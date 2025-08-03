import React from "react";
import { ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useReadAddressPosition } from "@/hooks/read/useReadPositionAddress";
import { EnrichedPool } from "@/lib/pair-token-address";

interface PositionAddressProps {
  pool: EnrichedPool | null;
}

export const PositionAddress: React.FC<PositionAddressProps> = ({ pool }) => {
  const { addressPosition, isLoadingAddressPosition } =
    useReadAddressPosition(
      pool?.id || "0x0000000000000000000000000000000000000000"
    );

  if (!pool) return null;

  if (isLoadingAddressPosition) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Your Position Address:</span>
        <Spinner size="sm" className="text-blue-400" />
      </div>
    );
  }

  if (
    !addressPosition ||
    addressPosition === "0x0000000000000000000000000000000000000000"
  ) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>No position found for this pool</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <span>Your Position Address:</span>
      <span className="text-blue-400 font-mono">{addressPosition}</span>
      <ExternalLink className="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-300" />
    </div>
  );
}; 