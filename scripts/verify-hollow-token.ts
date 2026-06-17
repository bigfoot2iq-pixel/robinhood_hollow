import pkg from "hardhat";
const { run } = pkg;

// Deployed contract address
const HOLLOW_TOKEN_ADDRESS = "0x26492D9f1acf9fa1aEf71B00A4B84d49fbAFdAc2";

// Constructor arguments (must match what was used at deployment)
const HOLLOW_TOKEN_ARGS = [
  "Hollow Token",
  "HOLLOW",
  "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d",
  "0",       // claimPrice (wei)
  "3600",    // claimCooldown (seconds) = 1 hour
];

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  HollowToken Verification (Katanascan)");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`Verifying HollowToken at ${HOLLOW_TOKEN_ADDRESS}...`);

  try {
    await run("verify:verify", {
      address: HOLLOW_TOKEN_ADDRESS,
      constructorArguments: HOLLOW_TOKEN_ARGS,
    });
    console.log("HollowToken verified on Katanascan!");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log("HollowToken is already verified on Katanascan.");
    } else {
      console.error("Verification failed:", msg);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Done! Check:");
  console.log(`  https://katanascan.com/address/${HOLLOW_TOKEN_ADDRESS}#code`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
