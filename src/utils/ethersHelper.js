const { ethers } = require("ethers");

/**
 * Gets an Ethers.js provider instance.
 * @param {string} providerUrl - The URL of the JSON RPC provider.
 * @returns {ethers.providers.JsonRpcProvider} - The Ethers.js provider.
 */
function getProvider(providerUrl) {
  return new ethers.providers.JsonRpcProvider(providerUrl);
}

/**
 * Gets an Ethers.js wallet/signer instance.
 * @param {string} privateKey - The private key of the wallet.
 * @param {ethers.providers.Provider} provider - The Ethers.js provider.
 * @returns {ethers.Wallet} - The Ethers.js wallet instance.
 */
function getSigner(privateKey, provider) {
  return new ethers.Wallet(privateKey, provider);
}

module.exports = {
  getProvider,
  getSigner,
}; 