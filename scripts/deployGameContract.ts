import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TheHollowGame to Katana network...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  const TheHollowGame = await ethers.getContractFactory("TheHollowGame");
  const game = await TheHollowGame.deploy();

  await game.waitForDeployment();
  const contractAddress = await game.getAddress();

  console.log("\n✅ TheHollowGame deployed to:", contractAddress);
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\nTo verify the contract, run:");
  console.log(`npx hardhat verify --network katana ${contractAddress}`);

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
