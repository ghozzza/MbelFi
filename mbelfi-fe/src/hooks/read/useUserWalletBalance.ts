"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem/utils";
import { useState, useEffect } from "react";
import { Address } from "viem";
import { erc20Abi } from "viem";

export type HexAddress = `0x${string}`;

export const useUserWalletBalance = (tokenAddress: HexAddress, decimals: number) => {
  const { address } = useAccount();
  const [balance, setBalance] = useState("0");
  const [balanceParsed, setBalanceParsed] = useState(0);

  const { data, isLoading, error, refetch } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  useEffect(() => {
    if (data) {
      const rawBalance = parseFloat(formatUnits(data as bigint, decimals));
      const formattedBalance = rawBalance.toFixed(decimals === 6 ? 2 : 4);
      setBalance(formattedBalance);
      setBalanceParsed(rawBalance);
    }
  }, [data, decimals]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  return {
    userWalletBalance: data,
    userWalletBalanceFormatted: balance,
    userWalletBalanceParsed: balanceParsed,
    walletBalanceLoading: isLoading,
    walletBalanceError: error,
    refetchWalletBalance: refetch,
  };
}; 