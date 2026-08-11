// Shared constants + helpers for the 3ROBI signed-mint scripts.
// No secrets here. The owner private key is read from process.env.OWNER_PK at runtime.
import { JsonRpcProvider, Wallet, getAddress } from "ethers";

export const RPC = process.env.RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const CHAIN_ID = 4663;

// 3ROBI ERC721SeaDropCloneable token (admin calls go here; it forwards to the singleton).
export const TOKEN = "0x0c0a302D8E99f3772a246D34180C9dD0ec8247c2";
// OpenSea SeaDrop singleton (mintSigned lives here; EIP-712 verifyingContract).
export const SEADROP = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";
// Expected owner. Script aborts if OWNER_PK does not derive to this.
export const OWNER = "0x11fC814f8E97A64531c93B89466109d233bEB693";

// EIP-712 typed-data (verified empirically against a real on-chain signature).
export const DOMAIN = {
  name: "SeaDrop",
  version: "1.0",
  chainId: CHAIN_ID,
  verifyingContract: SEADROP,
};

export const SIGNED_MINT_TYPES = {
  SignedMint: [
    { name: "nftContract", type: "address" },
    { name: "minter", type: "address" },
    { name: "feeRecipient", type: "address" },
    { name: "mintParams", type: "MintParams" },
    { name: "salt", type: "uint256" },
  ],
  MintParams: [
    { name: "mintPrice", type: "uint256" },
    { name: "maxTotalMintableByWallet", type: "uint256" },
    { name: "startTime", type: "uint256" },
    { name: "endTime", type: "uint256" },
    { name: "dropStageIndex", type: "uint256" },
    { name: "maxTokenSupplyForStage", type: "uint256" },
    { name: "feeBps", type: "uint256" },
    { name: "restrictFeeRecipients", type: "bool" },
  ],
};

export const TOKEN_ABI = [
  "function owner() view returns (address)",
  "function getMintStats(address minter) view returns (uint256 minterNumMinted, uint256 currentTotalSupply, uint256 maxSupply)",
  "function updateSignedMintValidationParams(address seaDropImpl, address signer, (uint80 minMintPrice, uint24 maxMaxTotalMintableByWallet, uint40 minStartTime, uint40 maxEndTime, uint40 maxMaxTokenSupplyForStage, uint16 minFeeBps, uint16 maxFeeBps) params)",
  "function updatePayer(address seaDropImpl, address payer, bool allowed)",
  "function updateAllowedFeeRecipient(address seaDropImpl, address feeRecipient, bool allowed)",
];

export const SEADROP_ABI = [
  "function mintSigned(address nftContract, address feeRecipient, address minterIfNotPayer, uint256 quantity, (uint256 mintPrice, uint256 maxTotalMintableByWallet, uint256 startTime, uint256 endTime, uint256 dropStageIndex, uint256 maxTokenSupplyForStage, uint256 feeBps, bool restrictFeeRecipients) mintParams, uint256 salt, bytes signature) payable",
  "function getPayers(address nftContract) view returns (address[])",
  "function getSigners(address nftContract) view returns (address[])",
];

export function getProvider() {
  return new JsonRpcProvider(RPC, CHAIN_ID);
}

// Build the owner wallet from env. Aborts if missing or not the expected owner.
export function getOwnerWallet(provider) {
  const pk = process.env.OWNER_PK;
  if (!pk) {
    throw new Error("OWNER_PK env var not set. Set it in this shell session only, e.g.\n  $env:OWNER_PK = '0x...'");
  }
  const w = new Wallet(pk.startsWith("0x") ? pk : "0x" + pk, provider);
  if (getAddress(w.address) !== getAddress(OWNER)) {
    throw new Error(`OWNER_PK derives to ${w.address} but expected owner ${OWNER}. Aborting.`);
  }
  return w;
}

export const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";
