// Set baseURI on the BSC TESTNET SevenSigma contract (owner = throwaway deployer).
// TESTNET ONLY. Usage: node scripts/set-baseuri-testnet.mjs "https://<site>/metadata/"
// The baseURI set here is the INTENDED site baseURI; the site itself is built
// in a later gate, so a public fetch of tokenURI(1) cannot return 200 until
// then. This script proves the on-chain half: setBaseURI succeeds, and
// tokenURI(1) returns baseURI + "1" exactly.
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const CONTRACT = "0x5332713cBC477893e5CFDd8087B8B78a5e6AaFFe"; // TESTNET ONLY / SUPERSEDED
const baseURI = process.argv[2];
if (!baseURI || !baseURI.endsWith("/")) { console.error("Usage: node scripts/set-baseuri-testnet.mjs <baseURI ending with />"); process.exit(2); }
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.testnet"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const provider = new ethers.JsonRpcProvider(RPC, 97);
const wallet = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, provider);
const abi = JSON.parse(fs.readFileSync(path.join(root, "build/SevenSigma.json"), "utf8")).abi;
const c = new ethers.Contract(CONTRACT, abi, wallet);
console.log("owner:", await c.owner(), "signer:", wallet.address);
console.log("totalSupply:", await c.totalSupply());
console.log("tokenURI(1) before:", await c.tokenURI(1).catch(e => "ERR " + e.message));
const tx = await c.setBaseURI(baseURI);
console.log("setBaseURI tx:", tx.hash);
const rc = await tx.wait();
console.log("receipt status:", rc.status, "gas:", rc.gasUsed.toString(), "block:", rc.blockNumber);
console.log("tokenURI(1) after:", await c.tokenURI(1));
console.log("deployer tBNB left:", ethers.formatEther(await provider.getBalance(wallet.address)));
