"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowDownIcon } from "@heroicons/react/24/outline";
import { tokens } from "@/constants/token-address";
import { useAccount } from "wagmi";
import { formatUnits, Address } from "viem";
import { useBalance } from "@/hooks/useBalance";
import { useSwapToken } from "@/hooks/useSwapToken";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useReadLendingData } from "@/hooks/read/useReadLendingData";
import { ArrowDownUp, ShieldAlert, Wallet2, MoveRight, History, ArrowRight } from "lucide-react";
import SelectPosition from "@/app/borrow/_components/position/selectPosition";
import {
  getAllLPFactoryData,
  getSelectedCollateralTokenByLPAddress,
} from "@/actions/GetLPFactory";
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
import { getPositionByOwnerAndLpAddress } from "@/actions/GetPosition";
import { useReadUserCollateral } from "@/hooks/read/useReadUserCollateral";
import { useReadAddressPosition } from "@/hooks/read/useReadAddressPosition";
import Link from "next/link";
import { useReadPositionBalance } from "@/hooks/read/useReadPositionBalance";
import { toast } from "sonner";
import { useTokenCalculator } from "@/hooks/read/useTokenCalculator";
import { defaultChain } from "@/lib/get-default-chain";

export default function SwapPanel() {
  const { address } = useAccount();
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [isMounted, setIsMounted] = useState(false);
  const [loadingToastId, setLoadingToastId] = useState<string | number | null>(null);
  const [positionAddress, setPositionAddress] = useState<string | undefined>(
    undefined
  );
  const [positionLength, setPositionLength] = useState(0);
  const [positionsArray, setPositionsArray] = useState<any[]>([]);
  const [lpAddress, setLpAddress] = useState<any[]>([]);
  const [lpAddressSelected, setLpAddressSelected] = useState<string>("");
  const [positionIndex, setPositionIndex] = useState<number | undefined>(
    undefined
  );
  const [selectedCollateralToken, setSelectedCollateralToken] =
    useState<any>(null);
  const { addressPosition } = useReadAddressPosition(lpAddressSelected);
  const { positionBalance: fromTokenBalance } = useReadPositionBalance(
    fromToken.addresses[defaultChain] as Address,
    addressPosition as `0x${string}`
  );
  const { positionBalance: toTokenBalance } = useReadPositionBalance(
    toToken.addresses[defaultChain] as Address,
    addressPosition as `0x${string}`
  );

  const {
    userCollateral,
    positionLoading,
    collateralLoading,
    positionError,
    collateralError,
  } = useReadUserCollateral(selectedCollateralToken, lpAddressSelected);

  // address position from hooks

  const {
    price: priceExchangeRate,
    isLoading: isLoadingPrice,
    error: errorPrice,
  } = useTokenCalculator(
    fromToken.addresses[defaultChain] as Address,
    toToken.addresses[defaultChain] as Address,
    Number(1),
    addressPosition as Address
  );

  const {
    price: priceExchangeRateReverse,
    isLoading: isLoadingPriceReverse,
    error: errorPriceReverse,
  } = useTokenCalculator(
    fromToken.addresses[defaultChain] as Address,
    toToken.addresses[defaultChain] as Address,
    Number(fromAmount),
    addressPosition as Address
  );

  const onSwapSuccess = useCallback(() => {
    // Reset form after successful swap
    setFromAmount("");
    setToAmount("");
  }, []);

  const onSwapError = useCallback((error: Error) => {
    console.error("Swap error:", error);
  }, []);

  const { swapToken, isLoading, isConfirming, isSuccess, isError, txHash, error, setError } = useSwapToken({
    fromToken: {
      address: fromToken.addresses[defaultChain] as Address,
      name: fromToken.name,
      decimals: fromToken.decimals,
    },
    toToken: {
      address: toToken.addresses[defaultChain] as Address,
      name: toToken.name,
      decimals: toToken.decimals,
    },
    fromAmount,
    toAmount,
    onSuccess: onSwapSuccess,
    onError: onSwapError,
    positionAddress: addressPosition as `0x${string}`,
    lpAddress: lpAddressSelected as Address,
  });

  useEffect(() => {
    if (txHash && !loadingToastId) {
      const toastId = toast.loading("Transaction submitted. Waiting for confirmation...", {
        style: {
          background: 'rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#93c5fd',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)'
        }
      });
      setLoadingToastId(toastId);
    }
  }, [txHash]); // Remove loadingToastId from dependencies

  useEffect(() => {
    if (isSuccess && txHash) {
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
        setLoadingToastId(null);
      }
      
      toast.success("Swap completed successfully!", {
        style: {
          background: 'rgba(34, 197, 94, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#86efac',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)'
        }
      });
      // Reset form after successful swap
      setFromAmount("");
      setToAmount("");
    }
  }, [isSuccess, txHash]); // Remove loadingToastId from dependencies

  useEffect(() => {
    if (isError) {
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
        setLoadingToastId(null);
      }
      
      const errorMessage = "Transaction failed. Please try again.";
      toast.error(errorMessage, {
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
  }, [isError]); // Remove loadingToastId from dependencies

  // Set mounted state to true after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchSelectedCollateralToken = async () => {
      const data = await getSelectedCollateralTokenByLPAddress(
        lpAddressSelected
      );
      setSelectedCollateralToken(data?.collateralToken);
    };
    fetchSelectedCollateralToken();
  }, [lpAddressSelected]);

  // Calculate exchange rate and to amount
  useEffect(() => {
    if (fromAmount && priceExchangeRate && priceExchangeRateReverse) {
      try {
        const amount = parseFloat(fromAmount);
        if (!isNaN(amount) && amount > 0) {
          const calculatedAmount = Number(priceExchangeRateReverse);
          setToAmount(calculatedAmount.toFixed(6));
        } else {
          setToAmount("");
        }
      } catch (err) {
        console.error("Error calculating exchange rate:", err);
        setToAmount("");
      }
    } else {
      setToAmount("");
    }
  }, [
    fromAmount,
    priceExchangeRate,
    priceExchangeRateReverse,
    fromToken,
    toToken,
  ]);

  useEffect(() => {
    const fetchLpAddress = async () => {
      try {
        setPositionsArray([]);
        setPositionLength(0);
        setPositionAddress(undefined);
        const lpAddress = await getAllLPFactoryData();
        setLpAddress(lpAddress);
      } catch (error) {
        console.error("Error fetching LP address:", error);
        setLpAddress([]);
      }
    };
    fetchLpAddress();
  }, []);

  useEffect(() => {
    if (lpAddressSelected) {
      const fetchPosition = async () => {
        const response = await getPositionByOwnerAndLpAddress(
          address as string,
          lpAddressSelected
        );
        setPositionsArray(response.data);
        setPositionLength(response.data.length);
        setPositionAddress(undefined);
      };
      fetchPosition();
    }
  }, [lpAddressSelected]);

  // Swap positions of tokens
  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const formatExchangeRate = (price: number) => {
    return `1 ${fromToken.name} ≈ ${
      isLoadingPrice ? "Loading..." : Number(price).toFixed(6)
    } ${toToken.name}`;
  };

  // Handle token swap
  const handleSwap = async () => {
    const fromAmountReal = parseFloat(fromAmount) * 10 ** fromToken.decimals;
    const fromTokenBalanceReal =
      fromToken.name === tokenName(selectedCollateralToken)
        ? Number(userCollateral?.toString() ?? "0")
        : Number(fromTokenBalance) * 10 ** fromToken.decimals;
    
    if (!address) {
      toast.error("Please connect your wallet", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      return;
    }

    if (!fromAmountReal || fromAmountReal <= 0) {
      toast.error("Please enter a valid amount", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      return;
    }

    if (fromAmountReal > Number(fromTokenBalanceReal)) {
      toast.error("Insufficient balance", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      return;
    }

    try {
      await swapToken();
    } catch (err) {
      console.error("Swap error:", err);
      toast.error("Swap failed. Please try again.", {
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

  // Determine button text based on client-side state only
  const getButtonText = () => {
    if (!isMounted) return "Swap"; // Default text for SSR
    if (!address) return "Connect Wallet";
    if (!addressPosition || addressPosition === "0x0000000000000000000000000000000000000000") {
      return "Create Pool First";
    }
    if (isLoading && !isConfirming) return "Submitting...";
    if (isConfirming) return "Confirming...";
    return "Swap";
  };

  const tokenName = (address: string) => {
    const token = tokens.find((token) => token.addresses[defaultChain] === address);
    return token?.name;
  };

  const tokenLogo = (address: string) => {
    const token = tokens.find((token) => token.addresses[defaultChain] === address);
    return token?.logo;
  };

  const formatBalance = (
    name: string,
    tokenAddress: string,
    decimals: number,
    tokenBalance: number
  ) => {
    return (
      <>
        {name === tokenName(tokenAddress)
          ? formatUnits(BigInt(tokenBalance.toString()), decimals)
          : tokenBalance}{" "}
        {name}
      </>
    );
  };

  const formatButtonClick = () => {
    console.log("Button clicked!"); // Debug log
    
    if (
      addressPosition === "0x0000000000000000000000000000000000000000" ||
      addressPosition === undefined
    ) {
      toast.error("You don't have any active positions. Visit the Borrow page to create a pool first.", {
        duration: 5000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        },
        action: {
          label: "Go to Borrow",
          onClick: () => window.open('/borrow', '_blank')
        }
      });
    } else if (
      Number(fromAmount) >
      Number(fromTokenBalance) / 10 ** fromToken.decimals
    ) {
      toast.error("Insufficient balance", {
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
    } else {
      handleSwap();
    }
  };

  const formatButtonClassName = () => {
    return `w-full py-3.5 rounded-xl font-bold transition-colors ${
      isLoading ||
      isConfirming ||
      !fromAmount ||
      !toAmount ||
      !address ||
      addressPosition === undefined ||
      addressPosition === "0x0000000000000000000000000000000000000000" ||
      Number(fromAmount) > Number(fromTokenBalance) / 10 ** fromToken.decimals
        ? "bg-blue-600/30 text-white shadow-md hover:shadow-lg cursor-not-allowed"
        : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-md hover:shadow-lg"
    }`;
  };

  return (
    <div className="max-w-md mx-auto w-full px-2 py-2">
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
                      <div className="flex flex-row gap-8 items-between justify-between ml-8 w-full">
                        <div className="flex items-center">
                          <Image
                            src={tokenLogo(lp.collateralToken) ?? ""}
                            alt={tokenName(lp.collateralToken) ?? ""}
                            className="size-5 rounded-full"
                            width={10}
                            height={10}
                          />
                        </div>
                        <ArrowRight className="size-4 mx-" />
                        <div className="flex items-center">
                          <Image
                            src={tokenLogo(lp.borrowToken) ?? ""}
                            alt={tokenName(lp.borrowToken) ?? ""}
                            className="size-5 rounded-full"
                            width={10}
                            height={10}
                          />
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
              href={`https://sepolia.arbiscan.io/address/${address}`}
              target="_blank"
            >
              <History className="size-4" />
              View History
            </Link>
          ) : (
            <div className="text-red-400 text-base text-center flex flex-row gap-2 items-center justify-center">
              <ShieldAlert className="size-4" />
              Please Select Pool
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 w-full">
        {/* Warning Message for No Position */}
        {(!addressPosition || addressPosition === "0x0000000000000000000000000000000000000000") && lpAddressSelected && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-yellow-400">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="size-5" />
              <span className="font-medium">No Active Position Found</span>
            </div>
            <p className="text-sm text-yellow-300">
              You need to create a position first by supplying collateral and borrowing assets. 
              Visit the <span className="font-medium">Borrow</span> page to get started.
            </p>
          </div>
        )}

        {/* From Token */}
        <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-4 w-full shadow-sm hover:shadow-md transition-shadow ${
          !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000" 
            ? "opacity-50 pointer-events-none" 
            : ""
        }`}>
          <div className="flex justify-between mb-5">
            <label htmlFor="fromAmount" className="text-blue-300 font-medium">
              From
            </label>
            <span className="text-blue-400 text-sm truncate">
              Balance:{" "}
              {formatBalance(
                fromToken.name,
                fromToken.addresses[defaultChain],
                fromToken.decimals,
                Number(fromTokenBalance ?? 0)
              )}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="fromAmount"
              type="text"
              className="w-full bg-transparent text-gray-100 text-xl focus:outline-none p-2 border-b border-blue-400/30"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setFromAmount(value);
                }
              }}
              aria-label="Amount to swap"
            />
            <Select
              value={fromToken.addresses[defaultChain]}
              onValueChange={(value) =>
                setFromToken(
                  tokens.find((t) => t.addresses[defaultChain] === value) || tokens[0]
                )
              }
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

        {/* Switch button */}
        <div className={`flex justify-center ${
          !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000" 
            ? "opacity-50 pointer-events-none" 
            : ""
        }`}>
          <div className="group">
            <button
              onClick={switchTokens}
              className="bg-slate-700/50 p-2 rounded-full hover:bg-slate-600/50 border border-blue-400/30 z-10 transform transition-transform duration-300 group-hover:rotate-18 cursor-pointer shadow-sm"
              aria-label="Switch tokens"
            >
              <ArrowDownUp className="h-5 w- text-blue-300  transform transition-transform duration-300 group-hover:rotate-162" />
            </button>
          </div>
        </div>

        {/* To Token */}
        <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
          !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000" 
            ? "opacity-50 pointer-events-none" 
            : ""
        }`}>
          <div className="flex justify-between mb-2">
            <label htmlFor="toAmount" className="text-blue-300 font-medium">
              To
            </label>
            <span className="text-blue-400 text-sm truncate">
              Balance:{" "}
              {formatBalance(
                toToken.name,
                toToken.addresses[defaultChain],
                toToken.decimals,
                Number(toTokenBalance ?? 0)
              )}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="toAmount"
              type="number"
              className="w-full bg-transparent text-gray-100 text-xl focus:outline-none p-2 border-b border-blue-400/30"
              placeholder="0.0"
              value={toAmount}
              readOnly
              aria-label="Amount to receive"
            />
            <Select
              value={toToken.addresses[defaultChain]}
              onValueChange={(value) =>
                setToToken(
                  tokens.find((t) => t.addresses[defaultChain] === value) || tokens[0]
                )
              }
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

        {/* Swap Rate */}
        <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-3 text-sm text-blue-400 shadow-sm ${
          !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000" 
            ? "opacity-50 pointer-events-none" 
            : ""
        }`}>
          <div className="flex justify-between">
            <span>Exchange Rate:</span>
            <span className="truncate">
              {formatExchangeRate(priceExchangeRate)}
            </span>
          </div>
        </div>

        {/* Slippage Setting */}
        <div className={`bg-slate-800/50 border border-blue-400/30 rounded-xl p-3 shadow-sm ${
          !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000" 
            ? "opacity-50 pointer-events-none" 
            : ""
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-blue-300 font-medium">
              Slippage Tolerance
            </span>
            <div className="flex flex-wrap gap-1">
              {["0.5", "1", "2", "3"].map((value) => (
                <button
                  key={value}
                  className={`px-3 py-1 rounded text-sm ${
                    slippage === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700/50 text-blue-300 hover:bg-slate-600/50 cursor-pointer"
                  }`}
                  onClick={() => setSlippage(value)}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/30">
            {error}
          </div>
        )}

        {/* Swap Button */}
        <button onClick={formatButtonClick} className={formatButtonClassName()}>
          {getButtonText()}{" "}
        </button>
      </div>
    </div>
  );
}
