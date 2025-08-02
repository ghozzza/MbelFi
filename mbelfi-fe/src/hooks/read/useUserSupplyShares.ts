import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { formatWeiToNumber, formatWeiToNumberForCalculation } from "@/lib/utils/numberFormat";
import { useAccount, useReadContract } from "wagmi";
import { useEffect } from "react";

export type HexAddress = `0x${string}`;

export const useReadUserSupplyShares = (lendingPoolAddress: HexAddress, decimals: number) => {
  const { address } = useAccount();

  const {
    data: userSupplySharesAmount,
    isLoading: sharesLoading,
    error: sharesError,
    refetch: refetchUserSupplyShares,
  } = useReadContract({
    address: lendingPoolAddress,
    abi: lendingPoolAbi,
    functionName: "userSupplyShares",
    args: [address as HexAddress],
    query: {
      enabled: !!address && !!lendingPoolAddress,
    },
  });

  // Auto-refetch every 3 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUserSupplyShares();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchUserSupplyShares]);

  const userSupplySharesFormatted = formatWeiToNumber(userSupplySharesAmount, decimals);
  const userSupplySharesParsed = formatWeiToNumberForCalculation(userSupplySharesAmount, decimals);

  return {
    userSupplySharesAmount,
    userSupplySharesFormatted,
    userSupplySharesParsed,
    sharesLoading,
    sharesError,
    refetchUserSupplyShares,
  };
};