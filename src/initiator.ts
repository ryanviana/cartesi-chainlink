import { ethers, Signer, Contract, utils, BigNumber } from "ethers";
import {
  CartesiAutomationRegistrationOptions,
  CartesiRegistrationPayload,
  RegistrationInitiationResult,
  NetworkMismatchError,
  InsufficientFundsError,
  InvalidConfigurationError,
} from "./types";
import { getNetworkConfig, getNetworkName } from "./networks";

// InputBox ABI - only the functions we need
const INPUT_BOX_ABI = [
  "function addInput(address dapp, bytes calldata input) external returns (bytes32)",
  "event InputAdded(address indexed dapp, uint256 indexed inputIndex, address sender, bytes input)",
];

/**
 * AutomationInitiator handles the first part of the registration workflow.
 * It sends registration requests to Cartesi DApps via the InputBox contract.
 */
export class AutomationInitiator {
  private signer: Signer;
  private inputBox: Contract | null = null;
  private networkConfig: any = null;
  private chainId: number | null = null;

  constructor(signer: Signer) {
    if (!signer) {
      throw new InvalidConfigurationError("Signer is required");
    }
    this.signer = signer;
  }

  /**
   * Initialize the initiator by connecting to the network and setting up contracts
   * This must be called before using any other methods
   */
  public async initialize(): Promise<void> {
    if (!this.signer.provider) {
      throw new InvalidConfigurationError("Signer must be connected to a provider");
    }

    try {
      const network = await this.signer.provider.getNetwork();
      this.chainId = network.chainId;
      this.networkConfig = getNetworkConfig(this.chainId);

      // Connect to InputBox contract
      this.inputBox = new Contract(
        this.networkConfig.cartesi.inputBox,
        INPUT_BOX_ABI,
        this.signer
      );

      console.log(`AutomationInitiator initialized for ${getNetworkName(this.chainId)}`);
    } catch (error) {
      if (error instanceof NetworkMismatchError) {
        throw error;
      }
      throw new InvalidConfigurationError(`Failed to initialize: ${error}`);
    }
  }

  /**
   * Validate the registration options
   * @param options The registration options to validate
   */
  private validateOptions(options: CartesiAutomationRegistrationOptions): void {
    // Validate required fields
    if (!options.dappAddress || !utils.isAddress(options.dappAddress)) {
      throw new InvalidConfigurationError("A valid DApp address is required");
    }

    if (!options.upkeepContract || !utils.isAddress(options.upkeepContract)) {
      throw new InvalidConfigurationError("A valid upkeep contract address is required");
    }

    if (!options.adminAddress || !utils.isAddress(options.adminAddress)) {
      throw new InvalidConfigurationError("A valid admin address is required");
    }

    if (!options.name || options.name.trim().length === 0) {
      throw new InvalidConfigurationError("Upkeep name is required");
    }

    if (!options.gasLimit || options.gasLimit <= 0 || options.gasLimit > 5000000) {
      throw new InvalidConfigurationError("Gas limit must be between 1 and 5,000,000");
    }

    if (!options.amount) {
      throw new InvalidConfigurationError("Funding amount is required");
    }

    // Validate amount is a valid number and within uint96 range
    try {
      const amountBN = BigNumber.from(options.amount);
      const maxUint96 = BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFF"); // 2^96 - 1
      
      if (amountBN.lte(0)) {
        throw new InvalidConfigurationError("Funding amount must be greater than 0");
      }
      
      if (amountBN.gt(maxUint96)) {
        throw new InvalidConfigurationError("Funding amount exceeds uint96 maximum value");
      }
    } catch (error) {
      throw new InvalidConfigurationError(`Invalid funding amount: ${error}`);
    }

    // Validate optional hex strings
    if (options.checkData && !utils.isHexString(options.checkData)) {
      throw new InvalidConfigurationError("checkData must be a valid hex string");
    }

    if (options.offchainConfig && !utils.isHexString(options.offchainConfig)) {
      throw new InvalidConfigurationError("offchainConfig must be a valid hex string");
    }
  }

