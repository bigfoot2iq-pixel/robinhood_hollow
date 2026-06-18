import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
// Tokens minted per free claim (whole HOLLOW, scaled to 18 decimals below).
const INITIAL_CLAIM_AMOUNT = ethers.parseEther("100");
// Cooldown between claims in seconds (3600 = 1 hour). Owner can change later.
const INITIAL_CLAIM_COOLDOWN = 3600;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  HollowToken Deployment (LitVM testnet)");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "zkLTC");
  console.log("Claim Amount:", ethers.formatEther(INITIAL_CLAIM_AMOUNT), "HOLLOW");
  console.log("Claim Cooldown:", INITIAL_CLAIM_COOLDOWN, "seconds");
  console.log("");

  // ── Deploy HollowToken ───────────────────────────────────────────
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
  console.log(`HollowToken deployed to: ${hollowAddress}`);

  // ── Wait for block explorer to index ────────────────────────────
  console.log("\nWaiting 30s for explorer to index the contract...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // ── Verify HollowToken ──────────────────────────────────────────
  console.log(`\nVerifying ${hollowAddress} on Liteforge Explorer...`);
  try {
    await run("verify:verify", {
      address: hollowAddress,
      constructorArguments: [
        HOLLOW_TOKEN_NAME,
        HOLLOW_TOKEN_SYMBOL,
        INITIAL_CLAIM_AMOUNT,
        INITIAL_CLAIM_COOLDOWN,
      ],
    });
    console.log(`${hollowAddress} verified successfully!`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log(`${hollowAddress} is already verified.`);
    } else {
      console.error(`Verification failed for ${hollowAddress}:`, msg);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`HollowToken: ${hollowAddress}`);
  console.log(`\nUpdate your .env.local:`);
  console.log(`NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS=${hollowAddress}`);
  console.log(`\nLiteforge Explorer:`);
  console.log(`https://liteforge.explorer.caldera.xyz/address/${hollowAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
