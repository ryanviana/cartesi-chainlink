const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const LINK_TOKEN_ABI_PATH = path.join(__dirname, "..", "abi", "LinkTokenABI.json");
let LINK_TOKEN_ABI;

try {
  LINK_TOKEN_ABI = JSON.parse(fs.readFileSync(LINK_TOKEN_ABI_PATH, "utf8"));
} catch (error) {
  console.error(`Failed to read or parse LinkTokenABI.json from ${LINK_TOKEN_ABI_PATH}`, error);
  throw new Error(`Failed to load LinkToken ABI: ${error.message}`);
}

/**
 * Gets an Ethers.js Contract instance for the LinkToken.
 * @param {string} address - The address of the LinkToken contract.
 * @param {ethers.Signer | ethers.providers.Provider} signerOrProvider - The Ethers.js signer or provider.
 * @returns {ethers.Contract} - The LinkToken contract instance.
 */
function getLinkTokenContract(address, signerOrProvider) {
  return new ethers.Contract(address, LINK_TOKEN_ABI, signerOrProvider);
}

module.exports = {
  LINK_TOKEN_ABI, // Exporting ABI for direct use if needed
  getLinkTokenContract,
}; 