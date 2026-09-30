const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
  let wallet, owners, nonOwner;
  const threshold = 2;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owners = signers.slice(0, 3); // 3 owners
    nonOwner = signers[3];

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    wallet = await MultiSigWallet.deploy(owners.map((o) => o.address), threshold);
    await wallet.waitForDeployment();
  });

  it("sets owners and threshold correctly on deployment", async function () {
    const chainOwners = await wallet.getOwners();
    expect(chainOwners.length).to.equal(3);
    expect(await wallet.numConfirmationsRequired()).to.equal(threshold);
    for (const owner of owners) {
      expect(await wallet.isOwner(owner.address)).to.be.true;
    }
  });

  it("rejects deployment with an invalid threshold", async function () {
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    await expect(
      MultiSigWallet.deploy(owners.map((o) => o.address), 0)
    ).to.be.revertedWith("MultiSigWallet: invalid threshold");

    await expect(
      MultiSigWallet.deploy(owners.map((o) => o.address), 5)
    ).to.be.revertedWith("MultiSigWallet: invalid threshold");
  });

  it("allows an owner to submit a transaction", async function () {
    const tx = await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await expect(tx).to.emit(wallet, "TransactionSubmitted");
    expect(await wallet.getTransactionCount()).to.equal(1);
  });

  it("rejects submission from a non-owner", async function () {
    await expect(
      wallet.connect(nonOwner).submitTransaction(owners[0].address, 0, "0x")
    ).to.be.revertedWith("MultiSigWallet: not an owner");
  });

  it("prevents execution before the threshold is reached", async function () {
    await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await wallet.connect(owners[0]).confirmTransaction(0);

    await expect(wallet.executeTransaction(0)).to.be.revertedWith(
      "MultiSigWallet: not enough confirmations"
    );
  });

  it("executes once the threshold is reached", async function () {
    await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);

    await expect(wallet.executeTransaction(0)).to.emit(wallet, "TransactionExecuted");

    const [, , , executed] = await wallet.getTransaction(0);
    expect(executed).to.be.true;
  });

  it("prevents double execution", async function () {
    await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);
    await wallet.executeTransaction(0);

    await expect(wallet.executeTransaction(0)).to.be.revertedWith(
      "MultiSigWallet: tx already executed"
    );
  });

  it("prevents duplicate confirmation by the same owner", async function () {
    await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await wallet.connect(owners[0]).confirmTransaction(0);

    await expect(wallet.connect(owners[0]).confirmTransaction(0)).to.be.revertedWith(
      "MultiSigWallet: tx already confirmed by caller"
    );
  });

  it("allows revoking a confirmation before execution", async function () {
    await wallet.connect(owners[0]).submitTransaction(nonOwner.address, 0, "0x");
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[0]).revokeConfirmation(0);

    const [, , , , numConfirmations] = await wallet.getTransaction(0);
    expect(numConfirmations).to.equal(0);
  });

  it("rejects direct calls to governance functions from outside the wallet", async function () {
    await expect(
      wallet.connect(owners[0]).addOwner(nonOwner.address)
    ).to.be.revertedWith("MultiSigWallet: only via wallet governance");
  });

  it("adds an owner only via the propose-confirm-execute flow", async function () {
    const data = wallet.interface.encodeFunctionData("addOwner", [nonOwner.address]);
    await wallet.connect(owners[0]).submitTransaction(await wallet.getAddress(), 0, data);
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);
    await wallet.executeTransaction(0);

    expect(await wallet.isOwner(nonOwner.address)).to.be.true;
  });

  it("changes the threshold only via the propose-confirm-execute flow", async function () {
    const data = wallet.interface.encodeFunctionData("changeThreshold", [3]);
    await wallet.connect(owners[0]).submitTransaction(await wallet.getAddress(), 0, data);
    await wallet.connect(owners[0]).confirmTransaction(0);
    await wallet.connect(owners[1]).confirmTransaction(0);
    await wallet.executeTransaction(0);

    expect(await wallet.numConfirmationsRequired()).to.equal(3);
  });
});
