import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { CreatePoolDialog } from "@/components/dialog/create-pool";
import { DetailsModal } from "@/components/dialog/details-modal";
import { getPools } from "@/lib/get-pools";
import { enrichPoolWithTokenInfo, EnrichedPool } from "@/lib/pair-token-address";
import Image from "next/image";

const MobileView = () => {
  const [createPoolOpen, setCreatePoolOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedMarket, setSelectedMarket] = React.useState<EnrichedPool | null>(null);
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

  const handleOpenDetails = (market: EnrichedPool) => {
    setSelectedMarket(market);
    setDetailsOpen(true);
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
        <div className="flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-xl px-2 py-4 space-y-4">
          <h2 className="text-2xl font-bold text-blue-400">Pool Overview</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search pools..."
              className="w-full pl-10 bg-gray-700 border-gray-600 text-sm hover:border-blue-500 text-gray-100"
            />
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 w-full"
            onClick={() => setCreatePoolOpen(true)}
          >
            <Plus className="mr-2 w-4 h-4" />
            Create Pool
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading pools...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : (
          pools.map((pool) => (
            <Card
              key={pool.id}
              className="bg-gray-900 text-gray-100 shadow-xl border border-gray-700"
            >
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {pool.borrowTokenInfo?.logo && (
                      <Image
                        alt={pool.borrowTokenInfo.symbol}
                        src={pool.borrowTokenInfo.logo}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-gray-100 font-medium">
                      {pool.borrowTokenInfo?.symbol || pool.borrowToken}
                    </span>
                  </div>
                  <span className="text-blue-400 font-medium">
                    {pool.ltv ? `${(Number(pool.ltv) / 1e16).toFixed(2)}%` : "-"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collateral:</span>
                    <div className="flex items-center space-x-2">
                      {pool.collateralTokenInfo?.logo && (
                        <Image
                          alt={pool.collateralTokenInfo.symbol}
                          src={pool.collateralTokenInfo.logo}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-gray-100">
                        {pool.collateralTokenInfo?.symbol || pool.collateralToken}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                    onClick={() => handleOpenDetails(pool)}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
};

export default MobileView;
