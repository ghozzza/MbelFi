import { useReadContract } from "wagmi";
import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";

export const useReadTotalBorrowShares = (lendingPoolAddress: string) => {
  const {
    data: totalBorrowShares,
    isLoading: isLoadingTotalBorrowShares,
    refetch: refetchTotalBorrowShares,
  } = useReadContract({
    address: lendingPoolAddress as `0x${string}`,
    abi: lendingPoolAbi,
    functionName: "totalBorrowShares",
  });

  return {
    totalBorrowShares,
    isLoadingTotalBorrowShares,
    refetchTotalBorrowShares,
  };
};
