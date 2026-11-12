# SEVEN SIGMA — Specs (in progress, Gate 0)

Name LOCKED 2026-11-02 ~02:17 GMT (user tapped option): SEVEN SIGMA
NFT symbol LOCKED 2026-11-02 ~02:36 GMT (user: "SIGMA is fine"): SIGMA — NFT is SIGMA, future token is also $SIGMA (same ticker; keep NFT vs planned token clear on site/docs)
Token (planned): $SIGMA — planned, no date promised, no price/value promised

## Locked by user 2026-11-02

- Total supply: 777 (user: max about 777, not more than 1,000)
- Free supply: 150
- Free phase: Agent ID holders ONLY, 1 per wallet ever, gas only
  - User tapped: "Free Agent-only, paid open to all" (2026-11-02 ~02:12 GMT)
- Paid phase: OPEN TO ALL wallets (Agent ID and non-Agent ID)
  - Paid supply: 627 (777 - 150)
  - Paid opens only after the free 150 are exhausted
- Paid price LOCKED 2026-11-02 ~02:13 GMT (user tapped option):
  $0.30, coded as 0.00042 BNB (0.30 / 710.40 = 0.000422, rounded)
  - 1 mint $0.30, 3 mints $0.90 (under $1), 5 mints $1.50
  - Max paid revenue: 627 x $0.30 = $188.10 (0.26334 BNB)
- Max paid per tx LOCKED 2026-11-02 ~02:15 GMT (user: "Max 3 is good"): 3
  - 3-pack = $0.90 (under $1); at least 209 different paid buyers for 627 paid
- Royalties LOCKED 2026-11-02 ~02:16 GMT (user tapped option): 5% ERC-2981
  to owner, same as NFOX. Note: not guaranteed — some marketplaces ignore
  ERC-2981 (Element displayed 0% for NFOX).
- Gating rationale (agreed): free Agent-only keeps AgenticMint / radar detection
  (Agent ID 100%) and the NFOX community; paid open brings degens, a wider
  holder base for $SIGMA, and a faster sellout.
- Art model LOCKED 2026-11-02 ~02:34 GMT (user tapped "Build 7 variants only"):
  Dark Stone base, 7 variants ONLY — NOT 777 unique. 777 / 7 = 111 of each variant.
  Base: Dark Stone slab, sigma engraved, dark, muted, restrained (v4 Option 3).
  Variants (all in ~/workspace/seven-sigma/art/ and variants/):
  1. Original Dark Stone — medium sigma, centre, dim light
  2. Small sigma, tilted left, lower left, teal light top-left
  3. Large sigma, tilted right, gold light top-right
  4. Medium sigma, centre, violet light from above
  5. Small sigma, top centre, ember orange light bottom-left
  6. Large sigma, tilted left, white light bottom-right
  7. Medium sigma, lower right, tilted right, gold light from above
  Each variant = one of the 7 strategies in the narrative. Metadata traits per
  token: Variant (1-7), Sigma Size, Sigma Direction, Light Angle, Light Colour.
  Note: the orangutan / Sigma Ape flat-illustration concept (user-supplied
  reference, v5 options) was presented but NOT picked — Dark Stone 7-variant
  model is the locked art direction unless the user changes it.

## Gate 0 — COMPLETE 2026-11-02 ~02:36 GMT

All Gate 0 items locked: name, supply, free/paid, price, max per tx,
royalties, gating, art (7 Dark Stone variants), NFT symbol SIGMA.
Next: Gate 1 — build the contract from the NFOX template.

## Gate 1 — COMPLETE 2026-11-02 (local only, no deploy, no wallet touched)

- Contract: `~/workspace/seven-sigma/contracts/SevenSigma.sol`
  (copied from NFOX template, renamed SevenSigma, "SEVEN SIGMA" / "SIGMA").
  Mock: `contracts/AgentIdRegistryMock.sol` (copied, local/testnet only).
- Stack: Solidity ^0.8.26, OpenZeppelin v5.6.1, Cancun, optimizer 200.
  solc pinned to exactly 0.8.26 (caret ^0.8.26 first installed 0.8.38;
  corrected and recompiled before testing).
