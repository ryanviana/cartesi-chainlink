const path = require("path");
const fs = require("fs");
const solc = require("solc");

/**
 * Compiles a Solidity contract.
 * @param {string} contractFileName - The Solidity file name.
 * @returns {object} - An object containing the ABI and bytecode.
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

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    // Filter out warnings and display errors
    const errors = output.errors.filter((error) => error.severity === "error");
    errors.forEach((err) => {
      console.error(err.formattedMessage);
    });
    if (errors.length > 0) {
      throw new Error("Compilation failed with errors.");
    }
  }

  const compiledContracts = output.contracts[contractFileName];
  const compiledData = {};

  for (const contractName in compiledContracts) {
    compiledData[contractName] = {
      abi: compiledContracts[contractName].abi,
      bytecode: compiledContracts[contractName].evm.bytecode.object,
    };
  }

  return compiledData;
}

// Export the function to make it available when the package is imported
module.exports = {
  compileContract,
};
