"use client";
import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useFaucet } from "@/hooks/write/useClaimFaucet";
import { Loader2, ExternalLink, Copy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useChainId } from "wagmi";
import Image from "next/image";
import { defaultChain } from "@/lib/get-default-chain";

const FaucetsCardForm = () => {
  const chainId = useChainId();

  const {
    selectedTokenAddress,
    amount,
    isClaiming,
    isConfirming,
    txHash,
    filteredTokens,
    setSelectedTokenAddress,
    setAmount,
    handleClaim,
    copyTokenAddress,
    addTokenToWallet,
    isSuccess,
    isError,
  } = useFaucet(defaultChain);

  // Amount change handler
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty string or valid number format
    if (value === "" || /^(\d+\.?\d*|\.\d+)$/.test(value) || value === ".") {
      setAmount(value);
    }
  };

  const getButtonText = () => {
    if (isClaiming && !isConfirming) return "Submitting...";
    if (isConfirming) return "Confirming...";
    return "Claim";
  };

  const getButtonIcon = () => {
    if (isClaiming || isConfirming) {
      return <Loader2 className="w-4 h-4 animate-spin mr-2" />;
    }
    return null;
  };

  const execAddTokenToWallet = () => {
    if (Number(chainId) == defaultChain) {
      addTokenToWallet();
    } else {
      toast.error("Please switch to the Avalanche Fuji network", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
    }
  };

  const execCopyTokenAddress = () => {
    if (Number(chainId) == defaultChain) {
      copyTokenAddress();
    } else {
      toast.error("Please switch to the Avalanche Fuji network", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
    }
  };

  return (
    <div className="px-7 w-full space-y-5">
      {/* Token Selection */}
      <Select
        value={selectedTokenAddress}
        onValueChange={setSelectedTokenAddress}
        disabled={isClaiming || isConfirming}
      >
        <SelectTrigger className="w-full bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700/70 transition-colors">
          <SelectValue placeholder="Select a token" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700/50 backdrop-blur-sm">
          <SelectGroup>
            <SelectLabel className="text-slate-300">
              Available Tokens
            </SelectLabel>
            <AnimatePresence>
              {filteredTokens.map((token, index) => (
                <motion.div
                  key={token.address}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <SelectItem
                    className="transition-colors duration-100 cursor-pointer text-white hover:bg-[#2986cc]/20 focus:bg-[#2986cc]/20"
                    value={token.address}
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={token.logo}
                        alt={token.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{token.name}</span>
                    </div>
                  </SelectItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Amount Input */}
      <div className="relative">
        <input
          value={amount}
          onChange={handleAmountChange}
          disabled={isClaiming || isConfirming}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#2986cc]/50 focus:border-[#265287] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400"
          placeholder="Enter amount (e.g., 100)"
          type="text"
          style={{
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            fontSize: "16px",
            minHeight: "40px",
          }}
        />
        {(isClaiming || isConfirming) && (
          <div className="absolute inset-0 bg-slate-800/50 rounded-md flex items-center justify-center">
            <span className="text-sm text-slate-400">Processing...</span>
          </div>
        )}
      </div>

      {/* Claim Button */}
      <Button
        onClick={handleClaim}
        disabled={
          isClaiming || isConfirming || !selectedTokenAddress || !amount
        }
        className="w-full bg-gradient-to-r from-[#01ECBE] to-[#141beb] text-white hover:from-[#01ECBE]/90 hover:to-[#141beb]/90 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl disabled:from-slate-600 disabled:to-slate-600"
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>

      {/* Transaction Status */}
      {txHash && (
        <div className="space-y-3">
          {isConfirming && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming transaction...</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Transaction Successful
              </div>
              <div className="text-xs text-green-300">
                Your tokens have been successfully claimed!
              </div>
            </div>
          )}

          {isError && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                Transaction Failed
              </div>
              <div className="text-xs text-red-300">
                Please try again or check your wallet connection.
              </div>
            </div>
          )}

          <div className="text-slate-300 text-sm">
            <span className="font-medium">Transaction Hash:</span>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-slate-700/50 px-2 py-1 rounded font-mono text-slate-200">
                {txHash.slice(0, 6)}...{txHash.slice(-6)}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(txHash);
                  toast.success("Transaction hash copied!", {
                    style: {
                      background: 'rgba(34, 197, 94, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#86efac',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)'
                    }
                  });
                }}
                className="text-[#01ECBE] hover:text-[#01ECBE]/80 transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={`https://testnet.explorer.etherlink.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01ECBE] hover:text-[#01ECBE]/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Token Address Info */}
      {selectedTokenAddress && (
        <div className="text-slate-300 text-sm">
          <span className="font-medium">Add token to your wallet:</span>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-slate-700/50 px-2 py-1 rounded font-mono flex-1 text-slate-200">
              {selectedTokenAddress}
            </code>
            <button
              onClick={execCopyTokenAddress}
              className="text-[#01ECBE] hover:text-[#01ECBE]/80 transition-colors cursor-pointer"
              title="Copy token address"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={execAddTokenToWallet}
              className="text-[#01ECBE] hover:text-[#01ECBE]/80 transition-colors cursor-pointer"
              title="Add token to wallet automatically"
            >
              <Wallet className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaucetsCardForm;
