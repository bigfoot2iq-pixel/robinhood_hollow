import pkg from "hardhat";
const { run } = pkg;

// Deployed contract address (from .env.local)
const HOLLOW_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS ?? "";

// Constructor arguments (must match what was used at deployment)
const HOLLOW_TOKEN_ARGS = [
  "Hollow Token",
  "HOLLOW",
  "200000000000000000000", // tier1Amount (wei) = 200 HOLLOW
  "100000000000000000000", // tier2Amount (wei) = 100 HOLLOW
  "50000000000000000000",  // tier3Amount (wei) = 50 HOLLOW
  "86400",                 // claimCooldown (seconds) = 1 day
];

async function main() {
  if (!HOLLOW_TOKEN_ADDRESS) {
    throw new Error("Set NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS in .env.local");
  }
  console.log("═══════════════════════════════════════════════════");
  console.log("  HollowToken Verification (Liteforge Explorer)");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`Verifying HollowToken at ${HOLLOW_TOKEN_ADDRESS}...`);

  try {
    await run("verify:verify", {
      address: HOLLOW_TOKEN_ADDRESS,
      constructorArguments: HOLLOW_TOKEN_ARGS,
    });
    console.log("HollowToken verified on Liteforge Explorer!");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log("HollowToken is already verified on Liteforge Explorer.");
    } else {
      console.error("Verification failed:", msg);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Done! Check:");
  console.log(`  https://liteforge.explorer.caldera.xyz/address/${HOLLOW_TOKEN_ADDRESS}#code`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
