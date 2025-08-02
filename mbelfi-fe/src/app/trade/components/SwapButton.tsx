"use client";

import React from "react";
import { ArrowDownUp } from "lucide-react";

interface SwapButtonProps {
  onSwitch: () => void;
  disabled?: boolean;
}

const SwapButton: React.FC<SwapButtonProps> = ({ onSwitch, disabled = false }) => {
  return (
    <div className={`flex justify-center ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="group">
        <button
          onClick={onSwitch}
          disabled={disabled}
          className="bg-slate-700/50 p-2 rounded-full hover:bg-slate-600/50 border border-blue-400/30 z-10 transform transition-transform duration-300 group-hover:rotate-18 cursor-pointer shadow-sm disabled:cursor-not-allowed"
          aria-label="Switch tokens"
        >
          <ArrowDownUp className="h-5 w-5 text-blue-300 transform transition-transform duration-300 group-hover:rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default SwapButton;
