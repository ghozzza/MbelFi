import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { formatWeiToNumber, formatWeiToNumberForCalculation } from "@/lib/utils/numberFormat";
import { useAccount, useReadContract } from "wagmi";
import { useEffect } from "react";

export type HexAddress = `0x${string}`;

export const useReadUserBorrowShares = (lendingPoolAddress: HexAddress, decimals: number) => {
  const { address } = useAccount();
  const {
    data: userBorrowShares,
    isLoading: userBorrowSharesLoading,
    error: userBorrowSharesError,
    refetch: refetchUserBorrowShares,
  } = useReadContract({
    address: lendingPoolAddress,
    abi: lendingPoolAbi,
    functionName: "userBorrowShares",
    args: [address as HexAddress],
  });

  // Auto-refetch every 3 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUserBorrowShares();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchUserBorrowShares]);

  const userBorrowSharesFormatted = formatWeiToNumber(userBorrowShares, decimals);
  const userBorrowSharesParsed = formatWeiToNumberForCalculation(userBorrowShares, decimals);

  return {
    userBorrowShares,
    userBorrowSharesFormatted,
    userBorrowSharesParsed,
    userBorrowSharesLoading,
    userBorrowSharesError,
    refetchUserBorrowShares,
  };
};