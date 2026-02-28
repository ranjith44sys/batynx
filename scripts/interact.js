const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const contractAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const report = fs.readFileSync("battery-report.json");
  const reportHash = ethers.keccak256(report);

  const [admin, serviceCenter, recycler] = await ethers.getSigners();

  const BatteryRegistry = await ethers.getContractFactory("BatteryRegistry");

  const registry = BatteryRegistry.attach(contractAddress);

  // Assign roles
  await registry.assignRole(serviceCenter.address, 2); // SERVICE_CENTER
  await registry.assignRole(recycler.address, 3); // RECYCLER

  // OEM creates battery
  await registry.connect(admin).createBattery("BAT123", reportHash);

  // Service center updates
  await registry
    .connect(serviceCenter)
    .serviceBattery("BAT123", reportHash);

  // Recycler retires
  await registry
    .connect(recycler)
    .retireBattery("BAT123", reportHash);

  const result = await registry.getBattery("BAT123");
  console.log("Final hash:", result[0]);
  console.log("Final status:", result[1]); // should be RETIRED
}

main().catch(console.error);
