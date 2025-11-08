// Contract addresses (replace with your deployed contract addresses)
// These are example addresses for local development
// For production, replace with your actual deployed contract addresses
export const SUBSCRIPTION_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Example address
export const LENDING_ESCROW_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; // Example address

// Network configurations
export const SUPPORTED_CHAINS = {
  mumbai: {
    id: 80001,
    name: 'Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    currency: 'MATIC',
  },
  polygon: {
    id: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    currency: 'MATIC',
  },
};

// Default chain to use
// export const DEFAULT_CHAIN = SUPPORTED_CHAINS.mumbai;
export const DEFAULT_CHAIN = SUPPORTED_CHAINS.mumbai; // Use Mumbai for testing

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// IPFS configuration
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs';

// App configuration
export const APP_NAME = 'SubToken';
export const APP_DESCRIPTION = 'Decentralized Subscription Token Platform';

// UI configuration
export const ITEMS_PER_PAGE = 10;
export const DEFAULT_GAS_LIMIT = 3000000;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  WRONG_NETWORK: `Please switch to ${DEFAULT_CHAIN.name} network`,
  TRANSACTION_FAILED: 'Transaction failed',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  UNAUTHORIZED: 'Unauthorized',
};

// Success messages
export const SUCCESS_MESSAGES = {
  TRANSACTION_SUCCESS: 'Transaction successful',
  TOKEN_MINTED: 'Token minted successfully',
  LISTING_CREATED: 'Listing created successfully',
  TOKEN_BORROWED: 'Token borrowed successfully',
  TOKEN_RETURNED: 'Token returned successfully',
};
