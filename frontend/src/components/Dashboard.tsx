'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { CreateTokenForm } from './CreateTokenForm';
import { TokenList } from './TokenList';
import { LendingDashboard } from './LendingDashboard';

export function Dashboard() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'tokens' | 'lend' | 'borrow'>('tokens');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Welcome back, <span className="text-indigo-400">{address?.substring(0, 6)}...{address?.substring(38)}</span>
        </h2>
      </div>

      <div className="bg-gray-800 rounded-xl p-1 w-full max-w-2xl">
        <nav className="flex space-x-1">
          {[
            { id: 'tokens', label: 'My Tokens' },
            { id: 'lend', label: 'Lend' },
            { id: 'borrow', label: 'Borrow' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">My Subscription Tokens</h3>
              <CreateTokenForm />
            </div>
            <TokenList />
          </div>
        )}

        {activeTab === 'lend' && <LendingDashboard mode="lend" />}
        {activeTab === 'borrow' && <LendingDashboard mode="borrow" />}
      </div>
    </div>
  );
}
