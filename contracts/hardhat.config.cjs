require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("@nomicfoundation/hardhat-network-helpers");
require("@typechain/hardhat");
require('dotenv').config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

// Load environment variables
require('dotenv').config();

// API Keys and Secrets
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

// Network URLs
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`;
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`;

// Verify we have required environment variables
if (!PRIVATE_KEY) {
  console.warn("WARNING: No PRIVATE_KEY found in .env file. You won't be able to deploy to live networks.");
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  typechain: {
    outDir: "./typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
    externalArtifacts: [],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // Uncomment and update the following for mainnet forking if needed
      // forking: {
      //   url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      //   blockNumber: 14390000
      // },
      // accounts: {
      //   mnemonic: "test test test test test test test test test test test junk",
      //   accountsBalance: "10000000000000000000000" // 10000 ETH
      // }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      gas: 2100000,
      gasPrice: 8000000000,
    },
    polygon: {
      url: POLYGON_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 137,
      gas: 2100000,
      gasPrice: 8000000000,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "MATIC",
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer
      80001: 0, // similarly on mumbai it will take the first account as deployer
    },
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};

module.exports = config;
