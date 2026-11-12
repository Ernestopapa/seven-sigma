// Deploy SevenSigma + AgentIdRegistryMock to BSC TESTNET (chain 97).
// TESTNET ONLY. Never point this at mainnet, never use the user's real
// wallet key. The deployer is a FRESH throwaway wallet generated locally
// and stored in .env.testnet (chmod 600). Only its ADDRESS is recorded
// in deployment-testnet.json / SPECS.md.
//
// Usage:
//   node scripts/deploy-testnet.js            # deploy + run live tests
//   node scripts/deploy-testnet.js --estimate # gas estimate only, no deploy
// The deployer needs >= 0.02 tBNB: deploys (~2.1M gas) + setAgents batches
// + funding 150 agent test wallets (0.0001 tBNB each for free-mint gas)
// + funding the plain test wallet for paid mints. Testnet gas is ~0.1 gwei,
// so a single faucet claim (~0.1 tBNB) is more than enough. If the balance
// is lower the script stops (exit 2) with faucet instructions. Fund it,
// then re-run the same command. Faucet: https://testnet.bnbchain.org/faucet-smart
// (M10 lesson: verify any claimed top-up ON CHAIN before redeploying;
// never assume a transfer landed — this script reads the balance first.)
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const CHAIN_ID = 97;
const FAUCET = "https://testnet.bnbchain.org/faucet-smart";
const ENV_FILE = path.join(root, ".env.testnet");
const DEPLOY_FILE = path.join(root, "deployment-testnet.json");
const TESTS_FILE = path.join(root, "testnet-live-tests.json");
const MIN_BALANCE = ethers.parseEther("0.025");
const FREE_COUNT = 150;
const PAID_PRICE = ethers.parseEther("0.00042");

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
let deployer;
if (env.DEPLOYER_PRIVATE_KEY) {
  deployer = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, provider);
} else {
  deployer = ethers.Wallet.createRandom().connect(provider);
  fs.writeFileSync(
    ENV_FILE,
    `# TESTNET-ONLY throwaway deployer — never fund with real BNB, never use on mainnet.\n# Address: ${deployer.address}\nDEPLOYER_PRIVATE_KEY=${deployer.privateKey}\n`,
    { mode: 0o600 }
  );
  console.log("Generated fresh throwaway testnet deployer.");
}
console.log("Deployer address:", deployer.address);

const balance = await provider.getBalance(deployer.address);
console.log("Deployer tBNB balance (on-chain):", ethers.formatEther(balance));
const feeData = await provider.getFeeData();
console.log("Testnet gas price:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "n/a");

const mockArt = loadArtifact("AgentIdRegistryMock");
const sigmaArt = loadArtifact("SevenSigma");
const mockFactory = new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, deployer);
const sigmaFactory = new ethers.ContractFactory(sigmaArt.abi, sigmaArt.bytecode, deployer);
try {
  const mockTx = await mockFactory.getDeployTransaction(deployer.address);
  const sigmaTx = await sigmaFactory.getDeployTransaction(deployer.address, deployer.address);
  const mockGas = await provider.estimateGas({ ...mockTx, from: deployer.address });
  const sigmaGas = await provider.estimateGas({ ...sigmaTx, from: deployer.address });
  const price = feeData.gasPrice ?? 3_000_000_000n;
  console.log(`Est. deploy gas: mock ${mockGas}, SevenSigma ${sigmaGas} (total ${mockGas + sigmaGas})`);
  console.log(`Est. deploy cost at ${ethers.formatUnits(price, "gwei")} gwei: ${ethers.formatEther((mockGas + sigmaGas) * price)} tBNB`);
  console.log(`Plus ~0.025 tBNB to fund 150 agent test wallets + paid-test wallet. Total needed: ~0.025 tBNB (one faucet claim of ~0.1 tBNB is plenty).`);
} catch (e) {
  console.log("Gas estimate failed (RPC may need a funded from-address):", e.message);
}

if (process.argv.includes("--estimate")) process.exit(0);

if (balance < MIN_BALANCE) {
  console.log("\n=== BLOCKED: testnet deployer needs tBNB ===");
  console.log(`1. Open ${FAUCET}`);
  console.log(`2. Paste this address: ${deployer.address}`);
  console.log(`3. Claim testnet BNB (faucet gives ~0.1 tBNB per claim; one claim is plenty).`);
  console.log("4. Re-run: node scripts/deploy-testnet.js");
  console.log("   (Key is saved in .env.testnet — never share it, never fund it with real BNB.)");
  console.log("   Verify the balance on-chain before re-running: the script reads it first.");
  process.exit(2);
}

const tests = [];
function record(name, ok, detail) {
  tests.push({ name, ok, detail });
  console.log(`TEST ${name}: ${ok ? "OK" : "FAIL"}${detail ? " — " + detail : ""}`);
}

