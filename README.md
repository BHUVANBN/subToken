# Tokenized Subscription Browser Extension

A browser extension that enables tokenized, time-limited sharing/rental of digital subscriptions without exposing account credentials.

## Project Structure

- `/extension` - Browser extension (React + TypeScript)
- `/backend` - Node.js/FastAPI backend service
- `/contracts` - Smart contracts (Solidity)
- `/ai-services` - AI/ML services for pricing and matching
- `/proxy-service` - Proxy service for secure session handling
- `/scripts` - Utility scripts
- `/ipfs` - IPFS configuration and utilities

## Development Setup

1. Clone the repository
2. Follow setup instructions in each directory's README
3. Start development servers

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=development
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_private_key
```

## Development Workflow

1. Smart Contract Development
   - Write and test contracts in `/contracts`
   - Deploy to testnet

2. Backend Development
   - Set up API endpoints
   - Implement business logic
   - Connect to blockchain

3. Extension Development
   - Build UI components
   - Connect wallet
   - Interact with contracts and backend

4. AI Services
   - Implement pricing models
   - Set up matching algorithms

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

MIT
