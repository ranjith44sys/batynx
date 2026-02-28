require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function check() {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    console.log(`Checking Token 0 on ${CONTRACT_ADDRESS}...`);
    try {
        const owner = await contract.ownerOf(0);
        console.log(`Owner of Token 0: ${owner}`);

        const count = await contract.getEventCount(0);
        console.log(`Event Count for Token 0: ${count}`);
    } catch (err) {
        console.error("Token 0 check failed:", err.message);
        if (err.data) console.error("Error Data:", err.data);
    }
}

check();
