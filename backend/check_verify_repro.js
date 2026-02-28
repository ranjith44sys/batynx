require("dotenv").config();
const { getReportPath, getTokenId, loadReport } = require("./src/services/storage.service");
const { hashFile } = require("./src/services/hash.service");
const { readLifecycleEvent, getEventCount } = require("./src/services/blockchain.service");
const { ethers } = require("ethers");

async function check() {
    const batteryId = "BAT-003";
    console.log(`Checking ${batteryId}...`);

    try {
        const reportPath = await getReportPath(batteryId);
        console.log(`Report Path: ${reportPath}`);

        const computedHash = hashFile(reportPath);
        console.log(`Computed Hash: ${computedHash}`);

        const tId = await getTokenId(batteryId);
        console.log(`Token ID from storage: ${tId}`);

        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            ["function nextTokenId() view returns (uint256)"],
            provider
        );
        const nextId = await contract.nextTokenId();
        console.log(`Next Token ID on Contract: ${nextId}`);

        if (tId === null) {
            console.log("Error: Token ID is null in storage");
            return;
        }

        if (BigInt(tId) >= nextId) {
            console.log(`Error: Token ID ${tId} has not been minted yet (Next is ${nextId}). Blockchain state is likely reset.`);
            return;
        }

        const count = await getEventCount(tId);
        console.log(`Event Count for Token ${tId}: ${count}`);

        if (count == 0) {
            console.log("Error: Event count is 0");
            return;
        }

        const event = await readLifecycleEvent(tId, 0);
        const onChainHash = event.dataHash;
        console.log(`On-Chain Hash: ${onChainHash}`);

        const report = await loadReport(batteryId);
        console.log(`Report loaded: ${!!report}`);

        console.log(`Integrity Match: ${computedHash === onChainHash}`);
    } catch (err) {
        console.error("Caught Error:", err);
    }
}

check();
