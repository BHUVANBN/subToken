import { createWeb3Modal, defaultConfig } from '@web3modal/ethers'
import { polygonMumbai } from 'viem/chains'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID' // Replace with your WalletConnect project ID

// 2. Define chains
const mumbai = {
  chainId: polygonMumbai.id,
  name: polygonMumbai.name,
  currency: 'MATIC',
  explorerUrl: polygonMumbai.blockExplorers?.default?.url || 'https://mumbai.polygonscan.com',
  rpcUrl: polygonMumbai.rpcUrls.default.http[0]
}

// 3. Create modal config
const metadata = {
  name: 'SubToken',
  description: 'Tokenized Subscription Platform',
  url: 'https://subtoken.xyz',
  icons: ['https://subtoken.xyz/logo.png']
}

// 4. Create Web3Modal instance
export const web3modal = createWeb3Modal({
  ethersConfig: defaultConfig({ 
    metadata,
    defaultChainId: mumbai.chainId,
    rpcUrl: mumbai.rpcUrl,
  }),
  chains: [mumbai],
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#00BB7F',
    '--w3m-color-mix-strength': 20,
    '--w3m-font-family': 'Inter, sans-serif',
    '--w3m-accent': '#00BB7F',
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // Metamask
    '4622a2b2d6af1c98449242940eaf5ea73268f96bf0dba9a4463b8d1105b634e1', // Coinbase Wallet
    'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac02', // Trust Wallet
  ]
})
