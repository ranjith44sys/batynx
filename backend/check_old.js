const { ethers } = require("ethers");
const path = require("path");

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // OLD ADDRESS

async function test() {
    console.log(`Checking Status at OLD Address: ${contractAddress}`);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const tokenId = 1;

    try {
        const owner = await contract.ownerOf(tokenId);
        console.log(`Token ${tokenId} owner: ${owner}`);
        const status = await contract.getBatteryStatus(tokenId);
        console.log(`Token ${tokenId} status: ${status}`);
    } catch (e) {
        console.log(`Token ${tokenId} does NOT exist on old contract: ${e.message}`);
    }
}

test().catch(console.error);
