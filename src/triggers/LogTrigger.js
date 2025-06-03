const { ethers } = require("ethers");

/**
 * Builds the LogTriggerConfig as per the Solidity struct for Chainlink Automation.
 * @param {string} contractAddress - The address of the contract to monitor for logs.
 * @param {number} filterSelector - The filter selector for topics (0 for topic0 only, 1 for topic0 and topic1, etc.).
 * @param {string} topic0 - The first topic (e.g., event signature). Required.
 * @param {string} [topic1] - The second topic. Optional.
 * @param {string} [topic2] - The third topic. Optional.
 * @param {string} [topic3] - The fourth topic. Optional.
 * @returns {string} - The ABI-encoded trigger configuration.
 * @throws {Error} if contractAddress or topic0 is not provided.
 */
function buildLogTriggerConfig(
  contractAddress,
  filterSelector, // Solidity: uint8
  topic0,         // Solidity: bytes32
  topic1,         // Solidity: bytes32
  topic2,         // Solidity: bytes32
  topic3          // Solidity: bytes32
) {
  if (!contractAddress) {
    throw new Error("contractAddress is required for LogTriggerConfig.");
  }
  if (!topic0) {
    throw new Error("topic0 is required for LogTriggerConfig.");
  }

  // Ensure topics are correctly padded to 32 bytes. Use '0x' for empty topics.
  const topic0Bytes = ethers.utils.hexZeroPad(topic0, 32);
  const topic1Bytes = ethers.utils.hexZeroPad(topic1 || "0x", 32);
  const topic2Bytes = ethers.utils.hexZeroPad(topic2 || "0x", 32);
  const topic3Bytes = ethers.utils.hexZeroPad(topic3 || "0x", 32);

  // ABI encode the parameters
  const encodedConfig = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint8", "bytes32", "bytes32", "bytes32", "bytes32"],
    [
      contractAddress,
      filterSelector,
      topic0Bytes,
      topic1Bytes,
      topic2Bytes,
      topic3Bytes,
    ]
  );

  return encodedConfig;
}

module.exports = {
  buildLogTriggerConfig,
}; 