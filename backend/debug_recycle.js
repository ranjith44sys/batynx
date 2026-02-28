const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RECYCLER_KEY = process.env.RECYCLER_KEY;

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

async function test() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const recyclerWallet = new ethers.Wallet(RECYCLER_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, recyclerWallet);

    try {
        const tokenId = 0;
        const hash = "0x" + "b".repeat(64);
        console.log("Testing decommission...");
        // This might fail if already decommissioned, but we just want to see if it's a role error
        const tx = await contract.decommission(tokenId, hash);
        console.log("Success!");
    } catch (error) {
        console.log("Error:", error.reason || error.message);
    }
}

test();
