"use client";

import React from "react";

interface SwapInfoProps {
  exchangeRate: string;
  slippage: string;
  onSlippageChange: (slippage: string) => void;
  disabled?: boolean;
}

const SwapInfo: React.FC<SwapInfoProps> = ({
  exchangeRate,
  slippage,
  onSlippageChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Swap Rate */}
      <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-3 text-sm text-blue-400 shadow-sm ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}>
        <div className="flex justify-between">
          <span>Exchange Rate:</span>
          <span className="truncate">{exchangeRate}</span>
        </div>
      </div>

      {/* Slippage Setting */}
      <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-3 shadow-sm ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-blue-300 font-medium">Slippage Tolerance</span>
          <div className="flex flex-wrap gap-1">
            {["0.5", "1", "2", "3"].map((value) => (
              <button
                key={value}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  slippage === value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700/50 text-blue-300 hover:bg-slate-600/50 cursor-pointer"
                }`}
                onClick={() => onSlippageChange(value)}
                disabled={disabled}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInfo;
