import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
// Tiered claim rewards (whole HOLLOW) and cooldown in seconds.
// Tier 1 = holds a top-5 token, Tier 2 = holds a next-5 token, Tier 3 = holds none.
const TIER1_AMOUNT = ethers.parseEther("200");
const TIER2_AMOUNT = ethers.parseEther("100");
const TIER3_AMOUNT = ethers.parseEther("50");
const INITIAL_CLAIM_COOLDOWN = 86_400; // 1 day
// Watchdog wallet allowed to end raffles. Falls back to the deployer.
const WATCHDOG_ADDRESS = process.env.WATCHDOG_ADDRESS;

// Initial top-token lists (owner can overwrite via setTierNTokens).
const TIER1_TOKENS = [
  "0x308CBcd9a2b3C9a6A2A71E0A64C14E3A5cFA5951", // lsZKLTC — ERC-20
  "0xBc963F0Dc2A5FB9F38AA5FAB98208Cf8619EbEBa", // lsTUSD — ERC-20
  "0x6858790e164a8761a711BAD1178220C5AebcF7eC", // PEPE — ERC-20
  "0xFC73cdB75F37B0da829c4e54511f410D525B76b2", // Lester — ERC-20
  "0xA0692f67ffcEd633f9c5CfAefd83FC4F21973D01", // GMCards (GM) — ERC-721
];
// MDO dropped (multi-id ERC-1155, no "holds any" check); Silver takes last slot.
const TIER2_TOKENS = [
  "0xd5118dEe968d1533B2A57aB66C266010AD8957fa", // USDC — ERC-20
  "0x76a816EFa69e3183972ff7a231F5C8d7b065d9De", // INAME — ERC-721
  "0x1c6C28403400c44D8D351dEaBcF7B1365F96EbF1", // ZNS LIT — ERC-721
  "0xe1b51EfB42cC9748C8ecf1129705F5d27901261a", // USDC Test — ERC-20
  "0x13FeC2AD48fcADb14fc06603675ECc46455AE3f7", // Silver (SILVER) — ERC-20
];

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
    TIER1_AMOUNT,
    TIER2_AMOUNT,
    TIER3_AMOUNT,
    INITIAL_CLAIM_COOLDOWN,
  );
  await hollowToken.waitForDeployment();
  const hollowAddress = await hollowToken.getAddress();
  console.log(`✅ HollowToken deployed to: ${hollowAddress}`);

  // Seed the tier token lists.
  console.log("Seeding tier token lists...");
  await (await hollowToken.setTier1Tokens(TIER1_TOKENS)).wait();
  await (await hollowToken.setTier2Tokens(TIER2_TOKENS)).wait();
  console.log("✅ Tier token lists set.");

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
    TIER1_AMOUNT,
    TIER2_AMOUNT,
    TIER3_AMOUNT,
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
