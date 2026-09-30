const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SectorialStableCoin", function () {
  let token, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const SectorialStableCoin = await ethers.getContractFactory("SectorialStableCoin");
    token = await SectorialStableCoin.deploy(
      "Sectorial Stable Coin",
      "SSC",
      "Agriculture",
      owner.address
    );
    await token.waitForDeployment();
  });

  it("sets name, symbol, decimals and sector correctly", async function () {
    expect(await token.name()).to.equal("Sectorial Stable Coin");
    expect(await token.symbol()).to.equal("SSC");
    expect(await token.decimals()).to.equal(18);
    expect(await token.sector()).to.equal("Agriculture");
  });

  it("allows the owner to update the sector label", async function () {
    await expect(token.updateSector("Healthcare"))
      .to.emit(token, "SectorUpdated")
      .withArgs("Healthcare");
    expect(await token.sector()).to.equal("Healthcare");
  });

  it("rejects a sector update from a non-owner", async function () {
    await expect(
      token.connect(user1).updateSector("Healthcare")
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("allows the owner to mint tokens", async function () {
    await expect(token.mint(user1.address, ethers.parseEther("100")))
      .to.emit(token, "TokensIssued")
      .withArgs(user1.address, ethers.parseEther("100"));

    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
  });

  it("rejects minting from a non-owner", async function () {
    await expect(
      token.connect(user1).mint(user1.address, ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("allows the owner to burn tokens", async function () {
    await token.mint(user1.address, ethers.parseEther("100"));
    await token.burn(user1.address, ethers.parseEther("40"));
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("60"));
  });

  it("blocks minting and transfers while paused", async function () {
    await token.mint(user1.address, ethers.parseEther("100"));
    await token.pause();

    await expect(
      token.mint(user2.address, ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(token, "EnforcedPause");

    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(token, "EnforcedPause");

    await token.unpause();
    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseEther("10"))
    ).to.not.be.reverted;
  });

  it("blocks transfers to or from a frozen address", async function () {
    await token.mint(user1.address, ethers.parseEther("100"));
    await token.freeze(user1.address);

    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseEther("10"))
    ).to.be.revertedWith("SectorialStableCoin: sender frozen");

    await token.unfreeze(user1.address);
    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseEther("10"))
    ).to.not.be.reverted;
  });

  it("allows normal transfers between unfrozen accounts", async function () {
    await token.mint(user1.address, ethers.parseEther("100"));
    await token.connect(user1).transfer(user2.address, ethers.parseEther("30"));
    expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("30"));
  });
});
