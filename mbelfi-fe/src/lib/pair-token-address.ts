import { tokens } from "@/constants/tokenAddress";

export interface EnrichedPool {
  id: string;
  collateralToken: string;
  borrowToken: string;
  ltv: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
  borrowTokenInfo?: TokenInfo;
  collateralTokenInfo?: TokenInfo;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  logo: string;
  address: string;
  decimals: number;
}

export function enrichPoolWithTokenInfo(pool: any, chainId = 128123): EnrichedPool {
  const getTokenInfo = (address: string): TokenInfo | undefined => {
    // Add null/undefined checks
    if (!address) {
      return undefined;
    }

    for (const t of tokens) {
      const tokenAddr = t.addresses?.[chainId];
      if (tokenAddr && tokenAddr.toLowerCase() === address.toLowerCase()) {
        return {
          name: t.name,
          symbol: t.symbol,
          logo: t.logo,
          address: tokenAddr,
          decimals: t.decimals,
        };
      }
    }
    return undefined;
  };

  // Add validation for required pool properties
  if (!pool) {
    return {
      id: "",
      collateralToken: "",
      borrowToken: "",
      ltv: "",
      createdAt: "",
      blockNumber: "",
      transactionHash: "",
    };
  }

  // Convert snake_case to camelCase and handle API response structure
  const normalizedPool = {
    id: pool.id || "",
    collateralToken: pool.collateral_token || pool.collateralToken || "",
    borrowToken: pool.borrow_token || pool.borrowToken || "",
    ltv: pool.ltv || "",
    createdAt: pool.created_at || pool.createdAt || "",
    blockNumber: pool.block_number || pool.blockNumber || "",
    transactionHash: pool.transaction_hash || pool.transactionHash || "",
  };

  return {
    ...normalizedPool,
    borrowTokenInfo: getTokenInfo(normalizedPool.borrowToken),
    collateralTokenInfo: getTokenInfo(normalizedPool.collateralToken),
  };
} 