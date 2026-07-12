import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config";

const robinhoodChain = defineChain({
  id: config.blockchain.chainId,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [config.blockchain.rpcUrl],
    },
  },
});

const rafflesAbi = parseAbi([
  "function activateRaffle(uint256 raffleId) external",
  "function endRaffle(uint256 raffleId, address[] calldata participants, uint256[] calldata ticketCounts, uint256 randomSeed) external",
  "function getRaffleState(uint256 raffleId) external view returns (uint8)",
  "function getWinners(uint256 raffleId) external view returns (address[])",
]);

export class Blockchain {
  private publicClient;
  private walletClient;
  private account;

  constructor() {
    this.account = privateKeyToAccount(config.blockchain.privateKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: robinhoodChain,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      chain: robinhoodChain,
      transport: http(),
      account: this.account,
    });
  }

  async activateRaffle(chainRaffleId: number): Promise<string> {
    const hash = await this.walletClient.writeContract({
      address: config.contracts.raffles,
      abi: rafflesAbi,
      functionName: "activateRaffle",
      args: [BigInt(chainRaffleId)],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async endRaffle(
    chainRaffleId: number,
    participants: string[],
    ticketCounts: bigint[],
    randomSeed: bigint
  ): Promise<string> {
    const normalizedParticipants = participants.map((participant) =>
      getAddress(participant as `0x${string}`)
    );
    const hash = await this.walletClient.writeContract({
      address: config.contracts.raffles,
      abi: rafflesAbi,
      functionName: "endRaffle",
      args: [BigInt(chainRaffleId), normalizedParticipants, ticketCounts, randomSeed],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getRaffleState(chainRaffleId: number): Promise<number> {
    const state = await this.publicClient.readContract({
      address: config.contracts.raffles,
      abi: rafflesAbi,
      functionName: "getRaffleState",
      args: [BigInt(chainRaffleId)],
    });

    return Number(state);
  }

  async getWinners(chainRaffleId: number): Promise<string[]> {
    const winners = await this.publicClient.readContract({
      address: config.contracts.raffles,
      abi: rafflesAbi,
      functionName: "getWinners",
      args: [BigInt(chainRaffleId)],
    });

    return winners as string[];
  }
}
