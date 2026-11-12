// Compile contracts/ with solc-js (0.8.26) + OpenZeppelin imports.
// Usage: node scripts/compile.mjs
// Writes build/SevenSigma.json and build/AgentIdRegistryMock.json
// (each: { abi, bytecode }) plus build/<Name>.abi.json for the site.
import solc from "solc";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findImports(importPath) {
  let full;
  if (importPath.startsWith("@")) {
    full = path.join(root, "node_modules", importPath);
  } else {
    full = path.resolve(root, "contracts", importPath);
  }
  try {
    return { contents: fs.readFileSync(full, "utf8") };
  } catch (e) {
    return { error: `import not found: ${importPath} (${e.message})` };
  }
}

const sources = {};
for (const f of fs.readdirSync(path.join(root, "contracts"))) {
  if (f.endsWith(".sol")) {
    sources[f] = { content: fs.readFileSync(path.join(root, "contracts", f), "utf8") };
  }
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    evmVersion: "cancun",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors || []).filter((e) => e.severity === "error");
const warnings = (output.errors || []).filter((e) => e.severity === "warning");
for (const w of warnings) console.log("WARN:", w.formattedMessage);
if (errors.length) {
  for (const e of errors) console.log("ERROR:", e.formattedMessage);
  process.exit(1);
}

fs.mkdirSync(path.join(root, "build"), { recursive: true });
for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    const artifact = { contractName: name, sourceName: file, abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
    fs.writeFileSync(path.join(root, "build", `${name}.json`), JSON.stringify(artifact, null, 2));
    fs.writeFileSync(path.join(root, "build", `${name}.abi.json`), JSON.stringify(c.abi, null, 2));
    console.log(`OK ${name}: bytecode ${c.evm.bytecode.object.length / 2} bytes, ABI ${c.abi.length} entries`);
  }
}
console.log("Compiled clean.");
