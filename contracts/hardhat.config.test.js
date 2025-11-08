import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomicfoundation/hardhat-network-helpers";

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
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // Enable this if you want to fork mainnet for testing
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY`,
      //   blockNumber: 14390000
      // }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    token: "ETH",
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};

export default config;
