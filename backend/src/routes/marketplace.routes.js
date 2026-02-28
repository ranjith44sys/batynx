const express = require('express');
const router = express.Router();
const StorageService = require('../services/storage.service');
const BlockchainService = require('../services/blockchain.service');
const LogService = require('../services/log.service');
const SupabaseService = require('../services/supabase.service');

// 1. List available Second-Life batteries
router.get('/list', async (req, res) => {
    try {
        const batteries = await SupabaseService.listSecondLifeBatteries();
        res.json(batteries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Buy a battery
router.post('/buy/:batteryId', async (req, res) => {
    try {
        const { batteryId } = req.params;
        const { buyerName, buyerContact } = req.body;

        if (!buyerName || !buyerContact) {
            return res.status(400).json({ error: "Buyer name and contact are required." });
        }

        const battery = await StorageService.loadReport(batteryId);
        if (!battery) return res.status(404).json({ error: "Battery not found" });

        if (battery.lifecycleState !== "SecondLife") {
            return res.status(400).json({ error: "Battery is not in Second-Life phase." });
        }

        if (battery.isSold) {
            return res.status(400).json({ error: "Battery is already sold." });
        }

        const tId = await StorageService.getTokenId(batteryId);
        if (tId === null) return res.status(404).json({ error: "Battery not found on blockchain." });

        // 1. Log PURCHASE event on blockchain
        const purchaseData = {
            buyerName,
            buyerContact,
            purchaseDate: new Date().toISOString()
        };
        const eventId = `purchase-${Date.now()}`;
        const { hash } = await StorageService.saveReport(eventId, purchaseData);

        console.log(`[MARKETPLACE] Logging purchase for ${batteryId} (Token ${tId})`);
        const { tx, receipt } = await BlockchainService.addEvent(tId, 'PURCHASE', hash, "OEM");

        // 2. Mark as Sold in metadata
        battery.isSold = true;
        battery.buyerInfo = { buyerName, buyerContact, purchaseDate: purchaseData.purchaseDate };
        await StorageService.saveReport(batteryId, battery);

        // Save to Supabase (non-blocking)
        try { await SupabaseService.markAsSold(batteryId, purchaseData); } catch (e) { console.warn('[MARKETPLACE] Supabase markAsSold failed (non-blocking):', e.message?.substring(0, 80)); }

        // Log transaction
        await LogService.addLog({
            type: 'PURCHASE',
            batteryId,
            txHash: tx.hash,
            contractCall: 'BatteryPassport#addEvent',
            from: receipt.from,
            to: receipt.to,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber.toString(),
            details: `Battery purchased by ${buyerName} for Second-Life use`
        });

        res.json({ message: "Purchase successful! Battery is now locked.", batteryId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
