const { ethers } = require("ethers");

async function check() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const address = "0x9A676e781A523b5d0C0e43731313A708CB607508";
    try {
        const code = await provider.getCode(address);
        console.log(`Code at ${address}: ${code === '0x' ? 'EMPTY' : 'FOUND (' + code.length + ' bytes)'}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
