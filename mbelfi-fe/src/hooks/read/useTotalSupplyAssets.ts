import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { formatWeiToNumber, formatWeiToNumberForCalculation } from "@/lib/utils/numberFormat";
import { useReadContract } from "wagmi";
import { useEffect } from "react";

export type HexAddress = `0x${string}`;

export const useReadTotalSupplyAssets = (lendingPoolAddress: HexAddress, decimals: number) => {
  const {
    data: totalSupplyAssets,
    isLoading: totalSupplyAssetsLoading,
    error: totalSupplyAssetsError,
    refetch: refetchTotalSupplyAssets,
  } = useReadContract({
    address: lendingPoolAddress,
    abi: lendingPoolAbi,
    functionName: "totalSupplyAssets",
  });

  // Auto-refetch every 3 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTotalSupplyAssets();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchTotalSupplyAssets]);

  const totalSupplyAssetsFormatted = formatWeiToNumber(totalSupplyAssets, decimals);
  const totalSupplyAssetsParsed = formatWeiToNumberForCalculation(totalSupplyAssets, decimals);

  return {
    totalSupplyAssets,
    totalSupplyAssetsFormatted,
    totalSupplyAssetsParsed,
    totalSupplyAssetsLoading,
    totalSupplyAssetsError,
    refetchTotalSupplyAssets,
  };
};