import { toast } from "sonner";
import { Token } from "@/types";

export const addTokenToWallet = async (
  tokenAddress: string,
  selectedToken: Token & { address: `0x${string}` }
) => {
  if (!tokenAddress) {
    toast.error("Please select a token first", {
      className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
      style: {
        backgroundColor: "rgba(239,68,68,0.1)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        color: "#fca5a5"
      }
    });
    return;
  }

  // Check if wallet supports wallet_watchAsset
  if (typeof window !== "undefined" && (window as any).ethereum) {
    try {
      await (window as any).ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            image: `${(window as any).location.origin}${selectedToken.logo}`,
          },
        },
      });
  
      toast.success(`${selectedToken.name} added to your wallet!`, {
        className: "bg-green-900/10 backdrop-blur-md border-green-400/30 text-green-300",
        style: {
          backgroundColor: "rgba(34,197,94,0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(134, 239, 172, 0.3)",
          color: "#86efac"
        }
      });
    } catch (error) {
  
      toast.error("Failed to add token to wallet. Please add it manually.", {
        className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
        style: {
          backgroundColor: "rgba(239,68,68,0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(248, 113, 113, 0.3)",
          color: "#fca5a5"
        }
      });
    }
  } else {
    toast.error("Wallet not found. Please connect your wallet first.", {
      className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
      style: {
        backgroundColor: "rgba(239,68,68,0.1)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        color: "#fca5a5"
      }
    });
  }
};

// Enhanced version with better error handling and wallet detection
export const addTokenToWalletEnhanced = async (
  tokenAddress: string,
  selectedToken: Token & { address: `0x${string}` },
  chainId?: number
) => {
  if (!tokenAddress) {
    toast.error("Please select a token first", {
      className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
      style: {
        backgroundColor: "rgba(239,68,68,0.1)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        color: "#fca5a5"
      }
    });
    return false;
  }

  if (typeof window === "undefined") {
    toast.error("This feature is only available in a browser environment", {
      className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
      style: {
        backgroundColor: "rgba(239,68,68,0.1)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        color: "#fca5a5"
      }
    });
    return false;
  }

  if (!(window as any).ethereum) {
    toast.error("No wallet detected. Please install MetaMask or another compatible wallet.", {
      className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
      style: {
        backgroundColor: "rgba(239,68,68,0.1)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        color: "#fca5a5"
      }
    });
    return false;
  }

  try {
    // Check if the wallet supports the wallet_watchAsset method
    const methods = await (window as any).ethereum.request({ method: "wallet_getCapabilities" });
    
    if (methods && methods.snaps && methods.snaps["wallet_watchAsset"]) {
      // Modern wallet with capabilities
      const wasAdded = await (window as any).ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            image: `${(window as any).location.origin}${selectedToken.logo}`,
          },
        },
      });

      if (wasAdded) {
        toast.success(`${selectedToken.name} added to your wallet!`, {
          className: "bg-green-900/10 backdrop-blur-md border-green-400/30 text-green-300",
          style: {
            backgroundColor: "rgba(34,197,94,0.1)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(134, 239, 172, 0.3)",
            color: "#86efac"
          }
        });
        return true;
      } else {
        toast.info("Token was not added to your wallet", {
          className: "bg-blue-900/10 backdrop-blur-md border-blue-400/30 text-blue-300",
          style: {
            backgroundColor: "rgba(59,130,246,0.1)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(147, 197, 253, 0.3)",
            color: "#93c5fd"
          }
        });
        return false;
      }
    } else {
      // Fallback for older wallets
      const wasAdded = await (window as any).ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            image: `${(window as any).location.origin}${selectedToken.logo}`,
          },
        },
      });

      if (wasAdded) {
        toast.success(`${selectedToken.name} added to your wallet!`, {
          className: "bg-green-900/10 backdrop-blur-md border-green-400/30 text-green-300",
          style: {
            backgroundColor: "rgba(34,197,94,0.1)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(134, 239, 172, 0.3)",
            color: "#86efac"
          }
        });
        return true;
      } else {
        toast.info("Token was not added to your wallet", {
          className: "bg-blue-900/10 backdrop-blur-md border-blue-400/30 text-blue-300",
          style: {
            backgroundColor: "rgba(59,130,246,0.1)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(147, 197, 253, 0.3)",
            color: "#93c5fd"
          }
        });
        return false;
      }
    }
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 4001) {
      toast.error("User rejected the token addition request", {
        className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
        style: {
          backgroundColor: "rgba(239,68,68,0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(248, 113, 113, 0.3)",
          color: "#fca5a5"
        }
      });
    } else if (error.code === -32601) {
      toast.error("This wallet doesn't support adding tokens automatically. Please add it manually.", {
        className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
        style: {
          backgroundColor: "rgba(239,68,68,0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(248, 113, 113, 0.3)",
          color: "#fca5a5"
        }
      });
    } else {
      toast.error("Failed to add token to wallet. Please add it manually.", {
        className: "bg-red-900/10 backdrop-blur-md border-red-400/30 text-red-300",
        style: {
          backgroundColor: "rgba(239,68,68,0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(248, 113, 113, 0.3)",
          color: "#fca5a5"
        }
      });
    }
    
    return false;
  }
};

// Utility function to check if wallet supports token addition
export const checkWalletTokenSupport = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return false;
  }

  try {
    // Try to detect if the wallet supports wallet_watchAsset
    const methods = await (window as any).ethereum.request({ method: "wallet_getCapabilities" });
    return !!(methods && methods.snaps && methods.snaps["wallet_watchAsset"]);
  } catch (error) {
    // If wallet_getCapabilities fails, assume it might support wallet_watchAsset
    return true;
  }
};

// Utility function to get wallet type
export const getWalletType = (): string | null => {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return null;
  }

  if ((window as any).ethereum.isMetaMask) {
    return "MetaMask";
  }
  
  // Add more wallet detection logic here
  return "Unknown";
}; 