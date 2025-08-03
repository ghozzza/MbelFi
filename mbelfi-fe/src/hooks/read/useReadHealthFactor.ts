"use client";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { helperAbi } from "@/lib/abis/helperAbi";
import { helperAddress } from "@/constants/tokenAddress";

export const useReadHealthFactor = (
  lendingPoolAddress: string,
) => {
  const { address } = useAccount();
  
  // Always call useReadContract to maintain hook order
  const {
    data: healthFactor,
    isLoading: isLoadingHealthFactor,
    refetch: refetchHealthFactor,
    error: healthFactorError,
  } = useReadContract({
    address: helperAddress as `0x${string}`,
    abi: helperAbi,
    functionName: "getHealthFactor",
    args: [lendingPoolAddress as `0x${string}`, address as `0x${string}`],
  });

  // Return appropriate values based on validation
  if (!lendingPoolAddress || lendingPoolAddress === "0x0000000000000000000000000000000000000000") {
    return {
      healthFactor: undefined,
      isLoadingHealthFactor: false,
      refetchHealthFactor: () => {},
      error: undefined,
    };
  }

  return {
    healthFactor,
    isLoadingHealthFactor,
    refetchHealthFactor,
    error: healthFactorError,
  };
};
