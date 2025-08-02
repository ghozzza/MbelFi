"use client";

import React from "react";
import { useAccount } from "wagmi";
import { ShieldAlert, Wallet2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { defaultChain } from "@/lib/get-default-chain";

interface PoolSelectorProps {
  lpAddress: any[];
  lpAddressSelected: string;
  setLpAddressSelected: (value: string) => void;
  addressPosition: string | undefined;
  tokenName: (address: string) => string | undefined;
  tokenLogo: (address: string) => string | undefined;
}

const PoolSelector: React.FC<PoolSelectorProps> = ({
  lpAddress,
  lpAddressSelected,
  setLpAddressSelected,
  addressPosition,
  tokenName,
  tokenLogo,
}) => {
  const { address } = useAccount();

  return (
    <div className="flex flex-row gap-2 mb-5">
      <div className="flex-1 min-w-0">
        <Select onValueChange={(value) => setLpAddressSelected(value)}>
          <SelectTrigger className="truncate w-full bg-slate-800/50 text-blue-300 border border-blue-400/30 hover:border-blue-400/50 focus:ring-2 focus:ring-blue-400/50 px-4 rounded-lg shadow-sm cursor-pointer">
            <SelectValue placeholder="Select LP Address" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border border-blue-400/30 rounded-lg shadow-md max-w-[100%] text-white">
            <SelectGroup>
              <SelectLabel className="text-blue-300 font-semibold px-3 pt-2">
                Pool Address
              </SelectLabel>
              {address ? (
                lpAddress.map((lp) => (
                  <SelectItem
                    key={lp.id}
                    value={lp.lpAddress}
                    className="py-2 px-0 text-sm text-gray-100 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex flex-row gap-2 items-center justify-between">
                      <div className="flex items-center gap-2 truncate px-3">
                        <Image
                          src={tokenLogo(lp.collateralToken) ?? ""}
                          alt={tokenName(lp.collateralToken) ?? ""}
                          className="size-5 rounded-full text"
                          width={10}
                          height={10}
                        />
                        <span className="truncate">
                          {tokenName(lp.collateralToken)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Image
                          src={tokenLogo(lp.borrowToken) ?? ""}
                          alt={tokenName(lp.borrowToken) ?? ""}
                          className="size-5 rounded-full"
                          width={10}
                          height={10}
                        />
                        <span className="truncate">
                          {tokenName(lp.borrowToken)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="text-blue-300 px-3 py-2 text-sm">
                  No LP Address found
                </div>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div
        className={`flex-1 min-w-0 text-center px-3 py-1 rounded-lg ${
          addressPosition &&
          addressPosition !== "0x0000000000000000000000000000000000000000"
            ? "bg-blue-500/20 hover:bg-blue-500/30 duration-300 border-2 border-blue-400/50 cursor-pointer"
            : "bg-red-900/20 border-2 border-red-500/30"
        }`}
      >
        {addressPosition &&
        addressPosition !== "0x0000000000000000000000000000000000000000" ? (
          <Link
            className="flex flex-row gap-2 items-center justify-center text-blue-300 text-base text-center mt-0"
            href={`https://sepolia.arbiscan.io/address/${addressPosition}`}
            target="_blank"
          >
            <Wallet2 className="size-4" />
            View Position
          </Link>
        ) : (
          <div className="text-red-400 text-base text-center flex flex-row gap-2 items-center justify-center">
            <ShieldAlert className="size-4" />
            Please Select Pool
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolSelector;
