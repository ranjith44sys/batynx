require("dotenv").config();
const fs = require("fs-extra");
const path = require("path");
const BlockchainService = require("../src/services/blockchain.service");
const StorageService = require("../src/services/storage.service");

const STORAGE_DIR = path.resolve(__dirname, "../storage");

async function aggressiveCleanup() {
    console.log("[CLEANUP] Starting aggressive cleanup...");

    try {
        const files = await fs.readdir(STORAGE_DIR);

        for (const f of files) {
            // Process only potential battery files (skip events/hashes for the main driver)
            // We want to remove the "Entry points" for the dashboard.
            if (!f.endsWith(".json")) continue;
            if (f.startsWith("0x")) continue;
            if (f.includes("-usage") || f.includes("usage-")) continue;
            if (f.includes("maintenance-")) continue;
            if (f.includes("recycle-")) continue;
            if (f.includes("transfer-")) continue;

            const filePath = path.join(STORAGE_DIR, f);
            try {
                const data = await fs.readJson(filePath);

                // CRITICAL CHECK: Check if it is a battery structure
                if (data.batteryId) {
                    const id = data.batteryId;

                    // SKIP BAT-005
                    if (id === "BAT-005") {
                        console.log(`[CLEANUP] Skipping Protected Asset: ${id}`);
                        continue;
                    }

                    console.log(`[CLEANUP] Found unwanted asset: ${id} (File: ${f})`);

                    // 1. Try to burn on chain
                    const tId = await StorageService.getTokenId(id);
                    if (tId !== null) {
                        try {
                            console.log(`[CLEANUP] Attempting to burn token ${tId}...`);
                            await BlockchainService.burnPassport(tId);
                            console.log(`[CLEANUP] Burn successful.`);
                        } catch (e) {
                            console.warn(`[CLEANUP] Burn failed (might already be burnt): ${e.message}`);
                        }
                    } else {
                        console.log(`[CLEANUP] No token ID found for ${id}.`);
                    }

                    // 2. Delete Local Files
                    console.log(`[CLEANUP] Deleting local records for ${id}...`);

                    // Delete the main JSON file
                    await fs.remove(filePath);

                    // Delete the token ID mapping
                    const mappingPath = path.join(STORAGE_DIR, `${id}.tokenid`);
                    if (await fs.pathExists(mappingPath)) {
                        await fs.remove(mappingPath);
                    }

                    console.log(`[CLEANUP] Deleted ${id}.`);
                }
            } catch (err) {
                console.error(`[CLEANUP] Error processing file ${f}:`, err.message);
            }
        }
    } catch (err) {
        console.error("[CLEANUP] Fatal error:", err);
    }

    console.log("[CLEANUP] Cleanup complete.");
}

aggressiveCleanup();
