import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
// Tokens minted per free claim (whole HOLLOW) and cooldown in seconds.
const INITIAL_CLAIM_AMOUNT = ethers.parseEther("100");
const INITIAL_CLAIM_COOLDOWN = 3600;
// Watchdog wallet allowed to end raffles. Falls back to the deployer.
const WATCHDOG_ADDRESS = process.env.WATCHDOG_ADDRESS;

async function verifyContract(address: string, constructorArguments: unknown[]) {
  console.log(`\nVerifying ${address} on Liteforge Explorer...`);
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
  const watchdog = WATCHDOG_ADDRESS && ethers.isAddress(WATCHDOG_ADDRESS)
    ? WATCHDOG_ADDRESS
    : deployer.address;

  console.log("═══════════════════════════════════════════════════");
  console.log("  LitVM Testnet Deployment (HollowToken + Raffles)");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "zkLTC");
  console.log("Watchdog:", watchdog, watchdog === deployer.address ? "(defaulted to deployer)" : "");
  console.log("");

  // ── 1. Deploy HollowToken ───────────────────────────────────────
  console.log("Deploying HollowToken...");
  const HollowToken = await ethers.getContractFactory("HollowToken");
  const hollowToken = await HollowToken.deploy(
    HOLLOW_TOKEN_NAME,
    HOLLOW_TOKEN_SYMBOL,
    INITIAL_CLAIM_AMOUNT,
    INITIAL_CLAIM_COOLDOWN,
  );
  await hollowToken.waitForDeployment();
  const hollowAddress = await hollowToken.getAddress();
  console.log(`✅ HollowToken deployed to: ${hollowAddress}`);

  // ── 2. Deploy KatanaRaffles ─────────────────────────────────────
  console.log("\nDeploying KatanaRaffles...");
  const KatanaRaffles = await ethers.getContractFactory("KatanaRaffles");
  const katanaRaffles = await KatanaRaffles.deploy(
    hollowAddress,
    watchdog,
  );
  await katanaRaffles.waitForDeployment();
  const rafflesAddress = await katanaRaffles.getAddress();
  console.log(`✅ KatanaRaffles deployed to: ${rafflesAddress}`);

  // ── 3. Wait for block explorer to index ─────────────────────────
  console.log("\nWaiting 30s for explorer to index the contracts...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // ── 4. Verify ───────────────────────────────────────────────────
  await verifyContract(hollowAddress, [
    HOLLOW_TOKEN_NAME,
    HOLLOW_TOKEN_SYMBOL,
    INITIAL_CLAIM_AMOUNT,
    INITIAL_CLAIM_COOLDOWN,
  ]);
  await verifyContract(rafflesAddress, [hollowAddress, watchdog]);

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`HollowToken:   ${hollowAddress}`);
  console.log(`KatanaRaffles: ${rafflesAddress}`);
  console.log(`\nUpdate your .env.local:`);
  console.log(`NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS=${hollowAddress}`);
  console.log(`NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS=${rafflesAddress}`);
  console.log(`\nLiteforge Explorer:`);
  console.log(`https://liteforge.explorer.caldera.xyz/address/${hollowAddress}#code`);
  console.log(`https://liteforge.explorer.caldera.xyz/address/${rafflesAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
