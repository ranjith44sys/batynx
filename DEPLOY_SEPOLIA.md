# 🚀 Deploying to Ethereum Sepolia Testnet

Follow these steps to deploy your Battery Passport system to the Ethereum Sepolia testnet.

## 1. Prerequisites
- **Sepolia ETH**: Ensure your wallet has testnet ETH. You can get it from:
  - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
  - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- **RPC URL**: Get a Sepolia RPC URL from a provider like [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/).

## 2. Setup Environment Variables
Create a file named `.env` in the root directory (copy from `.env.example`) and fill in your details:

```env
# Sepolia Configuration
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_metamask_private_key

# Backend Service Keys (Use your private key for all for testing)
OEM_KEY=your_metamask_private_key
SERVICE_KEY=your_metamask_private_key
RECYCLER_KEY=your_metamask_private_key
OWNER_KEY=your_metamask_private_key

# Contract Configuration (Leave empty initially)
CONTRACT_ADDRESS=
NEXT_PUBLIC_CONTRACT_ADDRESS=
```

## 3. Deployment
Run the following command in your terminal to deploy the smart contract:

```powershell
npx hardhat run scripts/deploy.js --network sepolia
```

**Note**: If deployment fails with a timeout, ensure your RPC URL is stable and you have enough Sepolia ETH for gas.

## 4. Finalizing Configuration
Once deployed, the terminal will log: `BatteryPassport deployed to: 0x...`

1. Copy this address.
2. Update your `.env` file:
   ```env
   CONTRACT_ADDRESS=0x_deployed_address_here
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x_deployed_address_here
   ```
3. Restart your Backend and Frontend servers.

## 5. Verify on Etherscan (Optional)
You can view your contract and transactions on [Sepolia Etherscan](https://sepolia.etherscan.io/) by searching for your contract address.
