import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreatePoolDialog } from "@/components/dialog/create-pool";
import { DetailsModal } from "@/components/dialog/details-modal";
import { getPools } from "@/lib/get-pools";
import {
  enrichPoolWithTokenInfo,
  EnrichedPool,
} from "@/lib/pair-token-address";
import Image from "next/image";
import { LiquidityDisplay } from "@/components/pool/LiquidityDisplay";
import { StatsCard } from "@/components/home/StatsCard";
import { PoolSelector } from "@/components/home/PoolSelector";
import { PositionAddress } from "@/components/home/PositionAddress";
import { TokenTable } from "@/components/home/TokenTable";

const MobileView = () => {
  const [createPoolOpen, setCreatePoolOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedMarket, setSelectedMarket] =
    React.useState<EnrichedPool | null>(null);
  const [selectedPool, setSelectedPool] = React.useState<EnrichedPool | null>(
    null
  );
  const [pools, setPools] = React.useState<EnrichedPool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPools = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPools();
      const enriched = data.map((pool: any) => enrichPoolWithTokenInfo(pool));
      setPools(enriched);
    } catch (e: any) {
      setError(e.message || "Failed to fetch pools");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Auto-select first pool when pools are loaded
  React.useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  const handleOpenDetails = (market: EnrichedPool) => {
    setSelectedMarket(market);
    setDetailsOpen(true);
  };

  const handleSelectPool = (pool: EnrichedPool) => {
    setSelectedPool(pool);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedMarket(null);
  };

  return (
    <>
      <DetailsModal
        open={detailsOpen}
        onClose={handleCloseDetails}
        market={selectedMarket}
      />
      <CreatePoolDialog
        open={createPoolOpen}
        onClose={() => setCreatePoolOpen(false)}
        onPoolCreated={fetchPools}
      />

      <div className="w-full max-w-4xl space-y-4">
        {/* Stats Card */}
        <StatsCard pool={selectedPool} />

        {/* Pool Header dengan Selector */}
        <Card className="border border-cyan-800 bg-gray-900 text-gray-100 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-xl">💰</div>
                <h2 className="text-lg font-bold text-white">Lending Pool</h2>
              </div>
              <PoolSelector
                pools={pools}
                selectedPool={selectedPool}
                loading={loading}
                onSelectPool={handleSelectPool}
              />
            </div>
            {selectedPool && (
              <>
                <PositionAddress pool={selectedPool} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Token Table */}
        <Card className="border border-cyan-800 bg-gray-900 text-gray-100 shadow-xl">
          <CardContent className="p-4">
            <TokenTable pool={selectedPool} />
          </CardContent>
        </Card>

        {/* Pools List */}
        <Card className="border border-cyan-800 bg-gray-900 text-gray-100 shadow-xl">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-blue-400">
                  Available Pools
                </h3>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setCreatePoolOpen(true)}
                >
                  <Plus className="mr-2 w-3 h-3" />
                  Create Pool
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading pools...
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">{error}</div>
              ) : (
                <div className="space-y-3">
                  {pools.map((pool) => (
                    <Card
                      key={pool.id}
                      className="bg-gray-800 text-gray-100 shadow-lg border border-gray-600"
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            {pool.borrowTokenInfo?.logo && (
                              <Image
                                alt={pool.borrowTokenInfo.symbol}
                                src={pool.borrowTokenInfo.logo}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )}
                            <span className="text-gray-100 font-medium text-sm">
                              {pool.borrowTokenInfo?.symbol || pool.borrowToken}
                            </span>
                          </div>
                          <span className="text-blue-400 font-medium text-sm">
                            {pool.ltv
                              ? `${(Number(pool.ltv) / 1e16).toFixed(2)}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">
                              Collateral:
                            </span>
                            <div className="flex items-center space-x-1">
                              {pool.collateralTokenInfo?.logo && (
                                <Image
                                  alt={pool.collateralTokenInfo.symbol}
                                  src={pool.collateralTokenInfo.logo}
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-gray-100 text-xs">
                                {pool.collateralTokenInfo?.symbol ||
                                  pool.collateralToken}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">
                              Liquidity:
                            </span>
                            <div className="flex items-center space-x-1">
                              <LiquidityDisplay
                                lendingPoolAddress={pool.id}
                                borrowTokenAddress={pool.borrowToken}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700 flex-1 text-xs"
                            onClick={() => handleOpenDetails(pool)}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-600 flex-1 text-xs"
                            onClick={() => handleSelectPool(pool)}
                          >
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MobileView;
