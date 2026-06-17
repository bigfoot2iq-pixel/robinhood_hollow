import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
// Address of the deployed HollowToken contract
const HOLLOW_TOKEN_ADDRESS = "0x26492D9f1acf9fa1aEf71B00A4B84d49fbAFdAc2";
// Backend wallet address that signs claim vouchers (trustedSigner)
const TRUSTED_SIGNER_ADDRESS = "0xD6Ded4c01dF14E71DBd5168b46e6CeA015aAB89a";
// Default claim window in hours
const CLAIM_WINDOW_HOURS = 24;

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  StakingRewards Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:       ", deployer.address);
  console.log("Balance:        ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Hollow Token:   ", HOLLOW_TOKEN_ADDRESS);
  console.log("Trusted Signer: ", TRUSTED_SIGNER_ADDRESS);
  console.log("Claim Window:   ", CLAIM_WINDOW_HOURS, "hours");
  console.log("");

  // ── Deploy StakingRewards ────────────────────────────────────────
  console.log("Deploying StakingRewards...");
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const stakingRewards = await StakingRewards.deploy(
    HOLLOW_TOKEN_ADDRESS,
    TRUSTED_SIGNER_ADDRESS,
    CLAIM_WINDOW_HOURS,
  );
  await stakingRewards.waitForDeployment();
  const contractAddress = await stakingRewards.getAddress();
  console.log(`StakingRewards deployed to: ${contractAddress}`);

  // ── Wait for block explorer to index ────────────────────────────
  console.log("\nWaiting 30s for explorer to index the contract...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // ── Verify StakingRewards ────────────────────────────────────────
  console.log(`\nVerifying ${contractAddress} on Katanascan...`);
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        HOLLOW_TOKEN_ADDRESS,
        TRUSTED_SIGNER_ADDRESS,
        CLAIM_WINDOW_HOURS,
      ],
    });
    console.log(`${contractAddress} verified successfully!`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log(`${contractAddress} is already verified.`);
    } else {
      console.error(`Verification failed for ${contractAddress}:`, msg);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`StakingRewards: ${contractAddress}`);
  console.log(`\nNext steps:`);
  console.log(`1. Add to .env.local:`);
  console.log(`   NEXT_PUBLIC_STAKING_REWARDS_ADDRESS=${contractAddress}`);
  console.log(`2. Fund the treasury — call HollowToken.mint(${contractAddress}, amount) from owner wallet`);
  console.log(`3. Set tiers — call setAVKATTiers() and setVKATTiers() from owner wallet`);
  console.log(`\nKatanascan:`);
  console.log(`https://katanascan.com/address/${contractAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
