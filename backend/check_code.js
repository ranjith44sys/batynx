const { ethers } = require("ethers");
require("dotenv").config();

async function check() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const address = process.env.CONTRACT_ADDRESS;
    console.log("Checking address:", address);

    const code = await provider.getCode(address);
    if (code === "0x") {
        console.log("FAILED: No contract code found at this address. You need to redeploy the contract.");
    } else {
        console.log("SUCCESS: Contract code found. Bytes:", code.length);
    }
}

check().catch(console.error);
