const { ethers } = require("ethers");
const path = require("path");

// Correct artifact path
const artifactPath = path.resolve(
  __dirname,
  "../../../artifacts/contracts/BatteryPassport.sol/BatteryPassport.json"
);

// Load ABI
const { abi } = require(artifactPath);

// Provider
// Provider
const provider = new ethers.JsonRpcProvider((process.env.RPC_URL || "http://127.0.0.1:8545").trim());

// Wallets mapped to roles - with robust trimming
const wallets = {
  OEM: new ethers.Wallet(process.env.OEM_KEY.trim(), provider),
  SERVICE: new ethers.Wallet(process.env.SERVICE_KEY.trim(), provider),
  RECYCLER: new ethers.Wallet(process.env.RECYCLER_KEY.trim(), provider),
  OWNER: new ethers.Wallet(process.env.OWNER_KEY.trim(), provider),
};

// Standard Hardhat Local Keys for seamless dev experience
const HH_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f41914174235c1a142cb37042311410b29",
  "0x47e170ec697e79890650ecd3d07a0330327028d48247118a83f150a94662b102",
  "0xc87509a94843f8870198fa20b81df104d9c77c92b9547d27f8725838421ee1e7",
  "0x8927606659c037889e497330206e00ea6509a25b2a04944ecaf7a1997fa523fc",
  "0x8b3531b402ea9a0957ae615563914945d944c66e288e23f03a62f83111cc7994",
  "0xa8385e331bc433604f7f626c715973491f034a74360e290f65e2361ac86b8641",
  "0xa99cf9ea01ca3589b257529f7983637e6f1ecba0599a0d813470691507f3549a"
];

// Map addresses to wallets for fast lookup
const hhWallets = {};
HH_KEYS.forEach(k => {
  const w = new ethers.Wallet(k, provider);
  hhWallets[w.address.toLowerCase()] = w;
});

const getContractAddress = () => (process.env.CONTRACT_ADDRESS || "").trim();

/**
 * Robust Nonce Management
 * We maintain a cache of the next nonce to use to avoid sync issues 
 * between sequential transactions (e.g. Add Event + Transfer).
 */
const nonceCache = {};
const locks = {};

