const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Assuming Automation.json is now in src/abi/
const AUTOMATION_ABI_PATH = path.join(__dirname, "..", "abi", "Automation.json");

/**
 * Deploys the upkeep contract (Automation.json).
 * @param {ethers.Signer} signer - The signer object used to deploy the contract.
 * @param {object} [deploymentGasOptions] - Optional gas overrides for deployment.
 * @param {string} [deploymentGasOptions.gasLimit] - Gas limit for deployment.
 * @param {string} [deploymentGasOptions.maxFeePerGas] - Max fee per gas (EIP-1559).
 * @param {string} [deploymentGasOptions.maxPriorityFeePerGas] - Max priority fee per gas (EIP-1559).
 * @returns {Promise<string>} - The address of the deployed upkeep contract.
 * @throws {Error} if Automation.json cannot be read or deployment fails.
 */
async function deployUpkeepContract(signer, deploymentGasOptions = {}) {
  let contractJson;
  try {
    contractJson = JSON.parse(fs.readFileSync(AUTOMATION_ABI_PATH, "utf8"));
  } catch (error) {
    console.error(`Failed to read or parse Automation.json from ${AUTOMATION_ABI_PATH}`, error);
    throw new Error(`Failed to load upkeep contract ABI/bytecode: ${error.message}`);
  }

  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  if (!abi || !bytecode) {
    throw new Error("ABI or bytecode is missing from Automation.json.");
  }

  const factory = new ethers.ContractFactory(abi, bytecode, signer);

  const defaultGasOptions = {
    gasLimit: ethers.utils.hexlify(6000000), // Default gas limit
    maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
  };

  const mergedGasOptions = { ...defaultGasOptions, ...deploymentGasOptions };
  const finalDeploymentOptions = {};
  if (mergedGasOptions.gasLimit) finalDeploymentOptions.gasLimit = mergedGasOptions.gasLimit;
  if (mergedGasOptions.maxFeePerGas) finalDeploymentOptions.maxFeePerGas = mergedGasOptions.maxFeePerGas;
  if (mergedGasOptions.maxPriorityFeePerGas) finalDeploymentOptions.maxPriorityFeePerGas = mergedGasOptions.maxPriorityFeePerGas;


  console.log("Deploying the upkeep contract...");
  try {
    const contractInstance = await factory.deploy(finalDeploymentOptions);
    // console.log("Upkeep contract deployment transaction sent. Waiting for confirmation...");
    await contractInstance.deployed();
    // console.log("Upkeep contract deployed at address:", contractInstance.address);
    return contractInstance.address;
  } catch (error) {
    console.error("Upkeep contract deployment failed:", error);
    throw new Error(`Upkeep contract deployment failed: ${error.message}`);
  }
}

module.exports = {
  deployUpkeepContract,
}; 