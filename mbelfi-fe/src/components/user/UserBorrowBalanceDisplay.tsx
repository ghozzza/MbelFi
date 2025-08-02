import React from "react";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { useReadTotalSupplyAssets } from "@/hooks/read/useTotalSupplyAssets";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { EnrichedPool } from "@/lib/pair-token-address";

interface UserBorrowBalanceDisplayProps {
  market: EnrichedPool;
  className?: string;
}

export const UserBorrowBalanceDisplay: React.FC<UserBorrowBalanceDisplayProps> = ({
  market,
  className = "",
}) => {
  const chainId = useChainId();
  
  // Get token decimals dynamically
  const tokenDecimals = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === market.borrowToken.toLowerCase()
    );
    return token?.decimals || 18;
  }, [market.borrowToken, chainId]);

  const { 
    userBorrowSharesFormatted, 
    userBorrowSharesParsed,
    userBorrowSharesLoading,
    userBorrowSharesError 
  } = useReadUserBorrowShares(
    market.id as `0x${string}`,
    tokenDecimals
  );

  const {
    totalSupplyAssetsFormatted,
    totalSupplyAssetsParsed,
    totalSupplyAssetsLoading,
    totalSupplyAssetsError
  } = useReadTotalSupplyAssets(
    market.id as `0x${string}`,
    tokenDecimals
  );

  // Calculate available to borrow (70% of total supply assets)
  const availableToBorrow = React.useMemo(() => {
    if (totalSupplyAssetsParsed === 0) return 0;
    return totalSupplyAssetsParsed * 0.7; // 70% of total supply assets
  }, [totalSupplyAssetsParsed]);

  const availableToBorrowFormatted = React.useMemo(() => {
    if (availableToBorrow === 0) return "0";
    
    // Format the number to avoid scientific notation
    if (availableToBorrow > 0 && availableToBorrow < 0.000001) {
      return availableToBorrow.toFixed(12).replace(/\.?0+$/, '');
    }
    
    if (availableToBorrow < 1) {
      return availableToBorrow.toFixed(6).replace(/\.?0+$/, '');
    }
    
    if (availableToBorrow < 1000) {
      return availableToBorrow.toFixed(2).replace(/\.?0+$/, '');
    }
    
    return availableToBorrow.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, [availableToBorrow]);

  if (userBorrowSharesLoading || totalSupplyAssetsLoading) {
    return (
      <span className={`font-semibold text-white ${className}`}>
        Loading... {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  if (userBorrowSharesError || totalSupplyAssetsError) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        0 {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  return (
    <span className={`font-semibold text-white ${className}`}>
      {availableToBorrowFormatted} {market.borrowTokenInfo?.symbol || market.borrowToken}
    </span>
  );
}; 