const fs = require('fs-extra');
const path = require('path');

const STORAGE_DIR = path.resolve(__dirname, '../backend/storage');

async function migrateLegacyBatteries() {
    console.log('Starting legacy battery migration...');

    const files = await fs.readdir(STORAGE_DIR);
    let migratedCount = 0;

    for (const file of files) {
        // Only process .json files
        if (!file.endsWith('.json')) continue;

        const batteryId = file.replace('.json', '');

        // Skip hash files (start with 0x) and event files (contain hyphens)
        if (batteryId.startsWith('0x') || batteryId.includes('-')) continue;

        // Check if .tokenid already exists
        const tokenIdPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
        if (await fs.pathExists(tokenIdPath)) {
            console.log(`✓ ${batteryId} already has mapping`);
            continue;
        }

        // Read the battery data
        const batteryData = await fs.readJson(path.join(STORAGE_DIR, file));

        // Verify it's a battery (has required fields)
        if (!batteryData.serialNumber || !batteryData.batteryId) {
            console.log(`⊗ Skipping ${batteryId} - not a valid battery record`);
            continue;
        }

        // For legacy batteries, the batteryId is often the tokenId
        // If batteryId is numeric, use it as tokenId
        let tokenId = batteryId;

        // If batteryId is "BAT-xxx" but was created before the fix,
        // we need to check blockchain to find its tokenId
        // For simplicity, numeric IDs map to themselves
        if (isNaN(batteryId)) {
            console.log(`⚠ ${batteryId} - Cannot auto-migrate non-numeric ID, skipping`);
            continue;
        }

        // Create the mapping file
        await fs.outputFile(tokenIdPath, String(tokenId));
        console.log(`✓ Created mapping for ${batteryId} → tokenId ${tokenId}`);
        migratedCount++;
    }

    console.log(`\nMigration complete! Migrated ${migratedCount} batteries.`);
}

migrateLegacyBatteries().catch(console.error);
