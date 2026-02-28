const { ethers } = require("ethers");
require("dotenv").config();
const path = require("path");

const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json");
const { abi } = require(artifactPath);

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.OEM_KEY, provider); // Hardhat #0
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

async function checkRoles() {
    console.log("Contract Address:", process.env.CONTRACT_ADDRESS);
    console.log("Checking roles for address:", wallet.address);

    const MANUFACTURER_ROLE = ethers.id("MANUFACTURER_ROLE");
    const SERVICE_PROVIDER_ROLE = ethers.id("SERVICE_PROVIDER_ROLE");
    const RECYCLER_ROLE = ethers.id("RECYCLER_ROLE");
    const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const hasMan = await contract.hasRole(MANUFACTURER_ROLE, wallet.address);
    const hasSrv = await contract.hasRole(SERVICE_PROVIDER_ROLE, wallet.address);
    const hasRec = await contract.hasRole(RECYCLER_ROLE, wallet.address);
    const hasAdm = await contract.hasRole(ADMIN_ROLE, wallet.address);

    console.log("Has MANUFACTURER_ROLE:", hasMan);
    console.log("Has SERVICE_PROVIDER_ROLE:", hasSrv);
    console.log("Has RECYCLER_ROLE:", hasRec);
    console.log("Has DEFAULT_ADMIN_ROLE:", hasAdm);

    if (!hasMan || !hasSrv || !hasRec) {
        console.log("Roles missing. Attempting to grant them...");
        try {
            if (!hasMan) await (await contract.grantRole(MANUFACTURER_ROLE, wallet.address)).wait();
            if (!hasSrv) await (await contract.grantRole(SERVICE_PROVIDER_ROLE, wallet.address)).wait();
            if (!hasRec) await (await contract.grantRole(RECYCLER_ROLE, wallet.address)).wait();
            console.log("Roles granted successfully!");
        } catch (e) {
            console.error("Failed to grant roles. Are you the admin?", e.message);
        }
    } else {
        console.log("All roles are already correctly assigned.");
    }
}

checkRoles();
