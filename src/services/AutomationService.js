const { ethers } = require("ethers");
const config = require("../config");
const { getProvider, getSigner } = require("../utils/ethersHelper");
const { deployUpkeepContract } = require("../contracts/UpkeepContract");
const { getLinkTokenContract } = require("../contracts/LinkToken");
const { getAutomationRegistrarInterface } = require("../contracts/AutomationRegistrar");
const { buildLogTriggerConfig } = require("../triggers/LogTrigger");

/**
 * Creates a new Chainlink Automation Upkeep.
 * This involves deploying an upkeep contract and registering it with the Automation Registrar.
 *
 * @param {string} privateKey - The private key of the wallet to use for transactions.
 * @param {object} options - Options for creating the automation.
 * @param {string} options.adminAddress - The address that will own and manage the upkeep. Required.
 * @param {number} options.triggerType - The type of trigger for the upkeep (e.g., 0 for Log Trigger, 1 for Time-based). Required.
 * @param {string} [options.providerUrl=config.DEFAULT_PROVIDER_URL] - URL of the Ethereum JSON RPC provider.
 * @param {string} [options.linkTokenAddress=config.DEFAULT_LINK_TOKEN_ADDRESS] - Address of the LINK token contract.
 * @param {string} [options.automationRegistrarAddress=config.DEFAULT_AUTOMATION_REGISTRAR_ADDRESS] - Address of the Chainlink Automation Registrar contract.
 * @param {string} [options.name=config.DEFAULT_UPKEEP_NAME] - Name for the upkeep registration.
 * @param {string} [options.encryptedEmail=config.DEFAULT_ENCRYPTED_EMAIL] - Encrypted email for notifications (bytes).
 * @param {string} [options.checkData=config.DEFAULT_CHECK_DATA] - Data passed to the upkeep's checkUpkeep function (bytes).
 * @param {string} [options.offchainConfig=config.DEFAULT_OFFCHAIN_CONFIG] - Off-chain configuration for the upkeep (bytes).
 * @param {number | string | ethers.BigNumber} [options.gasLimit=config.DEFAULT_UPKEEP_GAS_LIMIT] - Gas limit for the upkeep's performUpkeep function.
 * @param {ethers.BigNumber | string} [options.amount=config.DEFAULT_REGISTRATION_AMOUNT_LINK] - Amount of LINK to fund the upkeep with.
 * @param {object} [options.triggerLogConfigParams] - Parameters for a log trigger. If provided, `triggerConfig` will be built using these.
 * @param {string} options.triggerLogConfigParams.contractAddress - Contract to watch for logs.
 * @param {number} options.triggerLogConfigParams.filterSelector - Log filter selector.
 * @param {string} options.triggerLogConfigParams.topic0 - Log topic0.
 * @param {string} [options.triggerLogConfigParams.topic1] - Log topic1.
 * @param {string} [options.triggerLogConfigParams.topic2] - Log topic2.
 * @param {string} [options.triggerLogConfigParams.topic3] - Log topic3.
 * @param {string} [options.triggerConfig] - Manually pre-built triggerConfig (bytes). If `triggerLogConfigParams` is given, this is ignored.
 * @param {object} [options.upkeepDeploymentGasOptions] - Optional gas overrides for deploying the upkeep contract.
 * @param {object} [options.registrationTxGasOptions] - Optional gas overrides for the registration transaction.
 * @returns {Promise<object>} An object containing the deployed upkeep contract address and the registration transaction receipt.
 * @throws {Error} if required options are missing or if any step in the process fails.
 */
