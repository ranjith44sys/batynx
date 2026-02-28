require("dotenv").config();
const BlockchainService = require("../src/services/blockchain.service");
const StorageService = require("../src/services/storage.service");

async function cleanup() {
    const batteriesToDelete = ["BAT-001", "BAT-002", "BAT-003", "BAT123"];

    for (const id of batteriesToDelete) {
        console.log(`[CLEANUP] Processing ${id}...`);
        try {
            const tId = await StorageService.getTokenId(id);
            if (tId !== null) {
                console.log(`[CLEANUP] Burning token ${tId} for ${id}...`);
                try {
                    await BlockchainService.burnPassport(tId);
                } catch (bcError) {
                    console.warn(`[CLEANUP] Blockchain burn failed for ${id} (Token ${tId}):`, bcError.message);
                }
            } else {
                console.log(`[CLEANUP] No token mapping found for ${id}.`);
            }

            console.log(`[CLEANUP] Removing local records for ${id}...`);
            await StorageService.deleteTokenId(id);
            await StorageService.removeReport(id);

            console.log(`[CLEANUP] ${id} cleanup finished.`);
        } catch (error) {
            console.error(`[CLEANUP] Critical error on ${id}:`, error.message);
        }
    }
    console.log("[CLEANUP] Done.");
}

cleanup();
