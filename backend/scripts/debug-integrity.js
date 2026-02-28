const { ethers } = require("ethers");
const fs = require("fs-extra");
const path = require("path");
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Try loading from current and parent
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
console.log("CONTRACT_ADDRESS from env:", CONTRACT_ADDRESS);

const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json");
const { abi } = fs.readJsonSync(artifactPath);

async function debug() {
    const batteryId = "BAT-001";
    const STORAGE_DIR = path.resolve(__dirname, "../storage");

    // Get Token ID
    const mappingPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
    if (!fs.existsSync(mappingPath)) {
        console.log("No token ID found for", batteryId);
        return;
    }
    const tId = fs.readFileSync(mappingPath, "utf-8").trim();
    console.log(`Checking Token ID: ${tId}`);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const count = await contract.getEventCount(tId);
    console.log(`Event count: ${count}`);

    for (let i = 0; i < count; i++) {
        const evt = await contract.getLifecycleEvent(tId, i);
        const onChainHash = evt.dataHash;
        console.log(`\n--- Event ${i} ---`);
        console.log(`On-chain Hash: ${onChainHash}`);

        const filePath = path.join(STORAGE_DIR, `${onChainHash}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`Local file NOT FOUND: ${filePath}`);
            continue;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(content);

        // Re-hash using the exact algorithm from StorageService
        const rehashedString = JSON.stringify(json, null, 2);
        const buffer = Buffer.from(rehashedString);
        const localHash = ethers.keccak256(buffer);

        console.log(`Local Hash (re-calculated): ${localHash}`);
        if (localHash === onChainHash) {
            console.log("✅ MATCH - This event is verified.");
        } else {
            console.log("❌ MISMATCH - Tamper detected!");
            console.log("Modified file content snippet:", content.substring(0, 100));
        }
    }
}

debug().catch(console.error);
