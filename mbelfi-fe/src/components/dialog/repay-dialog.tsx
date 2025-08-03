import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpCircle, AlertTriangle, ArrowDownUp } from "lucide-react";
import { EnrichedPool } from "@/lib/pair-token-address";
import { useRepay } from "@/hooks/write/useRepaySelectedToken";
import { toast } from "sonner";
import { useActionLogic } from "@/hooks/useActionLogic";
import { TransactionStatus } from "@/components/transaction/TransactionStatus";
import { UserBorrowBalanceDisplay } from "@/components/user/UserBorrowBalanceDisplay";
import { UserWalletBalanceDisplay } from "@/components/user/UserWalletBalanceDisplay";
import { useAccount, useChainId } from "wagmi";
import { Spinner } from "@/components/ui/spinner";
import { tokens } from "@/constants/tokenAddress";
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { defaultChain } from "@/lib/get-default-chain";
import { useTokenCalculator } from "@/hooks/read/useTokenCalculator";
import { useReadAddressPosition } from "@/hooks/read/useReadPositionAddress";
import { Address } from "viem";

interface RepayDialogProps {
  market: EnrichedPool;
  selectedToken: any;
  isOpen: boolean;
  onClose: () => void;
}

export function RepayDialog({
  market,
  selectedToken,
  isOpen,
  onClose,
}: RepayDialogProps) {
  // Early return if market is not provided
  if (!market) {
    return null;
  }

  const {
    amount,
    setAmount,
    tokenDecimals,
    etherlinkChain,
  } = useActionLogic("repay", market);

  const chainId = useChainId();

  // Wallet connection check
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const isChainValid = connectedChainId === defaultChain;

  // Get position address
  const { addressPosition } = useReadAddressPosition(market.id);

  // State for dual input
  const [inputTokenAmount, setInputTokenAmount] = React.useState("");
  const [borrowTokenAmount, setBorrowTokenAmount] = React.useState("");
  const [lastInputChanged, setLastInputChanged] = React.useState<"input" | "borrow">("input");

  // Reset amounts when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setInputTokenAmount("");
      setBorrowTokenAmount("");
      setAmount("");
      setLastInputChanged("input");
    }
  }, [isOpen, setAmount]);

  // Get token decimals dynamically
  const tokenDecimalsForHooks = React.useMemo(() => {
    // Try to get from borrowTokenInfo first
    if (market?.borrowTokenInfo?.address) {
      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowTokenInfo?.address?.toLowerCase()
      );
      return token?.decimals || 18;
    }
    
    // Fallback to borrowToken string
    if (market?.borrowToken) {
      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowToken?.toLowerCase()
      );
      return token?.decimals || 18;
    }
    
    return 18;
  }, [market?.borrowTokenInfo?.address, market?.borrowToken, chainId]);

  // Get selected token info (dynamic input token)
  const inputToken = React.useMemo(() => {
    return selectedToken;
  }, [selectedToken]);

  // Get borrow token info
  const borrowToken = React.useMemo(() => {
    if (market?.borrowTokenInfo) {
      return tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowTokenInfo?.address?.toLowerCase()
      );
    }
    if (market?.borrowToken) {
      return tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowToken?.toLowerCase()
      );
    }
    return null;
  }, [market, chainId]);

  // Token calculator for input token to borrow token conversion
  const {
    price: inputToBorrowRate,
    isLoading: isLoadingInputToBorrow,
    error: errorInputToBorrow,
  } = useTokenCalculator(
    inputToken?.addresses[defaultChain] as Address,
    borrowToken?.addresses[defaultChain] as Address,
    Number(inputTokenAmount) || 0,
    addressPosition as Address
  );

  // Token calculator for borrow token to input token conversion
  const {
    price: borrowToInputRate,
    isLoading: isLoadingBorrowToInput,
    error: errorBorrowToInput,
  } = useTokenCalculator(
    borrowToken?.addresses[defaultChain] as Address,
    inputToken?.addresses[defaultChain] as Address,
    Number(borrowTokenAmount) || 0,
    addressPosition as Address
  );

  // Token calculator for rate calculation (1 unit)
  const {
    price: baseRate,
    isLoading: isLoadingBaseRate,
    error: errorBaseRate,
  } = useTokenCalculator(
    inputToken?.addresses[defaultChain] as Address,
    borrowToken?.addresses[defaultChain] as Address,
    1,
    addressPosition as Address
  );





  // Repay hooks
  const {
    repay: handleRepay,
    isPending: isRepaying,
    isLoading: isRepayLoading,
    isSuccess: isRepaySuccess,
    isError: isRepayError,
    error: repayError,
    reset: resetRepay,
    userBorrowShares,
    totalBorrowAssets,
    totalBorrowShares,
    userBorrowSharesLoading,
    totalBorrowAssetsLoading,
    isLoadingTotalBorrowShares,
  } = useRepay(
    market.borrowTokenInfo?.name || market.borrowToken,
    market.id,
    false,
    chainId,
    market.borrowTokenInfo?.decimals || 6, // Use borrow token decimals
    inputToken?.name // Pass selected token name instead of address
  );

  const { refetchAll } = useRepay(
    market.borrowTokenInfo?.name || market.borrowToken,
    market.id,
    false,
    chainId,
    market.borrowTokenInfo?.decimals || 6,
    inputToken?.name
  );



  // Handle repay success
  React.useEffect(() => {
    if (isRepaySuccess) {
      setInputTokenAmount("");
      setBorrowTokenAmount("");
      setAmount("");
      toast.success("Repay successful!");
      
      // Refetch data after successful transaction
      if (refetchAll) {
        refetchAll();
      }
      
      onClose();
    }
  }, [isRepaySuccess, setAmount, onClose, refetchAll]);

  // Handle repay error
  React.useEffect(() => {
    if (isRepayError && repayError) {
      toast.error(`Repay failed: ${repayError.message}`);
    }
  }, [isRepayError, repayError]);

  // Calculate max amount (user's borrow shares)
  const getMaxAmount = () => {
    if (userBorrowSharesLoading || !userBorrowShares) return 0;
    return Number(userBorrowShares) / Math.pow(10, tokenDecimalsForHooks);
  };

  const handleMaxClick = () => {
    const maxAmount = getMaxAmount();
    if (maxAmount > 0) {
      setLastInputChanged("borrow");
      setBorrowTokenAmount(maxAmount.toString());
    }
  };

  const formatMaxAmount = (amount: number): string => {
    if (amount === 0) return "0.00";
    return amount.toFixed(5);
  };

  const handleInputTokenAmountChange = (value: string) => {
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value) || value === "") {
      setLastInputChanged("input");
      setInputTokenAmount(value);
      
      // Calculate conversion from input token to borrow token for display
      if (value && Number(value) > 0) {
        
        // Use base rate for conversion to borrow token (for display only)
        if (baseRate > 0) {
          const convertedAmount = Number(value) * baseRate;
          setBorrowTokenAmount(convertedAmount.toFixed(6));
          // Set amount as the input token amount (not converted)
          setAmount(value);
        } else if (inputToBorrowRate > 0) {
          // Fallback to direct calculation
          const convertedAmount = Number(value) * inputToBorrowRate;
          setBorrowTokenAmount(convertedAmount.toFixed(6));
          // Set amount as the input token amount (not converted)
          setAmount(value);
        }
      } else if (!value) {
        setBorrowTokenAmount("");
        setAmount("");
      }
    }
  };

  const handleBorrowTokenAmountChange = (value: string) => {
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value) || value === "") {
      setLastInputChanged("borrow");
      setBorrowTokenAmount(value);
      
      // Calculate conversion from borrow token to input token for display
      if (value && Number(value) > 0) {
        console.log("🔄 Borrow Token Change:", {
          value,
          baseRate,
          borrowToInputRate,
          inputToken: inputToken?.symbol,
          borrowToken: borrowToken?.symbol
        });
        
        // Use base rate for conversion to input token (for display only)
        if (baseRate > 0) {
          const convertedAmount = Number(value) / baseRate;
          setInputTokenAmount(convertedAmount.toFixed(6));
          // Set amount as the borrow token amount (not converted)
          setAmount(value);
        } else if (borrowToInputRate > 0) {
          // Fallback to direct calculation
          const convertedAmount = Number(value) * borrowToInputRate;
          setInputTokenAmount(convertedAmount.toFixed(6));
          // Set amount as the borrow token amount (not converted)
          setAmount(value);
        }
      } else if (!value) {
        setInputTokenAmount("");
        setAmount("");
      }
    }
  };

  const handleRepayPress = async () => {
    // Always use borrow token amount for repayment
    const finalAmount = borrowTokenAmount;
    
    if (!finalAmount || isNaN(Number(finalAmount)) || Number(finalAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isChainValid) {
      toast.error("Please switch to the correct network");
      return;
    }

    try {
      await handleRepay(finalAmount, {
        totalAssets: totalBorrowAssets?.toString(),
        totalShares: totalBorrowShares?.toString(),
      });
    } catch (error) {
      console.error("Repay error:", error);
      toast.error("Repay failed. Please try again.");
    }
  };

  const isButtonDisabled = () => {
    return (
      !isConnected ||
      !isChainValid ||
      !borrowTokenAmount ||
      isNaN(Number(borrowTokenAmount)) ||
      Number(borrowTokenAmount) <= 0 ||
      isRepaying ||
      isRepayLoading ||
      userBorrowSharesLoading ||
      totalBorrowAssetsLoading ||
      isLoadingTotalBorrowShares
    );
  };

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!isChainValid) return "Switch Network";
    if (isRepaying || isRepayLoading) return "Repaying...";
    if (!borrowTokenAmount || isNaN(Number(borrowTokenAmount)) || Number(borrowTokenAmount) <= 0) return "Enter Amount";
    return "Repay";
  };

  const getExchangeRate = () => {
    if (baseRate > 0) {
      return `1 ${inputToken?.symbol} = ${baseRate.toFixed(6)} ${borrowToken?.symbol}`;
    }
    return "Calculating exchange rate...";
  };

  const getDynamicExchangeRate = () => {
    if (inputTokenAmount && Number(inputTokenAmount) > 0 && baseRate > 0) {
      const convertedAmount = Number(inputTokenAmount) * baseRate;
      return `${inputTokenAmount} ${inputToken?.symbol} = ${convertedAmount.toFixed(6)} ${borrowToken?.symbol}`;
    }
    if (borrowTokenAmount && Number(borrowTokenAmount) > 0 && baseRate > 0) {
      const convertedAmount = Number(borrowTokenAmount) / baseRate;
      return `${borrowTokenAmount} ${borrowToken?.symbol} = ${convertedAmount.toFixed(6)} ${inputToken?.symbol}`;
    }
    return getExchangeRate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl mx-4 border border-blue-400/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-green-400" />
            Repay Debt
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <ConnectButton client={thirdwebClient} />
          </div>
        ) : (
          <>
            {/* Market Info */}
            <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-blue-400/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Pool</span>
                <span className="text-white font-medium">
                  {market.collateralTokenInfo?.symbol}/{market.borrowTokenInfo?.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Network</span>
                <span className="text-blue-400 text-sm">{etherlinkChain?.name}</span>
              </div>
            </div>

            {/* Balance Display */}
            <div className="mb-6 space-y-3">
              <UserBorrowBalanceDisplay
                market={market}
              />
              <UserWalletBalanceDisplay
                market={market}
                actionType="supply_liquidity"
              />
            </div>

            {/* Exchange Rate Display */}
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400">
                  <ArrowDownUp className="w-4 h-4" />
                  <span className="text-sm">{getDynamicExchangeRate()}</span>
                  {(isLoadingInputToBorrow || isLoadingBorrowToInput || isLoadingBaseRate) && (
                    <Spinner size="sm" className="text-blue-400" />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  Using token calculator
                </div>
              </div>
            </div>

            {/* Dual Input Section */}
            <div className="mb-6 space-y-4">
              {/* Input Token */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount in {inputToken?.symbol} (Input)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={inputTokenAmount}
                    onChange={(e) => handleInputTokenAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-800 border-blue-400/30 text-white placeholder-gray-500"
                    disabled={isRepaying || isRepayLoading}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                    {inputToken?.symbol}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Enter {inputToken?.symbol} amount to see equivalent {borrowToken?.symbol}
                </div>
              </div>

              {/* Conversion Arrow */}
              <div className="flex justify-center">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <ArrowDownUp className="w-3 h-3 text-blue-400" />
                </div>
              </div>

              {/* Borrow Token Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount in {borrowToken?.symbol} (Repay Amount)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={borrowTokenAmount}
                    onChange={(e) => handleBorrowTokenAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-800 border-blue-400/30 text-white placeholder-gray-500"
                    disabled={isRepaying || isRepayLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMaxClick}
                    disabled={
                      userBorrowSharesLoading ||
                      getMaxAmount() <= 0 ||
                      isRepaying ||
                      isRepayLoading
                    }
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                  >
                    MAX
                  </Button>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Max: {formatMaxAmount(getMaxAmount())}</span>
                  <span>{borrowToken?.symbol}</span>
                </div>
                <div className="text-xs text-green-400 mt-1">
                  This amount will be converted to borrow shares for repayment
                </div>
              </div>
            </div>

            {/* Transaction Status */}
            {(isRepaying || isRepayLoading) && (
              <div className="mb-4">
                <TransactionStatus
                  type="withdraw"
                  chainId={chainId}
                  isConfirming={isRepaying || isRepayLoading}
                  isSuccess={isRepaySuccess}
                  isError={isRepayError}
                  errorMessage={repayError?.message}
                />
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleRepayPress}
              disabled={isButtonDisabled()}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isRepaying || isRepayLoading ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <ArrowUpCircle className="w-4 h-4 mr-2" />
              )}
              {getButtonText()}
            </Button>

            {/* Error Display */}
            {repayError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{repayError.message}</span>
                </div>
              </div>
            )}

            {/* Token Calculator Errors */}
            {(errorInputToBorrow || errorBorrowToInput || errorBaseRate) && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {errorInputToBorrow?.message || errorBorrowToInput?.message || errorBaseRate?.message || "Token calculator error"}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 