- Constants: MAX_SUPPLY 777, FREE_SUPPLY 150, PAID_SUPPLY 627,
  PAID_PRICE 0.00042 ether, MAX_PAID_PER_TX 3, royalties 5% (500 bps).
- Compile: `npm run compile` — clean, no errors. SevenSigma bytecode
  8,458 bytes, ABI 59 entries.
- Local tests: `npm run test:local` (Anvil, port 8547) — **44/44 passed**,
  first full run, `allPassed: true`, results in `test-results.json`.
  No failures.
- Paid-open-to-all is INTENTIONAL and tested both ways (overrides the
  generic skill line and the NFOX playbook M1 gate, which required a
  registry check in both phases): freeMint() checks the registry
  (non-agent freeMint reverts "no Agent ID"); mint() has NO registry
  check (grep: the only `agentIdRegistry.balanceOf` require is in
  freeMint, line 134; mint has an explicit "intentionally NO check"
  note). Tests prove it: non-agent paid mint x1 succeeds after free
  exhaustion (token #151), agent paid mint x3 succeeds, non-agent
  freeMint reverts. Do NOT re-add the check to mint().
- Other tests: qty 0 and 4 revert, wrong price reverts, double free
  reverts, free after exhaustion reverts, supply cap 777 enforced
  (paid mint past cap reverts "exceeds max supply"), royaltyInfo 5%
  to owner, non-owner setBaseURI/withdraw revert, owner withdraw
  empties contract (raw eth_getBalance, M9 lesson), contract held
  exactly 0.26334 BNB (627 x 0.00042) before withdraw.
- Gas (local Anvil): deploy SevenSigma 1,811,365; mock 308,419;
  free mint 127,754; paid x1 (non-agent) 102,531; paid x3 (agent)
  122,431; withdraw 32,137; setBaseURI 91,474. Mainnet estimate at
  0.05 gwei / $710.40 BNB: deploy ~$0.064, creator launch total
  (deploy + setBaseURI) ~$0.07.
- Files: contracts/SevenSigma.sol, contracts/AgentIdRegistryMock.sol,
  scripts/compile.mjs, scripts/local-test.mjs, package.json,
  README.md, test-results.json, build/SevenSigma.json (+ ABI).
- NOT done in Gate 1 (later gates): Slither/Aderyn, testnet deploy +
  live free AND paid tests, metadata/IPFS, Sourcify + BscScan
  verification, site, mainnet deploy, launch.

## Gate 2 — COMPLETE (with one honest caveat), 2026-11-02 ~03:20 GMT

### Gate 2a — Scans COMPLETE
- Slither 0.11.6 (solc 0.8.26 binary): 69 results, 25 contracts analysed.
  64 are OpenZeppelin v5.6.1 library internals (known/audited, same as NFOX).
  5 touch SevenSigma.sol, all informational/low, none a real vulnerability:
  reentrancy-no-eth in `mint()` (mitigated by `nonReentrant` + state before
  `_safeMint` + max 3 loop), reentrancy-events in `withdraw()` (onlyOwner,
  balance read before the call, re-entrant call reverts on 0 balance),
  low-level-calls in `withdraw()` (checked `.call`, same as NFOX),
  costly-loop in `mint()` (max 3), pragma/solc-version (build pins solc
  exactly 0.8.26, so OZ's broad pragma ranges do not apply to the bytecode).
- Aderyn 0.6.8: 1 high, 7 low. The high (`reentrancy-state-change` in
  `freeMint`) is a FALSE POSITIVE — all state changes in `freeMint()` are
  BEFORE `_safeMint` (checks-effects-interactions) and the function is
  `nonReentrant`; only the event emit follows the call. Lows are all known /
  intentional: centralization risk (documented owner powers), costly-loop
  (max 3), PUSH0 (BSC supports Cancun), require-in-loop (atomic mint),
  state-change-without-event (`setBaseURI` has no event), unspecific pragma
  (`^0.8.26`, compiler pinned), public view functions (standard API).
  Caveat: Aderyn compiled with its own solc 0.8.33 / EVM Prague, not the
  pinned 0.8.26 / Cancun.
- Optional hardening noted (not blocking): add `nonReentrant` to `withdraw()`
  and an event to `setBaseURI()` in a future revision; changing the contract
  now would require re-running the full Gate 1 suite.
- Full outputs: `scans/slither-2026-11-02.txt`, `scans/aderyn-2026-11-02.json`
  (+ `.log`), analysis in `scans/SUMMARY.md`.

### Gate 2b — Testnet deploy COMPLETE 2026-11-02 ~03:20 GMT (TESTNET ONLY / SUPERSEDED — never point minters at it)
- Funding: user sent tBNB; deployer balance re-verified on-chain by raw RPC
  `eth_getBalance` on TWO endpoints before deploying: **0.03 tBNB**
  (`0x6a94d74f430000`), >= the 0.02 minimum. Deployer
  `0xd943bdD7236E000BF914531Bc235b60200f0d65D` (key only in `.env.testnet`,
  chmod 600; testnet-only, never mainnet).
- Mock registry: `0x910B24d382c21f453494161C03eb97594A635d76`,
  deploy tx `0x92c698b73d56f2378857f439030dbb9f6b9d9f45688689504de7151ebc3af8af`, gas 308,395.
- SevenSigma (testnet): `0x5332713cBC477893e5CFDd8087B8B78a5e6AaFFe`,
  deploy tx `0x3b3f70f48ee52df2d68c696eee781e9ee950ee7ef840b24820a88d6c9d570825`,
  gas 1,811,341, block 140305446 (mock deploy block 140305402).
  throwaway deployer (testnet-only; mainnet owner will be the user wallet).
- Live tests on testnet: **11/12 OK** — results in `testnet-live-tests.json`,
  deployment record in `deployment-testnet.json`. Proven live:
  agent freeMint #1 (tx `0x47975f8bb51fdcb84f3eaac1a292db3458993ac97608f02cc60c33477aeb4908`,
  gas 127,754); double free reverts ("already claimed free"); non-agent free
  reverts ("no Agent ID"); free 150/150 exhausted (last tx
  `0x908f4c86916deef24a0cf8df473575bc51f17b2b5c8948b8d46a2e9638ee76c9`);
  freeRemaining 0, paidOpen true; **NON-AGENT paid mint x1 succeeds —
  token #151 to plain wallet `0xa59a2f2540a9435e09fcdd82aDE21AECe3f36Fce`,
  tx `0x94cc6d60a148a4880a87c6b9f11b66e5ef8cfaab252facc22b32baa8cba939ac`,
  gas 102,531, block 140308575** (the critical Seven Sigma test, proven live);
  agent paid mint x3 succeeds — tokens #152-154 to deployer (marked agent
  on the mock), tx `0xb4883fc2b9c30530b3c8c332f8c723ec7a56fc170e3bd470cb5727c164eb1014`,
  gas 139,531, block 140308804; qty 4 reverts ("qty 1..3"); wrong price
  reverts ("wrong price"); royaltyInfo 5% to owner (0.05 on a 1 tBNB sale).
