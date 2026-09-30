const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet + SectorialStableCoin integration", function () {
  let wallet, token, owners, recipient;
  const threshold = 2;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owners = signers.slice(0, 3); // 3 owners, 2-of-3 required
    recipient = signers[3];

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    wallet = await MultiSigWallet.deploy(owners.map((o) => o.address), threshold);
    await wallet.waitForDeployment();

    const SectorialStableCoin = await ethers.getContractFactory("SectorialStableCoin");
    token = await SectorialStableCoin.deploy(
      "Sectorial Stable Coin",
      "SSC",
      "Agriculture",
      await wallet.getAddress()
    );
    await token.waitForDeployment();
  });

  it("makes the wallet the token owner at deployment", async function () {
    expect(await token.owner()).to.equal(await wallet.getAddress());
  });

  it("rejects a direct mint call from anyone, including a wallet owner acting alone", async function () {
    await expect(
      token.connect(owners[0]).mint(recipient.address, ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("refuses to mint until the required number of owners confirm", async function () {
    const mintData = token.interface.encodeFunctionData("mint", [
      recipient.address,
      ethers.parseEther("500"),
    ]);

    await wallet.connect(owners[0]).submitTransaction(await token.getAddress(), 0, mintData);
    await wallet.connect(owners[0]).confirmTransaction(0);

    await expect(wallet.executeTransaction(0)).to.be.revertedWith(
      "MultiSigWallet: not enough confirmations"
    );
    expect(await token.balanceOf(recipient.address)).to.equal(0);
  });

  it("mints only once the threshold is reached, via the wallet", async function () {
    const mintData = token.interface.encodeFunctionData("mint", [
      recipient.address,
      ethers.parseEther("500"),
    ]);

    await wallet.connect(owners[0]).submitTransaction(await token.getAddress(), 0, mintData);
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);

    await expect(wallet.executeTransaction(0)).to.emit(wallet, "TransactionExecuted");
    expect(await token.balanceOf(recipient.address)).to.equal(ethers.parseEther("500"));
  });

  it("gates pause/freeze the same way as mint", async function () {
    const pauseData = token.interface.encodeFunctionData("pause", []);

    await wallet.connect(owners[0]).submitTransaction(await token.getAddress(), 0, pauseData);
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);
    await wallet.executeTransaction(0);

    expect(await token.paused()).to.be.true;
  });
});
