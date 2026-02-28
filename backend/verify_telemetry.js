const http = require('http');

const post = (path, data) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'localhost',
        port: 4000,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
});

const get = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:4000${path}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
});

async function verify() {
    const batteryId = 'VERIFY-' + Date.now();
    console.log('--- Phase 1: Manufacture Logging ---');
    const mfgData = {
        batteryId,
        serialNumber: "SN-LOG",
        chemistryType: "LFP",
        capacityKWh: 80,
        manufacturingDate: new Date().toISOString(),
        manufacturerId: "MFG-1",
        carbonFootprint: { amount: 50, unit: "kgCO2e" },
        ownerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        telemetry: { vAvg: 3.7, vMin: 3.2, vMax: 4.2, iAvg: 0.1, tAvg: 20, tMin: 18, tMax: 22 }
    };
    const mfgRes = await post('/api/passport/manufacture', mfgData);
    console.log('Manufacture Result:', mfgRes);
    if (mfgRes.error) {
        console.error('Registration failed:', mfgRes.error, mfgRes.details);
        return;
    }

    console.log('\n--- Phase 2: Telemetry Aggregation Fallback (MINT) ---');
    const tel1 = await get(`/api/ai/latest-telemetry/${batteryId}`);
    if (tel1.error) {
        console.error('Fetch tel1 failed:', tel1.error);
    } else {
        console.log('Retrieved Telemetry (Fallbacks to Manufacture):', tel1.vAvg === 3.7 ? 'SUCCESS' : 'FAILED', tel1);
    }

    console.log('\n--- Phase 3: Usage Update ---');
    const usageData = {
        snapshotDate: new Date().toISOString(),
        sohPercentage: 95,
        mileage: 1000,
        averageTempCelsius: 30,
        telemetry: { vAvg: 3.55, vMin: 3.1, vMax: 4.0, iAvg: 0.8, tAvg: 32, tMin: 28, tMax: 35 }
    };
    const useRes = await post(`/api/passport/usage/${batteryId}`, usageData);
    if (useRes.error) console.error('Usage failed:', useRes.error);

    const tel2 = await get(`/api/ai/latest-telemetry/${batteryId}`);
    console.log('Retrieved Telemetry (Should be Usage):', tel2.vAvg === 3.55 ? 'SUCCESS' : 'FAILED', tel2);

    console.log('\n--- Phase 4: Repair Priority ---');
    const repairData = {
        serviceDate: new Date().toISOString(),
        serviceProviderId: "REPAIR-1",
        repairType: "Inspection",
        postRepairSOH: 98,
        technicianSignature: "TECH-A",
        telemetry: { vAvg: 4.05, vMin: 3.8, vMax: 4.25, iAvg: 0.05, tAvg: 25, tMin: 23, tMax: 27 }
    };
    const repRes = await post(`/api/passport/repair/${batteryId}`, repairData);
    if (repRes.error) console.error('Repair failed:', repRes.error);

    const tel3 = await get(`/api/ai/latest-telemetry/${batteryId}`);
    console.log('Retrieved Telemetry (Should prioritize Repair):', tel3.vAvg === 4.05 ? 'SUCCESS' : 'FAILED', tel3);

    console.log('\n--- Phase 5: Automated AI Analysis ---');
    const aiRes = await post('/api/ai/analyze', { batteryId });
    console.log('AI Analysis Result (Automated):', aiRes.success ? 'SUCCESS' : 'FAILED', aiRes.band);
}

verify().catch(console.error);
