import { randomBytes } from "crypto";
import { config, validateConfig } from "./config";
import { Database, Raffle } from "./database";
import { Blockchain } from "./blockchain";

class Watchdog {
  private db: Database;
  private blockchain: Blockchain;
  private isRunning: boolean = false;

  constructor() {
    this.db = new Database();
    this.blockchain = new Blockchain();
  }

  async start(): Promise<void> {
    if (!validateConfig()) {
      console.error("Invalid configuration. Exiting.");
      process.exit(1);
    }

    console.log("🐕 Watchdog starting...");
    console.log(`📊 Poll interval: ${config.pollInterval / 1000}s`);
    console.log(`⛓️  Chain ID: ${config.blockchain.chainId}`);

    this.isRunning = true;
    await this.runLoop();
  }

  async stop(): Promise<void> {
    console.log("🛑 Watchdog stopping...");
    this.isRunning = false;
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processRaffles();
      } catch (error) {
        console.error("Error in watchdog loop:", error);
      }

      await this.sleep(config.pollInterval);
    }
  }

  private async processRaffles(): Promise<void> {
    const rafflesToStart = await this.db.getRafflesNeedingStart();
    console.log(`🧭 Raffles to start: ${rafflesToStart.length}`);
    for (const raffle of rafflesToStart) {
      await this.startRaffle(raffle);
    }

    const rafflesToEnd = await this.db.getRafflesNeedingEnd();
    console.log(`🧭 Raffles to end: ${rafflesToEnd.length}`);
    for (const raffle of rafflesToEnd) {
      await this.endRaffle(raffle);
    }
  }

  private async startRaffle(raffle: Raffle): Promise<void> {
    if (!raffle.chain_raffle_id) return;

    console.log(`🎯 Activating raffle: ${raffle.title} (ID: ${raffle.id})`);

    try {
      const state = await this.blockchain.getRaffleState(raffle.chain_raffle_id);
      if (state !== 0) {
        console.log(`ℹ️ Raffle ${raffle.id} state ${state} (expected CREATED), skipping activate`);
        return;
      }

      const txHash = await this.blockchain.activateRaffle(raffle.chain_raffle_id);
      console.log(`✅ Raffle activated. TX: ${txHash}`);
    } catch (error) {
      console.error(`❌ Failed to activate raffle ${raffle.id}:`, error);
    }
  }

  private async endRaffle(raffle: Raffle): Promise<void> {
    if (!raffle.chain_raffle_id) return;

    console.log(`🏁 Ending raffle: ${raffle.title} (ID: ${raffle.id})`);

    try {
      const state = await this.blockchain.getRaffleState(raffle.chain_raffle_id);
      if (state !== 1) {
        console.log(`ℹ️ Raffle ${raffle.id} state ${state} (expected ACTIVE), skipping end`);
        return;
      }

      const now = new Date();
      const isPastEnd = now >= new Date(raffle.end_date);
      const participantsCount = await this.db.getParticipantCount(raffle.id);
      const isFull = participantsCount >= raffle.max_participants;

      if (!isPastEnd && !isFull) {
        console.log(
          `ℹ️ Raffle ${raffle.id} not ready to end (pastEnd=${isPastEnd}, full=${isFull})`
        );
        return;
      }

      const prizeCount = await this.db.getPrizeCount(raffle.id);
      if (prizeCount === 0) {
        console.log(`⚠️ No prizes configured for raffle ${raffle.id}, skipping end`);
        return;
      }

      const entries = await this.db.getRaffleEntries(raffle.id);
      const participants = entries.map((entry) => entry.wallet_address);
      const ticketCounts = entries.map((entry) => BigInt(entry.entry_count));

      console.log(
        `📦 Raffle ${raffle.id} entries=${participants.length}, prizes=${prizeCount}, participantsCount=${participantsCount}`
      );

      if (participants.length > 0 && participants.length < prizeCount) {
        console.log(`⚠️ Not enough participants for raffle ${raffle.id}, skipping end`);
        return;
      }

      const randomSeed = BigInt(`0x${randomBytes(32).toString("hex")}`);
      const txHash = await this.blockchain.endRaffle(
        raffle.chain_raffle_id,
        participants,
        ticketCounts,
        randomSeed
      );
      console.log(`✅ Raffle ended. TX: ${txHash}`);

      const winners = await this.blockchain.getWinners(raffle.chain_raffle_id);
      const prizes = await this.db.getRafflePrizes(raffle.id);

      console.log(`🏆 Raffle ${raffle.id} winners=${winners.length}, prizes=${prizes.length}`);

      if (winners.length > 0) {
        await this.db.saveWinners(
          raffle.id,
          winners.map((wallet, index) => ({
            wallet_address: wallet,
            prize_amount: prizes[index]?.prize_amount ?? undefined,
            prize_token_id: prizes[index]?.prize_token_id ?? undefined,
            distribution_tx_hash: txHash,
          }))
        );

        for (const winner of winners) {
          await this.db.incrementUserWins(winner);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to end raffle ${raffle.id}:`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const watchdog = new Watchdog();

process.on("SIGINT", async () => {
  await watchdog.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await watchdog.stop();
  process.exit(0);
});

watchdog.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
