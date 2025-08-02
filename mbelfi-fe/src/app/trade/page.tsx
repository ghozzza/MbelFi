"use client";

import React from "react";
import SwapPanel from "./components/SwapPanel";
import { Coins } from "lucide-react";

export default function TradePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 mt-20">
      <div className="container mx-auto max-w-xl">
        <div className="rounded-2xl p-6 shadow-xl border border-blue-400/30 bg-slate-800/50">
          <h1 className="text-3xl font-bold text-center text-blue-300 mb-6 flex flex-row gap-2 items-center justify-center">
            <Coins className="size-6" />
            Swap Collateral
          </h1>
          <SwapPanel />
        </div>
      </div>
    </div>
  );
}