async function getNextNonce(roleOrAddress) {
  // Resolve address: if it's a role, get from wallets, otherwise assume it's an address
  const address = wallets[roleOrAddress] ? wallets[roleOrAddress].address : roleOrAddress;

  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid role or address for nonce: ${roleOrAddress}`);
  }

  const addrLower = address.toLowerCase();

  // Get current pending nonce from provider
  const networkNonce = await provider.getTransactionCount(address, "pending");

  // Sync cache with network if network is ahead or cache is empty
  if (nonceCache[addrLower] === undefined || networkNonce > nonceCache[addrLower]) {
    nonceCache[addrLower] = networkNonce;
  }

  const current = nonceCache[addrLower];
  nonceCache[addrLower]++;
  return current;
}

function getOemAddress() {
  return wallets.OEM.address;
}

/**
 * Ensures transactions for a specific role are sent sequentially.
 */
async function withLock(role, callback) {
  if (!locks[role]) locks[role] = Promise.resolve();

  const prevLock = locks[role];
  let release;
  locks[role] = new Promise(res => { release = res; });

  await prevLock;
  try {
    return await callback(release);
  } catch (error) {
    if (error.message.includes("nonce")) {
      const address = wallets[role] ? wallets[role].address : role;
      if (address) nonceCache[address.toLowerCase()] = undefined;
    }
    throw error;
  } finally {
    release();
  }
}

function contractFor(role) {
  if (!wallets[role]) {
    throw new Error(`Unknown role: ${role}`);
  }
  return new ethers.Contract(getContractAddress(), abi, wallets[role]);
}

// Blockchain Service v2.1 - Enhanced Event Parsing
async function mintPassport(toAddress, dataHash) {
  return await withLock("OEM", async (release) => {
    const cleanAddress = toAddress.trim();
    const contract = contractFor("OEM");
    const nonce = await getNextNonce("OEM");

    console.log(`[BC-SERVICE] Minting for ${cleanAddress} with dataHash ${dataHash} (Nonce: ${nonce})`);
    const tx = await contract.mint(cleanAddress, dataHash, { nonce });

    release(); // RELEASE LOCK EARLY

    const receipt = await tx.wait();
    console.log(`[BC-SERVICE] Mint TX confirmed: ${tx.hash}`);

    let tokenId = null;
    for (const log of (receipt.logs || [])) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'PassportMinted') {
          // tokenId is the first argument
          tokenId = parsed.args[0];
          console.log(`[BC-SERVICE] Found PassportMinted event. TokenID: ${tokenId.toString()}`);
          break;
        }
      } catch (e) {
        // Fallback: If parseLog fails (sometimes happens with indexed strings in older ethers versions),
        // try to match the topic hash for PassportMinted(uint256,address,string)
        // Topic 0: keccak256("PassportMinted(uint256,address,string)") = 0x82f45ea3d7e52b2023dbb7e0bbfa199709d4eb4ccf3e2e854ebd8c0b5debe781
        if (log.topics[0] === '0x82f45ea3d7e52b2023dbb7e0bbfa199709d4eb4ccf3e2e854ebd8c0b5debe781') {
          // tokenId is the first indexed param (topic[1])
          tokenId = ethers.toBigInt(log.topics[1]);
          console.log(`[BC-SERVICE] Found PassportMinted event via raw topic fallback. TokenID: ${tokenId.toString()}`);
          break;
        }
      }
    }

    if (tokenId === null) {
      console.warn(`[BC-SERVICE] Warning: PassportMinted event not found in logs. Generating fallback ID.`);
      // Recovery fallback: use Nonce as the Token ID to prevent absolute crash if node doesn't return logs properly
      tokenId = nonce;
    }

    return { tx, tokenId: tokenId.toString(), receipt };
  });
}

async function addEvent(tokenId, eventTypeString, dataHash, role = "OEM") {
  return await withLock(role, async (release) => {
    const contract = contractFor(role);
    const nonce = await getNextNonce(role);
    console.log(`[BC-SERVICE] Adding ${eventTypeString} (Nonce: ${nonce})...`);

    try {
      const tx = await contract.addEvent(tokenId, eventTypeString, dataHash, { nonce });
      release(); // unblock next tx
      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      if (error.data && error.data.startsWith("0xe2517d3f")) {
        const addr = wallets[role].address;
        throw new Error(`ACCESS_CONTROL_FAILED: The ${role} wallet (${addr}) does not have the required role (MANUFACTURER/SERVICE) to log this event. Run 'node fix_roles.js' to grant permissions to Account #0.`);
      }
      throw error;
    }
  });
}

const StatusMap = {
  "Active": 0,
  "SecondLife": 1,
  "Recycled": 2,
  "Disposed": 3
};

async function decommission(tokenId, dataHash, status = "Recycled") {
  return await withLock("RECYCLER", async (release) => {
    const contract = contractFor("RECYCLER");
    const statusInt = StatusMap[status] ?? 2;
    const nonce = await getNextNonce("RECYCLER");
    console.log(`[BC-SERVICE] Decommissioning Token ${tokenId} (Nonce: ${nonce})...`);
    const tx = await contract.decommission(tokenId, statusInt, dataHash, { nonce });

    release(); // unblock next tx

    const receipt = await tx.wait();
    return { tx, receipt };
  });
}

