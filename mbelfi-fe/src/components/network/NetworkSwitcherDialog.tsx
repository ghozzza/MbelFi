import React, { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, AlertTriangle, Globe } from "lucide-react";
import { chains } from "@/constants/chainAddress";
import { defaultChain } from "@/lib/get-default-chain";
import { config } from "@/lib/wagmi";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface NetworkSwitcherDialogProps {
  className?: string;
  variant?: "button" | "icon";
  children?: React.ReactNode;
}

export const NetworkSwitcherDialog: React.FC<NetworkSwitcherDialogProps> = ({
  className = "",
  variant = "button",
  children
}) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentChain = chains.find(c => c.id === chainId) || { 
    id: defaultChain, 
    name: "Unknown" 
  };
  const isCorrectNetwork = chainId === defaultChain;

  // Filter to only show 3 specific chains
  const availableChains = chains.filter(chain => 
    [421614, 84532, 128123].includes(chain.id)
  );

  const getChainIcon = (chainId: number) => {
    // Map chain IDs to icon paths for the 3 supported chains
    const iconMap: { [key: number]: string } = {
      421614: "/chain/arbitrum.png",      // Arbitrum Sepolia
      84532: "/chain/base.png",           // Base Sepolia
      128123: "/chain/etherlink-logo.jpeg" // Etherlink Testnet
    };
    return iconMap[chainId] || "/chain/ethereum.png";
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        setIsOpen(false);
      } else {
        setError("MetaMask not found. Please install MetaMask extension.");
      }
    } catch (err: any) {
      // If the chain is not added to MetaMask, add it
      if (err.code === 4902) {
        try {
          const targetChain = chains.find(c => c.id === targetChainId);
          if (targetChain) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: targetChain.name,
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.ethereum.org'],
                blockExplorerUrls: [],
              }],
            });
            setIsOpen(false);
          }
        } catch (addErr: any) {
          setError(`Failed to add network: ${addErr.message}`);
        }
      } else {
        setError(`Failed to switch network: ${err.message}`);
      }
    } finally {
      setIsPending(false);
    }
  };

  const renderTrigger = () => {
    if (children) {
      return children;
    }

    if (variant === "icon") {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <Globe className="w-5 h-5" />
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        className="flex items-center py-5 gap-2 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50"
      >
        <img
          src={getChainIcon(currentChain.id)}
          alt={currentChain.name}
          className="w-4 h-4 rounded-full"
        />
        <span className="text-white text-sm">{currentChain.name}</span>
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="bg-gray-900/95 border border-gray-600/50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Switch Network
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Network Status */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getChainIcon(currentChain.id)}
                  alt={currentChain.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="text-white font-medium">Current Network</h3>
                  <p className="text-gray-400 text-sm">{currentChain.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isCorrectNetwork ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Wrong Network</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Network Options */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Available Networks</h4>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {availableChains.map((chainOption) => (
                <button
                  key={chainOption.id}
                  onClick={() => handleSwitchNetwork(chainOption.id)}
                  disabled={isPending}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    currentChain.id === chainOption.id
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500/50'
                  } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <img
                    src={getChainIcon(chainOption.id)}
                    alt={chainOption.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{chainOption.name}</div>
                    <div className="text-xs text-gray-400">Chain ID: {chainOption.id}</div>
                  </div>
                  {currentChain.id === chainOption.id && (
                    <Check className="w-5 h-5 text-blue-400" />
                  )}
                  {isPending && currentChain.id !== chainOption.id && (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Failed to switch network: {error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-600/50">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="flex-1 bg-gray-800/50 border-gray-600 text-white hover:text-gray-300 hover:bg-gray-700/50"
            >
              Cancel
            </Button>
            {!isCorrectNetwork && (
              <Button
                onClick={() => handleSwitchNetwork(defaultChain)}
                disabled={isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? "Switching..." : "Switch to Default"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 