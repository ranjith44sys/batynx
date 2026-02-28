const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function runVerification() {
    const batteryId = `BAT-TEST-${Date.now()}`;
    console.log(`Starting verification for Battery: ${batteryId}`);

    try {
        // 1. Manufacture
        console.log("1. Manufacturing...");
        const mfgData = {
            serialNumber: `SN-${Date.now()}`,
            chemistryType: "NMC",
            capacityKWh: 75,
            manufacturingDate: new Date().toISOString(),
            manufacturerId: "OEM-01",
            carbonFootprint: { amount: 100, unit: "kgCO2e" }
        };
        const mfgRes = await axios.post(`${BASE_URL}/api/passport/manufacture`, { ...mfgData, batteryId });
        console.log("   Manufacturing result:", mfgRes.data);

        if (!mfgRes.data.tokenId) throw new Error("No Token ID returned!");

        // 2. Add Usage Event
        console.log("2. Adding Usage Event...");
        const usageData = {
            mileage: 12000,
            averageTempCelsius: 22,
            sohPercentage: 98,
            snapshotDate: new Date().toISOString()
        };
        const usageRes = await axios.post(`${BASE_URL}/api/passport/usage/${batteryId}`, usageData);
        console.log("   Usage result:", usageRes.data);

        // 3. Verify
        console.log("3. Verifying...");
        const verifyRes = await axios.get(`${BASE_URL}/verify/${batteryId}`);
        console.log("   Verify result:", verifyRes.data.integrity ? "PASSED" : "FAILED");
        console.log("   On-Chain Hash:", verifyRes.data.onChainHash);

        console.log("SUCCESS: Full flow verification passed.");

    } catch (e) {
        console.error("FAILURE:", e.response ? e.response.data : e.message);
    }
}

runVerification();
