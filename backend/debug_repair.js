const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const SERVICE_KEY = process.env.SERVICE_KEY;

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const serviceWallet = new ethers.Wallet(SERVICE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, serviceWallet);

async function test() {
    console.log("Testing with Contract:", CONTRACT_ADDRESS);
    console.log("Service Wallet Address:", serviceWallet.address);

    try {
        const tokenId = 0; // BAT-003 is 0
        const eventType = "MAINTENANCE";
        const hash = "0x" + "a".repeat(64);

        console.log("Attempting addEvent...");
        const tx = await contract.addEvent(tokenId, eventType, hash);
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Transaction success!");
    } catch (error) {
        console.error("FAILED!");
        console.error("Message:", error.message);
        if (error.data) console.error("Data:", error.data);
        if (error.reason) console.error("Reason:", error.reason);
    }
}

test();
