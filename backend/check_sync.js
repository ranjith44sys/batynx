const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const STORAGE_DIR = path.join(__dirname, "storage");

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

async function check(batteryId) {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    console.log(`--- Checking Status for ${batteryId} ---`);

    // 1. Check local storage
    const tokenPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
    if (fs.existsSync(tokenPath)) {
        const tokenId = fs.readFileSync(tokenPath, "utf-8").trim();
        console.log(`Local Storage Token ID: ${tokenId}`);

        // 2. Check blockchain
        try {
            const owner = await contract.ownerOf(tokenId);
            console.log(`Blockchain: Token ${tokenId} EXISTS. Owner: ${owner}`);

            const eventCount = await contract.getEventCount(tokenId);
            console.log(`Blockchain: Event Count: ${eventCount}`);

            // Check roles
            const RECYCLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECYCLER_ROLE"));
            const RECYCLER_ADDRESS = new ethers.Wallet(process.env.RECYCLER_KEY).address;
            const hasRecyclerRole = await contract.hasRole(RECYCLER_ROLE, RECYCLER_ADDRESS);
            console.log(`Role Check: Recycler (${RECYCLER_ADDRESS}) has role: ${hasRecyclerRole}`);

        } catch (e) {
            console.log(`Blockchain: Token ${tokenId} does NOT exist (reverted).`);
        }
    } else {
        console.log("Local Storage: No token ID found for this battery.");
    }
}

const id = process.argv[2] || "BAT-TEST-001";
check(id);
