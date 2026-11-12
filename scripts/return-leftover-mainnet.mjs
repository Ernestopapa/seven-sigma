// Return leftover mainnet deployer BNB to the user wallet (one-off).
import { ethers } from "ethers";
import fs from "node:fs";
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/", 56);
const env = {};
for (const line of fs.readFileSync("/home/hatch/workspace/seven-sigma/.env.mainnet", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const deployer = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, provider);
const USER = "0x75d251Ba39dED2E456d9f6DD776f77d422864403";
const balance = await provider.getBalance(deployer.address);
const gasPrice = 50_000_000n; // 0.05 gwei, live mainnet price at deploy
const gasLimit = 21_000n;
const fee = gasPrice * gasLimit;
if (balance <= fee) { console.log("Balance too low to return:", ethers.formatEther(balance)); process.exit(1); }
const amount = balance - fee;
console.log("Deployer:", deployer.address);
console.log("Balance:", ethers.formatEther(balance), "BNB");
console.log("Returning:", ethers.formatEther(amount), "BNB to", USER);
const tx = await deployer.sendTransaction({ to: USER, value: amount, gasLimit, gasPrice });
console.log("Return tx:", tx.hash);
const rc = await tx.wait();
console.log("Receipt status:", rc.status, "block:", rc.blockNumber, "gas used:", rc.gasUsed.toString());
console.log("Deployer balance after:", ethers.formatEther(await provider.getBalance(deployer.address)));
console.log("User balance after:", ethers.formatEther(await provider.getBalance(USER)));
