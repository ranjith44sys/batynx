const axios = require("axios");

async function testAI() {
    try {
        console.log("Testing AI Analysis Route...");
        const res = await axios.post("http://localhost:4000/api/ai/analyze", {
            batteryId: "TEST-BAT",
            vAvg: 3.8,
            vMin: 3.4,
            vMax: 4.1,
            iAvg: 0.6,
            tAvg: 28,
            tMin: 22,
            tMax: 38
        });

        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("Test Failed:", error.response ? error.response.data : error.message);
    }
}

testAI();
