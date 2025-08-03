import React from "react";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { tokens } from "@/constants/tokenAddress";
import { useChainId } from "wagmi";
import { EnrichedPool } from "@/lib/pair-token-address";
import { Spinner } from "@/components/ui/spinner";

interface UserCurrentBorrowDisplayProps {
  market: EnrichedPool;
  className?: string;
}

export const UserCurrentBorrowDisplay: React.FC<UserCurrentBorrowDisplayProps> = ({
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

  if (userBorrowSharesLoading) {
    return (
      <span className={`font-semibold text-white ${className} flex items-center gap-2`}>
        <Spinner size="sm" className="text-white" />
        {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  if (userBorrowSharesError) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        0 {market.borrowTokenInfo?.symbol || market.borrowToken}
      </span>
    );
  }

  return (
    <span className={`font-semibold text-white ${className}`}>
      {userBorrowSharesFormatted} {market.borrowTokenInfo?.symbol || market.borrowToken}
    </span>
  );
}; 