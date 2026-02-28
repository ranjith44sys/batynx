const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

/**
 * Script to grant all roles to Account #0 on the local Hardhat node.
 * Run this if you see AccessControlUnauthorizedAccount errors.
 */
async function fixRoles() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    if (!CONTRACT_ADDRESS) {
        console.error("Set CONTRACT_ADDRESS in your .env first.");
        return;
    }

    // Role Hashes
    const MANUFACTURER_ROLE = ethers.id("MANUFACTURER_ROLE");
    const SERVICE_PROVIDER_ROLE = ethers.id("SERVICE_PROVIDER_ROLE");
    const RECYCLER_ROLE = ethers.id("RECYCLER_ROLE");

    // We assume Account #0 (hardhat) is either the admin or we try to use it to grant to itself
    const hhKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(hhKey, provider);

    const abi = [
        "function grantRole(bytes32 role, address account) external",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)"
    ];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log(`--- Fixing Roles for ${wallet.address} ---`);
    console.log(`Contract: ${CONTRACT_ADDRESS}`);

    const roles = [
        { name: "MANUFACTURER", hash: MANUFACTURER_ROLE },
        { name: "SERVICE_PROVIDER", hash: SERVICE_PROVIDER_ROLE },
        { name: "RECYCLER", hash: RECYCLER_ROLE }
    ];

    for (const role of roles) {
        try {
            const has = await contract.hasRole(role.hash, wallet.address);
            if (!has) {
                console.log(`Granting ${role.name}...`);
                const tx = await contract.grantRole(role.hash, wallet.address);
                await tx.wait();
                console.log(`Done.`);
            } else {
                console.log(`${role.name} already granted.`);
            }
        } catch (e) {
            console.error(`Failed to grant ${role.name}: Account #0 might not be the Admin on this contract.`);
            console.error(`If you redeployed, make sure .env CONTRACT_ADDRESS is updated.`);
        }
    }
}

fixRoles();
