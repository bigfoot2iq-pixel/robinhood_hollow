import type { Contract, TransactionResponse } from "ethers";
import pkg from "hardhat";
const { ethers } = pkg;

type ERC20Contract = Contract & {
  balanceOf: (account: string) => Promise<bigint>;
  transfer: (to: string, amount: bigint) => Promise<TransactionResponse>;
  approve: (spender: string, amount: bigint) => Promise<TransactionResponse>;
  allowance: (owner: string, spender: string) => Promise<bigint>;
  decimals: () => Promise<number>;
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const watchdogPrivateKey = "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0";
  const watchdogWallet = new ethers.Wallet(watchdogPrivateKey);
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address,uint256) returns (bool)",
    "function approve(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("Watchdog address:", watchdogWallet.address);

  // Deploy a mock KAT token for tier testing
  const MockToken = await ethers.getContractFactory("HollowToken");
  const mockKat = await MockToken.deploy(
    "Mock KAT",
    "KAT",
    ethers.ZeroAddress // no katToken for the mock itself
  );
  await mockKat.waitForDeployment();
  const mockKatAddress = await mockKat.getAddress();
  console.log("Mock KAT deployed to:", mockKatAddress);

  // Deploy HollowToken with tier-based claiming
  const HollowToken = await ethers.getContractFactory("HollowToken");
  const hollowToken = await HollowToken.deploy(
    "Hollow Token",
    "HOLLOW",
    mockKatAddress // KAT token address for tier check
  );
  await hollowToken.waitForDeployment();

  const hollowAddress = await hollowToken.getAddress();
  console.log("\n=== HollowToken Deployed ===");
  console.log("Address:", hollowAddress);
  console.log("KAT token:", await hollowToken.katToken());
  console.log("Tier amounts: 200 (whale) / 100 (KAT holder) / 25 (base)");

  console.log("\n=== Testing claimDailyTokens() ===");

  const canClaim = await hollowToken.canClaimToday(deployer.address);
  console.log("Can claim today:", canClaim);

  const [amount, tier] = await hollowToken.getClaimAmount(deployer.address);
  const tierNames = ["KAT Whale", "KAT Holder", "Base"];
  console.log("Would receive:", amount.toString(), "tokens (tier:", tierNames[Number(tier)], ")");

  console.log("\nClaiming daily tokens...");
  const tx = await hollowToken.claimDailyTokens();
  await tx.wait();

  const balance = await hollowToken.balanceOf(deployer.address);
  console.log("Balance after claim:", ethers.formatEther(balance), "HOLLOW");

  console.log("\nTrying to claim again (should fail)...");
  try {
    await hollowToken.claimDailyTokens();
    console.log("ERROR: Should have failed!");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(
      "✓ Correctly rejected:",
      message.includes("Must wait 24 hours") ? "Must wait 24 hours between claims" : message.slice(0, 50)
    );
  }

  console.log("\n=== Testing KAT Holder Tier ===");
  // Mint some mock KAT to deployer to test tier upgrade
  await mockKat.mint(deployer.address, ethers.parseEther("100")); // 100 KAT → tier 1
  const [newAmount, newTier] = await hollowToken.getClaimAmount(deployer.address);
  console.log("With 100 KAT → tier:", tierNames[Number(newTier)], "amount:", newAmount.toString());

  await mockKat.mint(deployer.address, ethers.parseEther("10000")); // total 10100 KAT → tier 0
  const [whaleAmount, whaleTier] = await hollowToken.getClaimAmount(deployer.address);
  console.log("With 10100 KAT → tier:", tierNames[Number(whaleTier)], "amount:", whaleAmount.toString());

  // Deploy KatanaRaffles
  console.log("\n=== Deploying KatanaRaffles ===");
  const KatanaRaffles = await ethers.getContractFactory("KatanaRaffles");
  const katanaRaffles = await KatanaRaffles.deploy(
    hollowAddress,        // Use HollowToken as the raffle token
    deployer.address,     // Treasury address
    watchdogWallet.address // Watchdog address (local test key)
  );
  await katanaRaffles.waitForDeployment();

  const rafflesAddress = await katanaRaffles.getAddress();
  console.log("KatanaRaffles deployed to:", rafflesAddress);
  console.log("Raffle Token:", await katanaRaffles.raffleToken());
  console.log("Treasury:", await katanaRaffles.treasury());
  console.log("Watchdog:", await katanaRaffles.watchdog());

  console.log("\n=== Funding Watchdog for Prizes ===");
  const prizeTokenAddress = hollowAddress;
  const prizeToken = new ethers.Contract(prizeTokenAddress, erc20Abi, deployer) as ERC20Contract;
  const prizeDecimals = await prizeToken.decimals().catch(() => 18);
  const fundAmount = ethers.parseUnits("1000", prizeDecimals);

  // Mint tokens to deployer for prize funding
  await hollowToken.mint(deployer.address, fundAmount);

  const transferTx = await prizeToken.transfer(watchdogWallet.address, fundAmount);
  await transferTx.wait();
  console.log("Funded watchdog with prize tokens:", ethers.formatUnits(fundAmount, prizeDecimals));

  const watchdogSigner = watchdogWallet.connect(ethers.provider);
  const prizeTokenWithWatchdog = prizeToken.connect(watchdogSigner) as ERC20Contract;
  const approveTx = await prizeTokenWithWatchdog.approve(rafflesAddress, fundAmount);
  await approveTx.wait();
  console.log("Approved raffle contract for prize tokens.");

  console.log("\n=== Contracts Ready for Interaction ===");
  console.log("HollowToken:", hollowAddress);
  console.log("KatanaRaffles:", rafflesAddress);
  console.log("Mock KAT:", mockKatAddress);
  console.log("\nUpdate your .env.local with:");
  console.log(`NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS=${hollowAddress}`);
  console.log(`NEXT_PUBLIC_RAFFLES_CONTRACT_ADDRESS=${rafflesAddress}`);
  console.log(`WATCHDOG_PRIVATE_KEY=${watchdogPrivateKey}`);
  console.log("\nUseful commands:");
  console.log(`npx hardhat console --network localhost`);
  console.log(`const hollow = await ethers.getContractAt("HollowToken", "${hollowAddress}")`);
  console.log(`const raffles = await ethers.getContractAt("KatanaRaffles", "${rafflesAddress}")`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
