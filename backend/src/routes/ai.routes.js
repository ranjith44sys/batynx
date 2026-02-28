const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const BlockchainService = require("../services/blockchain.service");
const StorageService = require("../services/storage.service");

// Internal helper to get latest telemetry from ledger
async function getLatestTelemetry(batteryId) {
    try {
        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return null;

        const count = await BlockchainService.getEventCount(tId);
        let latestUsage = null;
        let latestRepair = null;
        let manufactureData = null;

        // Iterate through history to find the best data
        for (let i = 0; i < count; i++) {
            const evt = await BlockchainService.readLifecycleEvent(tId, i);
            const data = await StorageService.loadReport(evt.dataHash);

            if (!data || !data.telemetry) continue;

            const type = evt.eventType; // USAGE or MAINTENANCE or MINT? 
            // Note: MINT is usually event 0, but evt.eventType for mint might be different or empty depending on how addEvent was called.
            // Actually, in passportRoutes.js, mint doesn't call addEvent, it just mints. 
            // So events are only Usage, Repair, etc.

            if (type === 'MAINTENANCE') {
                latestRepair = data.telemetry;
            } else if (type === 'USAGE') {
                latestUsage = data.telemetry;
            }
        }

        // Fallback to Manufacture data if no events have telemetry
        const mainReport = await StorageService.loadReport(batteryId);
        if (mainReport && mainReport.telemetry) {
            manufactureData = mainReport.telemetry;
        }

        // Priority logic: Repair > Usage > Manufacture
        return latestRepair || latestUsage || manufactureData;
    } catch (e) {
        console.error("Telemetry aggregation error:", e);
        return null;
    }
}

router.get("/latest-telemetry/:batteryId", async (req, res) => {
    const data = await getLatestTelemetry(req.params.batteryId);
    if (!data) return res.status(404).json({ error: "No telemetry found on chain for this asset." });
    res.json(data);
});

// Internal helper to aggregate 8 credit score features from full lifecycle
async function aggregateCreditFeatures(batteryId) {
    try {
        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return null;

        const count = await BlockchainService.getEventCount(tId);
        const allTelemetry = [];
        let manufactureCapacity = null;
        let latestCapacity = null;

        // Collect all telemetry from history
        for (let i = 0; i < count; i++) {
            const evt = await BlockchainService.readLifecycleEvent(tId, i);
            const data = await StorageService.loadReport(evt.dataHash);
            if (data && data.telemetry) {
                allTelemetry.push(data.telemetry);
                if (data.capacityKWh && !latestCapacity) {
                    latestCapacity = data.capacityKWh;
                }
            }
        }

        // Get manufacture data
        const mainReport = await StorageService.loadReport(batteryId);
        if (mainReport) {
            if (mainReport.telemetry) {
                allTelemetry.push(mainReport.telemetry);
            }
            if (mainReport.capacityKWh) {
                manufactureCapacity = mainReport.capacityKWh;
            }
        }

        if (allTelemetry.length === 0) {
            // Return baseline defaults for newly manufactured batteries
            return {
                avg_operating_temp: 25,
                max_temp: 25,
                overtemp_count: 0,
                overtemp_duration_log: 0,
                temp_variance: 0,
                fast_charge_ratio: 0,
                deep_discharge_ratio: 0,
                capacity_fade_rate: 0
            };
        }

        // Compute 8 features
        const temps = [];
        let overtempCount = 0;
        let overtempDuration = 0;
        let fastChargeCount = 0;
        let deepDischargeCount = 0;

        allTelemetry.forEach(t => {
            if (t.tAvg) temps.push(t.tAvg);
            if (t.tMax) temps.push(t.tMax);
            if (t.tMin) temps.push(t.tMin);

            if (t.tMax && t.tMax > 40) {
                overtempCount++;
                overtempDuration += 1; // Simplified: assume 1 unit per snapshot
            }

            if (t.iAvg && Math.abs(t.iAvg) > 1.5) {
                fastChargeCount++;
            }

            if (t.vMin && t.vMin < 2.7) {
                deepDischargeCount++;
            }
        });

        const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 25;
        const maxTemp = temps.length > 0 ? Math.max(...temps) : 25;
        const tempVariance = temps.length > 1 ? temps.reduce((sum, t) => sum + Math.pow(t - avgTemp, 2), 0) / temps.length : 0;
        const overtempCountNorm = overtempCount / Math.max(allTelemetry.length, 1);
        const overtempDurationLog = Math.log1p(overtempDuration);
        const fastChargeRatio = fastChargeCount / Math.max(allTelemetry.length, 1);
        const deepDischargeRatio = deepDischargeCount / Math.max(allTelemetry.length, 1);

        let capacityFadeRate = 0;
        if (manufactureCapacity && latestCapacity) {
            capacityFadeRate = (manufactureCapacity - latestCapacity) / Math.max(allTelemetry.length, 1);
        }

        return {
            avg_operating_temp: avgTemp,
            max_temp: maxTemp,
            overtemp_count: overtempCountNorm,
            overtemp_duration_log: overtempDurationLog,
            temp_variance: tempVariance,
            fast_charge_ratio: fastChargeRatio,
            deep_discharge_ratio: deepDischargeRatio,
            capacity_fade_rate: capacityFadeRate
        };
    } catch (e) {
        console.error("Credit feature aggregation error:", e);
        return null;
    }
}

