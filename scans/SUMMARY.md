# Gate 2a — Static scans, 2026-11-02

Tools installed for this gate (not present before):
- Slither 0.11.6 (venv `~/.venvs/slither`), solc binary 0.8.26+commit.8a97fa7a (`~/.local/bin/solc`)
- Aderyn 0.6.8 (`~/.local/bin/aderyn`, release aderyn-v0.6.8)
- Raw outputs: `scans/slither-2026-11-02.txt`, `scans/aderyn-2026-11-02.json` (+ `.log`)

## Slither 0.11.6 — 69 results total, 25 contracts analysed

Command: `slither contracts/SevenSigma.sol --solc ~/.local/bin/solc --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/"`

- 64 of the 69 results are inside `node_modules/@openzeppelin/` (Math.mulDiv,
  Bytes, Strings, StorageSlot, Context, ERC2981, ERC721 internals):
  incorrect-exp, divide-before-multiply, assembly, dead-code, too-many-digits,
  solc-version (broad OZ pragma ranges). These are known, audited OpenZeppelin
  v5.6.1 library internals, identical to the NFOX build. No action.
- 5 results touch `contracts/SevenSigma.sol` itself, all informational/low,
  none a real vulnerability:

| Detector | Location | Verdict |
|---|---|---|
| reentrancy-no-eth | `mint()` #149-163 — `_safeMint` then `_nextId++` in loop | Mitigated / false positive in practice. `mint()` is `nonReentrant`; per iteration the id is assigned BEFORE `_safeMint`; `paidMinted` and the supply cap are checked before the loop; loop max 3. A re-entrant `mint`/`freeMint` call reverts on the guard. |
| reentrancy-events | `withdraw()` #167-173 — event emitted after the low-level call | Informational. `withdraw()` is `onlyOwner`; balance is read into `amount` BEFORE the call, so a re-entrant `withdraw` during the callback sees balance 0 and reverts on "nothing to withdraw". No double-spend. Note: `withdraw()` has no `nonReentrant` modifier (same as NFOX); adding one is a possible v1.1 hardening, not required. |
| low-level-calls | `withdraw()` — `owner().call{value: amount}()` | Known pattern, same as NFOX. Return value checked (`require(ok)`). |
| costly-loop | `mint()` — `_nextId++` (SSTORE) inside loop | Intentional, max 3 iterations, negligible gas (paid x3 = 122,431 gas local). |
| pragma / solc-version | `^0.8.26` in SevenSigma; OZ files use `^0.8.20` etc. with known severe issues listed | Not applicable to the deployed bytecode: the build pins solc to exactly 0.8.26 (see Gate 1 — caret range first installed 0.8.38, corrected). The listed bugs are for older compiler versions in the pragma ranges, not for 0.8.26. |

## Aderyn 0.6.8 — 1 high, 7 low (111 SLOC, 2 source units)

Caveat: Aderyn compiled with its own bundled solc v0.8.33 / EVM Prague,
not the project's pinned solc 0.8.26 / Cancun. Findings are pattern-based
and still valid for review; compiler-specific notes (PUSH0) are judged
against the real 0.8.26/Cancun build.

### High (1) — FALSE POSITIVE
- `reentrancy-state-change` in `freeMint()`, reported at line 134.
  The hint lists `freeMinted[msg.sender] = true`, `_freeCount += 1`,
  `uint256 tokenId = _nextId++` as "state changed after an external call".
  In the actual code those three writes are lines 137-141, ALL BEFORE
  `_safeMint` (line 142) — i.e. the checks-effects-interactions pattern
  is followed — and `freeMint()` is `nonReentrant`. The only thing after
  the external call is the `FreeMinted` event emit. No re-entrancy path
  exists. No fix needed.

### Low (7) — all known / intentional
- `centralization-risk` (6 instances: mock `setAgent`/`setAgents`, SevenSigma
  constructor royalty, `setBaseURI`, `withdraw`): known and documented.
  Owner powers are listed in the contract header and README; mock is
  testnet-only. Same as NFOX.
- `costly-loop` (SevenSigma `mint()` line 158; mock `setAgents`): intentional,
  max 3 iterations for mint.
- `push-zero-opcode` (`^0.8.26` pragma): BSC supports Cancun/PUSH0; NFOX
  deployed on BSC mainnet with the same stack. Not an issue.
- `require-revert-in-loop` (`mint()` line 158, `_safeMint` in loop):
  intentional — a failed mint must revert the whole tx atomically, max 3.
- `state-change-without-event` (`setBaseURI` line 94; mock `setAgent`):
  minor. `setBaseURI` emits no event; acceptable, could be added in v1.1.
  Mock is testnet-only.
- `unspecific-solidity-pragma` (`^0.8.26`): compiler is pinned to exactly
  0.8.26 in `package.json`/build, so the deployed bytecode is deterministic.
- `unused-public-function` (view functions `totalSupply`, `freeMintedCount`,
  `freeRemaining`, `paidRemaining`, `paidOpen`): public by design — these are
  the skill's standard views used by the site checker and tests.

## Conclusion
No real vulnerability found by either scanner. No new issues vs the NFOX
contract (same code shape, same OpenZeppelin version). One optional
hardening noted for a future revision: add `nonReentrant` to `withdraw()`
and an event to `setBaseURI()` — neither blocks testnet or mainnet, and
changing the contract now would require re-running the full Gate 1 suite.
