const { ethers } = require("ethers");
require("dotenv").config();

// Contract Artifact
const path = require("path");
const artifactPath = path.resolve(__dirname, "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json");
const { abi } = require(artifactPath);

async function debugMint() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const wallet = new ethers.Wallet(process.env.OEM_KEY, provider);
    const address = process.env.CONTRACT_ADDRESS;

    console.log("--- DEBUG SESSION ---");
    console.log("Contract Address:", address);
    console.log("Signer Address:", wallet.address);

    const contract = new ethers.Contract(address, abi, wallet);

    try {
        // 1. Check Role
        const MANUFACTURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"));
        const hasRole = await contract.hasRole(MANUFACTURER_ROLE, wallet.address);
        console.log("Has MANUFACTURER_ROLE:", hasRole);

        if (!hasRole) {
            console.log("FAILED: Signer does not have permission to mint.");
            return;
        }

        // 2. Try Minting
        console.log("Attempting test mint...");
        const tx = await contract.mint(wallet.address, "test-hash-" + Date.now());
        console.log("Transaction Hash:", tx.hash);

        const receipt = await tx.wait();
        console.log("Receipt Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("Logs Count:", receipt.logs.length);

        for (let i = 0; i < receipt.logs.length; i++) {
            try {
                const parsed = contract.interface.parseLog(receipt.logs[i]);
                console.log(`Log ${i}: ${parsed.name}`);
            } catch (e) {
                console.log(`Log ${i}: (Could not parse)`);
            }
        }

        if (receipt.logs.length === 0) {
            console.log("\nALERT: Transaction succeeded but NO logs were generated.");
            console.log("This often happens if you are interacting with the WRONG contract address (or an EOA).");
        }

    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
    }
}

debugMint();
