import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { LENDING_ESCROW_ADDRESS } from '@/config/contracts';

// Define the ABI for the getListings function
const getListingsABI = [
  {
    "inputs": [],
    "name": "getListings",
    "outputs": [
      {
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "lender", "type": "address" },
          { "name": "platform", "type": "string" },
          { "name": "pricePerHour", "type": "uint256" },
          { "name": "maxDurationHours", "type": "uint256" },
          { "name": "available", "type": "bool" }
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

type Listing = {
  id: string;
  platform: string;
  pricePerHour: string;
  maxDurationHours: string;
  available: boolean;
};

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data, isError, error: fetchError } = useReadContract({
    address: LENDING_ESCROW_ADDRESS as `0x${string}`,
    abi: getListingsABI,
    functionName: 'getListings',
  });

  useEffect(() => {
    if (data) {
      try {
        // The data is already in the correct format from the contract
        const listingsData = Array.isArray(data) ? data : [data];
        
        // Transform the contract data to match our Listing type
        const formattedListings = listingsData.map((listing: any) => ({
          id: listing.id.toString(),
          platform: listing.platform,
          pricePerHour: listing.pricePerHour.toString(),
          maxDurationHours: listing.maxDurationHours.toString(),
          available: listing.available,
        }));
        
        setListings(formattedListings);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to parse listings'));
      } finally {
        setIsLoading(false);
      }
    }

    if (isError && fetchError) {
      setError(fetchError);
      setIsLoading(false);
    }
  }, [data, isError, fetchError]);

  return {
    listings,
    isLoading,
    error,
    refetch: () => {
      // This would trigger a refetch if needed
      setIsLoading(true);
      // The actual refetch would be handled by the useReadContract hook
    }
  };
}

export default useListings;
