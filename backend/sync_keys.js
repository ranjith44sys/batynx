const { ethers } = require("ethers");
const fs = require("fs-extra");
const path = require("path");

/**
 * Utility to sync local .env with Hardhat's default Account #0.
 * This ensures the backend has the necessary permissions for all roles
 * and owns the funds for transactions on the local node.
 */
async function sync() {
    const ENV_PATH = path.resolve(__dirname, "../.env");
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    // Hardhat Account #0 (Standard across all installations)
    const hardhatKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    try {
        const wallet = new ethers.Wallet(hardhatKey, provider);
        const balance = await provider.getBalance(wallet.address);

        console.log("--- Local Blockchain Sync ---");
        console.log(`Node: http://127.0.0.1:8545`);
        console.log(`Target Account: ${wallet.address}`);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (!await fs.pathExists(ENV_PATH)) {
            console.error("Error: .env file not found in root.");
            return;
        }

        let envContent = await fs.readFile(ENV_PATH, "utf-8");

        // Update all role keys to the Master Hardhat Key for local dev
        envContent = envContent.replace(/PRIVATE_KEY=.*/, `PRIVATE_KEY=${hardhatKey}`);
        envContent = envContent.replace(/OEM_KEY=.*/, `OEM_KEY=${hardhatKey}`);
        envContent = envContent.replace(/SERVICE_KEY=.*/, `SERVICE_KEY=${hardhatKey}`);
        envContent = envContent.replace(/RECYCLER_KEY=.*/, `RECYCLER_KEY=${hardhatKey}`);
        envContent = envContent.replace(/OWNER_KEY=.*/, `OWNER_KEY=${hardhatKey}`);

        await fs.writeFile(ENV_PATH, envContent);

        console.log("----------------------------");
        console.log("SUCCESS: .env updated with Hardhat Account #0 keys.");
        console.log("This account has Manufacturer, Service, and Recycler roles by default.");
        console.log("IMPORTANT: Restart your backend (npm start) now.");
    } catch (e) {
        console.error("FAILED: Ensure Hardhat node is running (npx hardhat node).");
        console.error("Error details:", e.message);
    }
}

sync();
