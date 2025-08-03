import React from "react";
import { useReadTotalSupplyAssets } from "@/hooks/read/useTotalSupplyAssets";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { Spinner } from "@/components/ui/spinner";

interface LiquidityDisplayProps {
  lendingPoolAddress: string;
  borrowTokenAddress: string;
}

export const LiquidityDisplay: React.FC<LiquidityDisplayProps> = ({
  lendingPoolAddress,
  borrowTokenAddress,
}) => {
  const chainId = useChainId();
  
  // Get token decimals dynamically
  const tokenDecimals = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === borrowTokenAddress.toLowerCase()
    );
    return token?.decimals || 18;
  }, [borrowTokenAddress, chainId]);

  const { totalSupplyAssetsFormatted, totalSupplyAssetsLoading } = useReadTotalSupplyAssets(
    lendingPoolAddress as `0x${string}`,
    tokenDecimals
  );

  if (totalSupplyAssetsLoading) {
    return (
      <div className="text-center text-gray-400 text-sm flex items-center justify-center gap-2">
        <Spinner size="sm" className="text-gray-400" />
        Loading...
      </div>
    );
  }

  return (
    <div className="text-green-400 font-medium text-center">
      {totalSupplyAssetsFormatted}
    </div>
  );
}; 