const express = require("express");
const { loadReport, getReportPath } = require("../services/storage.service");
const { hashFile } = require("../services/hash.service");
const { readLifecycleEvent, getEventCount, isDecommissioned } = require("../services/blockchain.service");

const router = express.Router();

router.get("/:batteryId", async (req, res) => {
  const { batteryId } = req.params;

  try {
    // Check the first event (MANUFACTURING) at index 0
    // Try converting batteryId to integer explicitly if it's "0"
    const tId = await require("../services/storage.service").getTokenId(batteryId);
    console.log(`[VERIFY-PATH-EXEC] BatteryId: ${batteryId}, TokenId: ${tId}`);

    if (tId === null) {
      return res.status(404).json({
        error: "Battery not found",
        details: `ID ${batteryId} not mapped to any blockchain token.`
      });
    }

    // Check if events exist / Token exists
    try {
      const count = await getEventCount(tId);
      if (count == 0) {
        return res.status(404).json({
          error: "Blockchain Sync Issue",
          details: `Token ID ${tId} exists in local storage but has 0 events on-chain. The blockchain state may have been reset.`
        });
      }

      const decommissioned = await isDecommissioned(tId);
      const status = await require("../services/blockchain.service").getBatteryStatus(tId);

      let integrity = true;
      let tamperedEvents = [];

      // Loop through ALL lifecycle events on-chain
      console.log(`[VERIFY] Checking ${count} events for Token ${tId}...`);
      for (let i = 0; i < count; i++) {
        const evt = await readLifecycleEvent(tId, i);
        const onChainHash = evt.dataHash;

        // Load the local report by this exact hash
        const localData = await loadReport(onChainHash);

        if (!localData) {
          console.warn(`[VERIFY] ⚠️ Missing local file for hash ${onChainHash} (Event ${i})`);
          integrity = false;
          tamperedEvents.push(i);
          continue;
        }

        // Re-calculate hash to detect tampering
        const jsonString = JSON.stringify(localData, null, 2);
        const buffer = Buffer.from(jsonString);
        const { keccak256 } = require("ethers");
        const localHash = keccak256(buffer);

        if (localHash !== onChainHash) {
          console.warn(`[VERIFY] ❌ INTEGRITY BREACH at Event ${i}!`);
          console.warn(`[VERIFY] Expected: ${onChainHash}`);
          console.warn(`[VERIFY] Actual:   ${localHash}`);
          integrity = false;
          tamperedEvents.push(i);
        } else {
          console.log(`[VERIFY] ✅ Event ${i} verified.`);
        }
      }
      console.log(`[VERIFY] Final Status for ${batteryId}: ${integrity ? "SAFE" : "TAMPERED"}`);

      let currentReport = await require("../services/supabase.service").getBattery(batteryId).catch(() => null);
      if (!currentReport) {
        currentReport = await loadReport(batteryId);
      }

      res.json({
        integrity,
        tamperedEvents,
        report: currentReport,
        isDecommissioned: decommissioned,
        status: Number(status)
      });
    } catch (bcError) {
      console.error("[VerifyRoutes] Blockchain Error:", bcError.message);
      return res.status(404).json({
        error: "Token Not Found",
        details: `Blockchain record for Token ${tId} could not be retrieved. It may not exist on this network instance.`
      });
    }
  } catch (err) {
    console.error("[VerifyRoutes] Internal Error:", err.message);
    res.status(404).json({
      error: "Battery not found",
      details: err.message,
    });
  }
});

module.exports = router;
