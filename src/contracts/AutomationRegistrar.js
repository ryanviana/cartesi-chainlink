const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const AUTOMATION_REGISTRAR_ABI_PATH = path.join(__dirname, "..", "abi", "AutomationRegistrarABI.json");
let AUTOMATION_REGISTRAR_ABI;

try {
  AUTOMATION_REGISTRAR_ABI = JSON.parse(fs.readFileSync(AUTOMATION_REGISTRAR_ABI_PATH, "utf8"));
} catch (error) {
  console.error(`Failed to read or parse AutomationRegistrarABI.json from ${AUTOMATION_REGISTRAR_ABI_PATH}`, error);
  throw new Error(`Failed to load AutomationRegistrar ABI: ${error.message}`);
}

/**
 * Gets an Ethers.js Interface instance for the AutomationRegistrar.
 * The Interface is often used for encoding function data.
 * @returns {ethers.utils.Interface} - The AutomationRegistrar interface instance.
 */
function getAutomationRegistrarInterface() {
  return new ethers.utils.Interface(AUTOMATION_REGISTRAR_ABI);
}

/**
 * Gets an Ethers.js Contract instance for the AutomationRegistrar.
 * @param {string} address - The address of the AutomationRegistrar contract.
 * @param {ethers.Signer | ethers.providers.Provider} signerOrProvider - The Ethers.js signer or provider.
 * @returns {ethers.Contract} - The AutomationRegistrar contract instance.
 */
function getAutomationRegistrarContract(address, signerOrProvider) {
  return new ethers.Contract(address, AUTOMATION_REGISTRAR_ABI, signerOrProvider);
}

module.exports = {
  AUTOMATION_REGISTRAR_ABI, // Exporting ABI for direct use if needed
  getAutomationRegistrarInterface,
  getAutomationRegistrarContract,
}; 