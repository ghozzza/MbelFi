"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { tokens } from "@/constants/token-address";
import { defaultChain } from "@/lib/get-default-chain";

interface TokenSelectorProps {
  selectedToken: any;
  onTokenChange: (token: any) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  balance: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  tokenName: (address: string) => string | undefined;
  tokenLogo: (address: string) => string | undefined;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenChange,
  amount,
  onAmountChange,
  balance,
  label,
  placeholder = "0.0",
  readOnly = false,
  disabled = false,
  tokenName,
  tokenLogo,
}) => {
  return (
    <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-4 w-full shadow-sm hover:shadow-md transition-shadow ${
      disabled ? "opacity-50 pointer-events-none" : ""
    }`}>
      <div className="flex justify-between mb-5">
        <label className="text-blue-300 font-medium">
          {label}
        </label>
        <span className="text-blue-400 text-sm truncate">
          Balance: {balance}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          className="w-full bg-transparent text-gray-100 text-xl focus:outline-none p-2 border-b border-blue-400/30"
          placeholder={placeholder}
          value={amount}
          onChange={(e) => {
            if (!readOnly) {
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                onAmountChange(value);
              }
            }
          }}
          readOnly={readOnly}
          disabled={disabled}
        />
        <Select
          value={selectedToken.addresses[defaultChain]}
          onValueChange={(value) => {
            const token = tokens.find((t) => t.addresses[defaultChain] === value);
            if (token) onTokenChange(token);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="bg-slate-700/50 max-w-32 min-w-32 text-blue-300 py-2 px-3 rounded-lg border border-blue-400/30 hover:border-blue-400/50 transition-colors cursor-pointer">
            <SelectValue placeholder="Select token" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border border-blue-400/30 text-white">
            {tokens.map((token, index) => (
              <SelectItem
                key={index}
                value={token.addresses[defaultChain]}
                className="text-gray-100 flex flex-row gap-2 items-center cursor-pointer hover:bg-slate-700/50"
              >
                <Image
                  src={tokenLogo(token.addresses[defaultChain]) ?? ""}
                  alt={token.name}
                  className="size-5 rounded-full"
                  width={10}
                  height={10}
                />
                {token.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TokenSelector;
