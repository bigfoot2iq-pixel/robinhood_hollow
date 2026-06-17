/**
 * Test script for Katana indexer-proxy UserLocks query.
 * Usage:
 *   npx tsx scripts/test-indexer-proxy.ts <userAddress> [contractAddress]
 */

const API_URL = "https://app.katana.network/api/indexer-proxy";
const CHAIN_ID = "747474";
const CHAIN_ID_INT = 747474;

const ALLOWED_CONTRACTS = [
  "0x4d6fc15ca6258b168225d283262743c623c13ead",
  "0x7231dbaCdFc968E07656D12389AB20De82FbfCeB",
] as const;

const USER_LOCKS_QUERY = `
  query UserLocks(
    $user: String!,
    $contractAddress: String!,
    $chainId: String!,
    $chainIdInt: Int!
  ) {
    Token(
      where: {
        _or: [
          { currentOwner: { _ilike: $user } },
          { beneficialOwner: { _ilike: $user } }
        ],
        active: { _eq: true },
        withdrawnAt: { _is_null: true},
        contract: {
          address: { _ilike: $contractAddress },
          chainId: { _eq: $chainId }
        }
      }
    ) {
      id
      tokenId
      currentValue
      createdAt
      inExitQueue
      exitQueuedAt
      cooldownEndsAt
    }

    _meta(
      where: {
        chainId: { _eq: $chainIdInt }
      }
    ) {
      progressBlock
    }
  }
`;

type UserLocksResponse = {
  data?: {
    Token?: Array<{
      id: string;
      tokenId: string;
      currentValue: string;
      createdAt: string;
      inExitQueue: boolean;
      exitQueuedAt: string | null;
      cooldownEndsAt: string | null;
    }>;
    _meta?: Array<{
      progressBlock: number;
    }>;
  };
  errors?: Array<{ message: string }>;
};

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function isAllowedContract(address: string): boolean {
  const normalized = normalizeAddress(address);
  return ALLOWED_CONTRACTS.some((contract) => normalizeAddress(contract) === normalized);
}

async function testIndexerProxy(user: string, contractAddress: string) {
  if (!isAllowedContract(contractAddress)) {
    console.error("❌ Invalid contractAddress.");
    console.error("Allowed values:");
    for (const contract of ALLOWED_CONTRACTS) {
      console.error(`  - ${contract}`);
    }
    process.exit(1);
  }

  const payload = {
    query: USER_LOCKS_QUERY,
    variables: {
      user,
      contractAddress,
      chainId: CHAIN_ID,
      chainIdInt: CHAIN_ID_INT,
    },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    credentials: "include",
    referrer: "https://app.katana.network/stake?tab=stake",
    headers: {
      accept: "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,ar;q=0.7,fr;q=0.6",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
      "sec-ch-ua-arch": "\"x86\"",
      "sec-ch-ua-bitness": "\"64\"",
      "sec-ch-ua-full-version": "\"146.0.7680.165\"",
      "sec-ch-ua-full-version-list":
        "\"Chromium\";v=\"146.0.7680.165\", \"Not-A.Brand\";v=\"24.0.0.0\", \"Google Chrome\";v=\"146.0.7680.165\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-model": "\"\"",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-ch-ua-platform-version": "\"19.0.0\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as UserLocksResponse;

  if (!response.ok) {
    console.error(`❌ Request failed with status ${response.status}`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  if (json.errors && json.errors.length > 0) {
    console.error("❌ GraphQL returned errors:");
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  console.log("✅ Request successful");
  console.log(`User: ${user}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Locks found: ${json.data?.Token?.length ?? 0}`);
  console.log(JSON.stringify(json, null, 2));
}

const user = process.argv[2];
const contractAddress = process.argv[3] ?? ALLOWED_CONTRACTS[0];

if (!user) {
  console.error("Usage: npx tsx scripts/test-indexer-proxy.ts <userAddress> [contractAddress]");
  console.error("\nAllowed contractAddress values:");
  for (const contract of ALLOWED_CONTRACTS) {
    console.error(`  - ${contract}`);
  }
  process.exit(1);
}

testIndexerProxy(user, contractAddress).catch((error: unknown) => {
  console.error("❌ Unexpected error while calling indexer-proxy:");
  console.error(error);
  process.exit(1);
});