- On-chain reads after deploy (verified independently by raw RPC):
  owner = deployer, totalSupply 154, freeMintedCount 150, freeRemaining 0,
  paidRemaining 623, freeOpen false, paidOpen true, ownerOf(151) = plain
  wallet, ownerOf(152-154) = deployer.
- CAVEAT — 1 test NOT proven on testnet: "paid mint blocked during free
  phase". The first deploy run crashed at the agent paid-x3 step on a
  TEST-HARNESS funding bug (agentWallets[0] held only 0.0001 tBNB, so
  mint(3) at 0.00126 failed INSUFFICIENT_FUNDS at estimateGas — NOT a
  contract bug; the contract deployed fine and 8 live tests had passed).
  The same underfunding made the blocked-paid check a false pass (it
  failed on wallet funds, not on the contract revert), and the free phase
  is now exhausted on this contract, so it cannot be re-proven on testnet.
  It IS proven locally (Gate 1, 44/44 Anvil tests). The remaining tests
  were completed against the same deployed contract by
  `scripts/complete-testnet-tests.js` (deployer marked as agent on the mock
  for the x3 test). The 150 agent test-wallet keys were lost in the crash
  (generated in-memory, JSON never written); only addresses are recoverable,
  and the public RPC rate-limits eth_getLogs so they were not recovered.
