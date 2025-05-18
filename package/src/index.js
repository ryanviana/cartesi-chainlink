const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// LinkToken ABI (trimmed down for necessary functions)
const linkTokenABI = [
  "function transferAndCall(address to, uint value, bytes data) public returns (bool)",
];

// AutomationRegistrar2_1 ABI (register function only)
const automationRegistrarABI = [
  "function register(string name, bytes encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig, uint96 amount, address sender) external",
];

/**
 * Builds the LogTriggerConfig as per the Solidity struct.
 * @param {string} contractAddress - The address of the contract to monitor.
 * @param {number} filterSelector - The filter selector for topics.
 * @param {string} topic0 - The first topic (usually the event signature).
 * @param {string} topic1 - The second topic.
 * @param {string} topic2 - The third topic.
 * @param {string} topic3 - The fourth topic.
 * @returns {string} - The encoded trigger configuration.
 */
function buildLogTriggerConfig(
  contractAddress,
  filterSelector,
  topic0,
  topic1,
  topic2,
  topic3
) {
  const topic0Bytes = ethers.utils.hexZeroPad(topic0 || "0x", 32);
  const topic1Bytes = ethers.utils.hexZeroPad(topic1 || "0x", 32);
  const topic2Bytes = ethers.utils.hexZeroPad(topic2 || "0x", 32);
  const topic3Bytes = ethers.utils.hexZeroPad(topic3 || "0x", 32);

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

/**
 * Deploys the upkeep contract and returns the address.
 * @param {ethers.Signer} signer - The signer object used to deploy the contract.
 * @returns {Promise<string>} - The address of the deployed upkeep contract.
 */
async function deployUpkeepContract(signer) {
  const contractFileName = "Automation.json"; // Your precompiled contract JSON
  const contractPath = path.join(__dirname, contractFileName);

  // Read the contract ABI and bytecode from the JSON file
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  // Create a ContractFactory and deploy the contract
  const factory = new ethers.ContractFactory(abi, bytecode, signer);

  const deploymentOptions = {
    gasLimit: ethers.utils.hexlify(6000000), // Increase gas limit
    maxFeePerGas: ethers.utils.parseUnits("100", "gwei"), // Adjust dynamically
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
  };

  console.log("Deploying the contract...");
  const contractInstance = await factory.deploy(deploymentOptions);

  // console.log(
  // "Contract deployment transaction sent. Waiting for confirmation..."
  // );
  await contractInstance.deployed();

  // console.log("Contract deployed at address:", contractInstance.address);

  return contractInstance.address;
}

/**
 * Sends LINK tokens with registration data to the Automation Registrar.
 * @param {string} privateKey - The private key of the sender's wallet.
 * @param {object} options - Additional options for the registration.
 * @param {string} options.name - The name of the upkeep.
 * @param {string} options.encryptedEmail - The encrypted email address.
 * @param {string} options.adminAddress - The address of the admin wallet.
 * @param {number} options.triggerType - The trigger type.
 * @param {string} options.checkData - The check data.
 * @param {object} options.triggerLogConfigs - The log trigger configurations.
 * @param {string} options.triggerConfig - The trigger configuration.
 * @param {string} options.offchainConfig - The off-chain configuration.
 * @param {number} options.gasLimit - The gas limit for the upkeep.
 */
async function createAutomation(privateKey, options = {}) {
  const {
    amount = ethers.utils.parseUnits("2", 18), // Default to 2 LINK
    providerUrl = "https://rpc2.sepolia.org",
    linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    automationRegistrarAddress = "0xb0e49c5d0d05cbc241d68c05bc5ba1d1b7b72976",
    name = "DEFAULT",
    encryptedEmail = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")),
    adminAddress,
    triggerType,
    checkData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")),
    offchainConfig = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")),
    gasLimit = 200000, // Default gas limit for the upkeep
    triggerLogConfigs,
  } = options;

  if (!adminAddress) {
    throw new Error("adminAddress is required in options.");
  }

  let triggerConfig = options.triggerConfig;

  if (triggerLogConfigs) {
    const { contractAddress, filterSelector, topic0, topic1, topic2, topic3 } =
      triggerLogConfigs;

    triggerConfig = buildLogTriggerConfig(
      contractAddress,
      filterSelector,
      topic0,
      topic1,
      topic2,
      topic3
    );
  }

  if (!triggerConfig) {
    throw new Error(
      "Either triggerConfig or triggerLogConfigs is required in options."
    );
  }

  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const upkeepContract = await deployUpkeepContract(wallet);
  console.log("Upkeep contract deployed at address:", upkeepContract);

  const linkToken = new ethers.Contract(linkTokenAddress, linkTokenABI, wallet);

  const automationRegistrar = new ethers.utils.Interface(
    automationRegistrarABI
  );

  const registerData = automationRegistrar.encodeFunctionData("register", [
    name,
    encryptedEmail,
    upkeepContract,
    gasLimit,
    adminAddress,
    triggerType,
    checkData,
    triggerConfig,
    offchainConfig,
    amount,
    wallet.address,
  ]);

  console.log(`Encoded register data: ${registerData}`);

  try {
    const gasEstimate = await linkToken.estimateGas.transferAndCall(
      automationRegistrarAddress,
      amount,
      registerData
    );
    const tx = await linkToken.transferAndCall(
      automationRegistrarAddress,
      amount,
      registerData,
      {
        gasLimit: ethers.BigNumber.from(gasEstimate).mul(2), // Double the estimate
      }
    );
    console.log("Transaction sent. Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed with hash:", receipt.transactionHash);
  } catch (error) {
    console.error("Gas estimation or transaction failed:", error);
    throw error;
  }
}

module.exports = {
  buildLogTriggerConfig,
  createAutomation,
};
