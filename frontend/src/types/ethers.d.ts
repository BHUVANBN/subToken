import { ContractInterface } from 'ethers';

declare module '*.json' {
  const value: {
    abi: ContractInterface;
    [key: string]: any;
  };
  export default value;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
