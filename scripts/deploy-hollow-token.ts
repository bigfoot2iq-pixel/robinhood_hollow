import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
const KAT_TOKEN_ADDRESS = "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d";
// Initial claim price in wei (0 = free). Update before deploying.
const INITIAL_CLAIM_PRICE = ethers.parseEther("0");
// Initial claim cooldown in seconds (3600 = 1 hour)
const INITIAL_CLAIM_COOLDOWN = 3600;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  HollowToken Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "KAT");
  console.log("KAT Token:", KAT_TOKEN_ADDRESS);
  console.log("Initial Claim Price:", ethers.formatEther(INITIAL_CLAIM_PRICE), "KAT");
  console.log("Initial Claim Cooldown:", INITIAL_CLAIM_COOLDOWN, "seconds");
  console.log("");

  // ── Deploy HollowToken ───────────────────────────────────────────
  console.log("Deploying HollowToken...");
  const HollowToken = await ethers.getContractFactory("HollowToken");
  const hollowToken = await HollowToken.deploy(
    HOLLOW_TOKEN_NAME,
    HOLLOW_TOKEN_SYMBOL,
    KAT_TOKEN_ADDRESS,
    INITIAL_CLAIM_PRICE,
    INITIAL_CLAIM_COOLDOWN,
  );
  await hollowToken.waitForDeployment();
  const hollowAddress = await hollowToken.getAddress();
  console.log(`HollowToken deployed to: ${hollowAddress}`);

  // ── Wait for block explorer to index ────────────────────────────
  console.log("\nWaiting 30s for explorer to index the contract...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // ── Verify HollowToken ──────────────────────────────────────────
  console.log(`\nVerifying ${hollowAddress} on Katanascan...`);
  try {
    await run("verify:verify", {
      address: hollowAddress,
      constructorArguments: [
        HOLLOW_TOKEN_NAME,
        HOLLOW_TOKEN_SYMBOL,
        KAT_TOKEN_ADDRESS,
        INITIAL_CLAIM_PRICE,
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
  console.log(`\nKatanascan:`);
  console.log(`https://katanascan.com/address/${hollowAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
