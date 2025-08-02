"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { tokens } from "@/constants/tokenAddress";
import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { mockErc20Abi } from "@/lib/abis/mockErc20Abi";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { useReadTotalBorrowAssets } from "@/hooks/read/useTotalBorrowAssets";
import { useReadTotalBorrowShares } from "@/hooks/read/useReadTotalBorrowShares";
import { defaultChain } from "@/lib/get-default-chain";

interface TokenInfo {
  address: string;
  decimals: number;
}

const getTokenInfo = (borrowToken?: string, chainId?: number): TokenInfo | null => {
  if (!borrowToken) return null;
  
  const token = tokens.find((t) => t.name === borrowToken);
  if (!token) return null;
  
  const targetChain = chainId || defaultChain;
  const address = token.addresses[targetChain];
  
  if (!address) {
    console.warn(`Token ${borrowToken} not found for chain ${targetChain}`);
    return null;
  }
  
  return {
    address,
    decimals: token.decimals ?? 6
  };
};

const calculateUserShares = (
  userAmount: number,
  totalBorrowAssets: string,
  totalBorrowShares: string
): bigint => {
  if (!totalBorrowAssets || !totalBorrowShares || 
      Number(totalBorrowAssets) === 0 || Number(totalBorrowShares) === 0) {
    return BigInt(0);
  }
  
  const shares = (userAmount * Number(totalBorrowAssets)) / Number(totalBorrowShares);
  return BigInt(Math.round(shares));
};

export const useRepay = (
  borrowToken?: string,
  lendingPoolAddress?: string,
  condition?: boolean,
  chainId?: number,
  decimals?: number
) => {
  const [error, setError] = useState<Error | null>(null);
  const { data: hash, isPending, writeContract, reset } = useWriteContract();
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  const {
    userBorrowShares,
    userBorrowSharesLoading,
    refetchUserBorrowShares,
  } = useReadUserBorrowShares(lendingPoolAddress as `0x${string}`, decimals ?? 6);

  const {
    totalBorrowAssets,
    totalBorrowAssetsLoading,
    refetchTotalBorrowAssets,
  } = useReadTotalBorrowAssets(lendingPoolAddress as `0x${string}`, decimals ?? 6);

  const {
    totalBorrowShares,
    isLoadingTotalBorrowShares,
    refetchTotalBorrowShares,
  } = useReadTotalBorrowShares(lendingPoolAddress as `0x${string}`);

  const repay = useCallback(async (
    amount: string,
    options?: {
      totalAssets?: string;
      totalShares?: string;
      useMaxAmount?: boolean;
    }
  ) => {
    setError(null);

    const tokenInfo = getTokenInfo(borrowToken, chainId);

    if (!tokenInfo || !lendingPoolAddress) {
      const error = new Error("Missing token or pool address");
      console.error("❌ Repay error:", error.message, {
        tokenInfo,
        lendingPoolAddress,
        borrowToken,
        chainId,
      });
      setError(error);
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      const error = new Error("Invalid repay amount");
      console.error("❌ Repay error:", error.message, { amount });
      setError(error);
      return;
    }

    // Use provided values or fallback to fetched values
    const effectiveTotalAssets = options?.totalAssets || totalBorrowAssets || "0";
    const effectiveTotalShares = options?.totalShares || totalBorrowShares || "0";

    const userAmount = Number(amount) * 10 ** tokenInfo.decimals;
    const userShares = calculateUserShares(
      userAmount,
      effectiveTotalAssets.toString(),
      effectiveTotalShares.toString()
    );

    if (userShares === BigInt(0)) {
      const error = new Error("Calculated shares amount is zero");
      console.error("❌ Repay error:", error.message, {
        userAmount,
        effectiveTotalAssets,
        effectiveTotalShares,
        userShares: userShares.toString(),
      });
      setError(error);
      return;
    }

    try {
      await writeContract({
        address: lendingPoolAddress as `0x${string}`,
        abi: lendingPoolAbi,
        functionName: "repayWithSelectedToken",
        args: [
          userShares,
          tokenInfo.address as `0x${string}`,
          false,
        ],
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Repay failed. Please try again.");

      console.error("❌ Repay transaction failed:", error.message, err);
      setError(error);
    }
  }, [
    borrowToken,
    lendingPoolAddress,
    chainId,
    totalBorrowAssets,
    totalBorrowShares,
    writeContract,
  ]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchUserBorrowShares(),
      refetchTotalBorrowAssets(),
      refetchTotalBorrowShares(),
    ]);
  }, [refetchUserBorrowShares, refetchTotalBorrowAssets, refetchTotalBorrowShares]);

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

export const useApproveToken = (
  borrowToken?: string,
  spenderAddress?: string,
  chainId?: number
) => {
  const [error, setError] = useState<Error | null>(null);
  const { data: hash, isPending, writeContract, reset } = useWriteContract();
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = useCallback(async (
    amount: string,
    options?: {
      approvalBuffer?: number; // Percentage buffer for approval (default 10%)
      maxApproval?: boolean; // Set to true for max approval
    }
  ) => {
    setError(null);

    const tokenInfo = getTokenInfo(borrowToken, chainId);

    if (!tokenInfo || !spenderAddress) {
      const error = new Error("Missing token or spender address");
      console.error("❌ Approval error:", error.message, {
        tokenInfo,
        spenderAddress,
        borrowToken,
        chainId,
      });
      setError(error);
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      const error = new Error("Invalid approve amount");
      console.error("❌ Approval error:", error.message, { amount });
      setError(error);
      return;
    }

    const approvalBuffer = options?.approvalBuffer ?? 10; // 10% buffer by default
    const approvalAmount = options?.maxApproval 
      ? Number.MAX_SAFE_INTEGER 
      : Number(amount) * (1 + approvalBuffer / 100);
    
    const amountBigInt = BigInt(Math.floor(approvalAmount * 10 ** tokenInfo.decimals));

    try {
      await writeContract({
        address: tokenInfo.address as `0x${string}`,
        abi: mockErc20Abi,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, amountBigInt],
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Approval failed. Please try again.");
      console.error("❌ Approval transaction failed:", error.message, err);
      setError(error);
    }
  }, [borrowToken, spenderAddress, chainId, writeContract]);

  return {
    approve,
    hash,
    isPending,
    isLoading,
    isSuccess,
    isError,
    error,
    reset,
  };
};