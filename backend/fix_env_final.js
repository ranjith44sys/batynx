const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function fixEnv() {
    const rootPath = path.resolve(__dirname, '..', '.env');
    const backendPath = path.resolve(__dirname, '.env');
    const latestAddrPath = path.resolve(__dirname, '..', 'latest_address.txt');

    let latestAddr = '';
    if (fs.existsSync(latestAddrPath)) {
        latestAddr = fs.readFileSync(latestAddrPath, 'utf8').trim();
    } else {
        console.error("latest_address.txt not found. Please redeploy.");
        return;
    }

    // Normalize address
    try {
        latestAddr = ethers.getAddress(latestAddr.toLowerCase());
    } catch (e) {
        console.error(`Invalid address in latest_address.txt: ${latestAddr}`);
        return;
    }

    const localhostRpc = "http://127.0.0.1:8545";

    const fixFile = (filePath) => {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf8');

        // Update RPC URLs
        content = content.replace(/RPC_URL=.*/g, `RPC_URL=${localhostRpc}`);
        content = content.replace(/NEXT_PUBLIC_RPC_URL=.*/g, `NEXT_PUBLIC_RPC_URL=${localhostRpc}`);

        // Update Addresses
        content = content.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${latestAddr}`);
        content = content.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/g, `NEXT_PUBLIC_CONTRACT_ADDRESS=${latestAddr}`);

        // Clean up headers
        content = content.replace(/# Sepolia Testnet Configuration/g, "# Local Development Configuration");
        content = content.replace(/# Wallet with.*Sepolia ETH/g, "# Local Hardhat Account #0");

        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    };

    fixFile(rootPath);
    fixFile(backendPath);
}

fixEnv();
