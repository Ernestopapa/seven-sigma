// Verify SevenSigma MAINNET on Sourcify (chain 56) via the v2 API.
// Usage: node scripts/verify-sourcify-mainnet.mjs
// No API key needed. Writes verification/standard-json-mainnet.json and
// verification/sourcify-mainnet-result.json. Same sources as testnet
// (standard-json.json); only chain/address/creation tx differ.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADDRESS = "0x9281740a566901aFBA3E566e505e1896bE176ff8";
const CHAIN_ID = 56;
const CREATION_TX = "0x67d0a362d7c5fdd77a155b65ce443bf1caeeb47eca6ddf34d4aaf73fcb83ecb8";
const CONTRACT_ID = "SevenSigma.sol:SevenSigma";
const COMPILER_VERSION = "0.8.26+commit.8a97fa7a";
const SOURCIFY = "https://sourcify.dev/server";

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function resolveImport(importPath, fromFile) {
  if (importPath.startsWith("@")) {
    const full = path.join(root, "node_modules", importPath);
    return { key: importPath, full };
  }
  const fromDir = path.dirname(fromFile);
  const full = path.resolve(fromDir, importPath);
  let key;
  if (full.startsWith(path.join(root, "contracts"))) {
    key = path.relative(path.join(root, "contracts"), full);
  } else if (full.includes("node_modules")) {
    key = full.split("node_modules/")[1];
  } else {
    key = path.basename(full);
  }
  return { key, full };
}

function collectSources(entryFiles) {
  const sources = {};
  const queue = [];
  for (const f of entryFiles) {
    const key = path.basename(f);
    queue.push({ key, full: path.join(root, "contracts", f) });
  }
  while (queue.length) {
    const { key, full } = queue.shift();
    if (sources[key]) continue;
    const content = readFile(full);
    sources[key] = { content };
    const importRe = /import\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g;
    let m;
    while ((m = importRe.exec(content)) !== null) {
      const r = resolveImport(m[1], full);
      if (!sources[r.key]) queue.push(r);
    }
  }
  return sources;
}

const sources = collectSources(["SevenSigma.sol", "AgentIdRegistryMock.sol"]);
console.log("sources collected:", Object.keys(sources).sort().join(", "));

const stdJsonInput = {
  language: "Solidity",
  sources,
  settings: {
    evmVersion: "cancun",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

fs.mkdirSync(path.join(root, "verification"), { recursive: true });
fs.writeFileSync(
  path.join(root, "verification", "standard-json-mainnet.json"),
  JSON.stringify(stdJsonInput, null, 2)
);
console.log("wrote verification/standard-json-mainnet.json");

// Check current status first
const statusRes = await fetch(
  `${SOURCIFY}/v2/contract/${CHAIN_ID}/${ADDRESS}`,
  { headers: { "User-Agent": "seven-sigma/1.0" } }
);
const statusJson = await statusRes.json();
console.log("current Sourcify status:", JSON.stringify(statusJson).slice(0, 500));
if (statusJson.match || statusJson.creationMatch) {
  console.log("Already verified on Sourcify.");
  fs.writeFileSync(
    path.join(root, "verification", "sourcify-mainnet-result.json"),
    JSON.stringify({ alreadyVerified: true, status: statusJson }, null, 2)
  );
  process.exit(0);
}

const payload = {
  stdJsonInput,
  compilerVersion: COMPILER_VERSION,
  contractIdentifier: CONTRACT_ID,
  creationTransactionHash: CREATION_TX,
};

console.log("submitting to Sourcify v2 verify...");
const res = await fetch(`${SOURCIFY}/v2/verify/${CHAIN_ID}/${ADDRESS}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "seven-sigma/1.0",
  },
  body: JSON.stringify(payload),
});
const body = await res.json();
console.log("submit HTTP", res.status, JSON.stringify(body).slice(0, 1000));
fs.writeFileSync(
  path.join(root, "verification", "sourcify-mainnet-result.json"),
  JSON.stringify({ submitStatus: res.status, submitBody: body }, null, 2)
);

const verificationId = body.verificationId;
if (!verificationId) {
  console.log("No verificationId returned — submission failed or already pending.");
  process.exit(1);
}

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 10000));
  const poll = await fetch(`${SOURCIFY}/v2/verify/${verificationId}`, {
    headers: { "User-Agent": "seven-sigma/1.0" },
  });
  const pj = await poll.json();
  console.log(`poll ${i + 1}:`, JSON.stringify(pj).slice(0, 600));
  fs.writeFileSync(
    path.join(root, "verification", "sourcify-mainnet-result.json"),
    JSON.stringify({ submitStatus: res.status, submitBody: body, lastPoll: pj }, null, 2)
  );
  const s = (pj.status || pj.job?.status || "").toLowerCase();
  if (s === "done" || s === "failed" || pj.contract || pj.match) break;
}
console.log("done — see verification/sourcify-mainnet-result.json");
