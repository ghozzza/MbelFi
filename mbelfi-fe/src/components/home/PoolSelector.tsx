import React from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { EnrichedPool } from "@/lib/pair-token-address";

interface PoolSelectorProps {
  pools: EnrichedPool[];
  selectedPool: EnrichedPool | null;
  loading: boolean;
  onSelectPool: (pool: EnrichedPool) => void;
}

export const PoolSelector: React.FC<PoolSelectorProps> = ({
  pools,
  selectedPool,
  loading,
  onSelectPool,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" className="text-gray-400" />
          </div>
        ) : selectedPool ? (
          <>
            <div className="flex items-center gap-2">
              {selectedPool.borrowTokenInfo?.logo && (
                <Image
                  src={selectedPool.borrowTokenInfo.logo}
                  alt={selectedPool.borrowTokenInfo.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-white font-medium">
                {selectedPool.borrowTokenInfo?.symbol ||
                  selectedPool.borrowToken}
              </span>
              <span className="text-gray-400">→</span>
              {selectedPool.collateralTokenInfo?.logo && (
                <Image
                  src={selectedPool.collateralTokenInfo.logo}
                  alt={selectedPool.collateralTokenInfo.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-white font-medium">
                {selectedPool.collateralTokenInfo?.symbol ||
                  selectedPool.collateralToken}
              </span>
            </div>
          </>
        ) : (
          <span className="text-gray-400">Select Pool</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-gray-400 text-sm flex items-center gap-2">
              <Spinner size="sm" className="text-gray-400" />
              Loading pools...
            </div>
          ) : pools.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">
              No pools available
            </div>
          ) : (
            pools.map((pool) => (
              <button
                key={pool.id}
                onClick={() => {
                  onSelectPool(pool);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-600 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {pool.borrowTokenInfo?.logo && (
                    <Image
                      src={pool.borrowTokenInfo.logo}
                      alt={pool.borrowTokenInfo.symbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-white text-sm">
                    {pool.borrowTokenInfo?.symbol || pool.borrowToken}
                  </span>
                  <span className="text-gray-400 text-sm">→</span>
                  {pool.collateralTokenInfo?.logo && (
                    <Image
                      src={pool.collateralTokenInfo.logo}
                      alt={pool.collateralTokenInfo.symbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-white text-sm">
                    {pool.collateralTokenInfo?.symbol || pool.collateralToken}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}; 