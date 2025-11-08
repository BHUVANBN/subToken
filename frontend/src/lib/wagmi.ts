import { createConfig, http } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
export const config = createConfig({
  chains: [polygonMumbai],
  transports: {
    [polygonMumbai.id]: http(),
  },
});

export const publicClient = config.publicClient;
