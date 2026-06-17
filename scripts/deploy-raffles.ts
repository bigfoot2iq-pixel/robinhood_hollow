import pkg from "hardhat";
const { ethers, run } = pkg;

const HOLLOW_TOKEN_ADDRESS = "0x26492D9f1acf9fa1aEf71B00A4B84d49fbAFdAc2";
const WATCHDOG_ADDRESS = "0xD6Ded4c01dF14E71DBd5168b46e6CeA015aAB89a";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  KatanaRaffles Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("HollowToken:", HOLLOW_TOKEN_ADDRESS);
  console.log("Watchdog:", WATCHDOG_ADDRESS);
  console.log("");

  // Deploy KatanaRaffles
  console.log("Deploying KatanaRaffles...");
  const KatanaRaffles = await ethers.getContractFactory("KatanaRaffles");
  const katanaRaffles = await KatanaRaffles.deploy(
    HOLLOW_TOKEN_ADDRESS,
    WATCHDOG_ADDRESS,
  );
  await katanaRaffles.waitForDeployment();
  const rafflesAddress = await katanaRaffles.getAddress();
  console.log(`✅ KatanaRaffles deployed to: ${rafflesAddress}`);

  // Wait for explorer to index
  console.log("\nWaiting 30s for explorer to index...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // Verify
  console.log(`\nVerifying ${rafflesAddress} on Katanascan...`);
  try {
    await run("verify:verify", {
      address: rafflesAddress,
      constructorArguments: [HOLLOW_TOKEN_ADDRESS, WATCHDOG_ADDRESS],
    });
    console.log(`✅ KatanaRaffles verified!`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log(`✅ KatanaRaffles is already verified.`);
    } else {
      console.error(`❌ Verification failed:`, msg);
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`KatanaRaffles: ${rafflesAddress}`);
  console.log(`\nUpdate your .env.local:`);
  console.log(`NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS=${rafflesAddress}`);
  console.log(`\nKatanascan:`);
  console.log(`https://katanascan.com/address/${rafflesAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
