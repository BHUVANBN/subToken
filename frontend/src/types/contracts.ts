import { ContractInterface } from 'ethers';

declare module '@/abis/LendingEscrow' {
  const abi: ContractInterface;
  export default { abi };
}

declare module '@/abis/SubscriptionToken' {
  const abi: ContractInterface;
  export default { abi };
}
