import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAccount } from "wagmi";
import { useReadAddressPosition } from "@/hooks/read/useReadPositionAddress";
import { useReadPositionBalance } from "@/hooks/read/useReadPositionBalance";
import { defaultChain } from "@/lib/get-default-chain";
import { tokens } from "@/constants/tokenAddress";
import { EnrichedPool } from "@/lib/pair-token-address";

interface TokenTableProps {
  pool: EnrichedPool | null;
}

export const TokenTable: React.FC<TokenTableProps> = ({ pool }) => {
  const { address } = useAccount();
  const { addressPosition, isLoadingAddressPosition } =
    useReadAddressPosition(
      pool?.id || "0x0000000000000000000000000000000000000000"
    );

  // Get all tokens for current chain
  const chainTokens = tokens.filter(
    (token) =>
      token.addresses[defaultChain] &&
      token.addresses[defaultChain] !==
        "0x0000000000000000000000000000000000000000"
  );

  // Create hooks for all tokens at component level
  const tokenBalances = chainTokens.map((token) => {
    const { positionBalance, isLoadingPositionBalance } =
      useReadPositionBalance(
        token.addresses[defaultChain],
        addressPosition || "0x0000000000000000000000000000000000000000"
      );

    return {
      token,
      positionBalance,
      isLoadingPositionBalance,
    };
  });

  if (!pool) {
    return (
      <div className="text-center py-8 text-gray-400">
        Please select a pool to view tokens
      </div>
    );
  }

  if (isLoadingAddressPosition) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <Spinner size="sm" className="text-gray-400" />
          Loading position...
        </div>
      </div>
    );
  }

  if (
    !addressPosition ||
    addressPosition === "0x0000000000000000000000000000000000000000"
  ) {
    return (
      <div className="text-center py-8 text-gray-400">
        No position found for this pool
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-blue-400/30 shadow-sm bg-slate-800/30">
      <div className="hidden md:grid md:grid-cols-3 gap-2 p-3 text-sm font-medium text-blue-300 border-b border-blue-400/20">
        <div className="pl-4">Assets</div>
        <div className="text-center">Current Balance</div>
        <div className="text-center">Quick Actions</div>
      </div>

      <div className="md:divide-y md:divide-blue-400/20">
        {tokenBalances.map(
          ({ token, positionBalance, isLoadingPositionBalance }) => {
            const formatBalance = () => {
              if (isLoadingPositionBalance)
                return <Spinner size="sm" className="text-green-400" />;
              if (!positionBalance) return "0.00000";

              const balance =
                Number(positionBalance) / Math.pow(10, token.decimals);
              return balance.toFixed(5);
            };

            return (
              <div
                key={token.addresses[defaultChain]}
                className="flex flex-col md:grid md:grid-cols-3 gap-2 p-4 border-b border-blue-400/20 last:border-b-0"
              >
                {/* Assets Column */}
                <div className="flex items-center gap-3 pl-4">
                  {token.logo && (
                    <Image
                      src={token.logo}
                      alt={token.symbol}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-white font-medium">
                    ${token.symbol}
                  </span>
                </div>

                {/* Current Balance Column */}
                <div className="text-center">
                  <span className="text-green-400 font-medium">
                    {formatBalance()}
                  </span>
                </div>

                {/* Quick Actions Column */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Trade
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    Repay
                  </Button>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}; 