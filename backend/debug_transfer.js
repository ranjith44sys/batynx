const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const OEM_KEY = process.env.OEM_KEY;

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const oemWallet = new ethers.Wallet(OEM_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, oemWallet);

async function test() {
    console.log("Testing Transfer with Contract:", CONTRACT_ADDRESS);
    console.log("OEM Wallet Address:", oemWallet.address);

    try {
        const tokenId = 0; // BAT-003 is 0
        const eventType = "TRANSFER";
        const hash = "0x" + "c".repeat(64);

        console.log("Attempting addEvent (TRANSFER) with OEM role...");
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
