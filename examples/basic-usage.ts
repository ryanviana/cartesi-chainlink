// examples/basic-usage.ts

import { ethers } from "ethers";
import {
  createAutomationRegistration,
  AutomationInitiator,
  VoucherExecutor,
  getSupportedChainIds,
  getNetworkName,
} from "../src/index";

/**
 * Basic usage example for the Cartesi Chainlink Automation Library
 */
async function basicExample() {
  // Setup provider and signer
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

  console.log("=== Cartesi Chainlink Automation Library Example ===");
  console.log(`Signer address: ${await signer.getAddress()}`);
  
  // Show supported networks
  const supportedChains = getSupportedChainIds();
  console.log("Supported networks:");
  supportedChains.forEach(chainId => {
    console.log(`  - ${getNetworkName(chainId)} (${chainId})`);
  });

  // Example registration options
  const registrationOptions = {
    dappAddress: "0x1234567890123456789012345678901234567890", // Replace with your DApp address
    upkeepContract: "0x0987654321098765432109876543210987654321", // Replace with your upkeep contract
    name: "Example DApp Automation",
    gasLimit: 500000,
    adminAddress: await signer.getAddress(),
    amount: ethers.utils.parseEther("5").toString(), // 5 LINK
    checkData: "0x", // Optional
    offchainConfig: "0x", // Optional
  };

  const graphqlUrl = "http://localhost:8080/graphql"; // Replace with your GraphQL endpoint

  try {
    // Method 1: One-step registration (recommended for most users)
    console.log("\n=== Method 1: One-step Registration ===");
    const result = await createAutomationRegistration(
      signer,
      registrationOptions,
      graphqlUrl,
      300000, // 5 minute timeout
      5000    // 5 second polling interval
    );

    console.log("Registration completed successfully!");
    console.log(`Input transaction: ${result.initiation.tx.hash}`);
    console.log(`Execution transaction: ${result.execution.tx.hash}`);
    console.log(`Input index: ${result.initiation.inputIndex}`);

  } catch (error) {
    console.error("One-step registration failed:", error);
    
    // Method 2: Two-step registration (for advanced users who need more control)
    console.log("\n=== Method 2: Two-step Registration ===");
    
    try {
      // Step 1: Initialize and send the registration request
      console.log("Step 1: Initiating registration...");
      const initiator = new AutomationInitiator(signer);
      await initiator.initialize();
      
      const initiation = await initiator.initiateRegistration(registrationOptions);
      console.log(`Registration initiated! Input index: ${initiation.inputIndex}`);
      console.log(`Transaction hash: ${initiation.tx.hash}`);

      // Step 2: Wait for and execute the voucher
      console.log("Step 2: Waiting for voucher...");
      const executor = new VoucherExecutor(signer, registrationOptions.dappAddress, graphqlUrl);
      
      // Check if voucher is ready (optional)
      const isReady = await executor.isVoucherReady(initiation.inputIndex);
      console.log(`Voucher ready: ${isReady}`);
      
      if (!isReady) {
        console.log("Voucher not ready yet, waiting...");
        const execution = await executor.waitForAndExecuteVoucher(
          initiation.inputIndex,
          300000, // 5 minute timeout
          5000    // 5 second polling interval
        );
        
        console.log("Voucher executed successfully!");
        console.log(`Execution transaction: ${execution.tx.hash}`);
        console.log(`Gas used: ${execution.receipt.gasUsed.toString()}`);
      }

    } catch (stepError) {
      console.error("Two-step registration failed:", stepError);
    }
  }
}

/**
 * Advanced example showing error handling
 */
async function advancedErrorHandling() {
  console.log("\n=== Advanced Error Handling Example ===");
  
  // This example shows how to handle different types of errors
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

  const registrationOptions = {
    dappAddress: "0x1234567890123456789012345678901234567890",
    upkeepContract: "0x0987654321098765432109876543210987654321",
    name: "Test Automation",
    gasLimit: 500000,
    adminAddress: await signer.getAddress(),
    amount: "1000000000000000000", // 1 LINK in wei
  };

  try {
    const result = await createAutomationRegistration(
      signer,
      registrationOptions,
      "http://localhost:8080/graphql"
    );
    console.log("Success:", result);
    
  } catch (error) {
    // Import error types for proper error handling
    const {
      InsufficientFundsError,
      NetworkMismatchError,
      VoucherProofTimeoutError,
      InvalidConfigurationError,
    } = await import("../src/index");

    if (error instanceof InsufficientFundsError) {
      console.error("❌ Insufficient funds:", error.message);
      console.log("💡 Solution: Add more ETH or LINK to your wallet");
      
    } else if (error instanceof NetworkMismatchError) {
      console.error("❌ Network issue:", error.message);
      console.log("💡 Solution: Check your network configuration and try again");
      
    } else if (error instanceof VoucherProofTimeoutError) {
      console.error("❌ Voucher timeout:", error.message);
      console.log("💡 Solution: Check your Cartesi node status and try with a longer timeout");
      
    } else if (error instanceof InvalidConfigurationError) {
      console.error("❌ Configuration error:", error.message);
      console.log("💡 Solution: Review your registration parameters");
      
    } else {
      console.error("❌ Unexpected error:", error);
    }
  }
}

/**
 * Example showing how to inspect vouchers before execution
 */
async function voucherInspectionExample() {
  console.log("\n=== Voucher Inspection Example ===");
  
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

  const dappAddress = "0x1234567890123456789012345678901234567890";
  const graphqlUrl = "http://localhost:8080/graphql";
  const inputIndex = 0; // Replace with actual input index

  const executor = new VoucherExecutor(signer, dappAddress, graphqlUrl);

  try {
    // Get voucher for inspection without executing it
    const voucher = await executor.getVoucherForInspection(inputIndex);
    
    if (voucher) {
      console.log("Voucher found:");
      console.log(`  Destination: ${voucher.destination}`);
      console.log(`  Payload length: ${voucher.payload.length} characters`);
      console.log(`  Has proof: ${voucher.proof ? "Yes" : "No"}`);
      
      if (voucher.proof) {
        console.log("  Proof details:");
        console.log(`    Input index: ${voucher.proof.validity.inputIndexWithinEpoch}`);
        console.log(`    Output index: ${voucher.proof.validity.outputIndexWithinInput}`);
      }
    } else {
      console.log("No voucher found for input index:", inputIndex);
    }
    
  } catch (error) {
    console.error("Failed to inspect voucher:", error);
  }
}

// Run examples (uncomment the ones you want to test)
if (require.main === module) {
  console.log("⚠️  This is an example file. Please update the configuration before running.");
  console.log("⚠️  Replace placeholder addresses and API keys with real values.");
  
  // basicExample().catch(console.error);
  // advancedErrorHandling().catch(console.error);
  // voucherInspectionExample().catch(console.error);
}

export {
  basicExample,
  advancedErrorHandling,
  voucherInspectionExample,
}; 