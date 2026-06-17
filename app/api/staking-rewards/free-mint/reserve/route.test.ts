import test from "node:test";
import assert from "node:assert/strict";
import { MIN_HOLLOW_BALANCE, MAX_RESERVED_SPOTS, reserveFreeMintWallet } from "./core.ts";

test("returns 400 for invalid wallet", async () => {
  const result = await reserveFreeMintWallet("invalid");
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Invalid wallet address");
});

test("returns 403 when balance is below 10k HOLLOW", async () => {
  const wallet = "0x1111111111111111111111111111111111111111";

  const result = await reserveFreeMintWallet(wallet, {
    getBalance: async () => MIN_HOLLOW_BALANCE - 1n,
    reserveSpot: async () => null,
  });

  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Minimum 10,000 HOLLOW required");
  assert.equal(result.body.required, MIN_HOLLOW_BALANCE.toString());
});

test("returns 409 when all spots are reserved", async () => {
  const wallet = "0x2222222222222222222222222222222222222222";

  const result = await reserveFreeMintWallet(wallet, {
    getBalance: async () => MIN_HOLLOW_BALANCE,
    reserveSpot: async () => ({
      success: false,
      already_reserved: false,
      reserved_count: MAX_RESERVED_SPOTS,
    }),
  });

  assert.equal(result.status, 409);
  assert.equal(result.body.error, "All free mint spots are reserved");
  assert.equal(result.body.remainingSpots, 0);
});

test("returns success when reservation is created", async () => {
  const wallet = "0x3333333333333333333333333333333333333333";

  const result = await reserveFreeMintWallet(wallet, {
    getBalance: async () => MIN_HOLLOW_BALANCE + 1n,
    reserveSpot: async () => ({
      success: true,
      already_reserved: false,
      reserved_count: 12,
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.alreadyReserved, false);
  assert.equal(result.body.reservedCount, 12);
  assert.equal(result.body.remainingSpots, MAX_RESERVED_SPOTS - 12);
});

test("returns success when wallet is already reserved", async () => {
  const wallet = "0x4444444444444444444444444444444444444444";

  const result = await reserveFreeMintWallet(wallet, {
    getBalance: async () => MIN_HOLLOW_BALANCE + 1n,
    reserveSpot: async () => ({
      success: true,
      already_reserved: true,
      reserved_count: 88,
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.alreadyReserved, true);
  assert.equal(result.body.reserved, true);
});

test("returns 500 when reservation call fails", async () => {
  const wallet = "0x5555555555555555555555555555555555555555";

  const result = await reserveFreeMintWallet(wallet, {
    getBalance: async () => MIN_HOLLOW_BALANCE + 1n,
    reserveSpot: async () => {
      throw new Error("rpc failure");
    },
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Failed to reserve spot");
});
