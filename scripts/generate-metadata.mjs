// Generate SEVEN SIGMA metadata for tokenIds 1-777 (Gate 3).
// Assignment: variant = ((tokenId - 1) % 7) + 1 — cyclic, so each variant
// appears exactly 111 times and is spread through free (#1-150) and paid
// (#151-777) phases. NOT sequential blocks.
// For each id, writes BOTH metadata/<id>.json AND extensionless metadata/<id>
// (identical content) — the contract's tokenURI appends only the id, so the
// extensionless file is what wallets/marketplaces actually fetch (NFOX M5).
// Also copies both forms into site-deploy/metadata/ for the site gate.
// CIDs below were verified via gateway.pinata.cloud (200, image/webp).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VARIANTS = [
  { id: 1, name: "Dark Stone — Original", cid: "bafybeihiqjeo3hqjar7uhos2zneipwlnaxrjxa5tjsbhkvmrwhehwpx5o4",
    size: "Medium", direction: "Upright", lightAngle: "Centre", lightColour: "Dim White",
    strategy: "Basis Trade", file: "variant-1.webp" },
  { id: 2, name: "Dark Stone — Teal Left", cid: "bafybeiaoosixoccz7hzkuucchynvhndk3qrqy4jp6hiymc7hrgkigz2juy",
    size: "Small", direction: "Tilted Left", lightAngle: "Top-Left", lightColour: "Teal",
    strategy: "Funding-Rate Harvest", file: "variant-2.webp" },
  { id: 3, name: "Dark Stone — Gold Right", cid: "bafybeihlt5ud5ezn3x43cu5te62ra2qnqsfdoonkgnbnqnfoa2o5wl4lou",
    size: "Large", direction: "Tilted Right", lightAngle: "Top-Right", lightColour: "Gold",
    strategy: "Volatility Convexity", file: "variant-3.webp" },
  { id: 4, name: "Dark Stone — Violet Above", cid: "bafkreigbi3dxp3vsjqqg7qnlzmop5ixgmiptt3stks5lzcbz6ckg2l7p5i",
    size: "Medium", direction: "Upright", lightAngle: "Above", lightColour: "Violet",
    strategy: "Cross-Market Arbitrage", file: "variant-4.webp" },
  { id: 5, name: "Dark Stone — Ember Below", cid: "bafkreigid6n6wkngbk4s76jb3bpaal7juhgvkwakqwkibuvptx5u7nit4a",
    size: "Small", direction: "Upright", lightAngle: "Bottom-Left", lightColour: "Ember Orange",
    strategy: "TWAP Stealth Execution", file: "variant-5.webp" },
  { id: 6, name: "Dark Stone — White Right", cid: "bafybeie3htvrgdy2hxoxz3z4r2yif2yhmbavjncy5xjvly2s5owbf72zhu",
    size: "Large", direction: "Tilted Left", lightAngle: "Bottom-Right", lightColour: "White",
    strategy: "MEV-Shielded Routing", file: "variant-6.webp" },
  { id: 7, name: "Dark Stone — Gold Above", cid: "bafybeiagl55n6fcpn22eqceab7ma6mk7ogh3onypy4gnkig6setiifdboi",
    size: "Medium", direction: "Tilted Right", lightAngle: "Above", lightColour: "Gold",
    strategy: "Tail-Risk Hedging", file: "variant-7.webp" },
];

const DESCRIPTION =
  "SEVEN SIGMA — 777 Sigma Nodes. A verifiable compute license, not just art. " +
  "Each Node holds seven autonomous sub-agents in a Cognitive Orderflow Mesh: " +
  "basis trade, funding-rate harvest, volatility convexity, cross-market " +
  "arbitrage, TWAP stealth execution, MEV-shielded routing, and tail-risk " +
  "hedging. Identity is proven by Binance Agent ID. 150 free Genesis Nodes, " +
  "627 paid. Seven Dark Stone variants, 111 of each.";

const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
const outDirs = [
  path.join(root, "metadata"),
  path.join(root, "site-deploy", "metadata"),
];
for (const d of outDirs) fs.mkdirSync(d, { recursive: true });

for (let id = 1; id <= 777; id++) {
  const v = VARIANTS[(id - 1) % 7];
  counts[v.id]++;
  const meta = {
    name: `SEVEN SIGMA #${id}`,
    description: DESCRIPTION,
    image: `ipfs://${v.cid}`,
    external_url: "",
    attributes: [
      { trait_type: "Collection", value: "SEVEN SIGMA" },
      { trait_type: "Variant", value: v.name },
      { trait_type: "Sigma Size", value: v.size },
      { trait_type: "Sigma Direction", value: v.direction },
      { trait_type: "Light Angle", value: v.lightAngle },
      { trait_type: "Light Colour", value: v.lightColour },
      { trait_type: "Strategy", value: v.strategy },
      { trait_type: "Origin", value: id <= 150 ? "Free" : "Paid" },
      { trait_type: "Token ID", value: String(id) },
    ],
  };
  const body = JSON.stringify(meta);
  for (const d of outDirs) {
    fs.writeFileSync(path.join(d, `${id}.json`), body);
    fs.writeFileSync(path.join(d, `${id}`), body);
  }
}
console.log("variant counts:", JSON.stringify(counts));
console.log("files per metadata dir:", fs.readdirSync(outDirs[0]).length);
fs.writeFileSync(
  path.join(root, "ipfs-upload", "variants.json"),
  JSON.stringify({ variants: VARIANTS, counts, generatedAt: new Date().toISOString() }, null, 2)
);
console.log("wrote ipfs-upload/variants.json");
