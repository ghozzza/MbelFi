import React from "react";
import { useReadUserCollateral } from "@/hooks/read/useReadUserCollateral";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";

interface UserCollateralBalanceProps {
  lendingPoolAddress: string;
  collateralTokenAddress: string;
  showLabel?: boolean;
  className?: string;
}

export const UserCollateralBalance: React.FC<UserCollateralBalanceProps> = ({
  lendingPoolAddress,
  collateralTokenAddress,
  showLabel = true,
  className = "",
}) => {
  const chainId = useChainId();
  
  // Get token decimals dynamically
  const tokenDecimals = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === collateralTokenAddress.toLowerCase()
    );
    return token?.decimals || 18;
  }, [collateralTokenAddress, chainId]);

  const { 
    userCollateralFormatted, 
    userCollateralParsed,
    collateralLoading,
    collateralError 
  } = useReadUserCollateral(
    collateralTokenAddress as `0x${string}`,
    lendingPoolAddress as `0x${string}`,
    tokenDecimals
  );

  // Get token symbol for display
  const tokenSymbol = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === collateralTokenAddress.toLowerCase()
    );
    return token?.symbol || "TOKEN";
  }, [collateralTokenAddress, chainId]);

  if (collateralLoading) {
    return (
      <div className={`text-gray-400 text-sm ${className}`}>
        Loading collateral...
      </div>
    );
  }

  if (collateralError) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        Error loading collateral
      </div>
    );
  }

  return (
    <div className={className}>
      {showLabel && (
        <span className="text-gray-400 text-sm font-medium mr-2">
          Your Collateral:
        </span>
      )}
      <span className="text-blue-400 font-medium">
        {userCollateralFormatted} {tokenSymbol}
      </span>
    </div>
  );
}; 