async function createAutomation(privateKey, options = {}) {
  // Parameter validation and defaulting
  if (!privateKey) {
    throw new Error("privateKey is required.");
  }
  if (!options.adminAddress) {
    throw new Error("options.adminAddress is required.");
  }
  if (options.triggerType === undefined || options.triggerType === null) {
    throw new Error("options.triggerType is required.");
  }

  const providerUrl = options.providerUrl || config.DEFAULT_PROVIDER_URL;
  const linkTokenAddress = options.linkTokenAddress || config.DEFAULT_LINK_TOKEN_ADDRESS;
  const automationRegistrarAddress = options.automationRegistrarAddress || config.DEFAULT_AUTOMATION_REGISTRAR_ADDRESS;
  const upkeepName = options.name || config.DEFAULT_UPKEEP_NAME;
  const encryptedEmail = options.encryptedEmail || config.DEFAULT_ENCRYPTED_EMAIL; // Should be bytes
  const adminAddress = options.adminAddress;
  const triggerType = options.triggerType; // uint8
  const checkData = options.checkData || config.DEFAULT_CHECK_DATA; // bytes
  const offchainConfig = options.offchainConfig || config.DEFAULT_OFFCHAIN_CONFIG; // bytes
  const upkeepGasLimit = options.gasLimit || config.DEFAULT_UPKEEP_GAS_LIMIT; // uint32
  const registrationAmount = options.amount || config.DEFAULT_REGISTRATION_AMOUNT_LINK; // uint96

  let triggerConfig = options.triggerConfig; // bytes

  if (options.triggerLogConfigParams) {
    const { contractAddress, filterSelector, topic0, topic1, topic2, topic3 } = options.triggerLogConfigParams;
    triggerConfig = buildLogTriggerConfig(contractAddress, filterSelector, topic0, topic1, topic2, topic3);
  }

  if (!triggerConfig) {
    throw new Error("Either options.triggerConfig or options.triggerLogConfigParams is required.");
  }

  // Setup provider and signer
  const provider = getProvider(providerUrl);
  const wallet = getSigner(privateKey, provider);
  console.log(`Using wallet address: ${wallet.address}`);

  // 1. Deploy the upkeep contract
  console.log("Starting upkeep contract deployment...");
  const upkeepContractAddress = await deployUpkeepContract(wallet, options.upkeepDeploymentGasOptions);
  console.log(`Upkeep contract deployed at address: ${upkeepContractAddress}`);

  // 2. Prepare registration data
  const automationRegistrarInterface = getAutomationRegistrarInterface();
  const registrationData = automationRegistrarInterface.encodeFunctionData("register", [
    upkeepName,
    encryptedEmail,
    upkeepContractAddress,
    upkeepGasLimit,
    adminAddress,
    triggerType,
    checkData,
    triggerConfig,
    offchainConfig,
    registrationAmount,
    wallet.address, // sender for the registration
  ]);
  console.log(`Encoded registration data for Automation Registrar: ${registrationData}`);

  // 3. Send LINK tokens via transferAndCall to the Automation Registrar
  const linkToken = getLinkTokenContract(linkTokenAddress, wallet);
  console.log(`Attempting to register upkeep with ${ethers.utils.formatUnits(registrationAmount, 18)} LINK...`);

  try {
    const defaultTxGasOptions = {};
    // Gas estimation can be tricky and sometimes fails for complex txs or on certain networks.
    // Providing a manual gasLimit in options.registrationTxGasOptions can be a fallback.
    if (!options.registrationTxGasOptions || !options.registrationTxGasOptions.gasLimit) {
        try {
            const gasEstimate = await linkToken.estimateGas.transferAndCall(
                automationRegistrarAddress,
                registrationAmount,
                registrationData
            );
            defaultTxGasOptions.gasLimit = ethers.BigNumber.from(gasEstimate).mul(12).div(10); // Add 20% buffer
            console.log(`Estimated gas for registration: ${gasEstimate.toString()}, using: ${defaultTxGasOptions.gasLimit.toString()}`);
        } catch (estimateError) {
            console.warn("Gas estimation failed for transferAndCall. Consider setting a manual gas limit.", estimateError);
            // Fallback to a higher default if estimation fails, or let it fail if no manual override.
            // defaultTxGasOptions.gasLimit = ethers.utils.hexlify(1000000); // Example fallback
        }
    }
    
    const txOptions = { ...defaultTxGasOptions, ...options.registrationTxGasOptions };

    const tx = await linkToken.transferAndCall(
      automationRegistrarAddress,
      registrationAmount,
      registrationData,
      txOptions
    );
    console.log(`Registration transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log("Upkeep registration transaction confirmed. Receipt:", receipt);
    return {
      upkeepContractAddress,
      transactionHash: receipt.transactionHash,
      receipt,
    };
  } catch (error) {
    console.error("Upkeep registration (transferAndCall) failed:", error);
    throw new Error(`Upkeep registration failed: ${error.message}`);
  }
}

module.exports = {
  createAutomation,
}; 