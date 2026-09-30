const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();

  // Demo role assignment against Hardhat's default local accounts.
  // Accounts 0-3 are the four authorized multisig owners/approvers.
  const [owner0, owner1, owner2, owner3] = signers;
  const owners = [owner0.address, owner1.address, owner2.address, owner3.address];
  const threshold = 3; // 4 signers, 3-of-4 required

  console.log("Deploying with account:", owner0.address);
  console.log("Owners:", owners);
  console.log("Threshold:", threshold);

  // 1. Deploy MultiSigWallet
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, threshold);
  await wallet.waitForDeployment();
  const walletAddress = await wallet.getAddress();
  console.log("MultiSigWallet deployed to:", walletAddress);

  // 2. Deploy SectorialStableCoin, owned directly by the wallet from the
  // moment it exists — there is no window where a single key controls it.
  const SectorialStableCoin = await ethers.getContractFactory("SectorialStableCoin");
  const token = await SectorialStableCoin.deploy(
    "Sectorial Stable Coin",
    "SSC",
    "Agriculture", // change to whatever sector this instance represents
    walletAddress
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("SectorialStableCoin (SSC) deployed to:", tokenAddress);

  // 3. Demo: mint an initial supply through the real propose -> confirm ->
  // execute flow, using three of the four owners to reach the 3-of-4
  // threshold. This proves the token cannot be minted by any single key,
  // including the deployer's.
  console.log("\nProposing an initial mint through the multisig wallet...");
  const demoRecipient = owner0.address;
  const demoAmount = ethers.parseEther("1000000"); // 1,000,000 SSC demo supply

  const mintData = token.interface.encodeFunctionData("mint", [demoRecipient, demoAmount]);

  const submitTx = await wallet.connect(owner0).submitTransaction(tokenAddress, 0, mintData);
  await submitTx.wait();
  const txIndex = (await wallet.getTransactionCount()) - 1n;

  await (await wallet.connect(owner0).confirmTransaction(txIndex)).wait();
  await (await wallet.connect(owner1).confirmTransaction(txIndex)).wait();
  await (await wallet.connect(owner2).confirmTransaction(txIndex)).wait();
  await (await wallet.executeTransaction(txIndex)).wait();

  const balance = await token.balanceOf(demoRecipient);
  console.log(
    `Minted ${ethers.formatEther(balance)} SSC to ${demoRecipient} (tx index ${txIndex.toString()})`
  );

  // 4. Write a deployment artifact the backend/frontend can consume directly.
  const deployment = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      MultiSigWallet: walletAddress,
      SectorialStableCoin: tokenAddress,
    },
    roles: {
      owners,
      threshold,
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "localhost.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("\nDeployment addresses written to:", outPath);
  console.log(JSON.stringify(deployment.contracts, null, 2));
  console.log(
    "\nCopy these two addresses into backend/.env and frontend/.env " +
      "(WALLET_CONTRACT_ADDRESS / TOKEN_CONTRACT_ADDRESS, and their VITE_ " +
      "equivalents on the frontend) before starting later phases."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
