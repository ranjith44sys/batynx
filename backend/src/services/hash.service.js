const { keccak256, id } = require("ethers");
const fs = require("fs");

function hashFile(path) {
  const data = fs.readFileSync(path);
  return keccak256(data);
}

function hashBatteryId(batteryId) {
  return id(batteryId); // Keccak256 hash of the string
}

module.exports = { hashFile, hashBatteryId };
