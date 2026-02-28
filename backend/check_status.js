const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config();

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function test() {
    console.log(`Checking Tokens at: ${CONTRACT_ADDRESS}`);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    const accounts = {
        OEM: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        OWNER: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
    };

    for (let i = 0; i < 6; i++) {
        try {
            const owner = await contract.ownerOf(i);
            const statusInt = await contract.getBatteryStatus(i);
            const statuses = ["Active", "SecondLife", "Recycled", "Disposed"];

            let ownerLabel = "Other";
            if (owner.toLowerCase() === accounts.OEM.toLowerCase()) ownerLabel = "OEM";
            if (owner.toLowerCase() === accounts.OWNER.toLowerCase()) ownerLabel = "OWNER";

            console.log(`Token ${i}:`);
            console.log(`  Owner: ${owner} (${ownerLabel})`);
            console.log(`  Status: ${statuses[statusInt]} (${statusInt})`);
        } catch (e) {
            console.log(`Token ${i}: Does not exist`);
        }
    }
}

test().catch(console.error);
