# Deploy to Testnet Workflow

This workflow guides you through deploying the smart contracts to a testnet (e.g., Polygon Amoy) and configuring the project.

## 1. Prerequisites
- [ ] A wallet with some testnet tokens (e.g., MATIC for Amoy). You can get them from a faucet.
- [ ] Your wallet private key.

## 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:
```env
# Network Configuration
RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_here

# Backend Service Keys (Can be the same as PRIVATE_KEY for testing)
OEM_KEY=your_private_key_here
SERVICE_KEY=your_private_key_here
RECYCLER_KEY=your_private_key_here
OWNER_KEY=your_private_key_here

# Contract Configuration (Will be filled after deployment)
CONTRACT_ADDRESS=
```

## 3. Deployment Steps
// turbo
1. Run the deployment script to the testnet:
```powershell
npx hardhat run scripts/deploy.js --network amoy
```

2. Copy the deployed contract address and update your `.env` file:
```env
CONTRACT_ADDRESS=0x...your_new_contract_address...
```

## 4. Update Frontend
The frontend uses the contract address from `battery-frontend/app/context/WalletContext.tsx`.
Make sure `NEXT_PUBLIC_CONTRACT_ADDRESS` is also set in the environment or the file is updated.

## 5. Restart Services
Restart the backend server to apply the new environment variables and contract address.
