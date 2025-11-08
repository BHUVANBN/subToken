'use client';

import { useState, useCallback } from 'react';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useLending } from '@/hooks/useLending';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2 } from 'lucide-react';

// Supported platforms
const PLATFORMS = [
  { id: 'netflix', name: 'Netflix', icon: '🎬' },
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'youtube-premium', name: 'YouTube Premium', icon: '▶️' },
  { id: 'disney-plus', name: 'Disney+', icon: '🏰' },
  { id: 'amazon-prime', name: 'Amazon Prime', icon: '📦' },
];

export default function LendPage() {
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { toast } = useToast();
  const { createListing, isLoading } = useLending();

  const [formData, setFormData] = useState({
    platform: '',
    username: '',
    password: '',
    pricePerHour: '0.01',
    maxHours: '24',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to continue',
        variant: 'destructive',
      });
      return;
    }

    if (chain?.id !== polygonMumbai.id) {
      try {
        await switchNetwork?.(polygonMumbai.id);
        toast({
          title: 'Switching Network',
          description: 'Please confirm the network switch in your wallet',
        });
      } catch (error) {
        toast({
          title: 'Network Switch Failed',
          description: 'Please switch to Polygon Mumbai Testnet to continue',
          variant: 'destructive',
        });
      }
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Validate form data
      if (!formData.platform) {
        throw new Error('Please select a platform');
      }
      if (!formData.username || !formData.password) {
        throw new Error('Please enter your credentials');
      }
      
      const price = parseFloat(formData.pricePerHour);
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price per hour');
      }
      
      const maxHours = parseInt(formData.maxHours);
      if (isNaN(maxHours) || maxHours < 1 || maxHours > 720) {
        throw new Error('Maximum rental duration must be between 1 and 720 hours');
      }
      
      await createListing({
        platform: formData.platform,
        username: formData.username,
        password: formData.password,
        pricePerHour: price.toString(),
        maxHours: maxHours.toString(),
      });
      
      // Show success message
      toast({
        title: 'Success!',
        description: 'Your subscription has been listed successfully!',
      });
      
      // Reset form on success
      setFormData({
        platform: '',
        username: '',
        password: '',
        pricePerHour: '0.01',
        maxHours: '24',
      });
      
    } catch (error: any) {
      console.error('Error listing subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to list subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isConnected, address, chain, switchNetwork, formData, createListing, toast]);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">List Your Subscription</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Share your subscription and earn passive income. We keep your credentials secure and private.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <CardDescription>
            Enter your subscription information. Your credentials are encrypted and never stored in plain text.
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
              <div className="flex flex-col items-center gap-4">
                {!isConnected ? (
                  <ConnectButton 
                    chainStatus="icon"
                    showBalance={false}
                    accountStatus="address"
                    label="Connect Wallet"
                    className="w-full"
                  />
                ) : chain?.id !== polygonMumbai.id ? (
                  <Button 
                    type="button" 
                    onClick={() => switchNetwork?.(polygonMumbai.id)}
                    className="w-full"
                    variant="outline"
                  >
                    Switch to Mumbai Testnet
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || isSubmitting}
                  >
                    {(isLoading || isSubmitting) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'List My Subscription'
                    )}
                  </Button>
                )}
                
                <p className="text-center text-sm text-muted-foreground">
                  By listing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <div className="grid gap-6">
          {[
            {
              title: 'List Your Subscription',
              description: 'Select your platform and enter your subscription details. Your credentials are encrypted for security.'
            },
            {
              title: 'Earn Passive Income',
              description: 'Earn MATIC tokens whenever someone rents your subscription. You set the price and maximum rental duration.'
            },
            {
              title: 'Stay in Control',
              description: 'Pause or remove your listing at any time. You have full control over your subscription.'
            }
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                {index + 1}
              </div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
