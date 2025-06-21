import { ethers, Signer, Contract, utils } from "ethers";
import {
  Voucher,
  VoucherProof,
  VoucherExecutionResult,
  VoucherProofTimeoutError,
  InvalidConfigurationError,
} from "./types";

// CartesiDApp ABI - only the functions we need
const CARTESI_DAPP_ABI = [
  "function executeVoucher(address destination, bytes calldata payload, tuple(tuple(uint256 inputIndexWithinEpoch, uint256 outputIndexWithinInput, bytes32 outputHashesRootHash, bytes32 vouchersEpochRootHash, bytes32 noticesEpochRootHash, bytes32 machineStateHash) validity, bytes context) proof) external returns (bool)",
];

/**
 * VoucherExecutor handles the second part of the registration workflow.
 * It polls for vouchers from the Cartesi GraphQL API and executes them on-chain.
 */
export class VoucherExecutor {
  private signer: Signer;
  private dapp: Contract;
  private graphqlUrl: string;

  constructor(signer: Signer, dappAddress: string, graphqlUrl: string) {
    if (!signer) {
      throw new InvalidConfigurationError("Signer is required");
    }
    if (!dappAddress || !utils.isAddress(dappAddress)) {
      throw new InvalidConfigurationError("Valid DApp address is required");
    }
    if (!graphqlUrl || !this.isValidUrl(graphqlUrl)) {
      throw new InvalidConfigurationError("Valid GraphQL URL is required");
    }

    this.signer = signer;
    this.graphqlUrl = graphqlUrl;
    this.dapp = new Contract(dappAddress, CARTESI_DAPP_ABI, this.signer);
  }

  /**
   * Validate if a string is a valid URL
   * @param url The URL to validate
   * @returns True if valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Query the Cartesi GraphQL API for vouchers associated with a specific input
   * @param inputIndex The input index to query vouchers for
   * @returns Voucher object if found with proof, null otherwise
   */
  private async getVoucher(inputIndex: number): Promise<Voucher | null> {
    const query = `
      query GetVoucher($inputIndex: Int!) {
        input(index: $inputIndex) {
          vouchers {
            edges {
              node {
                destination
                payload
                proof {
                  validity {
                    inputIndexWithinEpoch
                    outputIndexWithinInput
                    outputHashesRootHash
                    vouchersEpochRootHash
                    noticesEpochRootHash
                    machineStateHash
                  }
                  context
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { inputIndex },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const vouchers = result.data?.input?.vouchers?.edges;
      if (!vouchers || vouchers.length === 0) {
        return null;
      }

      // Get the first voucher (there should typically only be one per input for our use case)
      const voucherNode = vouchers[0].node;

      // Only return the voucher if it has a proof (meaning it's ready for execution)
      if (voucherNode && voucherNode.proof) {
        return {
          destination: voucherNode.destination,
          payload: voucherNode.payload,
          proof: voucherNode.proof,
        };
      }

      return null;
    } catch (error) {
      console.error("Error querying GraphQL:", error);
      throw new InvalidConfigurationError(`Failed to query voucher: ${error}`);
    }
  }

  /**
   * Wait for a voucher to become available with a proof and execute it
   * @param inputIndex The index of the input that should generate the voucher
   * @param timeout Maximum time to wait in milliseconds (default: 5 minutes)
   * @param interval Polling interval in milliseconds (default: 5 seconds)
   * @returns The execution result with transaction details
   */
  public async waitForAndExecuteVoucher(
    inputIndex: number,
    timeout: number = 300000, // 5 minutes
    interval: number = 5000 // 5 seconds
  ): Promise<VoucherExecutionResult> {
    if (inputIndex < 0) {
      throw new InvalidConfigurationError("Input index must be non-negative");
    }
    if (timeout <= 0) {
      throw new InvalidConfigurationError("Timeout must be positive");
    }
    if (interval <= 0) {
      throw new InvalidConfigurationError("Interval must be positive");
    }

    const startTime = Date.now();
    let attempts = 0;

    console.log(`Waiting for voucher from input ${inputIndex}...`);
    console.log(`Timeout: ${timeout / 1000}s, Polling interval: ${interval / 1000}s`);

    while (Date.now() - startTime < timeout) {
      attempts++;
      console.log(`Polling attempt ${attempts} for voucher from input ${inputIndex}...`);

      try {
        const voucher = await this.getVoucher(inputIndex);

        if (voucher && voucher.proof) {
          console.log("Voucher with proof found! Executing on-chain...");
          console.log(`Destination: ${voucher.destination}`);
          console.log(`Payload length: ${voucher.payload.length} characters`);

          return await this.executeVoucher(voucher);
        }

        console.log("Voucher not ready yet, waiting...");
      } catch (error) {
        console.warn(`Polling attempt ${attempts} failed:`, error);
        // Continue polling unless it's a configuration error
        if (error instanceof InvalidConfigurationError) {
          throw error;
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new VoucherProofTimeoutError(
      `Timeout: Voucher for input ${inputIndex} not found within ${timeout / 1000} seconds after ${attempts} attempts`
    );
  }

  /**
   * Execute a voucher on-chain
   * @param voucher The voucher to execute
   * @returns The execution result
   */
  private async executeVoucher(voucher: Voucher): Promise<VoucherExecutionResult> {
    if (!voucher.proof) {
      throw new InvalidConfigurationError("Voucher must have a proof to be executed");
    }

    try {
      console.log("Estimating gas for voucher execution...");
      
      // Estimate gas first
      const gasEstimate = await this.dapp.estimateGas.executeVoucher(
        voucher.destination,
        voucher.payload,
        voucher.proof
      );

      console.log(`Estimated gas: ${gasEstimate.toString()}`);

      // Execute with a buffer on the gas limit
      const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer

      console.log("Executing voucher...");
      const tx = await this.dapp.executeVoucher(
        voucher.destination,
        voucher.payload,
        voucher.proof,
        { gasLimit }
      );

      console.log(`Voucher execution transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`Voucher executed successfully in block ${receipt.blockNumber}!`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);

      return {
        tx,
        receipt,
      };
    } catch (error: any) {
      console.error("Voucher execution failed:", error);

      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new InvalidConfigurationError("Insufficient funds for voucher execution");
      }

      if (error.reason) {
        throw new InvalidConfigurationError(`Voucher execution reverted: ${error.reason}`);
      }

      throw new InvalidConfigurationError(`Voucher execution failed: ${error.message || error}`);
    }
  }

  /**
   * Get a voucher without executing it (for inspection purposes)
   * @param inputIndex The input index to get the voucher for
   * @returns The voucher if available, null otherwise
   */
  public async getVoucherForInspection(inputIndex: number): Promise<Voucher | null> {
    return await this.getVoucher(inputIndex);
  }

  /**
   * Check if a voucher is ready for execution (has a proof)
   * @param inputIndex The input index to check
   * @returns True if voucher is ready, false otherwise
   */
  public async isVoucherReady(inputIndex: number): Promise<boolean> {
    const voucher = await this.getVoucher(inputIndex);
    return voucher !== null && voucher.proof !== undefined;
  }

  /**
   * Get the DApp contract address
   * @returns The DApp contract address
   */
  public getDappAddress(): string {
    return this.dapp.address;
  }

  /**
   * Get the GraphQL URL
   * @returns The GraphQL URL
   */
  public getGraphqlUrl(): string {
    return this.graphqlUrl;
  }

  /**
   * Get the signer address
   * @returns The signer address
   */
  public async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }
} 