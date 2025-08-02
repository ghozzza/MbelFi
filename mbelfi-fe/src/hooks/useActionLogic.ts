import { useState, useMemo } from "react";
import { useChainId } from "wagmi";
import { chains } from "@/constants/chainAddress";
import { tokens } from "@/constants/tokenAddress";
import { ActionType } from "@/constants/actionConfig";
import { EnrichedPool } from "@/lib/pair-token-address";

export const useActionLogic = (type: ActionType, market: EnrichedPool) => {
  const [amount, setAmount] = useState("");
  const [toChainId, setToChainId] = useState(
    type === "borrow" ? "128123" : ""
  );
  const [isApproved, setIsApproved] = useState(false);

  const chainId = useChainId();

  // Get token decimals based on action type
  const tokenDecimals = useMemo(() => {
    if (type === "supply_collateral") {
      if (!market?.collateralTokenInfo?.address) return 18;

      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.collateralTokenInfo?.address?.toLowerCase()
      );
      return token?.decimals || 18;
    } else if (type === "supply_liquidity" || type === "borrow") {
      if (!market?.borrowTokenInfo?.address) return 18;

      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowTokenInfo?.address?.toLowerCase()
      );
      return token?.decimals || 18;
    }
    return 18;
  }, [market, chainId, type]);

  // Get destination chain for borrow
  const toChain = useMemo(() => {
    if (type !== "borrow") return undefined;

    let chainIdString: string;
    if (toChainId && typeof toChainId === "object" && "size" in toChainId) {
      chainIdString = Array.from(toChainId as Set<string>)[0] as string;
    } else {
      chainIdString = toChainId as string;
    }

    return chains.find((c) => String(c.id) === chainIdString);
  }, [type, toChainId]);

  const etherlinkChain = useMemo(
    () => chains.find((c) => c.name === "Etherlink Testnet"),
    []
  );

  return {
    amount,
    setAmount,
    toChainId,
    setToChainId,
    isApproved,
    setIsApproved,
    tokenDecimals,
    toChain,
    etherlinkChain,
  };
}; 