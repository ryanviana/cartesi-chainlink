const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load the LinkToken contract interface (ILinkToken)
const linkTokenInterfaceJSON = require("./ILinkToken.json");

/**
 * Calls transferAndCall on the LinkToken contract.
 * @param {ethers.Wallet} wallet - The wallet instance to send the transaction.
 * @param {string} linkTokenAddress - The address of the LinkToken contract (Sepolia: 0x779877A7B0D9E8603169DdbD7836e478b4624789).
 * @param {string} toAddress - The address to send tokens to.
 * @param {ethers.BigNumber} value - The amount of tokens to send (as BigNumber).
 * @param {string} data - The bytes data to pass (as hex string).
 */
async function callTransferAndCall(
  wallet,
  linkTokenAddress,
  toAddress,
  value,
  data
) {
  const linkToken = new ethers.Contract(
    linkTokenAddress,
    linkTokenInterfaceJSON.abi,
    wallet
  );

  console.log(`Calling transferAndCall on LinkToken at ${linkTokenAddress}...`);

  // Validate that data is a valid hex string
  if (!ethers.utils.isHexString(data)) {
    throw new Error("Data is not a valid hex string");
  }

  console.log("Data length (excluding '0x'):", data.length - 2);
  console.log("Data (first 10 chars):", data.substring(0, 12));

  try {
    const gasLimit = ethers.BigNumber.from("500000"); // Adjust based on actual requirements
    const tx = await linkToken.transferAndCall(toAddress, value, data, {
      gasLimit,
    });

    console.log("Transaction sent. Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(
      "transferAndCall executed successfully. Transaction hash:",
      receipt.transactionHash
    );
  } catch (txError) {
    console.error("Transaction failed:", txError);
  }
}

/**
 * Main function to deploy InputAutomation and interact with LinkToken.
 * @param {string} providerUrl - The JSON-RPC provider URL.
 * @param {string} privateKey - The private key of the deployer.
 */
async function main(providerUrl, privateKey) {
  // Initialize provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  try {
    const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // LinkToken address on Sepolia

    // Define the recipient, value, and data for transferAndCall
    const toAddress = "0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976"; // The address to send tokens to
    const value = ethers.BigNumber.from("100000000000000000"); // 1 LINK (assuming 18 decimals)

    let data =
      "0x856853e6000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000af4c22ef6e054eed49d905ab3198b78b8b4580b8000000000000000000000000000000000000000000000000000000000007a120000000000000000000000000f3b64dd5af39d8ff0c614f7637e339e31466c4c3000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000f3b64dd5af39d8ff0c614f7637e339e31466c4c3000000000000000000000000000000000000000000000000000000000000000574657374650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000059b22d57d4f067708ab0c00552767405926dc76800000000000000000000000000000000000000000000000000000000000000006aaa400068bf4ca337265e2a1e1e841f66b8597fd5b452fdc52a44bed28a07840000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    // If data length is odd, pad it with '0' to make it even
    if (data.length % 2 !== 0) {
      data = "0x0" + data.substring(2); // Add padding after '0x'
    }

    await callTransferAndCall(wallet, linkTokenAddress, toAddress, value, data);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

module.exports = { main };
