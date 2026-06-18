import pkg from "hardhat";
const { ethers, run } = pkg;

// Pulled from .env.local. HOLLOW_TOKEN_ADDRESS must be a deployed HollowToken
// on the target network; WATCHDOG_ADDRESS is the address allowed to end raffles.
const HOLLOW_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS;
const WATCHDOG_ADDRESS = process.env.WATCHDOG_ADDRESS;

async function main() {
  if (!HOLLOW_TOKEN_ADDRESS || !ethers.isAddress(HOLLOW_TOKEN_ADDRESS)) {
    throw new Error("Set NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS in .env.local to the deployed HollowToken address");
  }
  if (!WATCHDOG_ADDRESS || !ethers.isAddress(WATCHDOG_ADDRESS)) {
    throw new Error("Set WATCHDOG_ADDRESS in .env.local to the watchdog wallet address");
  }

  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  KatanaRaffles Deployment (LitVM testnet)");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "zkLTC");
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
  console.log(`\nVerifying ${rafflesAddress} on Liteforge Explorer...`);
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
  console.log(`\nLiteforge Explorer:`);
  console.log(`https://liteforge.explorer.caldera.xyz/address/${rafflesAddress}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
