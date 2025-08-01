import React from "react";
import { Coins, Droplets, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PositionHeader = () => {
  return (
    <div>
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-3xl md:text-4xl font-bold text-white">
          <Droplets className="h-8 w-8 md:h-12 md:w-12 text-[#01ECBE]" />
          <h1>Faucets</h1>
        </div>
        <p className="text-slate-300 text-sm md:text-base">
          The Best DeFi Yields In 1-Click
        </p>
      </div>
    </div>
  );
};

export default PositionHeader;
