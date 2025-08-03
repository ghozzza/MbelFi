"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { tokens } from "@/constants/tokenAddress";
import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { useReadTotalBorrowAssets } from "@/hooks/read/useTotalBorrowAssets";
import { useReadTotalBorrowShares } from "@/hooks/read/useReadTotalBorrowShares";
import { defaultChain } from "@/lib/get-default-chain";

interface TokenInfo {
  address: string;
  decimals: number;
}

const getTokenInfo = (
  borrowToken?: string,
  chainId?: number
): TokenInfo | null => {
  if (!borrowToken) return null;

  const targetChain = chainId || defaultChain;
  
  // Try to find token by name first
  let token = tokens.find((t) => t.name === borrowToken);
  
  // If not found by name, try to find by address
  if (!token) {
    token = tokens.find((t) => t.addresses[targetChain] === borrowToken);
  }
  
  if (!token) {
    console.warn(`Token ${borrowToken} not found for chain ${targetChain}`);
    return null;
  }

  const address = token.addresses[targetChain];

  if (!address) {
    console.warn(`Token ${borrowToken} not found for chain ${targetChain}`);
    return null;
  }

  return {
    address,
    decimals: token.decimals ?? 6,
  };
};

const calculateUserShares = (
  userAmount: number,
  totalBorrowAssets: string,
  totalBorrowShares: string
): bigint => {
  if (
    !totalBorrowAssets ||
    !totalBorrowShares ||
    Number(totalBorrowAssets) === 0 ||
    Number(totalBorrowShares) === 0
  ) {
    return BigInt(0);
  }

  const shares =
    (userAmount * Number(totalBorrowAssets)) / Number(totalBorrowShares);
  return BigInt(Math.round(shares));
};

export const useRepay = (
  borrowToken?: string,
  lendingPoolAddress?: string,
  condition?: boolean,
  chainId?: number,
  decimals?: number,
  selectedTokenAddress?: string
) => {
  const [error, setError] = useState<Error | null>(null);
  const { data: hash, isPending, writeContract, reset } = useWriteContract();
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  // Get selected token decimals for shares calculation
  const selectedTokenDecimalsForShares = selectedTokenAddress ? 
    tokens.find(t => t.name === selectedTokenAddress)?.decimals || 6 :
    6;

  const { userBorrowShares, userBorrowSharesLoading, refetchUserBorrowShares } =
    useReadUserBorrowShares(lendingPoolAddress as `0x${string}`, selectedTokenDecimalsForShares);

  const {
    totalBorrowAssets,
    totalBorrowAssetsLoading,
    refetchTotalBorrowAssets,
  } = useReadTotalBorrowAssets(
    lendingPoolAddress as `0x${string}`,
    selectedTokenDecimalsForShares
  );

  const {
    totalBorrowShares,
    isLoadingTotalBorrowShares,
    refetchTotalBorrowShares,
  } = useReadTotalBorrowShares(lendingPoolAddress as `0x${string}`);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchUserBorrowShares(),
      refetchTotalBorrowAssets(),
      refetchTotalBorrowShares(),
    ]);
  }, [
    refetchUserBorrowShares,
    refetchTotalBorrowAssets,
    refetchTotalBorrowShares,
  ]);

  const repay = useCallback(
    async (
      amount: string,
      options?: {
        totalAssets?: string;
        totalShares?: string;
        useMaxAmount?: boolean;
      }
    ) => {
      setError(null);

      // Use selected token address if provided, otherwise fallback to borrow token
      const tokenToUse = selectedTokenAddress || borrowToken;
      
      const tokenInfo = getTokenInfo(tokenToUse, chainId);

      if (!tokenInfo || !lendingPoolAddress) {
        const error = new Error("Missing token or pool address");
        setError(error);
        return;
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        const error = new Error("Invalid repay amount");
        setError(error);
        return;
      }

      const effectiveTotalAssets =
        options?.totalAssets || totalBorrowAssets || "0";
      const effectiveTotalShares =
        options?.totalShares || totalBorrowShares || "0";

      // Use borrow token decimals for userAmount calculation (amount is in borrow token)
      const borrowTokenDecimals = decimals || 6;
      
      const userAmount = Number(amount) * 10 ** borrowTokenDecimals;
      const userShares = calculateUserShares(
        userAmount,
        effectiveTotalAssets.toString(),
        effectiveTotalShares.toString()
      );


      if (userShares === BigInt(0)) {
        const error = new Error("Calculated shares amount is zero");
        setError(error);
        return;
      }

      // Get selected token address for contract call
      const selectedTokenAddressForContract = selectedTokenAddress ? 
        tokens.find(t => t.name === selectedTokenAddress)?.addresses[chainId || defaultChain] :
        tokenInfo.address;



      await writeContract({
        address: lendingPoolAddress as `0x${string}`,
        abi: lendingPoolAbi,
        functionName: "repayWithSelectedToken",
        args: [userShares, selectedTokenAddressForContract as `0x${string}`, true],
      });
      
      // Refetch data after successful transaction
      await refetchAll();
    },
    [
      borrowToken,
      selectedTokenAddress,
      selectedTokenDecimalsForShares,
      lendingPoolAddress,
      chainId,
      totalBorrowAssets,
      totalBorrowShares,
      writeContract,
      refetchAll,
    ]
  );

  return {
    repay,
    hash,
    isPending,
    isLoading,
    isSuccess,
    isError,
    error,
    reset,
    refetchAll,
    userBorrowShares,
    totalBorrowAssets,
    totalBorrowShares,
    userBorrowSharesLoading,
    totalBorrowAssetsLoading,
    isLoadingTotalBorrowShares,
  };
};
