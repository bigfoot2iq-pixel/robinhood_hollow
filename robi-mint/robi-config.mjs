// ONE-TIME setup. Enrolls the owner wallet as (a) an allowed signed-mint signer
// and (b) an allowed payer, so the owner can sign + pay mints for any target wallet.
//
// Run (dry-run first, then for real):
//   $env:OWNER_PK = '0x...'            # this shell session only
//   node robi-config.mjs               # DRY_RUN: simulates, sends nothing
//   $env:DRY_RUN = 'false'; node robi-config.mjs   # actually sends txs
import { Contract, getAddress } from "ethers";
import { getProvider, getOwnerWallet, DRY_RUN, TOKEN, SEADROP, OWNER, TOKEN_ABI, SEADROP_ABI } from "./common.mjs";

// Bounds the enrolled signer is allowed to authorize. Permissive but capped to this drop.
const BOUNDS = {
  minMintPrice: 0n,
  maxMaxTotalMintableByWallet: 222n,
  minStartTime: 0n,
  maxEndTime: 1099511627775n, // 2^40 - 1 (max uint40)
  maxMaxTokenSupplyForStage: 222n,
  minFeeBps: 0n,
  maxFeeBps: 1000n,
};

async function main() {
  const provider = getProvider();
  const owner = getOwnerWallet(provider);
  const token = new Contract(TOKEN, TOKEN_ABI, owner);
  const seadrop = new Contract(SEADROP, SEADROP_ABI, provider);

  console.log("owner        :", owner.address);
  console.log("balance      :", (await provider.getBalance(owner.address)).toString(), "wei");
  console.log("signers  now :", await seadrop.getSigners(TOKEN));
  console.log("payers   now :", await seadrop.getPayers(TOKEN));
  console.log("DRY_RUN      :", DRY_RUN, "\n");

  const steps = [
    ["enroll signer  ", () => token.updateSignedMintValidationParams.staticCall(SEADROP, OWNER, BOUNDS), () => token.updateSignedMintValidationParams(SEADROP, OWNER, BOUNDS)],
    ["enroll payer   ", () => token.updatePayer.staticCall(SEADROP, OWNER, true), () => token.updatePayer(SEADROP, OWNER, true)],
  ];

  for (const [label, sim, send] of steps) {
    try {
      await sim(); // reverts here if the call would fail
      if (DRY_RUN) {
        console.log(label, "OK (simulated, not sent)");
      } else {
        const tx = await send();
        console.log(label, "sent", tx.hash, "…");
        const rc = await tx.wait();
        console.log(label, rc.status === 1 ? "CONFIRMED" : "FAILED", tx.hash);
      }
    } catch (e) {
      console.error(label, "WOULD REVERT:", e.shortMessage || e.message);
      process.exit(1);
    }
  }

  if (!DRY_RUN) {
    console.log("\nsigners after:", await seadrop.getSigners(TOKEN));
    console.log("payers  after:", await seadrop.getPayers(TOKEN));
  }
  console.log("\nDone.", DRY_RUN ? "Re-run with $env:DRY_RUN='false' to apply." : "Config applied. Now run robi-mint.mjs.");
}

main().catch((e) => { console.error(e); process.exit(1); });
