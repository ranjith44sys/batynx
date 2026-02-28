const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BatteryPassport", function () {
    let BatteryPassport, passport;
    let owner, manufacturer, serviceProvider, recycler, user;
    let MANUFACTURER_ROLE, SERVICE_PROVIDER_ROLE, RECYCLER_ROLE;

    beforeEach(async function () {
        [owner, manufacturer, serviceProvider, recycler, user] = await ethers.getSigners();

        const BatteryPassportFactory = await ethers.getContractFactory("BatteryPassport");
        passport = await BatteryPassportFactory.deploy();
        await passport.waitForDeployment();

        MANUFACTURER_ROLE = await passport.MANUFACTURER_ROLE();
        SERVICE_PROVIDER_ROLE = await passport.SERVICE_PROVIDER_ROLE();
        RECYCLER_ROLE = await passport.RECYCLER_ROLE();

        // Grant roles
        await passport.grantRole(MANUFACTURER_ROLE, manufacturer.address);
        await passport.grantRole(SERVICE_PROVIDER_ROLE, serviceProvider.address);
        await passport.grantRole(RECYCLER_ROLE, recycler.address);
    });

    it("Should allow manufacturer to mint a passport", async function () {
        const initialHash = ethers.id("manufacturing-data");
        await expect(passport.connect(manufacturer).mint(manufacturer.address, initialHash))
            .to.emit(passport, "PassportMinted")
            .withArgs(0, manufacturer.address, initialHash);

        expect(await passport.ownerOf(0)).to.equal(manufacturer.address);
    });

    it("Should fail if non-manufacturer tries to mint", async function () {
        const initialHash = ethers.id("manufacturing-data");
        await expect(passport.connect(user).mint(user.address, initialHash))
            .to.be.revertedWithCustomError(passport, "AccessControlUnauthorizedAccount");
    });

    it("Should allow service provider to add maintenance event", async function () {
        // Mint first
        await passport.connect(manufacturer).mint(manufacturer.address, ethers.id("init"));

        const repairHash = ethers.id("repair-data");
        await expect(passport.connect(serviceProvider).addEvent(0, "MAINTENANCE", repairHash))
            .to.emit(passport, "LifecycleEventAdded")
            .withArgs(0, "MAINTENANCE", repairHash, serviceProvider.address);
    });

    it("Should fail if unauthorized user tries to add maintenance", async function () {
        await passport.connect(manufacturer).mint(manufacturer.address, ethers.id("init"));
        const repairHash = ethers.id("repair-data");
        // User is not a service provider
        await expect(passport.connect(user).addEvent(0, "MAINTENANCE", repairHash))
            .to.be.revertedWith("Caller is not a service provider");
    });

    it("Should allow recycler to decommission", async function () {
        await passport.connect(manufacturer).mint(manufacturer.address, ethers.id("init"));
        const finalHash = ethers.id("final-data");

        await expect(passport.connect(recycler).decommission(0, finalHash))
            .to.emit(passport, "BatteryDecommissioned")
            .withArgs(0, recycler.address, finalHash);
    });
});
