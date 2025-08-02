import React from "react";
import { useReadUserSupplyShares } from "@/hooks/read/useUserSupplyShares";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { EnrichedPool } from "@/lib/pair-token-address";

interface UserSupplyBalanceDisplayProps {
  market: EnrichedPool;
  className?: string;
}

export const UserSupplyBalanceDisplay: React.FC<UserSupplyBalanceDisplayProps> = ({
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
    userSupplySharesFormatted, 
    userSupplySharesParsed,
    sharesLoading,
    sharesError 
  } = useReadUserSupplyShares(
    market.id as `0x${string}`,
    tokenDecimals
  );

  if (sharesLoading) {
    return (
      <span className={`font-semibold text-white ${className}`}>
        Loading... {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  if (sharesError) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        0 {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  return (
    <span className={`font-semibold text-white ${className}`}>
      {userSupplySharesFormatted} {market.borrowTokenInfo?.symbol || market.borrowToken}
    </span>
  );
}; 