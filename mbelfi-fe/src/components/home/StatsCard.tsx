import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useReadTotalSupplyAssets } from "@/hooks/read/useTotalSupplyAssets";
import { useReadUserCollateral } from "@/hooks/read/useReadUserCollateral";
import { useReadUserBorrowShares } from "@/hooks/read/useUserBorrowShares";
import { useReadHealthFactor } from "@/hooks/read/useReadHealthFactor";
import { EnrichedPool } from "@/lib/pair-token-address";

interface StatsCardProps {
  pool: EnrichedPool | null;
}

export const StatsCard: React.FC<StatsCardProps> = ({ pool }) => {
  // Always call hooks with default values to maintain hook order
  const poolId = (pool?.id as `0x${string}`) || "0x0000000000000000000000000000000000000000";
  const collateralToken = (pool?.collateralToken as `0x${string}`) || "0x0000000000000000000000000000000000000000";
  const borrowTokenDecimals = pool?.borrowTokenInfo?.decimals || 18;

  const { totalSupplyAssetsParsed, totalSupplyAssetsLoading } =
    useReadTotalSupplyAssets(poolId, 18);

  const { userCollateralParsed, collateralLoading } = useReadUserCollateral(
    collateralToken,
    poolId,
    18
  );

  const { userBorrowSharesParsed, userBorrowSharesLoading } =
    useReadUserBorrowShares(poolId, borrowTokenDecimals);

  const { healthFactor, isLoadingHealthFactor, error: healthFactorError } = useReadHealthFactor(poolId);

  const formatCollateralAmount = () => {
    if (collateralLoading) return "Loading...";
    if (!userCollateralParsed || userCollateralParsed === 0) return "0";
    return userCollateralParsed.toFixed(4);
  };

  const formatBorrowAmount = () => {
    if (userBorrowSharesLoading) return "Loading...";
    if (!userBorrowSharesParsed || userBorrowSharesParsed === 0) return "0";
    return userBorrowSharesParsed.toFixed(4);
  };

  const formatHealthFactor = () => {
    if (isLoadingHealthFactor) return "Loading...";
    if (healthFactorError) return "Error";
    if (!healthFactor || healthFactor === BigInt(0)) return "0";
    
    // Convert from wei to readable format (assuming health factor is in wei)
    const healthFactorNumber = Number(healthFactor) / 1e8;
    return healthFactorNumber.toFixed(2);
  };

  if (!pool) {
    return (
      <Card className="border border-cyan-800 py-2 w-full max-w-full bg-gray-900 text-gray-100 shadow-xl">
        <CardContent className="w-full flex flex-row mx-auto px-6 py-3 justify-between items-center">
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-sm font-medium">
              Select a Pool
            </span>
            <span className="text-blue-400 font-bold text-lg">-</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-sm font-medium">
              Your Borrow
            </span>
            <span className="text-green-400 font-bold text-lg">-</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-sm font-medium">
              Health Factor
            </span>
            <span className="text-cyan-400 font-bold text-lg">-</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-cyan-800 py-2 w-full max-w-full bg-gray-900 text-gray-100 shadow-xl">
      <CardContent className="w-full flex flex-row mx-auto px-6 py-3 justify-between items-center">
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-sm font-medium">
            Total Collateral
          </span>
          <span className="text-blue-400 font-bold text-lg">
            {formatCollateralAmount()}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-sm font-medium">Your Debt</span>
          <span className="text-green-400 font-bold text-lg">
            {formatBorrowAmount()}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-sm font-medium">
            Health Factor
          </span>
          <span className="text-cyan-400 font-bold text-lg">
            {formatHealthFactor()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}; 