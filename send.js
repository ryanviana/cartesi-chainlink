const { ethers } = require("ethers");

// LinkToken ABI (trimmed down for necessary functions)
const linkTokenABI = [
  "function transferAndCall(address to, uint value, bytes data) public returns (bool)",
];

// AutomationRegistrar2_1 ABI (register function only)
const automationRegistrarABI = [
  "function register(string name, bytes encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig, uint96 amount, address sender) external",
];

// Function to build the LogTriggerConfig as per the Solidity struct
function buildLogTriggerConfig(
  contractAddress,
  filterSelector,
  topic0,
  topic1,
  topic2,
  topic3
) {
  // Ensure that all topics are 32 bytes (padded)
  const topic0Bytes = ethers.utils.hexZeroPad(topic0, 32);
  const topic1Bytes = ethers.utils.hexZeroPad(topic1, 32);
  const topic2Bytes = ethers.utils.hexZeroPad(topic2, 32);
  const topic3Bytes = ethers.utils.hexZeroPad(topic3, 32);

  // Construct the trigger config
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

async function sendLinkWithRegisterData(
  providerUrl,
  privateKey,
  linkTokenAddress,
  automationRegistrarAddress,
  upkeepContract,
  amount,
  gasLimit
) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Initialize the LinkToken contract
  const linkToken = new ethers.Contract(linkTokenAddress, linkTokenABI, wallet);

  // Initialize the AutomationRegistrar2_1 contract to encode the data
  const automationRegistrar = new ethers.utils.Interface(
    automationRegistrarABI
  );

  // Parameters for the `register` function
  const name = "BIRIFO_250k"; // Example upkeep name
  const encryptedEmail = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(""));
  const adminAddress = "0xF3b64dD5AF39d8fF0c614F7637e339e31466c4C3"; // Your wallet will be the admin
  const triggerType = 1; // Example trigger type (log trigger)
  const checkData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(""));

  // Build the triggerConfig using the helper function
  const triggerConfig = buildLogTriggerConfig(
    "0x59B22D57D4F067708AB0C00552767405926DC768", // contractAddress
    0, // filterSelector: filtering all topics
    "0x6AAA400068BF4CA337265E2A1E1E841F66B8597FD5B452FDC52A44BED28A0784", // topic0 (Event signature)
    "0x0000000000000000000000000000000000000000000000000000000000000000", // topic1 (no filter)
    "0x0000000000000000000000000000000000000000000000000000000000000000", // topic2 (no filter)
    "0x0000000000000000000000000000000000000000000000000000000000000000" // topic3 (no filter)
  );

  const offchainConfig = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(""));

  // Encode the `register` function data for `transferAndCall`
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

  // Estimate gas and send transaction using `transferAndCall`
  try {
    const tx = await linkToken.transferAndCall(
      automationRegistrarAddress,
      amount,
      registerData,
      {
        gasLimit: ethers.BigNumber.from("1000000"), // Adjust the gas limit as necessary
      }
    );
    console.log("Transaction sent. Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed with hash:", receipt.transactionHash);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

// Execute the function with appropriate values
sendLinkWithRegisterData(
  "https://rpc2.sepolia.org", // Infura or another provider URL
  "0x7fc118ff40c94cb1a8590fd7fd2830b06a65c5fbc4c936d35619495ceec88dbe", // Your private key
  "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Sepolia LinkToken address
  "0xb0e49c5d0d05cbc241d68c05bc5ba1d1b7b72976", // Your AutomationRegistrar2_1 contract address
  "0xAf4c22EF6e054Eed49d905AB3198b78b8B4580b8", // Your upkeep contract address
  ethers.utils.parseUnits("2", 18), // 0.1 LINK (expressed in 18 decimals)
  500000 // Gas limit for upkeep (example)
);
