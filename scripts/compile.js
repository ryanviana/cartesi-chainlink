const path = require("path");
const fs = require("fs");
const solc = require("solc");

const TARGET_CONTRACT_FILE_NAME = "InputAutomation.sol";
const PRIMARY_CONTRACT_NAME = "Upkeep"; // Adjust if your main contract has a different name
const OUTPUT_JSON_PATH = path.resolve(__dirname, "..", "src", "abi", "Automation.json");

/**
 * Compiles a Solidity contract.
 * @param {string} contractFileName - The Solidity file name.
 * @returns {object} - An object containing the ABI and bytecode for all contracts in the file.
 */
function compileContract(contractFileName) {
  const contractPath = path.resolve(__dirname, "contracts", contractFileName);
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      [contractFileName]: {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  console.log(`Compiling ${contractFileName}...`);
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((error) => error.severity === "error");
    if (errors.length > 0) {
      errors.forEach((err) => {
        console.error(err.formattedMessage);
      });
      throw new Error("Compilation failed with errors.");
    } else {
      // Log warnings if any
      output.errors.forEach((warn) => {
        console.warn(warn.formattedMessage);
      });
    }
  }

  console.log("Compilation successful.");
  return output.contracts[contractFileName];
}

/**
 * Main function to compile and save the primary contract's ABI and bytecode.
 */
function build() {
  try {
    const compiledContracts = compileContract(TARGET_CONTRACT_FILE_NAME);
    if (!compiledContracts || !compiledContracts[PRIMARY_CONTRACT_NAME]) {
      console.error(`Error: Contract '${PRIMARY_CONTRACT_NAME}' not found in ${TARGET_CONTRACT_FILE_NAME}.`);
      console.log("Available contracts:", Object.keys(compiledContracts || {}));
      process.exit(1);
    }

    const primaryContractOutput = {
      abi: compiledContracts[PRIMARY_CONTRACT_NAME].abi,
      bytecode: compiledContracts[PRIMARY_CONTRACT_NAME].evm.bytecode.object,
    };

    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(primaryContractOutput, null, 2));
    console.log(`Successfully wrote ${PRIMARY_CONTRACT_NAME} ABI and bytecode to ${OUTPUT_JSON_PATH}`);

  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

// If the script is executed directly, run the build function.
if (require.main === module) {
  build();
}

// Export the function to make it available if the package is imported elsewhere
module.exports = {
  compileContract,
  build, // Optionally export build if you want to call it programmatically
};
