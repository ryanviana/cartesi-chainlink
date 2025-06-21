/**
 * Default configuration values for the library
 * These values are used as fallbacks when specific configurations are not provided
 */

export interface DefaultConfig {
  gas: {
    limit: number;
    price: string;
  };
  timeouts: {
    transaction: number;
    voucher: number;
  };
  polling: {
    interval: number;
    maxRetries: number;
  };
}

/**
 * Default configuration object
 */
export const DEFAULT_CONFIG: DefaultConfig = {
  gas: {
    limit: 500000,
    price: "20000000000", // 20 gwei in wei
  },
  timeouts: {
    transaction: 60000, // 1 minute
    voucher: 300000, // 5 minutes
  },
  polling: {
    interval: 5000, // 5 seconds
    maxRetries: 60, // 5 minutes with 5s intervals
  },
};

/**
 * Common gas limits for different operations
 */
export const GAS_LIMITS = {
  INPUT_ADDITION: 100000,
  VOUCHER_EXECUTION: 500000,
  LINK_TRANSFER: 65000,
  AUTOMATION_REGISTRATION: 300000,
} as const;

/**
 * Chainlink Automation trigger types
 */
export const TRIGGER_TYPES = {
  CONDITIONAL: 0,
  LOG: 1,
} as const;

/**
 * Default GraphQL endpoints for different environments
 */
export const DEFAULT_GRAPHQL_ENDPOINTS = {
  localhost: "http://localhost:8080/graphql",
  testnet: "https://your-testnet-node.com/graphql",
  mainnet: "https://your-mainnet-node.com/graphql",
} as const; 