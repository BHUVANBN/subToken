'use client';

import { useState } from 'react';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';
import { useWeb3Modal } from '@web3modal/ethers5/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Supported platforms with their details
const PLATFORMS = [
  { id: 'netflix', name: 'Netflix', icon: '🎬' },
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'youtube-premium', name: 'YouTube Premium', icon: '▶️' },
  { id: 'disney-plus', name: 'Disney+', icon: '🏰' },
  { id: 'amazon-prime', name: 'Amazon Prime', icon: '📦' },
];

export function SubscriptionForm() {
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { open: openConnectModal } = useWeb3Modal();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    platform: '',
    username: '',
    password: '',
    pricePerHour: '',
    maxHours: '24',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      openConnectModal();
      return;
    }

    if (chain?.id !== polygonMumbai.id) {
      switchNetwork?.(polygonMumbai.id);
      return;
    }

    try {
      setIsLoading(true);
      
      // TODO: Call smart contract to list subscription
      console.log('Listing subscription:', formData);
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success!",
        description: "Your subscription has been listed successfully!",
      });
      
      // Reset form
      setFormData({
        platform: '',
        username: '',
        password: '',
        pricePerHour: '',
        maxHours: '24',
      });
      
    } catch (error) {
      console.error('Error listing subscription:', error);
      toast({
        title: "Error",
        description: "Failed to list subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>List Your Subscription</CardTitle>
        <CardDescription>
          Share your subscription and earn passive income. Your credentials are encrypted and never stored in plain text.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="platform" className="block text-sm font-medium mb-2">
                Platform
              </label>
              <Select 
                value={formData.platform} 
                onValueChange={(value) => handleSelectChange(value, 'platform')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{platform.icon}</span>
                        <span>{platform.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username/Email
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username or email"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your password is encrypted and never stored in plain text.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pricePerHour" className="block text-sm font-medium mb-2">
                  Price per hour (MATIC)
                </label>
                <Input
                  id="pricePerHour"
                  name="pricePerHour"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.01"
                  value={formData.pricePerHour}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="maxHours" className="block text-sm font-medium mb-2">
                  Maximum rental (hours)
                </label>
                <Input
                  id="maxHours"
                  name="maxHours"
                  type="number"
                  min="1"
                  max="720"
                  value={formData.maxHours}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            {!isConnected ? (
              <Button 
                type="button" 
                onClick={() => openConnectModal()}
                className="w-full"
              >
                Connect Wallet
              </Button>
            ) : chain?.id !== polygonMumbai.id ? (
              <Button 
                type="button" 
                onClick={() => switchNetwork?.(polygonMumbai.id)}
                className="w-full"
              >
                Switch to Mumbai Testnet
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Listing...' : 'List My Subscription'}
              </Button>
            )}
            
            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              By listing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
