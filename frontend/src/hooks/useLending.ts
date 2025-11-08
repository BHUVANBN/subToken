import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, Address } from 'viem';
import { LENDING_ESCROW_ADDRESS } from '@/config/contracts';

type TransactionReceipt = {
  status: 'success' | 'reverted';
  transactionHash: string;
};

// Define the ABI for the createListing function
const createListingABI = [
  {
    "inputs": [
      { "name": "lender", "type": "address" },
      { "name": "encryptedCredentials", "type": "string" },
      { "name": "pricePerHour", "type": "uint256" },
      { "name": "maxDurationHours", "type": "uint256" }
    ],
    "name": "createListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

type TransactionResult = {
  hash: `0x${string}`;
};

type ListingParams = {
  platform: string;
  username: string;
  password: string;
  pricePerHour: string;
  maxHours: string;
};

const useLending = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const { writeContractAsync } = useWriteContract();

  // Handle transaction receipt
  const { isPending: isTransactionPending } = useWaitForTransactionReceipt({
    hash: transactionHash || undefined,
    query: {
      onSuccess: (receipt: TransactionReceipt) => {
        if (receipt.status === 'success') {
          console.log('Success: Your subscription has been listed successfully!');
        } else {
          console.error('Transaction Reverted: The transaction was reverted on chain.');
        }
        setIsLoading(false);
      },
      onError: (error: Error) => {
        console.error('Transaction error:', error);
        console.error('Error:', error.message || 'Failed to create listing');
        setIsLoading(false);
      },
    },
  });

  const createListing = useCallback(async (params: ListingParams): Promise<TransactionResult> => {
    try {
      if (!address) throw new Error('Wallet not connected');
      
      setIsLoading(true);
      
      // In a real app, you would encrypt the credentials here
      const encryptedCredentials = `encrypted:${params.username}:${params.password}`;
      
      // Convert price to wei
      const pricePerHour = parseEther(params.pricePerHour || '0');
      
      // Call the contract
      const hash = await writeContractAsync({
        address: LENDING_ESCROW_ADDRESS as Address,
        abi: createListingABI,
        functionName: 'createListing',
        args: [
          address as Address,
          encryptedCredentials,
          pricePerHour,
          BigInt(parseInt(params.maxHours, 10)),
        ],
      });

      setTransactionHash(hash as `0x${string}`);
      return { hash: hash as `0x${string}` };
    } catch (error: any) {
      console.error('Error creating listing:', error);
      const errorMessage = error?.error?.message || error?.message || 'Failed to create listing';
      console.error('Error:', errorMessage);
      setIsLoading(false);
      throw error;
    }
  }, [address, writeContractAsync]);

  return {
    createListing,
    isLoading: isLoading || isTransactionPending,
  };
}

export { useLending };
