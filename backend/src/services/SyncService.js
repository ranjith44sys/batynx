const { ethers } = require("ethers");
const fs = require("fs-extra");
const path = require("path");
const BlockchainService = require("./blockchain.service");
const StorageService = require("./storage.service");
const SupabaseService = require("./supabase.service");

const ENV_PATH = path.resolve(__dirname, "../../.env");
const ARTIFACT_PATH = path.resolve(__dirname, "../../../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json");

async function detectAndSync() {
    console.log("[SYNC] Starting Auto-Sync detection...");

    const provider = new ethers.JsonRpcProvider((process.env.RPC_URL || "http://127.0.0.1:8545").trim());
    const address = (process.env.CONTRACT_ADDRESS || "").trim();

    let needsSync = false;
    let missingContract = false;

    try {
        const normalizedAddress = ethers.getAddress(address.toLowerCase());
        const code = await provider.getCode(normalizedAddress);
        if (code === "0x" || code === "0x0") {
            console.warn(`[SYNC] No contract code found at ${normalizedAddress}. Blockchain reset suspected.`);
            needsSync = true;
            missingContract = true;
        } else {
            // Check all local batteries to ensure their tokens exist and hashes match
            const abi = [
                "function ownerOf(uint256) view returns (address)",
                "function getEventCount(uint256) view returns (uint256)",
                "function getLifecycleEvent(uint256,uint256) view returns (bytes32,string,uint256,address)"
            ];
            const contract = new ethers.Contract(address, abi, provider);
            const batteries = await StorageService.listBatteries();
            console.log(`[SYNC] Verifying ${batteries.length} local records against on-chain integrity...`);

            for (const b of batteries) {
                // Add a small delay to avoid hitting RPC rate limits during high-volume sync
                await new Promise(r => setTimeout(r, 100));

                const tId = await StorageService.getTokenId(b.batteryId);
                if (tId !== null) {
                    try {
                        await contract.ownerOf(tId);

                        // Check if initial hash matches
                        const count = await contract.getEventCount(tId);
                        if (Number(count) === 0) {
                            console.warn(`[SYNC] Token ${tId} exists but has 0 events. Re-syncing.`);
                            needsSync = true;
                            break;
                        }

                        const evt = await contract.getLifecycleEvent(tId, 0);
                        const { hash } = await StorageService.saveReport(b.batteryId, b);
                        if (evt[1] !== hash) {
                            console.warn(`[SYNC] Content hash mismatch for ${b.batteryId} (On-chain: ${evt[1]}, Local: ${hash}). Recovery triggered.`);
                            needsSync = true;
                            break;
                        }
                    } catch (e) {
                        console.warn(`[SYNC] Token ${tId} for ${b.batteryId} integrity failed/missing. Sync triggered.`);
                        needsSync = true;
                        break;
                    }
                } else {
                    console.warn(`[SYNC] Battery ${b.batteryId} missing tokenId mapping. Sync triggered.`);
                    needsSync = true;
                    break;
                }
            }

            if (!needsSync && batteries.length > 0) {
                console.log("[SYNC] All local tokens and hashes verified on-chain. System is healthy.");
            } else if (batteries.length === 0) {
                console.log("[SYNC] No local batteries to verify.");
            }
        }
    } catch (e) {
        console.error("[SYNC] Provider connection failed. Ensure Hardhat node is running.");
        console.error("[SYNC] Error details:", e.message);
        return;
    }

    if (needsSync) {
        await fullRestore(missingContract);
    }
}

