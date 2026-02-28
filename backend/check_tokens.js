const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

async function check() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    try {
        console.log("Checking contract:", CONTRACT_ADDRESS);

        // Check if we can get owner of 0 and 1
        for (let i = 0; i < 3; i++) {
            try {
                const owner = await contract.ownerOf(i);
                console.log(`Token ${i} exists. Owner: ${owner}`);
            } catch (e) {
                console.log(`Token ${i} does not exist.`);
            }
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

check();
