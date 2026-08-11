# 3ROBI batch signed-mint

Mints the 3ROBI SeaDrop collection to a list of wallets, using the collection
**owner** key as both the allowlist **signer** and the **payer**. Target wallets
need only their **address** — no private key, no gas.

## How it works

- Collection is OpenSea **SeaDrop**. Minting requires an EIP-712 signature from an
  address the drop trusts as a "signer".
- You own the collection, so you rotate/add the **owner** as an allowed signer, then
  sign each mint yourself.
- `mintSigned` is sent to the SeaDrop **singleton** `0x00005EA0…24bf5`; admin calls go
  to the token `0x0c0a…47c2` (it forwards them). EIP-712 domain uses the singleton as
  `verifyingContract` (verified against a real on-chain signature).

| | |
|---|---|
| Token | `0x0c0a302D8E99f3772a246D34180C9dD0ec8247c2` |
| SeaDrop singleton | `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5` |
| Owner / signer / payer | `0x11fC814F8E97a64531c93b89466109d233bEB693` |
| Chain | Robinhood Chain, id 4663 |

## Security

- The owner private key is read from `$env:OWNER_PK` at runtime and **never** written
  to disk, logged, or passed as a CLI arg. Set it in your shell session only.
- Both scripts default to **DRY_RUN** (simulate via `eth_call`, send nothing). You must
  explicitly set `$env:DRY_RUN='false'` to broadcast.
- Uses the ethers install already in this repo's `node_modules` (v6).

## Steps (PowerShell)

```powershell
cd D:\my_projects\robinhood_hollow\robi-mint
$env:OWNER_PK = '0xYOUR_OWNER_PRIVATE_KEY'   # this session only; do not commit

# 1) one-time: enroll owner as signer + payer  (dry-run, then apply)
node robi-config.mjs
$env:DRY_RUN = 'false'; node robi-config.mjs

# 2) fill wallets.txt with one target address per line, then mint (dry-run, then real)
$env:DRY_RUN = 'true'; node robi-mint.mjs wallets.txt
$env:DRY_RUN = 'false'; node robi-mint.mjs wallets.txt

# when done, clear the key from the session
Remove-Item Env:OWNER_PK
```

## Notes

- Price is 0, so mints cost only gas (paid by the owner wallet). Fund the owner with
  enough native ETH for ~N transactions.
- `robi-mint` skips wallets that already minted, so it is safe to re-run.
- Supply cap is 222; the script stops when reached.
