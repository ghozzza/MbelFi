import { mockErc20Abi } from "@/lib/abis/mockErc20Abi";
import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { formatWeiToNumber, formatWeiToNumberForCalculation } from "@/lib/utils/numberFormat";
import { useAccount, useReadContract } from "wagmi";
import { useEffect } from "react";

export type HexAddress = `0x${string}`;

export const useReadUserCollateral = (collateralToken: HexAddress, lendingPoolAddress: HexAddress, decimals: number) => {
  const { address } = useAccount();

  const {
    data: userPostitionAddress,
    isLoading: positionLoading,
    error: positionError,
    refetch: refetchPosition,
  } = useReadContract({
    address: lendingPoolAddress,
    abi: lendingPoolAbi,    
    functionName: "addressPositions",
    args: [address as HexAddress],
    query: {
      enabled: !!address && !!lendingPoolAddress && !!collateralToken,
    },
  });

  const {
    data: userCollateral,
    isLoading: collateralLoading,
    error: collateralError,
    refetch: refetchCollateral,
  } = useReadContract({
    address: collateralToken,
    abi: mockErc20Abi,
    functionName: "balanceOf",
    args: [userPostitionAddress as HexAddress],
    query: {
      enabled: !!userPostitionAddress,
    },
  });

  // Auto-refetch every 3 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPosition();
      if (userPostitionAddress) {
        refetchCollateral();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchPosition, refetchCollateral, userPostitionAddress]);

  // Format the user collateral with proper decimals
  const userCollateralFormatted = formatWeiToNumber(userCollateral, decimals);
  const userCollateralParsed = formatWeiToNumberForCalculation(userCollateral, decimals);

  return {
    userPostitionAddress,
    userCollateral,
    userCollateralFormatted,
    userCollateralParsed,
    positionLoading,
    collateralLoading,
    positionError,
    collateralError,
    refetchPosition,
    refetchCollateral,
  };
};