import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

export interface Raffle {
  id: string;
  chain_raffle_id: number | null;
  title: string;
  start_date: string;
  end_date: string;
  max_participants: number;
}

export interface Entry {
  id: string;
  raffle_id: string;
  wallet_address: string;
  entry_count: number;
}

export interface Prize {
  prize_type: string;
  prize_amount: string | null;
  prize_token_id: string | null;
}

export class Database {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.serviceKey);
  }

  async getRafflesNeedingStart(): Promise<Raffle[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("litvm_raffle_raffles")
      .select("*")
      .lte("start_date", now)
      .gt("end_date", now)
      .not("chain_raffle_id", "is", null);

    if (error) {
      console.error("Error fetching raffles to start:", error);
      return [];
    }
    return data || [];
  }

  async getRafflesNeedingEnd(): Promise<Raffle[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("litvm_raffle_raffles")
      .select("*")
      .lte("start_date", now)
      .not("chain_raffle_id", "is", null);

    if (error) {
      console.error("Error fetching raffles to end:", error);
      return [];
    }
    return data || [];
  }

  async getRaffleEntries(raffleId: string): Promise<Entry[]> {
    const { data, error } = await this.client
      .from("litvm_raffle_entries")
      .select("*")
      .eq("raffle_id", raffleId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching entries:", error);
      return [];
    }
    return data || [];
  }

  async getRafflePrizes(raffleId: string): Promise<Prize[]> {
    const { data, error } = await this.client
      .from("litvm_raffle_prizes")
      .select("prize_type, prize_amount, prize_token_id")
      .eq("raffle_id", raffleId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching prizes:", error);
      return [];
    }

    return data || [];
  }

  async getPrizeCount(raffleId: string): Promise<number> {
    const { count, error } = await this.client
      .from("litvm_raffle_prizes")
      .select("id", { count: "exact", head: true })
      .eq("raffle_id", raffleId);

    if (error) {
      console.error("Error fetching prize count:", error);
      return 0;
    }

    return count || 0;
  }

  async getParticipantCount(raffleId: string): Promise<number> {
    const { count, error } = await this.client
      .from("litvm_raffle_entries")
      .select("id", { count: "exact", head: true })
      .eq("raffle_id", raffleId);

    if (error) {
      console.error("Error fetching participant count:", error);
      return 0;
    }

    return count || 0;
  }

  async saveWinners(
    raffleId: string,
    winners: Array<{
      wallet_address: string;
      prize_amount?: string;
      prize_token_id?: string;
      distribution_tx_hash?: string;
    }>
  ): Promise<void> {
    const { error } = await this.client
      .from("litvm_raffle_winners")
      .insert(winners.map((w) => ({ raffle_id: raffleId, ...w })));

    if (error) {
      console.error("Error saving winners:", error);
    }
  }

  async updateWinnerDistribution(raffleId: string, walletAddress: string, txHash: string): Promise<void> {
    const { error } = await this.client
      .from("litvm_raffle_winners")
      .update({ distribution_tx_hash: txHash })
      .eq("raffle_id", raffleId)
      .eq("wallet_address", walletAddress);

    if (error) {
      console.error("Error updating winner distribution:", error);
    }
  }

  async incrementUserWins(walletAddress: string): Promise<void> {
    const { error } = await this.client.rpc("litvm_raffle_increment_user_wins", {
      p_wallet: walletAddress.toLowerCase(),
    });

    if (error) {
      console.error("Error incrementing user wins:", error);
    }
  }
}