console.log("\nDeploying AgentIdRegistryMock...");
const mock = await mockFactory.deploy(deployer.address);
await mock.waitForDeployment();
const mockAddr = await mock.getAddress();
const mockRc = await (await mock.deploymentTransaction().wait());
console.log("Mock deployed:", mockAddr, "tx", mock.deploymentTransaction().hash, "gas", mockRc.gasUsed.toString());

// 150 agent test wallets (one free mint each) + 1 plain wallet (never an agent).
const agentWallets = Array.from({ length: FREE_COUNT }, () => ethers.Wallet.createRandom().connect(provider));
const plainWallet = ethers.Wallet.createRandom().connect(provider);
console.log("Agent test wallets: 150 generated. Plain test wallet:", plainWallet.address);
// Persist test wallets IMMEDIATELY (lesson from the 2026-11-02 crash: the
// first run crashed before deployment-testnet.json was written and the
// in-memory wallet keys were lost). Testnet-only throwaways, chmod 600.
fs.writeFileSync(
  path.join(root, "test-wallets-testnet.json"),
  JSON.stringify(
    {
      note: "TESTNET-ONLY throwaway wallets. Never use on mainnet, never fund with real BNB.",
      agents: agentWallets.map((w) => ({ address: w.address, privateKey: w.privateKey })),
      plain: { address: plainWallet.address, privateKey: plainWallet.privateKey },
    },
    null,
    2
  ),
  { mode: 0o600 }
);
console.log("Test wallets saved to test-wallets-testnet.json (before any deploy).");
for (let i = 0; i < agentWallets.length; i += 50) {
  const batch = agentWallets.slice(i, i + 50).map((w) => w.address);
  await (await mock.setAgents(batch, true)).wait();
  console.log(`Mock: agents ${i + 1}-${i + batch.length} marked as Agent ID holders.`);
}

console.log("Deploying SevenSigma (owner = throwaway deployer, TESTNET ONLY)...");
const sigma = await sigmaFactory.deploy(mockAddr, deployer.address);
await sigma.waitForDeployment();
const sigmaAddr = await sigma.getAddress();
const sigmaRc = await (await sigma.deploymentTransaction().wait());
console.log("SevenSigma deployed:", sigmaAddr, "tx", sigma.deploymentTransaction().hash, "gas", sigmaRc.gasUsed.toString());

// Fund test wallets: agents need free-mint gas only; plain needs paid price + gas.
// agentWallets[0] also gets an extra 0.0015 tBNB for the agent paid-mint x3
// test (0.00126) — lesson from the 2026-11-02 crash, where it held only
// 0.0001 tBNB and the x3 mint failed INSUFFICIENT_FUNDS at estimateGas.
for (const w of agentWallets) {
  await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("0.0001") })).wait();
}
await (await deployer.sendTransaction({ to: agentWallets[0].address, value: ethers.parseEther("0.0015") })).wait();
await (await deployer.sendTransaction({ to: plainWallet.address, value: ethers.parseEther("0.005") })).wait();
console.log("Test wallets funded.");

// --- Live test 1: freeMint succeeds for Agent ID holder ---
const tx1 = await sigma.connect(agentWallets[0]).freeMint();
const rc1 = await tx1.wait();
record("freeMint (agent wallet)", (await sigma.ownerOf(1)) === agentWallets[0].address, `tx ${tx1.hash} gas ${rc1.gasUsed} token #1`);

// --- Live test 2: second freeMint from same wallet must revert ---
try {
  await (await sigma.connect(agentWallets[0]).freeMint()).wait();
  record("double freeMint reverts", false, "second mint succeeded (BUG)");
} catch (e) {
  record("double freeMint reverts", true, String(e.message).slice(0, 100));
}

// --- Live test 3: non-Agent wallet must revert on freeMint ---
try {
  await (await sigma.connect(plainWallet).freeMint()).wait();
  record("freeMint (non-agent) reverts", false, "non-agent minted (BUG)");
} catch (e) {
  record("freeMint (non-agent) reverts", true, String(e.message).slice(0, 100));
}

// --- Live test 4: paid mint is blocked while free supply remains ---
// Use the FUNDED plain wallet (0.005 tBNB) so the revert is proven to come
// from the contract ("paid mint not open yet"), not from insufficient funds
// — lesson from the 2026-11-02 crash, where an underfunded agent wallet
// made this check a false pass.
try {
  await (await sigma.connect(plainWallet).mint(1, { value: PAID_PRICE })).wait();
  record("paid mint blocked during free phase", false, "paid mint succeeded early (BUG)");
} catch (e) {
  record("paid mint blocked during free phase", /paid mint not open yet/.test(e.message), String(e.message).slice(0, 100));
}

// --- Exhaust the free 150 ---
console.log(`\nExhausting free supply: ${FREE_COUNT - 1} more agent free mints...`);
let lastFreeTx = tx1.hash;
for (let i = 1; i < agentWallets.length; i++) {
  const tx = await sigma.connect(agentWallets[i]).freeMint();
  const rc = await tx.wait();
  lastFreeTx = tx.hash;
  if ((i + 1) % 25 === 0) console.log(`  free mints done: ${i + 1}/150 (last tx ${tx.hash.slice(0, 18)}..., gas ${rc.gasUsed})`);
}
const freeCount = await sigma.freeMintedCount();
record("free supply exhausted (150/150)", freeCount === 150n, `freeMintedCount=${freeCount} last tx ${lastFreeTx}`);
record("freeRemaining 0 / paidOpen true", (await sigma.freeRemaining()) === 0n && (await sigma.paidOpen()) === true, "");

