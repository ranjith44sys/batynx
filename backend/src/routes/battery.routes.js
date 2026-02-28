const express = require("express");
const { saveReport } = require("../services/storage.service");
const { hashFile } = require("../services/hash.service");
const { contractFor } = require("../services/blockchain.service");

const router = express.Router();

router.post("/create", async (req, res) => {
  const { batteryId, report } = req.body;

  const filePath = await saveReport(batteryId, report);
  const hash = hashFile(filePath);

  const tx = await contractFor("OEM").createBattery(batteryId, hash);
  await tx.wait();

  res.json({ status: "CREATED", hash });
});

router.post("/service", async (req, res) => {
  const { batteryId, report } = req.body;

  const filePath = await saveReport(batteryId, report);
  const hash = hashFile(filePath);

  const tx = await contractFor("SERVICE").serviceBattery(batteryId, hash);
  await tx.wait();

  res.json({ status: "SERVICED", hash });
});

router.post("/retire", async (req, res) => {
  const { batteryId, report } = req.body;

  const filePath = await saveReport(batteryId, report);
  const hash = hashFile(filePath);

  const tx = await contractFor("RECYCLER").retireBattery(batteryId, hash);
  await tx.wait();

  res.json({ status: "RETIRED", hash });
});

module.exports = router;
