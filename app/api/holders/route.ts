import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';

const ETHERSCAN_V2_API = 'https://api.etherscan.io/v2/api';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const CHAIN_ID = '747474';
const HOLLOW_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS as string;
const TOKEN_DECIMALS = 18;
const HOLDERS_PER_PAGE = 50;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CACHE_TTL_MS = 60_000; // 60 seconds

// In-memory cache keyed by contract address
const cache = new Map<string, { data: { sorted: [string, bigint][]; totalSupplyBig: bigint }; timestamp: number }>();

interface Holder {
  rank: number;
  address: string;
  nameTag: string;
  quantity: string;
  quantityRaw: string;
  percentage: string;
}

interface TokenHoldersResponse {
  holders: Holder[];
  totalHolders: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

interface EtherscanTransfer {
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
}

async function fetchAllTransfers(contractAddress: string): Promise<EtherscanTransfer[]> {
  const allTransfers: EtherscanTransfer[] = [];
  let page = 1;
  const offset = 10000;

  while (true) {
    const url = `${ETHERSCAN_V2_API}?chainid=${CHAIN_ID}&module=account&action=tokentx&contractaddress=${contractAddress}&page=${page}&offset=${offset}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      break;
    }

    allTransfers.push(...data.result);

    if (data.result.length < offset) {
      break;
    }

    page++;
  }

  return allTransfers;
}

function buildHolderMap(transfers: EtherscanTransfer[]): Map<string, bigint> {
  const balances = new Map<string, bigint>();

  for (const tx of transfers) {
    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    const value = BigInt(tx.value);

    // Subtract from sender (skip zero address = mint)
    if (from !== ZERO_ADDRESS) {
      const prev = balances.get(from) ?? 0n;
      balances.set(from, prev - value);
    }

    // Add to receiver (skip zero address = burn)
    if (to !== ZERO_ADDRESS) {
      const prev = balances.get(to) ?? 0n;
      balances.set(to, prev + value);
    }
  }

  // Remove zero balances
  for (const [addr, bal] of balances) {
    if (bal <= 0n) {
      balances.delete(addr);
    }
  }

  return balances;
}

export async function GET(request: NextRequest): Promise<NextResponse<TokenHoldersResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('address') || HOLLOW_TOKEN_ADDRESS;
    const pageParam = searchParams.get('page');

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Missing token address (and NEXT_PUBLIC_HOLLOW_TOKEN_ADDRESS env var is not set)' },
        { status: 400 }
      );
    }

    if (!ETHERSCAN_API_KEY) {
      return NextResponse.json(
        { error: 'ETHERSCAN_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page number. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = contractAddress.toLowerCase();
    const cached = cache.get(cacheKey);
    let sorted: [string, bigint][];
    let totalSupplyBig: bigint;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      sorted = cached.data.sorted;
      totalSupplyBig = cached.data.totalSupplyBig;
    } else {
      // Fetch all transfer events and build holder balances
      const transfers = await fetchAllTransfers(contractAddress);
      const balanceMap = buildHolderMap(transfers);

      // Calculate total supply from balances
      totalSupplyBig = 0n;
      for (const bal of balanceMap.values()) {
        totalSupplyBig += bal;
      }

      // Sort by balance descending
      sorted = [...balanceMap.entries()].sort((a, b) => {
        if (b[1] > a[1]) return 1;
        if (b[1] < a[1]) return -1;
        return 0;
      });

      cache.set(cacheKey, { data: { sorted, totalSupplyBig }, timestamp: Date.now() });
    }

    const totalHolders = sorted.length;
    const totalPages = Math.ceil(totalHolders / HOLDERS_PER_PAGE);
    const startIdx = (page - 1) * HOLDERS_PER_PAGE;
    const pageEntries = sorted.slice(startIdx, startIdx + HOLDERS_PER_PAGE);

    const holders: Holder[] = pageEntries.map(([address, balance], index) => {
      const formatted = formatUnits(balance, TOKEN_DECIMALS);
      const percentage = totalSupplyBig > 0n
        ? ((Number(balance) / Number(totalSupplyBig)) * 100).toFixed(4) + '%'
        : '0%';

      return {
        rank: startIdx + index + 1,
        address,
        nameTag: '',
        quantity: parseFloat(formatted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        quantityRaw: formatted,
        percentage,
      };
    });

    return NextResponse.json({
      holders,
      totalHolders,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error('Error in token holders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
