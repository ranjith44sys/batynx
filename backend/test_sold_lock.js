const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

async function testSoldLock() {
    const batteryId = 'BAT-LOCK-TEST';
    const storageDir = path.resolve(__dirname, 'storage');
    const filePath = path.join(storageDir, `${batteryId}.json`);
    const mappingPath = path.join(storageDir, `${batteryId}.tokenid`);

    console.log(`--- Testing 'Sold' Lock for ${batteryId} ---`);

    // 1. Setup mock battery in 'Sold' state
    const mockData = {
        batteryId,
        serialNumber: "SN-LOCK-999",
        isSold: true,
        lifecycleState: "SecondLife"
    };

    await fs.ensureDir(storageDir);
    await fs.outputJson(filePath, mockData);
    await fs.outputFile(mappingPath, "0"); // Map to Token 0 for test

    console.log("Mock battery created with isSold: true");

    // 2. Attempt Transfer via API
    try {
        console.log("Attempting transfer for sold battery...");
        const response = await axios.post(`http://localhost:4000/api/passport/transfer/${batteryId}`, {
            transferDate: new Date().toISOString(),
            fromOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            toOwner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            updatedSOH: 95,
            sellerSignature: "MOCK_SELLER_SIG",
            buyerSignature: "MOCK_BUYER_SIG"
        });
        console.log("FAIL: Transfer allowed! (Status:", response.status, ")");
    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.log("SUCCESS: Transfer BLOCKED with 403 Forbidden.");
            console.log("Error message:", error.response.data.error);
        } else {
            console.log("FAILED with unexpected error:", error.message);
        }
    }

    // 3. Cleanup
    await fs.remove(filePath);
    await fs.remove(mappingPath);
}

testSoldLock();
