import React from "react";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { useReadTotalSupplyAssets } from "@/hooks/read/useTotalSupplyAssets";
import { useReadMaxUserBorrow } from "@/hooks/read/useReadMaxUserBorrow";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { EnrichedPool } from "@/lib/pair-token-address";
import { Spinner } from "@/components/ui/spinner";

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

  // Get max user borrow amount from contract
  const {
    maxUserBorrow,
    isLoadingMaxUserBorrow,
    refetchMaxUserBorrow,
  } = useReadMaxUserBorrow(
    market.id as `0x${string}`,
    tokenDecimals
  );

  // Use max user borrow amount if available, otherwise fallback to 70% of total supply assets
  const availableToBorrow = React.useMemo(() => {
    if (maxUserBorrow !== undefined && maxUserBorrow !== null) {
      // Parse the raw value from contract with proper decimals
      const rawValue = Number(maxUserBorrow);
      const parsedValue = rawValue / Math.pow(10, tokenDecimals);
      return parsedValue;
    }
    // Fallback to 70% of total supply assets if max user borrow is not available
    if (totalSupplyAssetsParsed === 0) return 0;
    return totalSupplyAssetsParsed * 0.7; // 70% of total supply assets
  }, [maxUserBorrow, totalSupplyAssetsParsed, tokenDecimals]);

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
    
    return availableToBorrow.toLocaleString('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, [availableToBorrow]);

  if (userBorrowSharesLoading || totalSupplyAssetsLoading || isLoadingMaxUserBorrow) {
    return (
      <span className={`font-semibold text-white ${className} flex items-center gap-2`}>
        <Spinner size="sm" className="text-white" />
        {market.borrowTokenInfo?.symbol || market.borrowToken}
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