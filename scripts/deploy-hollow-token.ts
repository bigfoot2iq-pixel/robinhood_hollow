import pkg from "hardhat";
const { ethers, run } = pkg;

// ── Constructor arguments ──────────────────────────────────────────
const HOLLOW_TOKEN_NAME = "Hollow Token";
const HOLLOW_TOKEN_SYMBOL = "HOLLOW";
// Tiered claim rewards (whole HOLLOW, scaled to 18 decimals below).
// Tier 1 = holds a top-5 token, Tier 2 = holds a next-5 token, Tier 3 = holds none.
const TIER1_AMOUNT = ethers.parseEther("200");
const TIER2_AMOUNT = ethers.parseEther("100");
const TIER3_AMOUNT = ethers.parseEther("50");
// Cooldown between claims in seconds (86400 = 1 day). Owner can change later.
const INITIAL_CLAIM_COOLDOWN = 86_400;

// ── Initial top-token lists (owner can overwrite via setTierNTokens) ─
// Top 5 by holders (Tier 1).
const TIER1_TOKENS = [
  "0x308CBcd9a2b3C9a6A2A71E0A64C14E3A5cFA5951", // LiteSwap Test zkLTC (lsZKLTC) — ERC-20
  "0xBc963F0Dc2A5FB9F38AA5FAB98208Cf8619EbEBa", // LiteSwap Test USD (lsTUSD) — ERC-20
  "0x6858790e164a8761a711BAD1178220C5AebcF7eC", // PEPE — ERC-20
  "0xFC73cdB75F37B0da829c4e54511f410D525B76b2", // Lester — ERC-20
  "0xA0692f67ffcEd633f9c5CfAefd83FC4F21973D01", // GMCards (GM) — ERC-721
];
// Next 5 by holders (Tier 2).
// MDO (#6) dropped: it's a multi-id prediction-market ERC-1155 with no usable
// "holds any" check. Silver (#11 by holders) takes the last slot instead.
const TIER2_TOKENS = [
  "0xd5118dEe968d1533B2A57aB66C266010AD8957fa", // USD Coin (USDC) — ERC-20
  "0x76a816EFa69e3183972ff7a231F5C8d7b065d9De", // InfinityName (INAME) — ERC-721
  "0x1c6C28403400c44D8D351dEaBcF7B1365F96EbF1", // ZNS Connect (LIT) — ERC-721
  "0xe1b51EfB42cC9748C8ecf1129705F5d27901261a", // USD Coin Test (USDC) — ERC-20
  "0x13FeC2AD48fcADb14fc06603675ECc46455AE3f7", // Silver (SILVER) — ERC-20
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  HollowToken Deployment (LitVM testnet)");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "zkLTC");
  console.log("Tier 1 (top 5):", ethers.formatEther(TIER1_AMOUNT), "HOLLOW");
  console.log("Tier 2 (next 5):", ethers.formatEther(TIER2_AMOUNT), "HOLLOW");
  console.log("Tier 3 (none):", ethers.formatEther(TIER3_AMOUNT), "HOLLOW");
  console.log("Claim Cooldown:", INITIAL_CLAIM_COOLDOWN, "seconds");
  console.log("");

  // ── Deploy HollowToken ───────────────────────────────────────────
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
  console.log(`HollowToken deployed to: ${hollowAddress}`);

  // ── Seed token lists ─────────────────────────────────────────────
  console.log("\nSeeding Tier 1 token list...");
  await (await hollowToken.setTier1Tokens(TIER1_TOKENS)).wait();
  console.log("Seeding Tier 2 token list...");
  await (await hollowToken.setTier2Tokens(TIER2_TOKENS)).wait();
  console.log("Token lists set.");

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
        TIER1_AMOUNT,
        TIER2_AMOUNT,
        TIER3_AMOUNT,
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