async function fullRestore(missingContract = false) {
    console.log("[SYNC] Initiating Full Restore Sequence...");

    // 1. Redeploy Contract ONLY if missing
    if (missingContract) {
        // Only auto-redeploy on local network to avoid burning testnet ETH on Sepolia/Amoy
        const isLocal = !process.env.RPC_URL || process.env.RPC_URL.includes("127.0.0.1") || process.env.RPC_URL.includes("localhost");
        if (isLocal) {
            await redeploy();
        } else {
            console.error("[SYNC] CRITICAL: Contract not found on remote network! Auto-redeploy disabled for safety.");
            return;
        }
    } else {
        console.log("[SYNC] Contract exists. Skipping redeploy, proceeding to asset restoration.");
    }

    // 2. Restore Assets (Primary Records)
    const batteries = await StorageService.listBatteries();
    console.log(`[SYNC] Found ${batteries.length} local battery records to restore.`);

    // Sort by ID to ensure consistent Token IDs if possible in dev
    batteries.sort((a, b) => a.batteryId.localeCompare(b.batteryId));

    const idToToken = {};

    for (const battery of batteries) {
        const id = battery.batteryId;
        console.log(`[SYNC] Restoring ${id}...`);

        try {
            // Get correct content hash for re-minting
            const { hash } = await StorageService.saveReport(id, battery);

            // Re-mint
            let owner = battery.ownerAddress || battery.manufacturerId || ethers.ZeroAddress;

            // Validate owner address (some legacy debug data might have strings)
            if (!ethers.isAddress(owner)) {
                console.warn(`[SYNC] Invalid owner address found: "${owner}". Defaulting to OEM wallet.`);
                owner = BlockchainService.getOemAddress();
            }

            const mintResult = await BlockchainService.mintPassport(owner, hash);
            const newTokenId = mintResult.tokenId;

            idToToken[id] = newTokenId;
            await StorageService.saveTokenId(id, newTokenId);
            console.log(`[SYNC] ${id} re-minted. New Token ID: ${newTokenId} (Hash: ${hash})`);
        } catch (err) {
            console.error(`[SYNC] Failed to restore ${id}:`, err.message);
        }
    }

    // 3. Restore Ledger (Audit Trail)
    console.log("[SYNC] Scanning for additional events to restore audit trail...");
    const STORAGE_DIR = StorageService.STORAGE_DIR;
    const files = await fs.readdir(STORAGE_DIR);
    const eventsToRestore = [];

    for (const f of files) {
        if (!f.endsWith(".json")) continue;
        const name = f.replace(".json", "");
        if (name.startsWith("0x")) continue; // Skip hashes
        if (idToToken[name]) continue; // Skip primary battery records

        const parts = name.split("-");
        if (parts.length >= 2) {
            // Check if it's a known event type
            const type = parts[0].toUpperCase();
            if (["USAGE", "MAINTENANCE", "TRANSFER", "PURCHASE", "RECYCLE"].includes(type)) {
                try {
                    const data = await fs.readJson(path.join(STORAGE_DIR, f));
                    const bId = data.batteryId;
                    if (bId && idToToken[bId]) {
                        eventsToRestore.push({
                            tokenId: idToToken[bId],
                            type,
                            data,
                            timestamp: parseInt(parts[1]) || 0,
                            filename: name
                        });
                    }
                } catch (e) {
                    // skip malformed
                }
            }
        }
    }

    // Sort events by timestamp and re-play them
    eventsToRestore.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`[SYNC] Re-playing ${eventsToRestore.length} lifecycle events...`);

    for (const evt of eventsToRestore) {
        const { hash } = await StorageService.saveReport(evt.filename, evt.data);
        const role = evt.type === 'MAINTENANCE' ? 'SERVICE' : (evt.type === 'RECYCLE' ? 'RECYCLER' : 'OEM');

        try {
            console.log(`[SYNC] Restoring ${evt.type} for Token ${evt.tokenId}...`);
            if (evt.type === 'TRANSFER') {
                await BlockchainService.addEvent(evt.tokenId, 'TRANSFER', hash, "OEM");
                await BlockchainService.transferPassport(evt.tokenId, evt.data.toOwner);
            } else if (evt.type === 'RECYCLE') {
                await BlockchainService.decommission(evt.tokenId, hash, evt.data.finalState);
                try { await SupabaseService.logRecycle(evt.data.batteryId, evt.data); } catch (e) { }
            } else if (evt.type === 'PURCHASE') {
                await BlockchainService.addEvent(evt.tokenId, 'PURCHASE', hash, "OEM");
                try { await SupabaseService.markAsSold(evt.data.batteryId, evt.data); } catch (e) { }
            } else if (evt.type === 'MAINTENANCE') {
                await BlockchainService.addEvent(evt.tokenId, 'MAINTENANCE', hash, 'SERVICE');
                try { await SupabaseService.logMaintenance(evt.data.batteryId, evt.data); } catch (e) { }
            } else if (evt.type === 'USAGE') {
                await BlockchainService.addEvent(evt.tokenId, 'USAGE', hash, 'OEM');
                try { await SupabaseService.logTelemetry(evt.data.batteryId, evt.data); } catch (e) { }
            } else {
                await BlockchainService.addEvent(evt.tokenId, evt.type, hash, role);
            }
        } catch (e) {
            console.warn(`[SYNC] Failed to restore event ${evt.type}:`, e.message);
        }
    }

    console.log("[SYNC] Restore Sequence Complete.");
}

async function redeploy() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
    const oemWallet = new ethers.Wallet(process.env.OEM_KEY, provider);
    const serviceWallet = new ethers.Wallet(process.env.SERVICE_KEY, provider);
    const recyclerWallet = new ethers.Wallet(process.env.RECYCLER_KEY, provider);

    const { abi, bytecode } = require(ARTIFACT_PATH);
    const factory = new ethers.ContractFactory(abi, bytecode, oemWallet);

    console.log("[SYNC] Deploying new BatteryPassport contract...");
    // Explicitly get nonce for deployment and increment locally for speed
    let currentNonce = await provider.getTransactionCount(oemWallet.address, "pending");
    const contract = await factory.deploy({ nonce: currentNonce++ });
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("[SYNC] Contract deployed to:", address);

    // Grant Roles with explicit sequential nonces to avoid provider lag
    const SERVICE_ROLE = ethers.id("SERVICE_PROVIDER_ROLE");
    const RECYCLER_ROLE = ethers.id("RECYCLER_ROLE");

    console.log("[SYNC] Granting roles...");
    await (await contract.grantRole(SERVICE_ROLE, serviceWallet.address, { nonce: currentNonce++ })).wait();
    await (await contract.grantRole(RECYCLER_ROLE, recyclerWallet.address, { nonce: currentNonce++ })).wait();

    // Update .env
    let envContent = await fs.readFile(ENV_PATH, "utf-8");
    envContent = envContent
        .replace(/^CONTRACT_ADDRESS=.*/m, `CONTRACT_ADDRESS=${address}`)
        .replace(/^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m, `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
    await fs.writeFile(ENV_PATH, envContent);
    process.env.CONTRACT_ADDRESS = address;
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = address;

    console.log("[SYNC] Environment updated with new contract address.");
    return address;
}

module.exports = { detectAndSync };
