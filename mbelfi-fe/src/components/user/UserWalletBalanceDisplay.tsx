import React from "react";
import { useUserWalletBalance } from "@/hooks/read/useUserWalletBalance";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { Spinner } from "@/components/ui/spinner";
import { EnrichedPool } from "@/lib/pair-token-address";

interface UserWalletBalanceDisplayProps {
  market: EnrichedPool;
  actionType: "supply_collateral" | "supply_liquidity";
  className?: string;
}

export const UserWalletBalanceDisplay: React.FC<UserWalletBalanceDisplayProps> = ({
  market,
  actionType,
  className = "",
}) => {
  const chainId = useChainId();
  
  // Determine which token to use based on action type
  const tokenAddress = React.useMemo(() => {
    if (actionType === "supply_collateral") {
      return market.collateralTokenInfo?.address || market.collateralToken;
    } else {
      return market.borrowTokenInfo?.address || market.borrowToken;
    }
  }, [market, actionType]);

  // Get token decimals dynamically
  const tokenDecimals = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.decimals || 18;
  }, [tokenAddress, chainId]);

  const { 
    userWalletBalanceFormatted, 
    userWalletBalanceParsed,
    walletBalanceLoading,
    walletBalanceError 
  } = useUserWalletBalance(
    tokenAddress as `0x${string}`,
    tokenDecimals
  );

  // Get token symbol for display
  const tokenSymbol = React.useMemo(() => {
    const token = tokens.find(
      (t) =>
        t.addresses[chainId]?.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.symbol || "TOKEN";
  }, [tokenAddress, chainId]);

  if (walletBalanceLoading) {
    return (
      <span className={`font-semibold text-white ${className} flex items-center gap-2`}>
        <Spinner size="sm" className="text-white" />
        {tokenSymbol}
      </span>
    );
  }

  if (walletBalanceError) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        0 {tokenSymbol}
      </span>
    );
  }

  return (
    <span className={`font-semibold text-white ${className}`}>
      {userWalletBalanceFormatted} {tokenSymbol}
    </span>
  );
}; 