- Harness fixes applied to `scripts/deploy-testnet.js` for any future run:
  test wallets are persisted to `test-wallets-testnet.json` (chmod 600)
  immediately after generation; agentWallets[0] gets an extra 0.0015 tBNB
  for the x3 test; the blocked-paid test now uses the funded plain wallet
  and asserts the exact revert string "paid mint not open yet"; minimum
  balance raised to 0.025 tBNB. Scripts parse-checked (`node --check`).
- NOT done (later gates): metadata/IPFS (Gate 3), Sourcify + BscScan verification,
  site, mainnet deploy, launch.

## Gate 3 — COMPLETE with one honest caveat, 2026-11-02 ~03:27 GMT

- Images: 7 variant images uploaded to Pinata (auth 200), one CID each,
  all verified via gateway.pinata.cloud — 200, image/webp, size matches
  the local file. Full table in `ipfs-upload/IPFS-RECORD.md`,
  machine record in `ipfs-upload/variants.json`. CIDs:
  V1 bafybeihiqjeo3hqjar7uhos2zneipwlnaxrjxa5tjsbhkvmrwhehwpx5o4,
  V2 bafybeiaoosixoccz7hzkuucchynvhndk3qrqy4jp6hiymc7hrgkigz2juy,
  V3 bafybeihlt5ud5ezn3x43cu5te62ra2qnqsfdoonkgnbnqnfoa2o5wl4lou,
  V4 bafkreigbi3dxp3vsjqqg7qnlzmop5ixgmiptt3stks5lzcbz6ckg2l7p5i,
  V5 bafkreigid6n6wkngbk4s76jb3bpaal7juhgvkwakqwkibuvptx5u7nit4a,
  V6 bafybeie3htvrgdy2hxoxz3z4r2yif2yhmbavjncy5xjvly2s5owbf72zhu,
  V7 bafybeiagl55n6fcpn22eqceab7ma6mk7ogh3onypy4gnkig6setiifdboi.
