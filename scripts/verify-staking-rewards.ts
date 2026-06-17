import pkg from "hardhat";
const { run } = pkg;

// Deployed contract address — update after deployment
const STAKING_REWARDS_ADDRESS = "0xE92FCFee94ddf7e55761D018046e8675683622F9";

// Constructor arguments — must match exactly what was used at deployment
const STAKING_REWARDS_ARGS = [
  "0x26492D9f1acf9fa1aEf71B00A4B84d49fbAFdAc2", // hollowToken_
  "0xD6Ded4c01dF14E71DBd5168b46e6CeA015aAB89a", // trustedSigner_
  24,                                             // claimWindowHours_
];

async function main() {
  if (!STAKING_REWARDS_ADDRESS) throw new Error("Set STAKING_REWARDS_ADDRESS at the top of this script");

  console.log("═══════════════════════════════════════════════════");
  console.log("  StakingRewards Verification (Katanascan)");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`Verifying StakingRewards at ${STAKING_REWARDS_ADDRESS}...`);

  try {
    await run("verify:verify", {
      address: STAKING_REWARDS_ADDRESS,
      constructorArguments: STAKING_REWARDS_ARGS,
    });
    console.log("StakingRewards verified on Katanascan!");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log("StakingRewards is already verified on Katanascan.");
    } else {
      console.error("Verification failed:", msg);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Done! Check:");
  console.log(`  https://katanascan.com/address/${STAKING_REWARDS_ADDRESS}#code`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
