import { parseEther } from 'viem';
import { polygonMumbai } from 'wagmi/chains';

// Contract ABIs
import LendingEscrowABI from '../abis/LendingEscrow.json';
import SubscriptionTokenABI from '../abis/SubscriptionToken.json';

// Environment
const isProd = process.env.NODE_ENV === 'production';
const network = isProd ? 'mumbai' : 'localhost';

// Chain IDs
export const CHAIN_IDS = {
  LOCALHOST: 31337,
  MUMBAI: polygonMumbai.id,
} as const;

export const CHAIN_ID = isProd ? CHAIN_IDS.MUMBAI : CHAIN_IDS.LOCALHOST;

export const CONTRACTS = {
  localhost: {
    subscriptionToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    lendingEscrow: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  },
  // Add other networks as needed
  mumbai: {
    subscriptionToken: process.env.NEXT_PUBLIC_SUBSCRIPTION_TOKEN_ADDRESS || '',
    lendingEscrow: process.env.NEXT_PUBLIC_LENDING_ESCROW_ADDRESS || '',
  },
} as const;

// Export contract addresses with proper type assertions
export const LENDING_ESCROW_ADDRESS = CONTRACTS[network].lendingEscrow as `0x${string}`;
export const SUBSCRIPTION_TOKEN_ADDRESS = CONTRACTS[network].subscriptionToken as `0x${string}`;

export const CONTRACT_ABIS = {
  LendingEscrow: LendingEscrowABI.abi,
  SubscriptionToken: SubscriptionTokenABI.abi,
} as const;

// Default gas limit for transactions
const GAS_LIMIT = 500000;

export const DEFAULT_GAS = {
  gasLimit: GAS_LIMIT,
};

// Common error messages
export const ERROR_MESSAGES = {
  USER_REJECTED: 'User rejected the transaction',
  NETWORK_SWITCH: 'Please switch to the correct network',
  CONNECT_WALLET: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  TRANSACTION_FAILED: 'Transaction failed',
} as const;

// Helper function to parse token amounts
export const parseTokenAmount = (amount: string, decimals = 18) => {
  try {
    return parseEther(amount);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    throw new Error('Invalid token amount');
  }
};
