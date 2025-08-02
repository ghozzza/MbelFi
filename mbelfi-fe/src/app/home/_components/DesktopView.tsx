import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { CreatePoolDialog } from "@/components/dialog/create-pool";
import Image from "next/image";
import { getPools } from "@/lib/get-pools";
import { enrichPoolWithTokenInfo, EnrichedPool } from "@/lib/pair-token-address";
import { DetailsModal } from "@/components/dialog/details-modal";

const DesktopView = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [createPoolOpen, setCreatePoolOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedMarket, setSelectedMarket] = React.useState<EnrichedPool | null>(null);
  const [pools, setPools] = React.useState<EnrichedPool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

      <Card className="w-full max-w-full bg-gray-900 text-gray-100 shadow-xl border border-cyan-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-blue-400">Pool Overview</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search pools..."
                  className="w-full pl-10 bg-gray-700 border-gray-600 hover:border-blue-500 text-gray-100"
                />
              </div>
              <Button
                variant="default"
                className="w-3/5 bg-blue-600 hover:bg-blue-700"
                onClick={() => setCreatePoolOpen(true)}
              >
                <Plus className="mr-2 w-4 h-4" />
                Create Pool
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading pools...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">{error}</div>
          ) : (
            <div className="rounded-xl border border-cyan-800 overflow-hidden min-w-full">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="bg-blue-700 text-white font-bold text-center px-4 py-3 rounded-tl-xl">
                      Loan Token
                    </th>
                    <th className="bg-blue-700 text-white font-bold text-center px-4 py-3">
                      Collateral Token
                    </th>
                    <th className="bg-blue-700 text-white font-bold text-center px-4 py-3">
                      LTV
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => (
                    <tr
                      key={pool.id}
                      className="bg-gray-900 border-b border-cyan-800 cursor-pointer hover:bg-gray-800 transition-colors"
                      onClick={() => handleOpenDetails(pool)}
                    >
                      <td className="text-gray-100 text-center px-4 py-3">
                        <div className="flex items-center space-x-2 justify-center">
                          {pool.borrowTokenInfo?.logo && (
                            <Image
                              alt={pool.borrowTokenInfo.symbol}
                              src={pool.borrowTokenInfo.logo}
                              width={28}
                              height={28}
                              className="rounded-full"
                            />
                          )}
                          <span className="font-medium">
                            {pool.borrowTokenInfo?.symbol || pool.borrowToken}
                          </span>
                        </div>
                      </td>
                      <td className="text-gray-100 text-center px-4 py-3">
                        <div className="flex items-center space-x-2 justify-center">
                          {pool.collateralTokenInfo?.logo && (
                            <Image
                              alt={pool.collateralTokenInfo.symbol}
                              src={pool.collateralTokenInfo.logo}
                              width={28}
                              height={28}
                              className="rounded-full"
                            />
                          )}
                          <span className="text-gray-100">
                            {pool.collateralTokenInfo?.symbol || pool.collateralToken}
                          </span>
                        </div>
                      </td>
                      <td className="text-blue-400 font-medium text-center px-4 py-3">
                        {pool.ltv ? `${(Number(pool.ltv) / 1e16).toFixed(2)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default DesktopView;
