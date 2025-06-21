/**
 * User-facing options for initiating a Chainlink Automation registration
 * This interface abstracts away the complexity of Solidity structs and provides
 * a clean, developer-friendly API for registration requests.
 */
export interface CartesiAutomationRegistrationOptions {
  /** The on-chain address of your Cartesi DApp where the registration request will be sent */
  dappAddress: string;
  
  /** The on-chain address of your AutomationCompatible contract that will be automated */
  upkeepContract: string;
  
  /** Human-readable name for the upkeep (displayed in Chainlink Automation UI) */
  name: string;
  
  /** Maximum gas limit for the performUpkeep function execution */
  gasLimit: number;
  
  /** Address that will have administrative control over this upkeep */
  adminAddress: string;
  
  /** Initial LINK funding amount in wei (as string to handle large numbers) */
  amount: string;
  
  /** Optional static data passed to checkUpkeep function (hex string, e.g., "0x1234") */
  checkData?: string;
  
  /** Optional CBOR-encoded JSON for advanced off-chain configurations (hex string) */
  offchainConfig?: string;
}

/**
 * Internal representation matching the Solidity RegistrationParams struct
 * Used for ABI encoding when generating vouchers in the Cartesi backend
 */
export interface ChainlinkRegistrationParams {
  name: string;
  encryptedEmail: Uint8Array;
  upkeepContract: string;
  gasLimit: number;
  adminAddress: string;
  triggerType: number;
  checkData: Uint8Array;
  triggerConfig: Uint8Array;
  offchainConfig: Uint8Array;
  amount: string; // uint96 as string
}

/**
 * Network-specific contract addresses configuration
 * Supports multiple networks with their respective Chainlink and Cartesi contract addresses
 */
export interface NetworkConfig {
  chainlink: {
    registrar: string;
    linkToken: string;
  };
  cartesi: {
    inputBox: string;
    dappFactory?: string;
  };
}

/**
 * Supported network configurations
 * Maps chain IDs to their respective contract addresses
 */
export interface NetworkConfigs {
  [chainId: number]: NetworkConfig;
}

/**
 * Result returned from initiating a registration request
 */
export interface RegistrationInitiationResult {
  /** The transaction that sent the input to the Cartesi DApp */
  tx: any; // ethers.ContractTransaction
  
  /** Transaction receipt */
  receipt: any; // ethers.ContractReceipt
  
  /** Input index for tracking the voucher */
  inputIndex: number;
}

/**
 * Result returned from executing a voucher
 */
export interface VoucherExecutionResult {
  /** The transaction that executed the voucher */
  tx: any; // ethers.ContractTransaction
  
  /** Transaction receipt */
  receipt: any; // ethers.ContractReceipt
}

/**
 * Voucher structure returned from Cartesi GraphQL API
 */
export interface Voucher {
  destination: string;
  payload: string;
  proof?: VoucherProof;
}

/**
 * Proof structure for voucher execution
 */
export interface VoucherProof {
  validity: {
    inputIndexWithinEpoch: number;
    outputIndexWithinInput: number;
    outputHashesRootHash: string;
    vouchersEpochRootHash: string;
    noticesEpochRootHash: string;
    machineStateHash: string;
  };
  context: string;
}

/**
 * JSON payload structure sent to Cartesi DApp backend
 * This defines the "API contract" between client and backend
 */
export interface CartesiRegistrationPayload {
  type: "chainlink-automation-register";
  params: {
    name: string;
    upkeepContract: string;
    gasLimit: number;
    adminAddress: string;
    amount: string;
    checkData: string;
    offchainConfig: string;
    chainId: number;
  };
}

/**
 * Custom error types for better error handling
 */
export class InsufficientFundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientFundsError";
  }
}

export class NetworkMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkMismatchError";
  }
}

export class VoucherProofTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherProofTimeoutError";
  }
}

export class InvalidConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConfigurationError";
  }
} 