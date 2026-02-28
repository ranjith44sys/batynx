const fs = require('fs-extra');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../storage');

async function cleanup() {
    console.log('Cleaning up storage at:', STORAGE_DIR);
    try {
        const files = await fs.readdir(STORAGE_DIR);
        for (const file of files) {
            const filePath = path.join(STORAGE_DIR, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                if (file === 'users') {
                    console.log('Skipping users directory');
                    continue;
                }
                await fs.remove(filePath);
            } else {
                await fs.remove(filePath);
            }
            console.log('Deleted:', file);
        }
        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

cleanup();
