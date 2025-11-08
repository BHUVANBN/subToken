'use client';

import { useState } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { SubscriptionToken__factory } from '../contracts/typechain-types';

interface CreateTokenFormProps {
  onSuccess?: () => void;
}

export function CreateTokenForm({ onSuccess }: CreateTokenFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: '',
    timeUnit: 86400, // 1 day in seconds
    expiryDate: '',
    totalSupply: '',
  });

  const { address } = useAccount();
  const { data: signer } = useSigner();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert form data to appropriate types
      const timeUnit = Number(formData.timeUnit);
      const expiryTimestamp = Math.floor(new Date(formData.expiryDate).getTime() / 1000);
      const totalSupply = ethers.utils.parseEther(formData.totalSupply);

      // TODO: Deploy or interact with the SubscriptionToken contract
      // This is a placeholder - you'll need to replace it with your actual contract interaction
      const tokenContract = SubscriptionToken__factory.connect(
        '0xYourTokenContractAddress',
        signer
      );

      const tx = await tokenContract.createToken(
        formData.serviceId,
        timeUnit,
        expiryTimestamp,
        totalSupply
      );

      await tx.wait();
      
      toast.success('Token created successfully!');
      setFormData({
        serviceId: '',
        timeUnit: 86400,
        expiryDate: '',
        totalSupply: '',
      });
      
      if (onSuccess) onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error?.message || 'Failed to create token');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        Create New Token
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Create Subscription Token</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="serviceId" className="block text-sm font-medium text-gray-300 mb-1">
              Service ID
            </label>
            <input
              id="serviceId"
              type="text"
              value={formData.serviceId}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
              className="input-field"
              placeholder="e.g., NETFLIX_PREMIUM"
              required
            />
          </div>

          <div>
            <label htmlFor="timeUnit" className="block text-sm font-medium text-gray-300 mb-1">
              Time Unit (seconds)
            </label>
            <select
              id="timeUnit"
              value={formData.timeUnit}
              onChange={(e) => setFormData({ ...formData, timeUnit: Number(e.target.value) })}
              className="input-field"
              required
            >
              <option value={3600}>1 Hour</option>
              <option value={86400}>1 Day</option>
              <option value={604800}>1 Week</option>
              <option value={2592000}>1 Month (30 days)</option>
            </select>
          </div>

          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-300 mb-1">
              Expiry Date
            </label>
            <input
              id="expiryDate"
              type="datetime-local"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="totalSupply" className="block text-sm font-medium text-gray-300 mb-1">
              Total Supply
            </label>
            <input
              id="totalSupply"
              type="number"
              step="0.000000000000000001"
              min="0"
              value={formData.totalSupply}
              onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              className="input-field"
              placeholder="1.0"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Token'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
