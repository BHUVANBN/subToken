import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { LENDING_ESCROW_ADDRESS, CHAIN_IDS } from '@/config/contracts';
import { polygonMumbai } from 'wagmi/chains';

// Custom error class for better error handling
class BorrowingError extends Error {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'BorrowingError';
    this.code = code;
    this.details = details;
  }
}

// Error messages mapping
const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction',
  USER_REJECTED: 'Transaction was rejected',
  NETWORK_ERROR: 'Network error. Please check your connection',
  CONTRACT_ERROR: 'Contract interaction failed',
  INVALID_INPUT: 'Invalid input parameters',
  UNKNOWN_ERROR: 'An unknown error occurred',
};

// Define the ABI for the borrow function
const borrowABI = [
  {
    "inputs": [
      { "name": "listingId", "type": "uint256" },
      { "name": "durationHours", "type": "uint256" }
    ],
    "name": "borrow",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

type BorrowParams = {
  listingId: string;
  pricePerHour: string;
  durationHours: number;
};

export function useBorrowing() {
  const { address, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { writeContractAsync } = useWriteContract();

  const resetError = useCallback(() => setError(null), []);

  const borrow = useCallback(async ({
    listingId,
    pricePerHour,
    durationHours
  }: BorrowParams): Promise<{ 
    hash: `0x${string}`;
    totalCost: string;
  }> => {
    resetError();
    
    try {
      // Validate inputs
      if (!isConnected || !address) {
        throw new BorrowingError('Please connect your wallet', 'WALLET_NOT_CONNECTED');
      }

      if (!listingId || !pricePerHour || !durationHours) {
        throw new BorrowingError('Missing required parameters', 'INVALID_INPUT');
      }
      
      setIsLoading(true);
      
      // Calculate total cost with proper error handling
      const pricePerSecond = parseFloat(pricePerHour) / 3600; // Convert hourly to per-second
      const totalCost = pricePerSecond * durationHours * 3600; // Convert hours to seconds
      
      if (isNaN(totalCost) || !isFinite(totalCost)) {
        throw new BorrowingError('Invalid price calculation', 'INVALID_CALCULATION');
      }
      
      // Format the total cost for display
      const formattedTotalCost = totalCost.toFixed(18);
      
      // Call the contract with proper error handling
      const hash = await writeContractAsync({
        address: LENDING_ESCROW_ADDRESS,
        abi: borrowABI,
        functionName: 'borrow',
        value: parseEther(formattedTotalCost),
        chainId: CHAIN_IDS.MUMBAI,
        args: [
          BigInt(listingId),
          BigInt(Math.floor(durationHours * 3600)) // Convert hours to seconds, ensure integer
        ]
      }).catch((error: any) => {
        console.error('Contract call failed:', error);
        
        // Handle common errors
        if (error.code === 4001) { // User rejected the request
          throw new BorrowingError(ERROR_MESSAGES.USER_REJECTED, 'USER_REJECTED');
        } else if (error.message?.includes('insufficient funds')) {
          throw new BorrowingError(ERROR_MESSAGES.INSUFFICIENT_FUNDS, 'INSUFFICIENT_FUNDS');
        } else if (error.message?.includes('wrong network')) {
          // Attempt to switch network
          try {
            switchChain?.({ chainId: polygonMumbai.id });
            throw new BorrowingError(
              'Please switch to Polygon Mumbai Testnet to continue',
              'WRONG_NETWORK'
            );
          } catch (switchError) {
            throw new BorrowingError(
              'Failed to switch networks',
              'NETWORK_SWITCH_ERROR',
              switchError
            );
          }
        }
        
        // Generic error handling
        throw new BorrowingError(
          error.message || ERROR_MESSAGES.CONTRACT_ERROR,
          'CONTRACT_ERROR',
          error
        );
      });
      
      return { 
        hash,
        totalCost: formattedTotalCost
      };
      
    } catch (error: any) {
      console.error('Borrowing failed:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContractAsync, switchChain, resetError]);

  return { 
    borrow, 
    isLoading, 
    error,
    resetError 
  };
}

export default useBorrowing;
