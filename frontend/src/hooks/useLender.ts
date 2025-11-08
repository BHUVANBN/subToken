import { useState, useCallback } from 'react';
import { useAccount, useNetwork, useProvider, useSigner } from 'wagmi';
import { LENDING_ESCROW_ADDRESS, CONTRACT_ABIS } from '@/config/contracts';
import { polygonMumbai } from 'wagmi/chains';
import { ethers } from 'ethers';
import type { BigNumber } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface ListingFormData {
  platform: string;
  username: string;
  password: string;
  pricePerHour: string;
  maxHours: string;
}

export function useLender() {
  const { address, isConnected } = useAccount();
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const provider = useProvider();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create contract instance with type-safe methods
  const getContract = useCallback(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !LENDING_ESCROW_ADDRESS) return null;
    
    // Create contract with explicit type casting
    const contract = new ethers.Contract(
      LENDING_ESCROW_ADDRESS,
      CONTRACT_ABIS.LendingEscrow as ethers.ContractInterface,
      signerOrProvider
    ) as ethers.Contract & {
      createListing: (pricePerHour: BigNumber, maxDuration: number, options?: { gasLimit?: BigNumber }) => Promise<ethers.ContractTransaction>;
      getListing: (listingId: number) => Promise<any>;
      removeListing: (listingId: number) => Promise<ethers.ContractTransaction>;
      estimateGas: {
        createListing: (pricePerHour: BigNumber, maxDuration: number) => Promise<BigNumber>;
      };
    };

    return contract;
  }, [signer, provider]);

  // Function to handle form submission
  const handleSubmitListing = useCallback(
    async (formData: ListingFormData) => {
      if (!address) {
        setError('Please connect your wallet');
        return false;
      }

      // Check network
      if (chain?.id !== polygonMumbai.id) {
        try {
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${polygonMumbai.id.toString(16)}` }],
          });
          // Give time for the network to switch
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (switchError: any) {
          setError('Failed to switch to Mumbai testnet');
          return false;
        }
      }

      const contract = getContract();
      if (!contract) {
        setError('Failed to initialize contract');
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Encrypt the credentials (in a real app, use a secure encryption method)
        const credentials = JSON.stringify({
          platform: formData.platform,
          username: formData.username,
          password: formData.password,
        });

        // 2. Create the listing on-chain
        const pricePerHourWei = ethers.utils.parseEther(formData.pricePerHour);
        
        if (!contract) {
          throw new Error('Contract not initialized');
        }
        const maxDurationHours = parseInt(formData.maxHours, 10);
        
        console.log('Creating listing with:', {
          pricePerHour: formData.pricePerHour,
          pricePerHourWei: pricePerHourWei.toString(),
          maxDurationHours,
        });

        try {
          // Estimate gas first
          // For now, use a fixed gas limit to avoid estimation issues
          // In production, you should estimate gas properly
          const gasLimit = 1000000; // Adjust based on your contract
          
          // Send the transaction with the fixed gas limit
          const tx = await contract.createListing(
            pricePerHourWei,
            maxDurationHours,
            { gasLimit: ethers.BigNumber.from(gasLimit) }
          );
          
          console.log('Transaction sent, waiting for confirmation...');
          const receipt = await tx.wait();
          console.log('Transaction confirmed in block', receipt.blockNumber);
          
          // In a real app, you would now store the credentials securely (e.g., IPFS)
          // For now, we'll just log them (don't do this in production!)
          console.warn('Store these credentials securely in production:', credentials);
          
          return true;
        } catch (error: any) {
          console.error('Transaction failed:', error);
          if (error.code === 'ACTION_REJECTED') {
            throw new Error('Transaction was rejected by user');
          }
          throw error;
        }
      } catch (err: any) {
        console.error('Error creating listing:', err);
        setError(err.message || 'Failed to create listing');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [address, chain, getContract]
  );

  return {
    createListing: handleSubmitListing,
    isLoading,
    error,
    isConnected,
    isCorrectNetwork: chain?.id === polygonMumbai.id,
  };
}
