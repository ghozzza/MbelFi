import React from "react";
import { useReadUserCollateral } from "@/hooks/read/useReadUserCollateral";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { EnrichedPool } from "@/lib/pair-token-address";

interface UserCollateralBalanceDisplayProps {
  market: EnrichedPool;
  className?: string;
}

export const UserCollateralBalanceDisplay: React.FC<UserCollateralBalanceDisplayProps> = ({
  market,
  className = "",
}) => {
  const chainId = useChainId();
  
  // Get token decimals dynamically
  const tokenDecimals = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === market.collateralToken.toLowerCase()
    );
    return token?.decimals || 18;
  }, [market.collateralToken, chainId]);

  const { 
    userCollateralFormatted, 
    userCollateralParsed,
    collateralLoading,
    collateralError 
  } = useReadUserCollateral(
    market.collateralToken as `0x${string}`,
    market.id as `0x${string}`,
    tokenDecimals
  );

  if (collateralLoading) {
    return (
      <span className={`font-semibold text-white ${className}`}>
        Loading... {market.collateralTokenInfo?.symbol || market.collateralToken}
      </span>
    );
  }

  if (collateralError) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        0 {market.collateralTokenInfo?.symbol || market.collateralToken}
      </span>
    );
  }

  return (
    <span className={`font-semibold text-white ${className}`}>
      {userCollateralFormatted} {market.collateralTokenInfo?.symbol || market.collateralToken}
    </span>
  );
}; 