async function aggregateLongevityFeatures(batteryId) {
    try {
        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return null;

        const count = await BlockchainService.getEventCount(tId);
        let latestSoh = 100;
        let avgDod = 80;
        let peakCurrent = 1.0;
        let totalRestoration = 0;

        for (let i = 0; i < count; i++) {
            const evt = await BlockchainService.readLifecycleEvent(tId, i);
            const data = await StorageService.loadReport(evt.dataHash);
            if (!data) continue;

            if (data.sohPercentage) latestSoh = data.sohPercentage;
            if (data.avgDepthOfDischarge) avgDod = data.avgDepthOfDischarge;
            if (data.peakCurrent) peakCurrent = data.peakCurrent;
            if (data.healthRestorationFactor) totalRestoration += data.healthRestorationFactor;
        }

        const mainReport = await StorageService.loadReport(batteryId);
        return {
            soh: latestSoh,
            cycle_life_expectancy: mainReport?.cycleLifeExpectancy || 3000,
            max_charge_rate: mainReport?.maxChargeRate || 2.0,
            avg_depth_of_discharge: avgDod,
            peak_current: peakCurrent,
            restoration_gain: totalRestoration
        };
    } catch (e) {
        console.error("Longevity feature aggregation error:", e);
        return null;
    }
}

router.get("/optimization/:batteryId", async (req, res) => {
    const features = await aggregateLongevityFeatures(req.params.batteryId);
    if (!features) return res.status(404).json({ error: "No historical data for longevity analysis." });

    const scriptPath = path.join(__dirname, "../../../optimization/inference_longevity.py");
    const pythonProcess = spawn("python", [scriptPath, JSON.stringify(features)]);

    let dataString = "";
    pythonProcess.stdout.on("data", (data) => dataString += data.toString());
    pythonProcess.stderr.on("data", (data) => console.error(`Longevity AI Error: ${data}`));
    pythonProcess.on("close", (code) => {
        if (code !== 0) return res.status(500).json({ error: "Longevity Optimization Failed" });
        try {
            const jsonStart = dataString.indexOf('{');
            const jsonEnd = dataString.lastIndexOf('}');
            const jsonString = dataString.slice(jsonStart, jsonEnd + 1);
            res.json(JSON.parse(jsonString));
        } catch (e) {
            res.status(500).json({ error: "Failed to parse Longevity response" });
        }
    });
});

router.get("/credit-score/:batteryId", async (req, res) => {
    const features = await aggregateCreditFeatures(req.params.batteryId);
    if (!features) {
        return res.status(404).json({ error: "Insufficient battery data to compute reliability score." });
    }

    const scriptPath = path.join(__dirname, "../../../credit_score/inference_credit.py");
    const pythonProcess = spawn("python", [
        scriptPath,
        features.avg_operating_temp,
        features.max_temp,
        features.overtemp_count,
        features.overtemp_duration_log,
        features.temp_variance,
        features.fast_charge_ratio,
        features.deep_discharge_ratio,
        features.capacity_fade_rate
    ]);

    let dataString = "";
    pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`Credit AI Python Error: ${data}`);
    });

    pythonProcess.on("close", (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "Credit Score Processing Failed" });
        }
        try {
            const jsonStart = dataString.indexOf('{');
            const jsonEnd = dataString.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("No JSON found in output");
            }
            const jsonString = dataString.slice(jsonStart, jsonEnd + 1);
            const result = JSON.parse(jsonString);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: "Failed to parse Credit Score response", details: dataString });
        }
    });
});

router.post("/analyze", async (req, res) => {
    let { batteryId, vAvg, vMin, vMax, iAvg, tAvg, tMin, tMax } = req.body;

    // Automated mode: Fetch from ledger if batteryId is provided and features are missing
    if (batteryId && [vAvg, vMin, vMax, iAvg, tAvg, tMin, tMax].some(v => v === undefined)) {
        const telemetry = await getLatestTelemetry(batteryId);
        if (!telemetry) {
            return res.status(404).json({ error: "No telemetry records found on ledger to perform analysis." });
        }
        vAvg = telemetry.vAvg;
        vMin = telemetry.vMin;
        vMax = telemetry.vMax;
        iAvg = telemetry.iAvg;
        tAvg = telemetry.tAvg;
        tMin = telemetry.tMin;
        tMax = telemetry.tMax;
    }

    // Check if all features are now present
    if ([vAvg, vMin, vMax, iAvg, tAvg, tMin, tMax].some(v => v === undefined)) {
        return res.status(400).json({ error: "Missing required telemetry data" });
    }

    const scriptPath = path.join(__dirname, "../../../USECASE/inference.py");

    // Execute python script
    const pythonProcess = spawn("python", [
        scriptPath,
        vAvg, vMin, vMax, iAvg, tAvg, tMin, tMax
    ]);

    let dataString = "";

    pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`AI Python Error: ${data}`);
    });

    pythonProcess.on("close", (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "AI Processing Failed" });
        }
        try {
            // Find the JSON part in the output (in case there are logs)
            const jsonStart = dataString.indexOf('{');
            const jsonEnd = dataString.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("No JSON found in output");
            }
            const jsonString = dataString.slice(jsonStart, jsonEnd + 1);
            const result = JSON.parse(jsonString);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: "Failed to parse AI response", details: dataString });
        }
    });
});

module.exports = router;
