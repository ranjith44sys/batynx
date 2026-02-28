const fs = require("fs-extra");
const path = require("path");

const LOG_FILE = path.resolve(__dirname, "../../storage/chain_logs.json");

/**
 * Appends a new transaction log to the persistent storage.
 * @param {Object} log - { type, batteryId, txHash, details, timestamp }
 */
async function addLog(log) {
    try {
        await fs.ensureDir(path.dirname(LOG_FILE));

        let logs = [];
        if (await fs.pathExists(LOG_FILE)) {
            logs = await fs.readJson(LOG_FILE);
        }

        const newLog = {
            ...log,
            timestamp: log.timestamp || new Date().toISOString()
        };

        logs.unshift(newLog); // Newest first

        // Keep last 500 logs to prevent file bloating
        if (logs.length > 500) {
            logs = logs.slice(0, 500);
        }

        await fs.writeJson(LOG_FILE, logs, { spaces: 2 });
    } catch (error) {
        console.error("[LogService] Error saving log:", error);
    }
}

/**
 * Retrieves all stored logs.
 */
async function getLogs() {
    try {
        if (await fs.pathExists(LOG_FILE)) {
            return await fs.readJson(LOG_FILE);
        }
    } catch (error) {
        console.error("[LogService] Error reading logs:", error);
    }
    return [];
}

module.exports = {
    addLog,
    getLogs
};
