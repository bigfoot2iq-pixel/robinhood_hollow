// BATCH MINT. For each address in wallets.txt, the owner signs a SignedMint payload
// (minter = that address) and sends the mint itself (owner = payer, pays gas).
// The NFT is minted TO the target address. Targets need no keys and no gas.
//
// Run:
//   $env:OWNER_PK = '0x...'
//   node robi-mint.mjs wallets.txt                 # DRY_RUN: simulates each, sends nothing
//   $env:DRY_RUN = 'false'; node robi-mint.mjs wallets.txt   # actually mints
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { Contract, getAddress, hexlify, toBigInt } from "ethers";
import {
  getProvider, getOwnerWallet, DRY_RUN, TOKEN, SEADROP, OWNER,
  TOKEN_ABI, SEADROP_ABI, DOMAIN, SIGNED_MINT_TYPES,
} from "./common.mjs";

const FEE_RECIPIENT = OWNER;     // we set restrictFeeRecipients=false, so any recipient is fine
const QUANTITY = 1n;             // NFTs per wallet
const SKIP_IF_ALREADY_MINTED = true;

function loadWallets(path) {
  const raw = readFileSync(path, "utf8");
  const seen = new Set();
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    let addr;
    try { addr = getAddress(s); } catch { console.warn("skip invalid:", s); continue; }
    const k = addr.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(addr);
  }
  return out;
}

async function main() {
  const path = process.argv[2] || "wallets.txt";
  const targets = loadWallets(path);
  const provider = getProvider();
  const owner = getOwnerWallet(provider);
  const seadrop = new Contract(SEADROP, SEADROP_ABI, owner);
  const token = new Contract(TOKEN, TOKEN_ABI, provider);

  const [, cur0, max] = await token.getMintStats(OWNER);
  let supply = cur0;
  console.log(`owner=${owner.address}  targets=${targets.length}  supply=${supply}/${max}  DRY_RUN=${DRY_RUN}\n`);

  const now = Math.floor(Date.now() / 1000);
  const mintParams = {
    mintPrice: 0n,
    maxTotalMintableByWallet: 5n,
    startTime: BigInt(now - 3600),
    endTime: BigInt(now + 30 * 86400),
    dropStageIndex: 1n,
    maxTokenSupplyForStage: 222n,
    feeBps: 0n,
    restrictFeeRecipients: false,
  };

  let minted = 0, skipped = 0, failed = 0;
  for (const target of targets) {
    if (supply + QUANTITY > max) { console.log("supply cap reached, stopping."); break; }

    if (SKIP_IF_ALREADY_MINTED) {
      const [num] = await token.getMintStats(target);
      if (num > 0n) { console.log(`- ${target}  already minted (${num}), skip`); skipped++; continue; }
    }

    const salt = toBigInt(hexlify(randomBytes(32)));
    const value = { nftContract: TOKEN, minter: target, feeRecipient: FEE_RECIPIENT, mintParams, salt };
    const signature = await owner.signTypedData(DOMAIN, SIGNED_MINT_TYPES, value);

    const args = [TOKEN, FEE_RECIPIENT, target, QUANTITY, mintParams, salt, signature];
    try {
      await seadrop.mintSigned.staticCall(...args, { value: 0n }); // simulate; reverts if invalid
    } catch (e) {
      console.error(`- ${target}  WOULD REVERT: ${e.shortMessage || e.message}`);
      failed++; continue;
    }

    if (DRY_RUN) {
      console.log(`- ${target}  OK (simulated)`);
      minted++; supply += QUANTITY;
      continue;
    }

    try {
      const tx = await seadrop.mintSigned(...args, { value: 0n });
      const rc = await tx.wait();
      if (rc.status === 1) { console.log(`- ${target}  MINTED  ${tx.hash}`); minted++; supply += QUANTITY; }
      else { console.error(`- ${target}  TX FAILED  ${tx.hash}`); failed++; }
    } catch (e) {
      console.error(`- ${target}  SEND ERROR: ${e.shortMessage || e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. minted=${minted} skipped=${skipped} failed=${failed}  supply=${supply}/${max}`);
  if (DRY_RUN) console.log("This was a dry run. Re-run with $env:DRY_RUN='false' to mint for real.");
}

main().catch((e) => { console.error(e); process.exit(1); });
