"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  user: {
    id: string;
  };
  pool: {
    id: string;
  };
  asset: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  // Specific fields for different transaction types
  onBehalfOf?: string;
  to?: string;
  borrowRateMode?: string;
  borrowRate?: string;
  repayer?: string;
  // Computed fields
  type: "supply_liquidity" | "withdraw_liquidity" | "borrow_debt" | "repay_collateral" | "supply_collateral";
  status: "success" | "failed";
  methodName: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  tokenSymbol?: string;
  tokenName?: string;
  chainId: number;
}

interface UseGoldskyHistoryProps {
  pageSize?: number;
  autoFetch?: boolean;
}

interface UseGoldskyHistoryReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  fetchTransactions: (page?: number, append?: boolean) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  clearTransactions: () => void;
}

export const useGoldskyHistory = ({
  pageSize = 20,
  autoFetch = true,
}: UseGoldskyHistoryProps = {}): UseGoldskyHistoryReturn => {
  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!account;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Goldsky API configuration - using the actual endpoint
  const GOLDSKY_ENDPOINT = "https://api.goldsky.com/api/public/project_cmds16kqrb8ra01wo4vdr7g5u/subgraphs/lending-pool-subgraph/1.0.2/gn";

  const fetchTransactions = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!address || !isConnected) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError(null);


    try {
      // First, let's test if there's any data in the subgraph
      const testQuery = `
        query TestSubgraph {
          supplyLiquidities(first: 5) {
            id
            user { id }
            pool { id }
            asset
            amount
            timestamp
          }
          withdrawLiquidities(first: 5) {
            id
            user { id }
            pool { id }
            asset
            amount
            timestamp
          }
          borrowDebtCrosschains(first: 5) {
            id
            user { id }
            pool { id }
            asset
            amount
            timestamp
          }
          repayWithCollateralByPositions(first: 5) {
            id
            user { id }
            pool { id }
            asset
            amount
            timestamp
          }
          supplyCollaterals(first: 5) {
            id
            user { id }
            pool { id }
            asset
            amount
            timestamp
          }
        }
      `;

      
      const testResponse = await fetch(GOLDSKY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: testQuery,
        }),
      });


      // GraphQL query for all transaction types from the lending pool subgraph
      const query = `
        query GetUserTransactions($userAddress: String!, $first: Int!, $skip: Int!) {
          supplyLiquidities(
            where: { user: $userAddress }
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            user { id }
            pool { id }
            asset
            amount
            onBehalfOf
            timestamp
            blockNumber
            transactionHash
          }
          
          withdrawLiquidities(
            where: { user: $userAddress }
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            user { id }
            pool { id }
            asset
            amount
            to
            timestamp
            blockNumber
            transactionHash
          }
          
          borrowDebtCrosschains(
            where: { user: $userAddress }
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            user { id }
            pool { id }
            asset
            amount
            borrowRateMode
            borrowRate
            onBehalfOf
            timestamp
            blockNumber
            transactionHash
          }
          
          repayWithCollateralByPositions(
            where: { user: $userAddress }
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            user { id }
            pool { id }
            asset
            amount
            repayer
            timestamp
            blockNumber
            transactionHash
          }
          
          supplyCollaterals(
            where: { user: $userAddress }
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            user { id }
            pool { id }
            asset
            amount
            onBehalfOf
            timestamp
            blockNumber
            transactionHash
          }
        }
      `;

      const variables = {
        userAddress: address.toLowerCase(),
        first: pageSize,
        skip: (page - 1) * pageSize,
      };


      const response = await fetch(GOLDSKY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        throw new Error(data.errors[0].message);
      }

      // Combine all transaction types and add type information
      const allTransactions: Transaction[] = [];
      
      // Process SupplyLiquidity transactions
      if (data.data.supplyLiquidities) {
        data.data.supplyLiquidities.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            type: "supply_liquidity" as const,
            status: "success" as const, // Assuming all indexed transactions are successful
            methodName: "Supply Liquidity",
            value: tx.amount,
            chainId: 421614, // Arbitrum Sepolia
          });
        });
      }

      // Process WithdrawLiquidity transactions
      if (data.data.withdrawLiquidities) {
        data.data.withdrawLiquidities.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            type: "withdraw_liquidity" as const,
            status: "success" as const,
            methodName: "Withdraw Liquidity",
            value: tx.amount,
            chainId: 421614,
          });
        });
      }

      // Process BorrowDebtCrosschain transactions
      if (data.data.borrowDebtCrosschains) {
        data.data.borrowDebtCrosschains.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            type: "borrow_debt" as const,
            status: "success" as const,
            methodName: "Borrow Debt",
            value: tx.amount,
            chainId: 421614,
          });
        });
      }

      // Process RepayWithCollateralByPosition transactions
      if (data.data.repayWithCollateralByPositions) {
        data.data.repayWithCollateralByPositions.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            type: "repay_collateral" as const,
            status: "success" as const,
            methodName: "Repay Collateral",
            value: tx.amount,
            chainId: 421614,
          });
        });
      }

      // Process SupplyCollateral transactions
      if (data.data.supplyCollaterals) {
        data.data.supplyCollaterals.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            type: "supply_collateral" as const,
            status: "success" as const,
            methodName: "Supply Collateral",
            value: tx.amount,
            chainId: 421614,
          });
        });
      }

      // Sort all transactions by timestamp (newest first)
      allTransactions.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
      
      if (append) {
        setTransactions(prev => [...prev, ...allTransactions]);
      } else {
        setTransactions(allTransactions);
      }
      
      setHasMore(allTransactions.length === pageSize);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load transaction history";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, pageSize]);

  const refreshTransactions = useCallback(async () => {
    await fetchTransactions(1, false);
  }, [fetchTransactions]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  // Auto-fetch on mount and when address changes
  useEffect(() => {
    if (autoFetch && address && isConnected) {
      fetchTransactions(1, false);
    }
  }, [address, isConnected, autoFetch, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    currentPage,
    fetchTransactions,
    refreshTransactions,
    clearTransactions,
  };
}; 