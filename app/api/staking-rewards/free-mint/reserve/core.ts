export const MIN_HOLLOW_BALANCE = 10_000n * 10n ** 18n;
export const MAX_RESERVED_SPOTS = 200;

function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

type ReserveRow = {
  success: boolean;
  already_reserved: boolean;
  reserved_count: number;
};

export async function reserveFreeMintWallet(
  walletAddressInput: string,
  deps: {
    getBalance: (wallet: `0x${string}`) => Promise<bigint>;
    reserveSpot: (wallet: string, maxSpots: number) => Promise<ReserveRow | null>;
  }
) {
  const wallet = String(walletAddressInput ?? "").trim().toLowerCase();

  if (!wallet || !isValidWalletAddress(wallet)) {
    return { status: 400, body: { error: "Invalid wallet address" } };
  }

  const balance = await deps.getBalance(wallet as `0x${string}`);

  if (balance < MIN_HOLLOW_BALANCE) {
    return {
      status: 403,
      body: {
        error: "Minimum 10,000 HOLLOW required",
        required: MIN_HOLLOW_BALANCE.toString(),
        balance: balance.toString(),
      },
    };
  }

  try {
    const row = await deps.reserveSpot(wallet, MAX_RESERVED_SPOTS);

    if (!row) {
      return { status: 500, body: { error: "Failed to reserve spot" } };
    }

    if (!row.success && !row.already_reserved) {
      return {
        status: 409,
        body: {
          error: "All free mint spots are reserved",
          reservedCount: row.reserved_count,
          maxSpots: MAX_RESERVED_SPOTS,
          remainingSpots: 0,
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        alreadyReserved: row.already_reserved,
        reserved: true,
        reservedCount: row.reserved_count,
        maxSpots: MAX_RESERVED_SPOTS,
        remainingSpots: Math.max(MAX_RESERVED_SPOTS - row.reserved_count, 0),
      },
    };
  } catch (reserveError) {
    console.error("Error reserving free mint spot:", reserveError);
    return { status: 500, body: { error: "Failed to reserve spot" } };
  }
}
