import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { formatWeiToNumber, formatWeiToNumberForCalculation } from "@/lib/utils/numberFormat";
import { useReadContract } from "wagmi";
import { useEffect } from "react";

export type HexAddress = `0x${string}`;

export const useReadTotalBorrowAssets = (lendingPoolAddress: HexAddress, decimals: number) => {
  const {
    data: totalBorrowAssets,
    isLoading: totalBorrowAssetsLoading,
    error: totalBorrowAssetsError,
    refetch: refetchTotalBorrowAssets,
  } = useReadContract({
    address: lendingPoolAddress,
    abi: lendingPoolAbi,
    functionName: "totalBorrowAssets",
  });

  // Auto-refetch every 3 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTotalBorrowAssets();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchTotalBorrowAssets]);

  const totalBorrowAssetsFormatted = formatWeiToNumber(totalBorrowAssets, decimals);
  const totalBorrowAssetsParsed = formatWeiToNumberForCalculation(totalBorrowAssets, decimals);

  return {
    totalBorrowAssets,
    totalBorrowAssetsFormatted,
    totalBorrowAssetsParsed,
    totalBorrowAssetsLoading,
    totalBorrowAssetsError,
    refetchTotalBorrowAssets,
  };
};