async function transferPassport(tokenId, toAddress) {
  const contract = contractFor("OEM");
  const currentOwner = await contract.ownerOf(tokenId);
  const ownerLower = currentOwner.toLowerCase();

  let role = "OEM";
  let targetWallet = wallets.OEM;

  if (ownerLower === wallets.OWNER.address.toLowerCase()) {
    role = "OWNER";
    targetWallet = wallets.OWNER;
  } else if (hhWallets[ownerLower]) {
    role = ownerLower;
    targetWallet = hhWallets[ownerLower];
    console.log(`[BC-SERVICE] Auto-detected Hardhat Owner (${ownerLower}). Using local key for transfer.`);
  } else if (ownerLower === wallets.OEM.address.toLowerCase()) {
    role = "OEM";
    targetWallet = wallets.OEM;
  } else {
    // Fallback to OEM if no match - though this will likely fail ERC721 auth if OEM doesn't own it
    console.warn(`[BC-SERVICE] Current owner ${currentOwner} not found in local keys. Attempting with OEM (Account #0).`);
    role = "OEM";
    targetWallet = wallets.OEM;
  }

  return await withLock(role, async (release) => {
    const activeContract = new ethers.Contract(getContractAddress(), abi, targetWallet);
    const nonce = await getNextNonce(targetWallet.address);

    console.log(`[BC-SERVICE] Transferring Token ${tokenId} from ${currentOwner} (Nonce: ${nonce})...`);

    try {
      const tx = await activeContract.getFunction("safeTransferFrom(address,address,uint256)")(
        currentOwner,
        toAddress,
        tokenId,
        { nonce }
      );

      release();

      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      if (error.data && error.data.startsWith("0x177e802f")) {
        throw new Error(`ERC721_AUTHORIZATION_FAILED: The wallet (${targetWallet.address}) is not authorized to move Token #${tokenId} owned by ${currentOwner}.`);
      }
      throw error;
    }
  });
}

async function getBatteryStatus(tokenId) {
  const contract = contractFor("OEM");
  try {
    const result = await contract.getBatteryStatus(tokenId);
    return Number(result); // Returns number (0-3)
  } catch (e) {
    // Token may not exist on-chain (e.g. after a fresh Hardhat restart)
    console.warn(`[BC-SERVICE] getBatteryStatus failed for token ${tokenId}: ${e.message?.substring(0, 80)}`);
    return -1; // Not found on-chain
  }
}

async function burnPassport(tokenId) {
  // OEM wallet has DEFAULT_ADMIN_ROLE in our setup
  const contract = contractFor("OEM");
  console.log(`[Service] Attempting to burn token ${tokenId} with OEM wallet ${wallets.OEM.address}`);
  try {
    const tx = await contract.burn(tokenId);
    console.log(`[Service] Burn transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[Service] Burn transaction confirmed.`);
    return { tx, receipt };
  } catch (error) {
    console.error(`[Service] Burn failed:`, error);
    if (error.data) {
      console.error(`[Service] Revert data: ${error.data}`);
    }
    throw error;
  }
}

async function readLifecycleEvent(tokenId, index) {
  console.log(`[Service] Reading event for Token ${tokenId} at index ${index}`);
  const contract = contractFor("OEM");
  try {
    // Log available functions
    // console.log(contract.interface.fragments.map(f => f.name));
    return await contract.getLifecycleEvent(tokenId, index);
  } catch (e) {
    console.error("[Service] Contract Call Failed:", e);
    throw e;
  }
}


async function getEventCount(tokenId) {
  const contract = contractFor("OEM");
  const count = await contract.getEventCount(tokenId);
  return Number(count);
}

async function isDecommissioned(tokenId) {
  const contract = contractFor("OEM");
  try {
    // 1. Try direct contract state if available
    const onChainStatus = await contract.isDecommissioned(tokenId);
    if (onChainStatus) return true;
  } catch (e) {
    console.log("[BlockchainService] isDecommissioned method not found on contract, falling back to history check.");
  }

  // 2. Fallback: Check event history for RECYCLING events with Disposed state
  try {
    const count = await getEventCount(tokenId);
    for (let i = count - 1; i >= 0; i--) {
      const evt = await readLifecycleEvent(tokenId, i);
      // "RECYCLING" string hash is what we check
      const recyclingHash = ethers.id("RECYCLING");
      if (evt.eventType === recyclingHash) {
        // If we found a recycling event, we consider it decommissioned for security
        return true;
      }
    }
  } catch (e) {
    console.error("[BlockchainService] History check failed:", e);
  }

  return false;
}

module.exports = {
  contractFor,
  mintPassport,
  addEvent,
  decommission,
  getBatteryStatus,
  transferPassport,
  burnPassport,
  readLifecycleEvent,
  getEventCount,
  isDecommissioned,
  getOemAddress
};
