const { ethers } = require("ethers");

function hexToStr(hexData) {
  try {
    // Convert hex to string using ethers.js' utility
    return ethers.utils.toUtf8String(hexData);
  } catch (error) {
    console.log(`Error decoding hex string: ${error.message}`);
    return null;
  }
}

// Define provider (e.g., Sepolia testnet)
const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc2.sepolia.org"
);

// Contract address you want to listen to (your InputAutomation contract)
const contractAddress = "0xAf4c22EF6e054Eed49d905AB3198b78b8B4580b8"; // Replace with your actual contract address

// ABI definition including the Bumped event
const contractABI = [
  "event Bumped(address indexed logSender, address indexed caller, uint256 number, uint256 blockNumber, uint256 newCounterValue, bytes32 txnHash, uint256 timestamp, bytes inputData)",
];

// Initialize the contract object
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Function to decode and print the inputData from the Bumped event
contract.on(
  "Bumped",
  (
    logSender,
    caller,
    number,
    blockNumber,
    newCounterValue,
    txnHash,
    timestamp,
    inputData
  ) => {
    // console.log("Bumped event detected:");
    // console.log(`Log Sender: ${logSender}`);
    // console.log(`Caller: ${caller}`);
    // console.log(`Number: ${number}`);
    // console.log(`Block Number: ${blockNumber}`);
    console.log(`Input of number: ${newCounterValue}`);
    // console.log(`Transaction Hash: ${txnHash}`);
    // console.log(`Timestamp: ${timestamp}`);

    console.log(`Input Data: ${inputData}`);

    //get only the last 32 bytes of the inputData and print as string
    let data = inputData.slice(-64);
    console.log(`Input Data as string: ${hexToStr("0x" + data)}`);
  }
);

// Start listening for events
console.log(`Listening for Bumped events on contract: ${contractAddress}`);
