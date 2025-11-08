'use client';

import { useState, useEffect } from 'react';
import { useAccount, useNetwork, useSwitchChain } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { waitForTransactionReceipt } from '@wagmi/core'
import { publicClient } from '@/lib/wagmi';
import useBorrowing from '@/hooks/useBorrowing';
import useListings from '@/hooks/useListings';

// Mock data - in a real app, this would come from the blockchain
const MOCK_LISTINGS = [
  {
    id: '1',
    platform: 'netflix',
    pricePerHour: '0.01',
    maxDurationHours: '24',
    available: true,
  },
  {
    id: '2',
    platform: 'spotify',
    pricePerHour: '0.005',
    maxDurationHours: '12',
    available: true,
  },
];

export default function BorrowPage() {
  const { toast } = useToast();
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const { switchChain } = useSwitchChain();
  const { borrow, isLoading: isBorrowing } = useBorrowing();
  const { listings, isLoading: isLoadingListings, refetch } = useListings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(1);

  // Refresh listings every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  const handleBorrow = async (listing: any) => {
    try {
      const { hash, totalCost } = await borrow({
        listingId: listing.id,
        pricePerHour: listing.pricePerHour,
        durationHours,
      });
      
      toast({
        title: 'Transaction Submitted',
        description: `Borrowing subscription for ${durationHours} hours. Total cost: ${totalCost} MATIC`,
        action: (
          <a 
            href={`https://mumbai.polygonscan.com/tx/${hash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on Explorer
          </a>
        ),
      });
      
      // Reset selection after successful borrow
      setSelectedListing(null);
      
    } catch (error: any) {
      // Error is already handled in the useBorrowing hook
      if (error.code === 'WRONG_NETWORK') {
        // Handle network switch request
        try {
          await switchChain?.({ chainId: polygonMumbai.id });
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
        }
      }
    }
  };

  // Filter and sort listings based on search term and availability
  const filteredListings = listings
    .filter((listing) => {
      const matchesSearch = listing.platform
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch && listing.available;
    })
    .sort((a, b) => {
      // Sort by price per hour (lowest first)
      return parseFloat(a.pricePerHour) - parseFloat(b.pricePerHour);
    });

  const selectedListingData = listings.find(listing => listing.id === selectedListing);
  const totalCost = selectedListingData 
    ? (parseFloat(selectedListingData.pricePerHour) * durationHours).toFixed(4)
    : '0';

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Borrow a Subscription</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Rent access to premium subscriptions at a fraction of the cost. 
          No long-term commitments, pause or cancel anytime.
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          Rent a subscription for a fraction of the cost. Pay only for what you use.
        </p>
      </div>

      <div className="mb-8 space-y-4">
        <div className="max-w-md mx-auto relative">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
          
          {isLoadingListings && (
            <div className="text-center mt-2 text-sm text-muted-foreground">
              <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
              Loading subscriptions...
            </div>
          )}
        </div>
        
        {selectedListing && selectedListingData && (
          <div className="max-w-md mx-auto p-4 bg-muted/50 rounded-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration" className="block mb-2">
                  Rental Duration: {durationHours} hour{durationHours !== 1 ? 's' : ''}
                </Label>
                <Slider
                  id="duration"
                  min={1}
                  max={parseInt(selectedListingData.maxDurationHours) || 24}
                  step={1}
                  value={[durationHours]}
                  onValueChange={(value: number[]) => setDurationHours(value[0])}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Cost:</span>
                <span className="font-bold">{totalCost} MATIC</span>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => handleBorrow(selectedListingData)}
                disabled={isBorrowing}
              >
                {isBorrowing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Borrow for ${totalCost} MATIC`
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSelectedListing(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view available subscriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <ConnectButton 
              showBalance={false}
              accountStatus="address"
              chainStatus="icon"
            />
          </CardContent>
        </Card>
      ) : chain?.id !== polygonMumbai.id ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Switch Network</CardTitle>
            <CardDescription>
              Please switch to Polygon Mumbai Testnet to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              onClick={() => switchChain?.({ chainId: polygonMumbai.id })}
              className="w-full"
            >
              Switch to Mumbai Testnet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingListings ? (
            <div className="col-span-3 flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No matching listings found' : 'No listings available at the moment'}
              </p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <Card 
                key={listing.id} 
                className={`relative transition-all duration-200 ${
                  selectedListing === listing.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="capitalize text-xl">
                        {listing.platform}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {parseFloat(listing.pricePerHour).toFixed(4)} MATIC/hour
                      </CardDescription>
                      <div className="p-2 rounded-lg bg-primary/10">
                        {listing.platform === 'netflix' && (
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H18v4.28h-1.25V7.38h-1.13V5.93m1.23 8.53v1.67c-.6.1-1.12.14-1.6.14-.5 0-.88-.04-1.15-.11-.28-.08-.48-.19-.6-.34-.12-.15-.18-.35-.18-.6v-3.7h-1.3V9.4h1.3V7.38h1.5v2.02h1.8v1.42h-1.8v3.4c0 .2.05.34.15.4.1.07.3.1.6.1.14 0 .3 0 .5-.04z" />
                          </svg>
                        )}
                        {listing.platform === 'spotify' && (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.3c-.21.3-.58.4-.88.2-2.4-1.47-5.44-1.8-9.01-.98-.35.1-.65-.2-.75-.5-.1-.36.2-.66.5-.76 3.88-.9 7.26-.52 9.91 1.12.3.15.4.55.23.85zm1.46-3.4c-.26.36-.73.46-1.08.25-2.75-1.69-6.93-2.18-10.17-1.19-.42.13-.8-.17-.93-.5-.15-.42.17-.8.5-.93 3.65-1.1 8.37-.6 11.48 1.37.36.2.47.68.26 1.04zm.13-3.64c-3.3-1.96-8.75-2.14-11.87-1.18-.5.15-1.03-.12-1.18-.6-.15-.5.12-1.03.6-1.18 3.65-1.1 9.6-.9 13.37 1.36.46.28.6.92.32 1.38-.28.46-.92.6-1.38.32z" />
                          </svg>
                        )}
                        {!['netflix', 'spotify'].includes(listing.platform) && '📺'}
                      </div>
                      <div>
                        <CardTitle className="capitalize">{listing.platform}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {listing.available ? 'Available' : 'Rented'}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {parseFloat(listing.pricePerHour).toFixed(4)} MATIC
                      <span className="text-sm font-normal text-muted-foreground">/hour</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Max duration: {listing.maxDurationHours} hours</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span>Pay only for time used</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span>Instant access after payment</span>
                    </div>
                  </div>
                  <div className="mt-auto space-y-2">
                    <Button 
                      className="w-full"
                      disabled={!listing.available || isBorrowing}
                      onClick={() => setSelectedListing(listing.id)}
                    >
                      {selectedListing === listing.id && isBorrowing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : 'Select Plan'}
                    </Button>
                    {!listing.available && (
                      <div className="text-center text-sm text-muted-foreground">
                        Currently in use
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-16 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No subscriptions found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm ? 'Try a different search term' : 'Check back later for new listings'}
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Transaction Details Modal */}
      {selectedListingData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Confirm Subscription</h3>
              <button 
                onClick={() => setSelectedListing(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium capitalize">{selectedListingData.platform}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{durationHours} hours</span>
                </div>
                <Slider
                  value={[durationHours]}
                  min={1}
                  max={Math.min(24, parseInt(selectedListingData.maxDurationHours))}
                  step={1}
                  onValueChange={([value]) => setDurationHours(value)}
                  className="py-4"
                />
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Cost:</span>
                  <span>{totalCost} MATIC</span>
                </div>
              </div>
              
              <Button 
                onClick={() => handleBorrow(selectedListingData)}
                disabled={isBorrowing}
                className="w-full mt-4"
              >
                {isBorrowing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : 'Confirm & Pay'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
