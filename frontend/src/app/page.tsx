'use client';

import { ConnectButton } from '@/components/ConnectButton';
import { useAccount } from 'wagmi';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gradient">Tokenized Subscription</h1>
          <ConnectButton />
        </header>

        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect your wallet to get started</h2>
            <p className="text-gray-400 mb-8">Connect your wallet to manage your tokenized subscriptions</p>
            <ConnectButton />
          </div>
        ) : (
          <Dashboard />
        )}
      </div>
    </main>
  );
}
