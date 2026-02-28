const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const OEM_KEY = process.env.OEM_KEY;
const SERVICE_KEY = process.env.SERVICE_KEY;
const RECYCLER_KEY = process.env.RECYCLER_KEY;

const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);
const { abi } = require(artifactPath);

async function checkAndGrant() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const oemWallet = new ethers.Wallet(OEM_KEY, provider);
    const serviceWallet = new ethers.Wallet(SERVICE_KEY, provider);
    const recyclerWallet = new ethers.Wallet(RECYCLER_KEY, provider);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, oemWallet);

    const SERVICE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SERVICE_PROVIDER_ROLE"));
    const RECYCLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECYCLER_ROLE"));

    const hasService = await contract.hasRole(SERVICE_ROLE, serviceWallet.address);
    if (!hasService) {
        console.log("Granting Service Role...");
        const tx = await contract.grantRole(SERVICE_ROLE, serviceWallet.address);
        await tx.wait();
        console.log("Service Role Granted.");
    } else {
        console.log("Service Role already granted.");
    }

    const hasRecycler = await contract.hasRole(RECYCLER_ROLE, recyclerWallet.address);
    if (!hasRecycler) {
        console.log("Granting Recycler Role...");
        const tx = await contract.grantRole(RECYCLER_ROLE, recyclerWallet.address);
        await tx.wait();
        console.log("Recycler Role Granted.");
    } else {
        console.log("Recycler Role already granted.");
    }

    console.log("Done.");
}

checkAndGrant();
