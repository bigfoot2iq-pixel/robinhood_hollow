import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
const KAT_TOKEN_ADDRESS = "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d";
const WATCHDOG_ADDRESS = "0xD6Ded4c01dF14E71DBd5168b46e6CeA015aAB89a";

async function verifyContract(address: string, constructorArguments: unknown[]) {
  console.log(`\nVerifying ${address} on Katanascan...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`✅ ${address} verified successfully!`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log(`✅ ${address} is already verified.`);
    } else {
      console.error(`❌ Verification failed for ${address}:`, msg);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  Katana Mainnet Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "KAT");
  console.log("KAT Token:", KAT_TOKEN_ADDRESS);
  console.log("Watchdog:", WATCHDOG_ADDRESS);
  console.log("");

  // ── 1. Deploy HollowToken ───────────────────────────────────────
  console.log("Deploying HollowToken...");
  const HollowToken = await ethers.getContractFactory("HollowToken");
  const hollowToken = await HollowToken.deploy(
    HOLLOW_TOKEN_NAME,
    HOLLOW_TOKEN_SYMBOL,
    KAT_TOKEN_ADDRESS,
  );
  await hollowToken.waitForDeployment();
  const hollowAddress = await hollowToken.getAddress();
  console.log(`✅ HollowToken deployed to: ${hollowAddress}`);

  // ── 2. Deploy KatanaRaffles ─────────────────────────────────────
  console.log("\nDeploying KatanaRaffles...");
  const KatanaRaffles = await ethers.getContractFactory("KatanaRaffles");
  const katanaRaffles = await KatanaRaffles.deploy(
    hollowAddress,
    WATCHDOG_ADDRESS,
  );
  await katanaRaffles.waitForDeployment();
  const rafflesAddress = await katanaRaffles.getAddress();
  console.log(`✅ KatanaRaffles deployed to: ${rafflesAddress}`);

  // ── 3. Wait for block explorer to index ─────────────────────────
  console.log("\nWaiting 30s for explorer to index the contracts...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // ── 4. Verify HollowToken ──────────────────────────────────────
  await verifyContract(hollowAddress, [
    HOLLOW_TOKEN_NAME,
    HOLLOW_TOKEN_SYMBOL,
    KAT_TOKEN_ADDRESS,
  ]);

  // ── 5. Verify KatanaRaffles ─────────────────────────────────────
  await verifyContract(rafflesAddress, [
    hollowAddress,
    WATCHDOG_ADDRESS,
  ]);

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`HollowToken:   ${hollowAddress}`);
  console.log(`KatanaRaffles: ${rafflesAddress}`);
  console.log(`\nUpdate your .env.local:`);
  console.log(`NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS=${hollowAddress}`);
  console.log(`NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS=${rafflesAddress}`);
  console.log(`\nKatanascan:`);
  console.log(`https://katanascan.com/address/${hollowAddress}#code`);
  console.log(`https://katanascan.com/address/${rafflesAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
