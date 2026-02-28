const express = require('express');
const router = express.Router();
const ValidationService = require('../services/ValidationService');
const BlockchainService = require('../services/blockchain.service'); // lowercase
const StorageService = require('../services/storage.service');
const HashService = require('../services/hash.service');
const LogService = require('../services/log.service');
const SupabaseService = require('../services/supabase.service');

// 1. Manufacturing (Mint)
router.post('/manufacture', async (req, res) => {
    try {
        const data = req.body;
        const { attachment, ...schemaData } = data;

        const validation = ValidationService.validateData('manufacturing.schema.json', schemaData);
        if (!validation.isValid) {
            return res.status(400).json({ error: 'Invalid Schema', details: validation.errors });
        }

        const batteryId = data.batteryId || "BAT-" + Date.now();
        const idHash = HashService.hashBatteryId(batteryId);
        data.idHash = idHash; // Store hash in metadata

        data.batteryId = batteryId;
        const { hash } = await StorageService.saveReport(batteryId, data);
        const toAddress = data.ownerAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        const { tx, tokenId, receipt } = await BlockchainService.mintPassport(toAddress, hash);

        // Save mapping
        await StorageService.saveTokenId(batteryId, tokenId);

        // Save to Supabase
        await SupabaseService.upsertBattery(data);

        // Log transaction
        await LogService.addLog({
            type: 'MINT',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#mint',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Minted Passport for ${batteryId} (Token ID: ${tokenId})`
        });

        res.json({ message: 'Passport Minted', batteryId, tokenId, idHash, txHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Usage (Add Event)
router.post('/usage/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const data = req.body;

        const validation = ValidationService.validateData('usage.schema.json', data);
        if (!validation.isValid) {
            return res.status(400).json({ error: 'Invalid Usage Schema', details: validation.errors });
        }

        const tId = await StorageService.getTokenId(batteryId);
        console.log(`[Usage] Battery: ${batteryId}, TokenID: ${tId}`);
        if (tId === null) return res.status(404).json({ error: "Battery ID not found or not synced to blockchain" });

        const battery = await StorageService.loadReport(batteryId);
        if (battery && battery.isSold) {
            return res.status(403).json({ error: "Battery is sold and no further updates are allowed." });
        }

        // Check finality - block only if Disposed (3). SecondLife(1) and Recycled(2) are okay.
        const status = await BlockchainService.getBatteryStatus(tId);
        console.log(`[Usage] On-chain status for Token ${tId}: ${status}`);
        if (status === 3) {
            console.log(`[Usage] Refusing update: Battery is disposed (status 3).`);
            return res.status(403).json({ error: "ERROR_DISPOSED_BY_CONTRACT: Battery is disposed and no further actions are allowed." });
        }

        const eventId = `usage-${Date.now()}`;
        data.batteryId = batteryId;
        const { hash } = await StorageService.saveReport(eventId, data);
        console.log(`[Usage] Saved report: ${hash}`);

        const { tx, receipt } = await BlockchainService.addEvent(tId, 'USAGE', hash, "OEM");

        // Save to Supabase (non-blocking)
        try { await SupabaseService.logTelemetry(batteryId, data); } catch (e) { console.warn('[USAGE] Supabase logTelemetry failed (non-blocking):', e.message?.substring(0, 80)); }

        await LogService.addLog({
            type: 'USAGE',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#addEvent',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Updated Usage Snapshot for ${batteryId} (Mileage: ${data.mileage}km, SoH: ${data.sohPercentage}%)`
        });

        res.json({ message: 'Usage Recorded', result: tx });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Repair (Add Event - REPAIR)
router.post('/repair/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const data = req.body;
        const { attachment, ...schemaData } = data;
        console.log('[REPAIR] Received request for battery:', batteryId, 'with data (schema part):', JSON.stringify(schemaData));

        const validation = ValidationService.validateData('maintenance.schema.json', schemaData);
        if (!validation.isValid) {
            console.log('[REPAIR] Validation failed:', validation.errors);
            return res.status(400).json({ error: 'Invalid Repair Schema', details: validation.errors });
        }

        console.log('[REPAIR] Validation passed, getting token ID...');

        const tId = await StorageService.getTokenId(batteryId);
        console.log('[REPAIR] Token ID for', batteryId, ':', tId);
        if (tId === null) return res.status(404).json({ error: "Battery not found" });

        const battery = await StorageService.loadReport(batteryId);
        if (battery && battery.isSold) {
            return res.status(403).json({ error: "Battery is sold and no further updates are allowed." });
        }

        // Check finality - block only if Disposed (3)
        const status = await BlockchainService.getBatteryStatus(tId);
        if (status === 3) {
            return res.status(403).json({ error: "Battery is disposed and no further actions are allowed." });
        }

        const eventId = `maintenance-${Date.now()}`;
        data.batteryId = batteryId;
        const { hash } = await StorageService.saveReport(eventId, data);
        console.log('[REPAIR] Saved report with hash:', hash);

        console.log('[REPAIR] Calling blockchain addEvent with tokenId:', tId);
        const { tx, receipt } = await BlockchainService.addEvent(tId, 'MAINTENANCE', hash, "SERVICE");

        // Save to Supabase (non-blocking)
        try { await SupabaseService.logMaintenance(batteryId, data); } catch (e) { console.warn('[REPAIR] Supabase logMaintenance failed (non-blocking):', e.message?.substring(0, 80)); }

        await LogService.addLog({
            type: 'REPAIR',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#addEvent',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Battery repaired: ${data.repairType} for ${batteryId}`
        });

        console.log('[REPAIR] Blockchain result:', tx);
        res.json({ message: 'Maintenance Recorded', result: tx });
    } catch (error) {
        console.error('[REPAIR] Error occurred:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// 4. Transfer (Add Event - TRANSFER)
router.post('/transfer/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const data = req.body;
        console.log('[TRANSFER] Received request for battery:', batteryId, 'data:', JSON.stringify(data));

        const validation = ValidationService.validateData('transfer.schema.json', data);
        if (!validation.isValid) {
            console.log('[TRANSFER] Validation failed:', validation.errors);
            return res.status(400).json({ error: 'Invalid Transfer Schema', details: validation.errors });
        }

        console.log('[TRANSFER] Validation passed, getting token ID...');
        const tId = await StorageService.getTokenId(batteryId);
        console.log('[TRANSFER] Token ID:', tId);
        if (tId === null) return res.status(404).json({ error: "Battery not found" });

        const battery = await StorageService.loadReport(batteryId);
        if (battery && battery.isSold) {
            return res.status(403).json({ error: "Battery is sold and cannot be transferred." });
        }

        // Check finality - block only if Disposed (3)
        const status = await BlockchainService.getBatteryStatus(tId);
        if (status === 3) {
            return res.status(403).json({ error: "Battery is disposed and cannot be sold or transferred." });
        }

        const eventId = `transfer-${Date.now()}`;
        data.batteryId = batteryId;
        const { hash } = await StorageService.saveReport(eventId, data);
        console.log('[TRANSFER] Saved report with hash:', hash);

        // 1. Log the transfer event (Now unblocks lock immediately after broadcast)
        console.log('[TRANSFER] Logging event on-chain...');
        const eventRes = await BlockchainService.addEvent(tId, 'TRANSFER', hash, "OEM");

        // 2. Perform actual ownership transfer of the NFT
        console.log('[TRANSFER] Performing NFT transfer to:', data.toOwner);
        const transferRes = await BlockchainService.transferPassport(tId, data.toOwner);

        const { tx, receipt } = transferRes;

        // Log transaction
        await LogService.addLog({
            type: 'TRANSFER',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#safeTransferFrom',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Asset ownership transferred to ${data.toOwner}`
        });

        console.log('[TRANSFER] Success:', tx.hash);
        res.json({
            message: 'Ownership Transferred Successfully',
            transferTx: tx.hash,
            eventTx: eventRes.tx.hash
        });
    } catch (error) {
        console.error('[TRANSFER] Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// 5. Recycle (Add Event - RECYCLE/DECOMMISSION)
router.post('/recycle/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const data = req.body;
        console.log('[RECYCLE] Received request for battery:', batteryId, 'data:', JSON.stringify(data));

        const validation = ValidationService.validateData('recycling.schema.json', data);
        if (!validation.isValid) {
            console.log('[RECYCLE] Validation failed:', validation.errors);
            return res.status(400).json({ error: 'Invalid Recycling Schema', details: validation.errors });
        }

        console.log('[RECYCLE] Validation passed, getting token ID...');
        const tId = await StorageService.getTokenId(batteryId);
        console.log('[RECYCLE] Token ID:', tId);
        if (tId === null) return res.status(404).json({ error: "Battery not found" });

        const battery = await StorageService.loadReport(batteryId);
        if (battery && battery.isSold) {
            return res.status(403).json({ error: "Battery is sold and cannot be recycled." });
        }

        // Check finality - block only if already Disposed (3)
        const status = await BlockchainService.getBatteryStatus(tId);
        if (status === 3) {
            return res.status(403).json({ error: "Battery is already disposed." });
        }

        const eventId = `recycle-${Date.now()}`;
        data.batteryId = batteryId;
        const { hash } = await StorageService.saveReport(eventId, data);
        console.log('[RECYCLE] Saved report with hash:', hash);

        console.log('[RECYCLE] Calling blockchain decommission with role RECYCLER and state:', data.finalState);
        const { tx, receipt } = await BlockchainService.decommission(tId, hash, data.finalState);

        // Update main record state
        battery.lifecycleState = data.finalState || "Recycled";
        await StorageService.saveReport(batteryId, battery);

        // Save to Supabase (non-blocking)
        try { await SupabaseService.logRecycle(batteryId, data); } catch (e) { console.warn('[RECYCLE] Supabase logRecycle failed (non-blocking):', e.message?.substring(0, 80)); }

        // Log transaction
        await LogService.addLog({
            type: 'RECYCLE',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#decommission',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Battery Decommissioned as ${data.finalState || 'Recycled'}`
        });

        console.log('[RECYCLE] Success:', tx.hash);
        res.json({ message: `Battery Decommissioned as ${data.finalState || 'Recycled'}`, result: tx });
    } catch (error) {
        console.error('[RECYCLE] Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// 6. Delete Battery (Burn - Admin Only)
router.delete('/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        console.log('[DELETE] Request for battery:', batteryId);

        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return res.status(404).json({ error: "Battery not found" });

        console.log('[DELETE] Burning token on-chain:', tId);
        const result = await BlockchainService.burnPassport(tId);

        console.log('[DELETE] Cleaning up local storage...');
        // Remove token mapping
        await StorageService.deleteTokenId(batteryId);

        // Remove manufacturing report (and potentially others, but let's start with primary)
        await StorageService.removeReport(batteryId);

        res.json({ message: 'Battery Passport Permanently Deleted', result });
    } catch (error) {
        console.error('[DELETE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generic List Endpoint
router.get('/list', async (req, res) => {
    try {
        const batteries = await SupabaseService.listBatteries();
        res.json(batteries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generic Data by Hash Endpoint
router.get('/data/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const data = await StorageService.loadReport(hash);
        if (!data) return res.status(404).json({ error: "Data not found" });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch History (Roadmap)
router.get('/history/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return res.status(404).json({ error: "Battery not found" });

        const count = await BlockchainService.getEventCount(tId);
        const events = [];

        for (let i = 0; i < count; i++) {
            // 0 -> Mint event, 1+ -> others
            const evt = await BlockchainService.readLifecycleEvent(tId, i);
            // evt = [eventType (bytes32), dataHash, timestamp, author]

            // Try to load data off-chain
            const data = await StorageService.loadReport(evt.dataHash);

            events.push({
                index: i,
                eventType: evt.eventType,
                dataHash: evt.dataHash,
                timestamp: Number(evt.timestamp),
                author: evt.author,
                data: data // Embedded off-chain data if available
            });
        }

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
