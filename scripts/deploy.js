async function main() {
  const [deployer, potentialService, potentialRecycler] = await ethers.getSigners();

  // For testnets with single private key, use deployer for all roles if others not provided
  const service = potentialService || deployer;
  const recycler = potentialRecycler || deployer;

  const Registry = await ethers.getContractFactory("BatteryPassport");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("BatteryPassport deployed to:", address);

  // Grant roles
  const SERVICE_PROVIDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SERVICE_PROVIDER_ROLE"));
  const RECYCLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECYCLER_ROLE"));

  await registry.grantRole(SERVICE_PROVIDER_ROLE, service.address);
  await registry.grantRole(RECYCLER_ROLE, recycler.address);

  console.log("Granted SERVICE_PROVIDER_ROLE to:", service.address);
  console.log("Granted RECYCLER_ROLE to:", recycler.address);

  const fs = require("fs");
  fs.writeFileSync("latest_address.txt", address);
  console.log("Full address saved to latest_address.txt");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
