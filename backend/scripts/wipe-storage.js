const fs = require("fs-extra");
const path = require("path");

const STORAGE_DIR = path.resolve(__dirname, "../storage");

async function wipe() {
    console.log("[WIPE] Starting storage cleanup...");
    try {
        const files = await fs.readdir(STORAGE_DIR);
        for (const file of files) {
            if (file === "users") continue; // Keep user accounts

            const fullPath = path.join(STORAGE_DIR, file);
            await fs.remove(fullPath);
            console.log(`[WIPE] Removed: ${file}`);
        }
        console.log("[WIPE] Storage wiped successfully (Users preserved).");
    } catch (err) {
        console.error("[WIPE] Failed to wipe storage:", err.message);
    }
}

wipe();
