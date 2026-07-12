import pkg from "hardhat";
const { run } = pkg;

// Deployed contract addresses
const HOLLOW_TOKEN_ADDRESS = "0x26492D9f1acf9fa1aEf71B00A4B84d49fbAFdAc2";
const KATANA_RAFFLES_ADDRESS = "0x87F2C5096E6a345CcA4270A5e60F919415d525b4";

// Constructor arguments (must match what was used at deployment)
const HOLLOW_TOKEN_ARGS = ["Hollow Token", "HOLLOW", "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d"];
const KATANA_RAFFLES_ARGS = [HOLLOW_TOKEN_ADDRESS, "0xD6Ded4c01dF14E71DBd5168b46e6CeA015aAB89a"];

async function verifyContract(name: string, address: string, constructorArguments: unknown[]) {
  console.log(`\nVerifying ${name} at ${address} on Robinhood Chain Explorer...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`✅ ${name} verified on Robinhood Chain Explorer!`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already verified")) {
      console.log(`✅ ${name} is already verified on Robinhood Chain Explorer.`);
    } else {
      console.error(`❌ Verification failed for ${name}:`, msg);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Robinhood Chain Explorer Verification (Etherscan v2)");
  console.log("═══════════════════════════════════════════════════\n");

  await verifyContract("HollowToken", HOLLOW_TOKEN_ADDRESS, HOLLOW_TOKEN_ARGS);
  await verifyContract("RobinhoodRaffles", KATANA_RAFFLES_ADDRESS, KATANA_RAFFLES_ARGS);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Done! Check:");
  console.log(`  https://robinhoodchain.blockscout.com/address/${HOLLOW_TOKEN_ADDRESS}#code`);
  console.log(`  https://robinhoodchain.blockscout.com/address/${KATANA_RAFFLES_ADDRESS}#code`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
