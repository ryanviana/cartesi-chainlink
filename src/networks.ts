import { NetworkConfig, NetworkConfigs, NetworkMismatchError } from "./types";

/**
 * Network configurations for supported chains
 * Contains contract addresses for Chainlink and Cartesi contracts on different networks
 */
export const NETWORK_CONFIGS: NetworkConfigs = {
  // Ethereum Mainnet
  1: {
    chainlink: {
      registrar: "0x6593c7De001fC8542bB1703532EE1E5aA0D458fD", // AutomationRegistrar2_1
      linkToken: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },

  // Sepolia Testnet
  11155111: {
    chainlink: {
      registrar: "0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976", // AutomationRegistrar2_1
      linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },

  // Polygon Mainnet
  137: {
    chainlink: {
      registrar: "0x02777053d6764996e594c3E88AF1D58D5363a2e6", // AutomationRegistrar2_1
      linkToken: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },

  // Polygon Mumbai Testnet
  80001: {
    chainlink: {
      registrar: "0xE16Df59B887e3Caa439E0b29B42bA2e7976FD8b2", // AutomationRegistrar2_1
      linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },

  // Base Mainnet
  8453: {
    chainlink: {
      registrar: "0x4Cb093f226983713164A62138C3F718A5b595F73", // AutomationRegistrar2_1
      linkToken: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },

  // Arbitrum One
  42161: {
    chainlink: {
      registrar: "0x4F3AF332A30973106Fe146Af0B4220bBBeA748eC", // AutomationRegistrar2_1
      linkToken: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    },
    cartesi: {
      inputBox: "0x59b22D57D4f067708AB0c00552767405926dc768", // InputBox
      dappFactory: "0x7122cd1221C20892234186facfE8615e6743Ab02", // CartesiDAppFactory
    },
  },
};

/**
 * Get network configuration for a specific chain ID
 * @param chainId The chain ID to get configuration for
 * @returns Network configuration object
 * @throws NetworkMismatchError if the chain ID is not supported
 */
export function getNetworkConfig(chainId: number): NetworkConfig {
  const config = NETWORK_CONFIGS[chainId];
  
  if (!config) {
    throw new NetworkMismatchError(
      `Unsupported network with chain ID: ${chainId}. ` +
      `Supported networks: ${Object.keys(NETWORK_CONFIGS).join(", ")}`
    );
  }
  
  return config;
}

/**
 * Check if a chain ID is supported
 * @param chainId The chain ID to check
 * @returns True if the chain ID is supported
 */
export function isSupportedNetwork(chainId: number): boolean {
  return chainId in NETWORK_CONFIGS;
}

/**
 * Get all supported chain IDs
 * @returns Array of supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(NETWORK_CONFIGS).map(Number);
}

/**
 * Get network name from chain ID (for display purposes)
 * @param chainId The chain ID
 * @returns Human-readable network name
 */
export function getNetworkName(chainId: number): string {
  const networkNames: { [key: number]: string } = {
    1: "Ethereum Mainnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Polygon Mumbai Testnet",
    8453: "Base Mainnet",
    42161: "Arbitrum One",
  };
  
  return networkNames[chainId] || `Unknown Network (${chainId})`;
} 