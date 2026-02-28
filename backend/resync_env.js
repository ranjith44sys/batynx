const fs = require("fs-extra");
const path = require("path");

const STORAGE_DIR = path.resolve(__dirname, "storage");

async function resync() {
    console.log("Starting Environment Resync...");

    if (!await fs.pathExists(STORAGE_DIR)) {
        console.log("Storage directory not found.");
        return;
    }

    const files = await fs.readdir(STORAGE_DIR);
    let count = 0;

    for (const file of files) {
        if (file.endsWith(".tokenid")) {
            await fs.remove(path.join(STORAGE_DIR, file));
            console.log(`Removed stale mapping: ${file}`);
            count++;
        }
    }

    console.log(`Resync complete. Removed ${count} stale token mappings.`);
    console.log("IMPORTANT: Please restart your backend server (node src/server.js) to apply changes.");
    console.log("Then, re-manufacture your batteries to create new valid blockchain records.");
}

resync().catch(console.error);
