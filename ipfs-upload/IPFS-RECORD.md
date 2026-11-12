# SEVEN SIGMA — IPFS record (Gate 3, 2026-11-02)

Images uploaded to Pinata (custom.pinata, auth 200). Each CID verified via
https://gateway.pinata.cloud/ipfs/<CID> — 200, image/webp, size matches the
local file. Do NOT invent a CID; these are the real ones.

| Variant | Name | Traits (Size / Direction / Light angle / Colour / Strategy) | File | CID | Gateway |
|---|---|---|---|---|---|
| 1 | Dark Stone — Original | Medium / Upright / Centre / Dim White / Basis Trade | variant-1.webp (305,202 B) | bafybeihiqjeo3hqjar7uhos2zneipwlnaxrjxa5tjsbhkvmrwhehwpx5o4 | 200 image/webp |
| 2 | Dark Stone — Teal Left | Small / Tilted Left / Top-Left / Teal / Funding-Rate Harvest | variant-2.webp (307,202 B) | bafybeiaoosixoccz7hzkuucchynvhndk3qrqy4jp6hiymc7hrgkigz2juy | 200 image/webp |
| 3 | Dark Stone — Gold Right | Large / Tilted Right / Top-Right / Gold / Volatility Convexity | variant-3.webp (339,506 B) | bafybeihlt5ud5ezn3x43cu5te62ra2qnqsfdoonkgnbnqnfoa2o5wl4lou | 200 image/webp |
| 4 | Dark Stone — Violet Above | Medium / Upright / Above / Violet / Cross-Market Arbitrage | variant-4.webp (243,490 B) | bafkreigbi3dxp3vsjqqg7qnlzmop5ixgmiptt3stks5lzcbz6ckg2l7p5i | 200 image/webp |
| 5 | Dark Stone — Ember Below | Small / Upright / Bottom-Left / Ember Orange / TWAP Stealth Execution | variant-5.webp (246,182 B) | bafkreigid6n6wkngbk4s76jb3bpaal7juhgvkwakqwkibuvptx5u7nit4a | 200 image/webp |
| 6 | Dark Stone — White Right | Large / Tilted Left / Bottom-Right / White / MEV-Shielded Routing | variant-6.webp (397,734 B) | bafybeie3htvrgdy2hxoxz3z4r2yif2yhmbavjncy5xjvly2s5owbf72zhu | 200 image/webp |
| 7 | Dark Stone — Gold Above | Medium / Tilted Right / Above / Gold / Tail-Risk Hedging | variant-7.webp (380,892 B) | bafybeiagl55n6fcpn22eqceab7ma6mk7ogh3onypy4gnkig6setiifdboi | 200 image/webp |

## Metadata

- Generator: `scripts/generate-metadata.mjs`. Assignment: variant =
  ((tokenId - 1) % 7) + 1 (cyclic, NOT sequential blocks). Each variant
  exactly 111 times across 1–777, verified by script (counts
  {"1":111,"2":111,"3":111,"4":111,"5":111,"6":111,"7":111}).
- `metadata/` holds 1,554 files: `1.json`…`777.json` AND extensionless
  `1`…`777` (identical content — the contract appends only the id, NFOX M5).
  Same 1,554 files staged in `site-deploy/metadata/` for the site gate.
- Each JSON: name "SEVEN SIGMA #N", description (SPECS narrative, no
  floor/returns/APY/token-date or price promises), image
  `ipfs://<variant CID>`, attributes Variant / Sigma Size / Sigma
  Direction / Light Angle / Light Colour / Strategy / Origin
  (Free #1–150, Paid #151–777) / Token ID.
- Placeholder grep over all 777 JSONs (REPLACE, TODO, TBD, placeholder,
  NFOX, NeonFox, fox, 3333, 0.00007, testnet contract address) = **0**.
  All 777 JSONs parse; every image is one of the 7 variant CIDs; every
  extensionless file is byte-identical to its .json twin.

## Why metadata is NOT on IPFS (Pinata pin cap)

Pinata v3 folder upload of `metadata/` (1,554 files) failed: **413 "Too
many files, max 150 files allowed"**. The legacy endpoint failed: **400
"The number of files being added would exceed your account's pin limit"**.
Account usage at the time: 9 pins, 2.8 MB — the free plan caps at 500
pinned files, so 1,554 files cannot be pinned. This is the same reason
NFOX hosted metadata on the site (Netlify), with only the image on IPFS.
Metadata therefore follows the NFOX route: JSON on the free mint site,
images on IPFS.

## Testnet baseURI proof (Gate 3, testnet contract only)

- Intended baseURI (site gate to confirm the actual Netlify name;
  NOT live yet, do not claim it is): `https://sevensigma.netlify.app/metadata/`
- `scripts/set-baseuri-testnet.mjs` (adapted from NFOX) signed by the
  throwaway testnet deployer (owner of the testnet contract):
  tx `0x349a43235a8a28fb2c489a6a4a8a2fb4641faedc7a2ff527d5cd93ef20391cf1`,
  status 1, gas 91,558, block 140309845. Deployer tBNB left: 0.0078328543.
- tokenURI(1) before: `` (empty — M4, as expected on a fresh deploy).
  tokenURI(1) after: `https://sevensigma.netlify.app/metadata/1` — the
  on-chain half is proven (setBaseURI works, concatenation is exact).
- Public fetch of that URL on 2026-11-02: **404** — the site is not built
  yet, so the live 200 proof is NOT done and must NOT be claimed. It is
  the site gate's job: deploy the staged `site-deploy/metadata/` to
  Netlify, then re-fetch tokenURI(1) live and record 200.
- Local proof of the exact files that will be deployed (python http.server
  serving `site-deploy/`): `/metadata/1` → **200**, `/metadata/1.json` →
  **200**, byte-identical, name "SEVEN SIGMA #1", image
  `ipfs://bafybeihiqjeo3hqjar7uhos2zneipwlnaxrjxa5tjsbhkvmrwhehwpx5o4`,
  which loads via the gateway 200 image/webp.
