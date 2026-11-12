// Deploy SevenSigma to BSC MAINNET (chain 56).
// MAINNET ONLY. No mock registry — constructor args are the REAL Agent ID
// registry and the USER wallet as initialOwner. The deployer is a FRESH
// throwaway wallet (key only in .env.mainnet, chmod 600); it pays gas only.
// It is NOT the testnet deployer (0xd943bdD7236E000BF914531Bc235b60200f0d65D),
// never fund it with testnet keys, never use the testnet deployer here.
//
// Usage:
//   node scripts/deploy-mainnet.js            # deploy (needs >= 0.001 BNB)
//   node scripts/deploy-mainnet.js --estimate # gas estimate only, no deploy
// Funding: user sends ~0.001 BNB to the deployer address from the user
// wallet. Deploy costs ~1,811,365 gas; at 0.05 gwei that is ~0.00009 BNB.
// 0.001 BNB leaves ample margin plus the leftover-return tx. Verify the
// top-up ON CHAIN before running (M10 lesson: never assume a transfer
// landed — this script reads the balance first and exits if < 0.001 BNB).
// After deploy, leftover deployer BNB is returned to the user wallet and
// the return tx is recorded (separate step, not this script).
// setBaseURI is owner-only: the USER wallet signs it via baw with a
// preview + explicit confirm (M15 lesson), NOT the deployer.
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RPC = "https://bsc-dataseed.binance.org/";
const CHAIN_ID = 56;
const ENV_FILE = path.join(root, ".env.mainnet");
const DEPLOY_FILE = path.join(root, "deployment-mainnet.json");
const MIN_BALANCE = ethers.parseEther("0.001");
const REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const OWNER = "0x75d251Ba39dED2E456d9f6DD776f77d422864403";
const TESTNET_DEPLOYER = "0xd943bdD7236E000BF914531Bc235b60200f0d65D";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "build", `${name}.json`), "utf8"));
}
function loadEnv() {
  const out = {};
  if (fs.existsSync(ENV_FILE)) {
    for (const line of fs.readFileSync(ENV_FILE, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
const env = loadEnv();
if (!env.DEPLOYER_PRIVATE_KEY) {
  console.log("BLOCKED: .env.mainnet missing DEPLOYER_PRIVATE_KEY. Generate the fresh mainnet deployer first; never reuse the testnet key.");
  process.exit(2);
}
const deployer = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, provider);
if (deployer.address.toLowerCase() === TESTNET_DEPLOYER.toLowerCase()) {
  console.log("BLOCKED: deployer is the TESTNET deployer. Never use the testnet key on mainnet.");
  process.exit(2);
}
if (deployer.address.toLowerCase() === OWNER.toLowerCase()) {
  console.log("BLOCKED: deployer must be a throwaway, not the user wallet.");
  process.exit(2);
}
console.log("Deployer address:", deployer.address);
console.log("Registry (real):", REGISTRY);
console.log("Owner (user wallet):", OWNER);

const balance = await provider.getBalance(deployer.address);
console.log("Deployer BNB balance (on-chain):", ethers.formatEther(balance));
const feeData = await provider.getFeeData();
console.log("Mainnet gas price:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "n/a");

const sigmaArt = loadArtifact("SevenSigma");
const sigmaFactory = new ethers.ContractFactory(sigmaArt.abi, sigmaArt.bytecode, deployer);
try {
  const sigmaTx = await sigmaFactory.getDeployTransaction(REGISTRY, OWNER);
  const sigmaGas = await provider.estimateGas({ ...sigmaTx, from: deployer.address });
  const price = feeData.gasPrice ?? 50_000_000n;
  console.log(`Est. deploy gas: ${sigmaGas}`);
  console.log(`Est. deploy cost at ${ethers.formatUnits(price, "gwei")} gwei: ${ethers.formatEther(sigmaGas * price)} BNB`);
} catch (e) {
  console.log("Gas estimate failed:", e.message);
}

if (process.argv.includes("--estimate")) process.exit(0);

if (balance < MIN_BALANCE) {
  console.log("\n=== BLOCKED: mainnet deployer needs BNB ===");
  console.log(`1. Send ~0.001 BNB (from the user wallet ${OWNER}) to: ${deployer.address}`);
  console.log("2. Verify the balance on-chain, then re-run: node scripts/deploy-mainnet.js");
  console.log("   (Key is saved in .env.mainnet — never share it.)");
  process.exit(2);
}

console.log("\nDeploying SevenSigma to BSC MAINNET (owner = user wallet)...");
const sigma = await sigmaFactory.deploy(REGISTRY, OWNER);
await sigma.waitForDeployment();
const sigmaAddr = await sigma.getAddress();
const deployTx = sigma.deploymentTransaction();
const sigmaRc = await deployTx.wait();
console.log("SevenSigma deployed:", sigmaAddr, "tx", deployTx.hash, "gas", sigmaRc.gasUsed.toString(), "block", sigmaRc.blockNumber);

// --- On-chain reads, asserted against the locked Gate 0 expectations ---
const reads = {
  owner: await sigma.owner(),
  totalSupply: (await sigma.totalSupply()).toString(),
  freeMintedCount: (await sigma.freeMintedCount()).toString(),
  freeRemaining: (await sigma.freeRemaining()).toString(),
  paidRemaining: (await sigma.paidRemaining()).toString(),
  freeOpen: await sigma.freeOpen(),
  paidOpen: await sigma.paidOpen(),
  registry: await sigma.agentIdRegistry(),
  royalty: await sigma.royaltyInfo(1, ethers.parseEther("1")),
};
console.log("\nOn-chain reads:", JSON.stringify({ ...reads, royalty: [reads.royalty[0], reads.royalty[1].toString()] }, null, 2));

const checks = [
  ["owner is user wallet", reads.owner.toLowerCase() === OWNER.toLowerCase()],
  ["registry is real registry", reads.registry.toLowerCase() === REGISTRY.toLowerCase()],
  ["totalSupply 0", reads.totalSupply === "0"],
  ["freeMintedCount 0", reads.freeMintedCount === "0"],
  ["freeRemaining 150", reads.freeRemaining === "150"],
  ["paidRemaining 627", reads.paidRemaining === "627"],
  ["freeOpen true", reads.freeOpen === true],
  ["paidOpen false", reads.paidOpen === false],
  ["royaltyInfo 5% to owner", reads.royalty[1] === ethers.parseEther("0.05") && reads.royalty[0].toLowerCase() === OWNER.toLowerCase()],
];
for (const [name, ok] of checks) console.log(`CHECK ${name}: ${ok ? "OK" : "FAIL"}`);

const deployment = {
  network: "BSC mainnet",
  chainId: CHAIN_ID,
  deployedAt: new Date().toISOString(),
  deployer: deployer.address,
  registry: REGISTRY,
  owner: OWNER,
  sevenSigma: sigmaAddr,
  sevenSigmaDeployTx: deployTx.hash,
  sevenSigmaDeployGas: sigmaRc.gasUsed.toString(),
  blockNumber: sigmaRc.blockNumber,
  deployerBalanceBefore: ethers.formatEther(balance),
  onChainReads: { ...reads, royalty: [reads.royalty[0], reads.royalty[1].toString()] },
  checks: Object.fromEntries(checks),
  status: "deployed",
  note: "MAINNET. baseURI NOT yet set (owner-only; user wallet signs via baw with preview + explicit confirm). Leftover deployer BNB to be returned to the user wallet; return tx to be recorded separately. Verify on Sourcify + BscScan next.",
};
fs.writeFileSync(DEPLOY_FILE, JSON.stringify(deployment, null, 2));
console.log("\nSaved:", DEPLOY_FILE);
console.log("Verify on BscScan: https://bscscan.com/address/" + sigmaAddr);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.log(`\n${failed.length} POST-DEPLOY CHECK(S) FAILED — do not proceed to launch.`);
  process.exit(1);
}
console.log("\nAll post-deploy checks passed. Next: return leftover deployer BNB, verify Sourcify + BscScan, owner setBaseURI, update site with this address.");
