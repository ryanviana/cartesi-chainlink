/**
 * Cartesi Chainlink Automation Library
 * 
 * This library simplifies the process of registering Chainlink Automation upkeeps
 * for Cartesi DApps by providing a two-part workflow:
 * 
 * 1. AutomationInitiator: Sends registration requests to Cartesi DApps
 * 2. VoucherExecutor: Polls for and executes the resulting vouchers
 * 
 * @author Cartesi Foundation
 * @version 1.0.0
 */

// Export main classes
export { AutomationInitiator } from "./initiator";
export { VoucherExecutor } from "./executor";

// Export types and interfaces
export type {
  CartesiAutomationRegistrationOptions,
  ChainlinkRegistrationParams,
  NetworkConfig,
  NetworkConfigs,
  RegistrationInitiationResult,
  VoucherExecutionResult,
  Voucher,
  VoucherProof,
  CartesiRegistrationPayload,
} from "./types";

// Import types for internal use
import type {
  CartesiAutomationRegistrationOptions,
  RegistrationInitiationResult,
  VoucherExecutionResult,
} from "./types";
import { AutomationInitiator } from "./initiator";
import { VoucherExecutor } from "./executor";

// Export custom error classes
export {
  InsufficientFundsError,
  NetworkMismatchError,
  VoucherProofTimeoutError,
  InvalidConfigurationError,
} from "./types";

// Export network utilities
export {
  NETWORK_CONFIGS,
  getNetworkConfig,
  isSupportedNetwork,
  getSupportedChainIds,
  getNetworkName,
} from "./networks";

/**
 * Library version
 */
export const VERSION = "1.0.0";

/**
 * Convenience function to create a complete automation registration workflow
 * This combines both the initiation and execution phases for simpler usage
 * 
 * @param signer - The ethers.js signer to use for transactions
 * @param options - Registration configuration options
 * @param graphqlUrl - URL of the Cartesi GraphQL API endpoint
 * @param timeout - Maximum time to wait for voucher (default: 5 minutes)
 * @param interval - Polling interval for voucher (default: 5 seconds)
 * @returns Promise that resolves with both initiation and execution results
 * 
 * @example
 * ```typescript
 * import { ethers } from "ethers";
 * import { createAutomationRegistration } from "cartesi-chainlink-automation";
 * 
 * const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_KEY");
 * const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
 * 
 * const result = await createAutomationRegistration(signer, {
 *   dappAddress: "0x...",
 *   upkeepContract: "0x...",
 *   name: "My Automation",
 *   gasLimit: 500000,
 *   adminAddress: "0x...",
 *   amount: ethers.utils.parseEther("10").toString(), // 10 LINK
 * }, "http://localhost:8080/graphql");
 * 
 * console.log("Registration completed:", result);
 * ```
 */
export async function createAutomationRegistration(
  signer: any, // ethers.Signer
  options: CartesiAutomationRegistrationOptions,
  graphqlUrl: string,
  timeout: number = 300000, // 5 minutes
  interval: number = 5000 // 5 seconds
): Promise<{
  initiation: RegistrationInitiationResult;
  execution: VoucherExecutionResult;
}> {
  // Phase 1: Initialize and send the registration request
  const initiator = new AutomationInitiator(signer);
  await initiator.initialize();
  
  console.log("=== Phase 1: Initiating Registration ===");
  const initiation = await initiator.initiateRegistration(options);
  
  // Phase 2: Wait for and execute the voucher
  const executor = new VoucherExecutor(signer, options.dappAddress, graphqlUrl);
  
  console.log("=== Phase 2: Waiting for Voucher ===");
  const execution = await executor.waitForAndExecuteVoucher(
    initiation.inputIndex,
    timeout,
    interval
  );
  
  console.log("=== Registration Complete ===");
  console.log("✅ Chainlink Automation upkeep has been registered successfully!");
  
  return {
    initiation,
    execution,
  };
} 