- Metadata: `scripts/generate-metadata.mjs` — assignment variant =
  ((tokenId-1) % 7) + 1 (cyclic, NOT sequential blocks). 1,554 files in
  `metadata/` (777 × `.json` + 777 extensionless, identical) and the same
  1,554 staged in `site-deploy/metadata/` for the site gate. Counts
  verified by script: **111 per variant**. Each JSON: name
  "SEVEN SIGMA #N", SPECS narrative description (no floor/returns/APY/
  token-date or price promises), image `ipfs://<variant CID>`, attributes
  Variant / Sigma Size / Sigma Direction / Light Angle / Light Colour /
  Strategy / Origin (Free #1-150, Paid #151-777) / Token ID. All 777
  JSONs parse; every image is one of the 7 variant CIDs.
- Placeholder grep over all 777 JSONs (REPLACE, TODO, TBD, placeholder,
  NFOX, NeonFox, fox, 3333, 0.00007, testnet contract address) = **0**.
- Metadata NOT on IPFS — Pinata pin cap, same as NFOX: v3 folder upload
  failed 413 (max 150 files per request), legacy failed 400 (would exceed
  the account's 500-file free pin limit; account had 9 pins). Metadata
  follows the NFOX route: JSON on the free mint site, images on IPFS.
- Testnet baseURI (testnet contract only, `0x5332713c...AaFFe`,
  TESTNET-ONLY / SUPERSEDED): set by the throwaway deployer via
  `scripts/set-baseuri-testnet.mjs` to the INTENDED site baseURI
  `https://sevensigma.netlify.app/metadata/` — tx
  `0x349a43235a8a28fb2c489a6a4a8a2fb4641faedc7a2ff527d5cd93ef20391cf1`,
  status 1, gas 91,558, block 140309845. tokenURI(1) before: empty (M4);
  tokenURI(1) after: `https://sevensigma.netlify.app/metadata/1`.
  On-chain half proven. CAVEAT: public fetch of that URL on 2026-11-02
  returned **404** — the site is not built yet, so the live 200 proof is
  NOT done and must NOT be claimed; it is the site gate's job (deploy
  staged `site-deploy/metadata/` to Netlify, then re-fetch tokenURI(1)
  live and record 200). Local proof of the exact staged files: python
  http.server over `site-deploy/` gave `/metadata/1` 200 and
  `/metadata/1.json` 200, byte-identical, name "SEVEN SIGMA #1", image
  loading via gateway 200 image/webp.
## Gate 4 — PARTIAL, 2026-11-02 ~03:36 GMT, updated ~06:52 GMT (4a Sourcify + BscScan BOTH VERIFIED; 4b site BUILT and locally verified, NOT live yet; 4c live tokenURI(1) NOT proven)

### Gate 4a — Verification (testnet contract 0x5332713cBC477893e5CFDd8087B8B78a5e6AaFFe, chain 97, TESTNET ONLY / SUPERSEDED)
- Sourcify: VERIFIED — exact_match (creationMatch exact_match, runtimeMatch exact_match), verifiedAt 2026-11-02T03:34:27Z, matchId **58034061**. Confirmed by direct read of https://sourcify.dev/server/v2/contract/97/0x5332713cBC477893e5CFDd8087B8B78a5e6AaFFe. Submit: verificationId c790d076-2c03-4c17-9547-0ec565395fd6. Script: scripts/verify-sourcify.mjs (adapted from NFOX). Standard JSON in verification/standard-json.json (solc 0.8.26, Cancun, optimizer 200). Note: Sourcify's Etherscan forwarding returned "Daily limit of 500 source code submissions reached", so BscScan was NOT auto-verified via Sourcify.
- BscScan testnet: VERIFIED 2026-11-02 ~06:52 GMT via the manual browser form (Standard JSON, solc 0.8.26, Cancun, optimizer 200, MIT; API submit had failed twice with generic Error!, per M11 looping stopped). Confirmed by direct BscScan API getsourcecode read by Muse: status 1 OK, ContractName SevenSigma, CompilerVersion v0.8.26+commit.8a97fa7a, OptimizationUsed 1, Runs 200, EVMVersion cancun, LicenseType MIT, ConstructorArguments 000000000000000000000000910b24d382c21f453494161c03eb97594a635d76 + 000000000000000000000000d943bdd7236e000bf914531bc235b60200f0d65d, SourceCode len 178,005, ABI len 10,367. Manual steps in verification/bscscan-manual.md; API attempts in verification/bscscan-result.json.
- Flattened source: scripts/flatten.mjs → verification/SevenSigma.flattened.sol. (The contract's own header comments mention NFOX as the template origin — that is documentation in the verified source, not site copy; the contract was verified with those comments intact.)

### Gate 4b — Site (sevensigma.netlify.app — NOT LIVE yet)
- Built in site/ (index.html, llms.txt), staged in site-deploy/ with metadata/ (1,554 files). Package: site-deploy-v1-2026-11-02-verification-site.zip (1.2 MB, 1,558 entries, testzip clean).
- TESTNET site, honest throughout: banner says testnet chain 97, mainnet NOT deployed yet, tBNB only, do not send real BNB. Checker reads the testnet contract (totalSupply/freeRemaining/phase live from chain 97) and the testnet mock registry; no wallet connect required. Copy-paste agent prompt + llms.txt are the main mint route; browser mint is collapsed/optional, qty 1-3, 0.00042 tBNB, chain 97 switch/add included.
- Content is Seven Sigma specs only: 777 total, 150 free Agent-only, 627 paid open to all, paid opens after free 150 exhausted, $0.30 / 0.00042 BNB, max 3/tx, 5% royalties, 7 Dark Stone variants 111 each with traits and IPFS gateway gallery. Roadmap is stages-not-dates. NFT SIGMA vs planned $SIGMA kept clear; no token date/price, no floor/returns/APY, no marketplace links (none indexed), no points campaign. Not-audited statement and owner powers in plain language. Technical details in a collapsed footer (deploy tx, gas, Sourcify matchId 58034061, BscScan pending with link, mock + real registry addresses, 44/44 local tests, 11/12 testnet tests with the one caveat).
- Greps on the built package: NFOX / NeonFox / 0x87129068 / 3333 / 0.00007 = 0 in index.html, llms.txt and metadata/; "self-reported" / "I've done it" = 0. (The phrase "verification pending" does not appear literally; the footer states "BscScan testnet verification: pending" with a link, which is genuine.)
- Local verification (python http.server over site-deploy/): homepage 200 (27,557 B), /metadata/1 200, /metadata/1.json 200, /llms.txt 200; /metadata/1 and /metadata/1.json byte-identical and matching metadata/1.json; inline JS parses (node --check); ethers CDN 200. Design: dark, restrained, one gold accent, mobile-first, variants grid 2-col mobile / 3-col desktop 900px+.
- NOT live, and NO Netlify site has been created yet (user corrected 2026-11-02 ~07:08 GMT: "Why are you assuming we've created a website yet? We're yet to create a website for this project"). Earlier instructions to drag to "the existing site's Deploys page" were WRONG — there is no existing Seven Sigma site. The intended name is sevensigma.netlify.app, but that site does not exist yet. Direct fetches 2026-11-02 ~03:36 GMT — https://sevensigma.netlify.app/ 404, /metadata/1 404 — because nothing is deployed there. Creating the site is a NEW-site step (Netlify Drop / new site from the site-deploy/ folder), not an update to an existing site. Once the site is created, if its name differs from sevensigma.netlify.app, the baseURI would need updating (testnet only for now; mainnet baseURI is set later, after the site is live).

### Gate 4c — Live tokenURI(1) proof: NOT done
- tokenURI(1) on-chain still resolves to https://sevensigma.netlify.app/metadata/1 (verified Gate 3), but the live fetch is 404 because the site is not deployed yet. Proof completes when the user drags site-deploy/ to Netlify and the live /metadata/1 returns 200 — then re-fetch and record.

- NOT done (later gates): CREATE the Netlify site (new site, not an update), live tokenURI(1) 200 proof, mainnet deploy, launch. Note: site footer still says "BscScan testnet verification: pending" — update it to verified in the next site rebuild.

## Proposed, NOT yet locked

- (none — Gate 0 complete)

## Narrative (proposed)

SEVEN SIGMA — 777 Sigma Nodes. A verifiable compute license, not just art.
Seven autonomous sub-agents per Node (basis, funding, volatility convexity,
cross-market arb, TWAP stealth, MEV-shielded routing, tail-risk hedging),
wired into a Cognitive Orderflow Mesh. Identity layer = Agent ID.
Intent layer = intents collateralized by the Node. Execution = batched,
MEV-shielded, split across 7 markets. Proof = TEE attestation + zk-proof.
Settlement = Mesh fees / funding / volatility premium back to Node holders.
$SIGMA planned: 777,000,000 total, 7.77% reserved for Node holders weighted
by hold time, Genesis 150 get a multiplier. $SIGMA = fee / staking /
governance token of the Mesh. No date, no price promise.

## Next decisions needed from user

1. Start building Gate 1 (contract from NFOX template)?

## Playbook

Follow ~/workspace/custom-skills/agent-mint-launch/SKILL.md (gates 0-8)
and ~/workspace/agent-mint-launch/SECOND-CONTRACT-PLAYBOOK.md §0 (M1-M23).
Do NOT start coding until Gate 0 specs above are all locked.
Template contract: ~/workspace/agent-mint-launch/contracts/NeonFoxAgents.sol
— copy it, change only name/symbol/supply/free/price/max-per-tx/royalties.
CRITICAL difference from NFOX: paid mint() must NOT check Agent ID
(freeMint() must), so add a test that a non-agent CAN paid-mint after
free exhaustion, and a test that a non-agent CANNOT free-mint.