// --- CRITICAL live test 5: non-agent CAN paid-mint after free exhaustion ---
const txP1 = await sigma.connect(plainWallet).mint(1, { value: PAID_PRICE });
const rcP1 = await txP1.wait();
record(
  "paid mint x1 (NON-AGENT) succeeds after free exhaustion",
  (await sigma.ownerOf(151)) === plainWallet.address,
  `tx ${txP1.hash} gas ${rcP1.gasUsed} token #151`
);

// --- Live test 6: agent paid mint x3 ---
const txP3 = await sigma.connect(agentWallets[0]).mint(3, { value: PAID_PRICE * 3n });
const rcP3 = await txP3.wait();
record("paid mint x3 (agent) succeeds", (await sigma.ownerOf(154)) === agentWallets[0].address, `tx ${txP3.hash} gas ${rcP3.gasUsed} tokens #152-154`);

// --- Live test 7: qty 4 must revert ---
try {
  await (await sigma.connect(plainWallet).mint(4, { value: PAID_PRICE * 4n })).wait();
  record("paid mint qty 4 reverts", false, "qty 4 succeeded (BUG)");
} catch (e) {
  record("paid mint qty 4 reverts", true, String(e.message).slice(0, 100));
}

// --- Live test 8: wrong price must revert ---
try {
  await (await sigma.connect(plainWallet).mint(1, { value: ethers.parseEther("0.0004") })).wait();
  record("paid mint wrong price reverts", false, "wrong price succeeded (BUG)");
} catch (e) {
  record("paid mint wrong price reverts", true, String(e.message).slice(0, 100));
}

// --- On-chain reads ---
const reads = {
  owner: await sigma.owner(),
  totalSupply: (await sigma.totalSupply()).toString(),
  freeMintedCount: (await sigma.freeMintedCount()).toString(),
  freeRemaining: (await sigma.freeRemaining()).toString(),
  paidRemaining: (await sigma.paidRemaining()).toString(),
  freeOpen: await sigma.freeOpen(),
  paidOpen: await sigma.paidOpen(),
  royalty: await sigma.royaltyInfo(151, ethers.parseEther("1")),
};
console.log("\nOn-chain reads:", JSON.stringify({ ...reads, royalty: [reads.royalty[0], reads.royalty[1].toString()] }, null, 2));
record("royaltyInfo 5% to owner", reads.royalty[1] === ethers.parseEther("0.05") && reads.royalty[0] === deployer.address, `receiver ${reads.royalty[0]} amount ${ethers.formatEther(reads.royalty[1])} BNB on 1 BNB sale`);

const deployment = {
  network: "BSC testnet",
  chainId: CHAIN_ID,
  deployedAt: new Date().toISOString(),
  deployer: deployer.address,
  mockRegistry: mockAddr,
  mockDeployTx: mock.deploymentTransaction().hash,
  mockDeployGas: mockRc.gasUsed.toString(),
  sevenSigma: sigmaAddr,
  sevenSigmaDeployTx: sigma.deploymentTransaction().hash,
  sevenSigmaDeployGas: sigmaRc.gasUsed.toString(),
  agentTestWallets: agentWallets.map((w) => w.address),
  plainTestWallet: plainWallet.address,
  freeMintTx: tx1.hash,
  freeMintGas: rc1.gasUsed.toString(),
  lastFreeMintTx: lastFreeTx,
  nonAgentPaidMintTx: txP1.hash,
  nonAgentPaidMintGas: rcP1.gasUsed.toString(),
  agentPaidMintX3Tx: txP3.hash,
  agentPaidMintX3Gas: rcP3.gasUsed.toString(),
  onChainReads: { ...reads, royalty: [reads.royalty[0], reads.royalty[1].toString()] },
  note: "TESTNET ONLY — SUPERSEDED contract, never point minters at it. Private keys are in .env.testnet (throwaway wallets). Never use on mainnet.",
};
fs.writeFileSync(DEPLOY_FILE, JSON.stringify(deployment, null, 2));
fs.writeFileSync(TESTS_FILE, JSON.stringify({ network: "BSC testnet", chainId: CHAIN_ID, at: new Date().toISOString(), tests }, null, 2));
console.log("\nSaved:", DEPLOY_FILE, "and", TESTS_FILE);
console.log("Verify on BscScan testnet: https://testnet.bscscan.com/address/" + sigmaAddr);
const failed = tests.filter((t) => !t.ok);
if (failed.length) {
  console.log(`\n${failed.length} LIVE TEST(S) FAILED — do not proceed to mainnet.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} live tests passed.`);