  /**
   * Check if the signer has sufficient balance for the transaction
   * @param options The registration options containing the funding amount
   */
  private async checkBalance(options: CartesiAutomationRegistrationOptions): Promise<void> {
    try {
      const signerAddress = await this.signer.getAddress();
      
      // Check ETH balance for gas
      const ethBalance = await this.signer.getBalance();
      const estimatedGasCost = utils.parseEther("0.01"); // Rough estimate
      
      if (ethBalance.lt(estimatedGasCost)) {
        throw new InsufficientFundsError(
          `Insufficient ETH balance for gas. Required: ~${utils.formatEther(estimatedGasCost)} ETH, ` +
          `Available: ${utils.formatEther(ethBalance)} ETH`
        );
      }

      // Note: We don't check LINK balance here because the actual LINK transfer
      // happens later when the voucher is executed. The DApp backend should
      // handle LINK balance validation if needed.
      
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw error;
      }
      throw new InvalidConfigurationError(`Failed to check balances: ${error}`);
    }
  }

  /**
   * Initiates the upkeep registration process by sending an input to the Cartesi DApp
   * @param options The configuration for the upkeep registration
   * @returns The transaction response and the input index
   */
  public async initiateRegistration(
    options: CartesiAutomationRegistrationOptions
  ): Promise<RegistrationInitiationResult> {
    // Ensure the initiator is initialized
    if (!this.inputBox || !this.networkConfig || !this.chainId) {
      throw new InvalidConfigurationError(
        "AutomationInitiator not initialized. Call initialize() first."
      );
    }

    // Validate all input parameters
    this.validateOptions(options);

    // Check balances
    await this.checkBalance(options);

    try {
      // Construct the JSON payload for the Cartesi backend
      const payload: CartesiRegistrationPayload = {
        type: "chainlink-automation-register",
        params: {
          name: options.name,
          upkeepContract: options.upkeepContract,
          gasLimit: options.gasLimit,
          adminAddress: options.adminAddress,
          amount: options.amount,
          checkData: options.checkData || "0x",
          offchainConfig: options.offchainConfig || "0x",
          chainId: this.chainId,
        },
      };

      // Convert to bytes for the InputBox
      const payloadString = JSON.stringify(payload);
      const payloadBytes = utils.toUtf8Bytes(payloadString);

      console.log(`Sending registration request to DApp at ${options.dappAddress}...`);
      console.log(`Payload size: ${payloadBytes.length} bytes`);

      // Send the input to the InputBox contract
      const tx = await this.inputBox.addInput(options.dappAddress, payloadBytes);
      console.log(`Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Extract the input index from the InputAdded event
      const inputAddedEvent = receipt.events?.find(
        (event: any) => event.event === "InputAdded"
      );

      if (!inputAddedEvent || !inputAddedEvent.args) {
        throw new InvalidConfigurationError("InputAdded event not found in transaction receipt");
      }

      const inputIndex = inputAddedEvent.args.inputIndex.toNumber();

      console.log(`Registration request submitted successfully!`);
      console.log(`Input Index: ${inputIndex}`);
      console.log(`Transaction Hash: ${tx.hash}`);
      console.log(`Next step: Use VoucherExecutor to wait for and execute the resulting voucher`);

      return {
        tx,
        receipt,
        inputIndex,
      };
    } catch (error: any) {
      console.error("Failed to initiate registration:", error);
      
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new InsufficientFundsError("Insufficient funds for transaction");
      }
      
      if (error.code === "NETWORK_ERROR") {
        throw new NetworkMismatchError("Network error occurred during transaction");
      }
      
      throw new InvalidConfigurationError(`Registration initiation failed: ${error}`);
    }
  }

  /**
   * Get the current network configuration
   * @returns The network configuration object
   */
  public getNetworkConfig() {
    return this.networkConfig;
  }

  /**
   * Get the current chain ID
   * @returns The chain ID
   */
  public getChainId(): number | null {
    return this.chainId;
  }

  /**
   * Get the signer address
   * @returns The signer address
   */
  public async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }
} 