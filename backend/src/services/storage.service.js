const fs = require("fs-extra");
const path = require("path");
const { keccak256 } = require("ethers");

// SINGLE authoritative storage directory
const STORAGE_DIR = path.resolve(__dirname, "../../storage");

/**
 * Saves a file by batteryId (Primary Record) AND by Hash (Content Addressed)
 * This allows easy retrieval by ID for the main record, and by Hash for events.
 */
async function saveReport(identifier, data) {
  await fs.ensureDir(STORAGE_DIR);

  // 1. Save strictly by identifier (e.g. BAT-001.json)
  // This might overwrite if it exists, which is fine for the "current state" concept
  // or "latest known file for this ID"
  const filePath = path.join(STORAGE_DIR, `${identifier}.json`);
  const jsonString = JSON.stringify(data, null, 2);
  await fs.outputFile(filePath, jsonString);

  // 2. Save by Content Hash (Immutable-style)
  // We use ethers keccak256 of the UTF8 bytes
  const buffer = Buffer.from(jsonString); // Utf8 buffer
  const hash = keccak256(buffer);

  const hashPath = path.join(STORAGE_DIR, `${hash}.json`);
  if (!await fs.pathExists(hashPath)) {
    await fs.outputFile(hashPath, jsonString);
  }

  return { filePath, hash };
}

async function getReportPath(identifier) {
  return path.join(STORAGE_DIR, `${identifier}.json`);
}

async function saveTokenId(batteryId, tokenId) {
  await fs.ensureDir(STORAGE_DIR);
  const mappingPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
  await fs.outputFile(mappingPath, String(tokenId));
}

async function getTokenId(batteryId) {
  const mappingPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
  if (await fs.pathExists(mappingPath)) {
    const idStr = await fs.readFile(mappingPath, "utf-8");
    return parseInt(idStr.trim());
  }
  return null;
}

async function deleteTokenId(batteryId) {
  const mappingPath = path.join(STORAGE_DIR, `${batteryId}.tokenid`);
  if (await fs.pathExists(mappingPath)) {
    await fs.remove(mappingPath);
  }
}

async function removeReport(batteryId) {
  const filePath = path.join(STORAGE_DIR, `${batteryId}.json`);
  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
  }
}

async function loadReport(identifier) {
  // identifier can be ID or Hash
  const filePath = path.join(STORAGE_DIR, `${identifier}.json`);
  if (await fs.pathExists(filePath)) {
    return fs.readJson(filePath);
  }
  return null;
}

// List all files that look like battery IDs (not long hashes)
// Simplistic heuristic: Hashes are 66 chars (0x...), IDs usually shorter.
async function listBatteries() {
  await fs.ensureDir(STORAGE_DIR);
  const files = await fs.readdir(STORAGE_DIR);

  // Filter for .json files that serve as "Primary Records"
  // We assume primary records are NOT hashes (start with 0x)
  // and aren't events like "usage-..."
  // Ideally, we'd have a separate index, but scanning works for MVP.
  const batteries = [];

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const name = f.replace(".json", "");

    // Skip hashes (0x...) and event logs
    if (name.startsWith("0x")) continue;

    const isEvent = ["usage-", "maintenance-", "recycle-", "transfer-", "purchase-"].some(pre => name.startsWith(pre));
    if (isEvent) continue;

    try {
      const data = await fs.readJson(path.join(STORAGE_DIR, f));
      // Confirm it's a battery by checking schema fields
      if (data.batteryId && data.serialNumber) {
        batteries.push(data);
      }
    } catch (e) {
      // ignore bad json
    }
  }
  return batteries;
}

async function listSecondLifeBatteries() {
  const all = await listBatteries();
  // We check for "SecondLife" status. 
  // In the recycle flow, we might save this in the main record or we check hisotry.
  // For now, we assume the latest status is in the main record or we check a specific flag.
  return all.filter(b => b.lifecycleState === "SecondLife" && !b.isSold);
}

module.exports = {
  saveReport,
  loadReport,
  getReportPath,
  listBatteries,
  listSecondLifeBatteries,
  saveTokenId,
  getTokenId,
  deleteTokenId,
  removeReport,
  STORAGE_DIR
};
