import { providers } from 'ethers';

declare module 'wagmi' {
  export function useAccount(): {
    address?: string;
    isConnected: boolean;
  };

  export function useProvider(): providers.Web3Provider;
  
  export function useSigner(): { data: providers.JsonRpcSigner | undefined };
  
  export function useNetwork(): {
    chain?: {
      id: number;
      name: string;
      testnet?: boolean;
    };
  };
}
