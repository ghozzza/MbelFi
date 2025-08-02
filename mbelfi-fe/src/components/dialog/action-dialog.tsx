import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Maximize2, AlertTriangle } from "lucide-react";
import { EnrichedPool } from "@/lib/pair-token-address";
import { useSupplyCollateral } from "@/hooks/write/useSupplyCollateral";
import { useSupplyLiquidity } from "@/hooks/write/useSupplyLiquidity";
import { useWithdrawCollateral } from "@/hooks/write/useWithdrawCollateral";
import { useWithdrawLiquidity } from "@/hooks/write/useWithdrawLiquidity";
import { useApprove } from "@/hooks/write/useApprove";
import { useBorrow } from "@/hooks/write/useBorrow";
import { toast } from "sonner";
import { actionConfig, ActionType } from "@/constants/actionConfig";
import { useActionLogic } from "@/hooks/useActionLogic";
import { TransactionStatus } from "@/components/transaction/TransactionStatus";
import { ChainSelector } from "@/components/chain/ChainSelector";
import { UserCollateralBalance } from "@/components/user/UserCollateralBalance";
import { UserCollateralBalanceDisplay } from "@/components/user/UserCollateralBalanceDisplay";
import { UserSupplyBalanceDisplay } from "@/components/user/UserSupplyBalanceDisplay";
import { UserBorrowBalanceDisplay } from "@/components/user/UserBorrowBalanceDisplay";
import { UserCurrentBorrowDisplay } from "@/components/user/UserCurrentBorrowDisplay";
import { UserWalletBalanceDisplay } from "@/components/user/UserWalletBalanceDisplay";
import { useAccount, useChainId } from "wagmi";
import { useReadUserCollateral } from "@/hooks/read/useReadUserCollateral";
import { useReadUserSupplyShares } from "@/hooks/read/useUserSupplyShares";
import { useReadTotalSupplyAssets } from "@/hooks/read/useTotalSupplyAssets";
import { useUserWalletBalance } from "@/hooks/read/useUserWalletBalance";
import { tokens } from "@/constants/tokenAddress";
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { defaultChain } from "@/lib/get-default-chain";

interface ActionModalViewProps {
  type: ActionType;
  market: EnrichedPool;
  onAction?: (amount: string, toChainId?: string) => void;
}

export function ActionModalView({
  type,
  market,
  onAction,
}: ActionModalViewProps) {
  const {
    amount,
    setAmount,
    toChainId,
    setToChainId,
    isApproved,
    setIsApproved,
    tokenDecimals,
    toChain,
    etherlinkChain,
  } = useActionLogic(type, market);

  const chainId = useChainId();

  // Wallet connection check
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const isChainValid = connectedChainId === defaultChain;

  // Reset amount when action type changes
  React.useEffect(() => {
    setAmount("");
  }, [type, setAmount]);

  // Get token decimals dynamically - use same logic as useActionLogic
  const tokenDecimalsForHooks = React.useMemo(() => {
    if (type === "supply_collateral" || type === "withdraw_collateral") {
      if (!market?.collateralTokenInfo?.address) return 18;

      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.collateralTokenInfo?.address?.toLowerCase()
      );
      return token?.decimals || 18;
    } else if (type === "supply_liquidity" || type === "withdraw_liquidity" || type === "borrow") {
      if (!market?.borrowTokenInfo?.address) return 18;

      const token = tokens.find(
        (t) =>
          t.addresses[chainId]?.toLowerCase() ===
          market.borrowTokenInfo?.address?.toLowerCase()
      );
      return token?.decimals || 18;
    }
    return 18;
  }, [market, chainId, type]);

  // Get user collateral for max calculation
  const { userCollateralParsed } = useReadUserCollateral(
    market.collateralToken as `0x${string}`,
    market.id as `0x${string}`,
    tokenDecimalsForHooks
  );

  // Get user supply shares for max calculation
  const { userSupplySharesParsed } = useReadUserSupplyShares(
    market.id as `0x${string}`,
    tokenDecimalsForHooks
  );

  // Get total supply assets for borrow max calculation
  const { totalSupplyAssetsParsed } = useReadTotalSupplyAssets(
    market.id as `0x${string}`,
    tokenDecimalsForHooks
  );

  // Get user wallet balance for supply actions
  const {
    userWalletBalanceParsed: collateralWalletBalance,
    walletBalanceLoading: collateralWalletLoading,
    walletBalanceError: collateralWalletError,
  } = useUserWalletBalance(
    (market.collateralTokenInfo?.address || market.collateralToken) as `0x${string}`,
    tokenDecimalsForHooks
  );

  const {
    userWalletBalanceParsed: borrowWalletBalance,
    userWalletBalanceFormatted: borrowWalletBalanceFormatted,
    walletBalanceLoading: borrowWalletLoading,
    walletBalanceError: borrowWalletError,
  } = useUserWalletBalance(
    (market.borrowTokenInfo?.address || market.borrowToken) as `0x${string}`,
    tokenDecimalsForHooks
  );

  // Initialize hooks
  const {
    setAmount: setApproveAmount,
    handleApprove,
    isApproving,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    isError: isApproveError,
    txHash: approveTxHash,
    writeError: approveWriteError,
    confirmError: approveConfirmError,
  } = useApprove(chainId, tokenDecimals, () => {
    setIsApproved(true);
  });

  const {
    setAmount: setSupplyCollateralAmount,
    handleSupplyCollateral,
    isSupplying: isSupplyingCollateral,
    isConfirming: isSupplyCollateralConfirming,
    isSuccess: isSupplyCollateralSuccess,
    isError: isSupplyCollateralError,
    txHash: supplyCollateralTxHash,
    writeError: supplyCollateralWriteError,
    confirmError: supplyCollateralConfirmError,
  } = useSupplyCollateral(chainId, tokenDecimals, () => {
    setAmount("");
    setIsApproved(false);
  });

  const {
    setAmount: setSupplyLiquidityAmount,
    handleSupplyLiquidity,
    isSupplying: isSupplyingLiquidity,
    isConfirming: isSupplyLiquidityConfirming,
    isSuccess: isSupplyLiquiditySuccess,
    isError: isSupplyLiquidityError,
    txHash: supplyLiquidityTxHash,
    writeError: supplyLiquidityWriteError,
    confirmError: supplyLiquidityConfirmError,
  } = useSupplyLiquidity(chainId, tokenDecimals, () => {
    setAmount("");
    setIsApproved(false);
  });

  const {
    setAmount: setBorrowAmount,
    handleBorrow,
    isBorrowing,
    isConfirming: isBorrowConfirming,
    isSuccess: isBorrowSuccess,
    isError: isBorrowError,
    txHash: borrowTxHash,
    writeError: borrowWriteError,
    confirmError: borrowConfirmError,
  } = useBorrow(
    chainId,
    tokenDecimals,
    () => {
      setAmount("");
      onAction?.("", undefined);
    },
    toChain?.id,
    market?.id as `0x${string}`
  );

  const {
    setAmount: setWithdrawCollateralAmount,
    handleWithdrawCollateral,
    isWithdrawing: isWithdrawingCollateral,
    isConfirming: isWithdrawCollateralConfirming,
    isSuccess: isWithdrawCollateralSuccess,
    isError: isWithdrawCollateralError,
    txHash: withdrawCollateralTxHash,
    writeError: withdrawCollateralWriteError,
    confirmError: withdrawCollateralConfirmError,
  } = useWithdrawCollateral(chainId, tokenDecimals, () => {
    setAmount("");
  });

  const {
    setShares: setWithdrawLiquidityShares,
    handleWithdrawLiquidity,
    isWithdrawing: isWithdrawingLiquidity,
    isConfirming: isWithdrawLiquidityConfirming,
    isSuccess: isWithdrawLiquiditySuccess,
    isError: isWithdrawLiquidityError,
    txHash: withdrawLiquidityTxHash,
    writeError: withdrawLiquidityWriteError,
    confirmError: withdrawLiquidityConfirmError,
  } = useWithdrawLiquidity(chainId, tokenDecimals, () => {
    setAmount("");
  });

  // Sync main amount state with action-specific amounts
  React.useEffect(() => {
    if (type === "supply_collateral" && amount) {
      setSupplyCollateralAmount(amount);
      setApproveAmount(amount);
    } else if (type === "supply_liquidity" && amount) {
      setSupplyLiquidityAmount(amount);
      setApproveAmount(amount);
    } else if (type === "withdraw_collateral" && amount) {
      setWithdrawCollateralAmount(amount);
    } else if (type === "withdraw_liquidity" && amount) {
      setWithdrawLiquidityShares(amount);
    } else if (type === "borrow" && amount) {
      setBorrowAmount(amount);
    }
  }, [amount, type, setSupplyCollateralAmount, setSupplyLiquidityAmount, setWithdrawCollateralAmount, setWithdrawLiquidityShares, setBorrowAmount, setApproveAmount]);

  // Calculate max amounts for different actions
  const getMaxAmount = () => {
    switch (type) {
      case "supply_collateral":
        return collateralWalletBalance || 0;
      case "supply_liquidity":
        // Use the same balance that's displayed in UserWalletBalanceDisplay
        // If the parsed balance is 0 but we have a formatted balance, try to parse it
        if (borrowWalletBalance === 0 && borrowWalletBalanceFormatted && borrowWalletBalanceFormatted !== "0") {
          const parsed = parseFloat(borrowWalletBalanceFormatted);
          return isNaN(parsed) ? 0 : parsed;
        }
        return borrowWalletBalance || 0;
      case "withdraw_collateral":
        return userCollateralParsed;
      case "withdraw_liquidity":
        return userSupplySharesParsed;
      case "borrow":
        return totalSupplyAssetsParsed * 0.7; // 70% of total supply assets
      case "repay":
        return 0; // Will be implemented when we have user debt data
      default:
        return 0;
    }
  };

  const handleMaxClick = () => {
    const maxAmount = getMaxAmount();
    
    if (maxAmount > 0) {
      // Format the number to avoid long decimal strings
      const formattedAmount = formatMaxAmount(maxAmount);
      setAmount(formattedAmount);
      
      // Also update the specific action hooks
      if (type === "supply_collateral") {
        setSupplyCollateralAmount(formattedAmount);
        setApproveAmount(formattedAmount);
      } else if (type === "supply_liquidity") {
        setSupplyLiquidityAmount(formattedAmount);
        setApproveAmount(formattedAmount);
      } else if (type === "withdraw_collateral") {
        setWithdrawCollateralAmount(formattedAmount);
      } else if (type === "withdraw_liquidity") {
        setWithdrawLiquidityShares(formattedAmount);
      } else if (type === "borrow") {
        setBorrowAmount(formattedAmount);
      }
    } else {
      toast.error("No maximum amount available");
    }
  };

  // Helper function to format max amount properly
  const formatMaxAmount = (amount: number): string => {
    if (amount === 0) return "0";
    
    // For very small numbers, show more decimal places
    if (amount > 0 && amount < 0.000001) {
      return amount.toFixed(12).replace(/\.?0+$/, '');
    }
    
    // For small numbers, show up to 6 decimal places
    if (amount < 1) {
      return amount.toFixed(6).replace(/\.?0+$/, '');
    }
    
    // For normal numbers, show 2 decimal places
    if (amount < 1000) {
      return amount.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // For large numbers, use locale formatting
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const config = actionConfig[type];

  // Handle amount change
  const handleAmountChange = (value: string) => {
    setAmount(value);
    
    // Handle max button click
    if (value === "max") {
      const maxAmount = getMaxAmount();
      if (maxAmount > 0) {
        const formattedAmount = formatMaxAmount(maxAmount);
        setAmount(formattedAmount);
        
        // Update all relevant action hooks
        if (type === "supply_collateral") {
          setSupplyCollateralAmount(formattedAmount);
          setApproveAmount(formattedAmount);
        } else if (type === "supply_liquidity") {
          setSupplyLiquidityAmount(formattedAmount);
          setApproveAmount(formattedAmount);
        } else if (type === "withdraw_collateral") {
          setWithdrawCollateralAmount(formattedAmount);
        } else if (type === "withdraw_liquidity") {
          setWithdrawLiquidityShares(formattedAmount);
        } else if (type === "borrow") {
          setBorrowAmount(formattedAmount);
        }
      } else {
        toast.error("No maximum amount available");
      }
      return;
    }

    // Set amounts for different actions
    if (type === "supply_collateral") {
      setApproveAmount(value);
      setSupplyCollateralAmount(value);
    } else if (type === "supply_liquidity") {
      setApproveAmount(value);
      setSupplyLiquidityAmount(value);
    } else if (type === "withdraw_collateral") {
      setWithdrawCollateralAmount(value);
    } else if (type === "withdraw_liquidity") {
      setWithdrawLiquidityShares(value);
    } else if (type === "borrow") {
      setBorrowAmount(value);
    }
  };

  // Handle action button press
  const handleActionPress = async () => {
    if (type === "supply_collateral" || type === "supply_liquidity") {
      if (!market?.id) {
        toast.error("No lending pool address found");
        return;
      }

      const tokenAddress =
        type === "supply_collateral"
          ? market.collateralTokenInfo?.address
          : market.borrowTokenInfo?.address;

      if (!tokenAddress) {
        toast.error(
          `No ${
            type === "supply_collateral" ? "collateral" : "borrow"
          } token address found`
        );
        return;
      }

      try {
        if (!isApproved) {
          const tokenToApprove =
            type === "supply_collateral"
              ? market.collateralTokenInfo?.address
              : market.borrowTokenInfo?.address;

          if (!tokenToApprove) {
            toast.error(
              `No ${
                type === "supply_collateral" ? "collateral" : "borrow"
              } token address found`
            );
            return;
          }

          await handleApprove(
            tokenToApprove as `0x${string}`,
            market.id as `0x${string}`
          );
        } else {
          if (type === "supply_collateral") {
            await handleSupplyCollateral(market.id as `0x${string}`);
          } else {
            await handleSupplyLiquidity(market.id as `0x${string}`);
          }
        }
      } catch (error) {
        toast.error(
          `${
            type === "supply_collateral"
              ? "Supply collateral"
              : "Supply liquidity"
          } failed`
        );
      }
    } else if (type === "withdraw_collateral") {
      if (!market?.id) {
        toast.error("No lending pool address found");
        return;
      }

      try {
        await handleWithdrawCollateral(market.id as `0x${string}`);
      } catch (error) {
        toast.error("Withdraw collateral failed");
      }
    } else if (type === "withdraw_liquidity") {
      if (!market?.id) {
        toast.error("No lending pool address found");
        return;
      }

      try {
        await handleWithdrawLiquidity(market.id as `0x${string}`);
      } catch (error) {
        toast.error("Withdraw liquidity failed");
      }
    } else if (type === "borrow") {
      if (!market?.id) {
        toast.error("No lending pool address found");
        return;
      }

      try {
        await handleBorrow(market.id as `0x${string}`);
      } catch (error) {
        toast.error("Borrow failed");
      }
    } else {
      onAction?.(amount, undefined);
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = () => {
    if (type === "supply_collateral" || type === "supply_liquidity") {
      const isSupplying =
        type === "supply_collateral"
          ? isSupplyingCollateral
          : isSupplyingLiquidity;
      const isConfirming =
        type === "supply_collateral"
          ? isSupplyCollateralConfirming
          : isSupplyLiquidityConfirming;
      return (
        !amount ||
        parseFloat(amount) <= 0 ||
        isApproving ||
        isSupplying ||
        isApproveConfirming ||
        isConfirming
      );
    } else if (type === "withdraw_collateral") {
      return (
        !amount ||
        parseFloat(amount) <= 0 ||
        isWithdrawingCollateral ||
        isWithdrawCollateralConfirming
      );
    } else if (type === "withdraw_liquidity") {
      return (
        !amount ||
        parseFloat(amount) <= 0 ||
        isWithdrawingLiquidity ||
        isWithdrawLiquidityConfirming
      );
    } else if (type === "borrow") {
      return (
        !amount ||
        parseFloat(amount) <= 0 ||
        isBorrowing ||
        isBorrowConfirming ||
        !toChain
      );
    }
    return !amount || parseFloat(amount) <= 0;
  };

  // Get button text
  const getButtonText = () => {
    if (type === "supply_collateral" || type === "supply_liquidity") {
      if (isApproving || isApproveConfirming) {
        return "Approving...";
      }
      if (isSupplyingCollateral || isSupplyingLiquidity) {
        return "Supplying...";
      }
      if (isSupplyCollateralConfirming || isSupplyLiquidityConfirming) {
        return "Confirming...";
      }
      if (!isApproved) {
        return "Approve";
      }
      return config.buttonText;
    } else if (type === "withdraw_collateral") {
      if (isWithdrawingCollateral) {
        return "Withdrawing...";
      }
      if (isWithdrawCollateralConfirming) {
        return "Confirming...";
      }
      return config.buttonText;
    } else if (type === "withdraw_liquidity") {
      if (isWithdrawingLiquidity) {
        return "Withdrawing...";
      }
      if (isWithdrawLiquidityConfirming) {
        return "Confirming...";
      }
      return config.buttonText;
    } else if (type === "borrow") {
      if (isBorrowing) {
        return "Borrowing...";
      }
      if (isBorrowConfirming) {
        return "Confirming...";
      }
      return config.buttonText;
    }
    return config.buttonText;
  };

  // Get button color
  const getButtonColor = () => {
    if (type === "supply_collateral" || type === "supply_liquidity") {
      if (!isApproved) {
        return "default";
      }
      return config.buttonColor === "primary" ? "default" : "secondary";
    }
    return config.buttonColor === "primary" ? "default" : "secondary";
  };

  return (
    <div className="space-y-6">
      {/* Simple Wallet Connection Check */}
      {!isConnected ? (
        <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-500/40 rounded-xl p-6 shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-blue-200 mb-4">
                Please connect your wallet to interact with this pool
              </p>
              <ConnectButton client={thirdwebClient} />
            </div>
          </div>
        </div>
      ) : !isChainValid ? (
        <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-500/40 rounded-xl p-6 shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                Switch Network
              </h3>
              <p className="text-sm text-yellow-200">
                Please switch to Arbitrum Sepolia (Chain ID: {defaultChain})
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300 font-medium">{config.balanceLabel}</span>
            {/* Use real balance data for different actions */}
            {(type === "supply_collateral") ? (
              <UserWalletBalanceDisplay market={market} actionType={type} />
            ) : (type === "supply_liquidity") ? (
              <UserWalletBalanceDisplay market={market} actionType={type} />
            ) : (type === "withdraw_collateral") ? (
              <UserCollateralBalanceDisplay market={market} />
            ) : (type === "withdraw_liquidity") ? (
              <UserSupplyBalanceDisplay market={market} />
            ) : type === "borrow" ? (
              <UserBorrowBalanceDisplay market={market} />
            ) : (
              <span className="font-semibold text-white">
                {config.balanceValue(market)}
              </span>
            )}
          </div>
          
          {/* Show supplied amount for supply actions */}
          {(type === "supply_collateral") && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300 font-medium">Your Supplied Collateral</span>
              <UserCollateralBalanceDisplay market={market} />
            </div>
          )}
          
          {(type === "supply_liquidity") && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300 font-medium">Your Supplied Liquidity</span>
              <UserSupplyBalanceDisplay market={market} />
            </div>
          )}
          
          {/* Show current borrow for borrow action */}
          {type === "borrow" && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300 font-medium">Your Borrow</span>
              <UserCurrentBorrowDisplay market={market} />
            </div>
          )}
          
          {config.showApy && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300 font-medium">{config.apyLabel}</span>
              <span className={`font-semibold ${config.apyColor}`}>
                {config.apyValue ? config.apyValue(market) : "N/A"}
              </span>
            </div>
          )}
          {type === "borrow" && (
            <ChainSelector
              fromChain={etherlinkChain}
              toChainId={toChainId}
              setToChainId={setToChainId}
            />
          )}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-200">
              {config.inputLabel}
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 hover:border-blue-400/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-gray-100 rounded-xl px-4 py-3 pr-24 transition-all duration-200"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
                <span className="text-sm text-gray-300 font-medium">
                  {config.tokenSymbol(market)}
                </span>
                <button
                  type="button"
                  onClick={handleMaxClick}
                  disabled={type === "supply_liquidity" ? borrowWalletLoading : type === "supply_collateral" ? collateralWalletLoading : false}
                  className={`transition-colors flex items-center space-x-1 ${
                    type === "supply_liquidity" && borrowWalletLoading 
                      ? "text-gray-500 cursor-not-allowed" 
                      : "text-blue-400 hover:text-blue-300"
                  }`}
                  title="Set to maximum available amount"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-xs font-medium">MAX</span>
                </button>
              </div>
            </div>
          </div>
          <Button
            onClick={handleActionPress}
            disabled={isButtonDisabled()}
            variant={getButtonColor()}
            className={config.buttonClass}
          >
            {React.createElement(config.buttonIcon, { className: "mr-2 w-5 h-5" })}
            {getButtonText()}
          </Button>

          {/* Transaction Status Section */}
          {(type === "supply_collateral" ||
            type === "supply_liquidity" ||
            type === "withdraw_collateral" ||
            type === "withdraw_liquidity" ||
            type === "borrow") && (
            <div className="space-y-4">
              {/* Approval Transaction Status */}
              {(type === "supply_collateral" || type === "supply_liquidity") &&
                approveTxHash && (
                  <TransactionStatus
                    type="approve"
                    txHash={approveTxHash}
                    chainId={chainId}
                    isConfirming={isApproveConfirming}
                    isSuccess={isApproveSuccess}
                    isError={isApproveError}
                    errorMessage={approveWriteError?.message || approveConfirmError?.message}
                  />
                )}

              {/* Supply Transaction Status */}
              {(type === "supply_collateral" || type === "supply_liquidity") &&
                (supplyCollateralTxHash || supplyLiquidityTxHash) && (
                  <TransactionStatus
                    type="supply"
                    txHash={supplyCollateralTxHash || supplyLiquidityTxHash}
                    chainId={chainId}
                    isConfirming={
                      isSupplyCollateralConfirming || isSupplyLiquidityConfirming
                    }
                    isSuccess={isSupplyCollateralSuccess || isSupplyLiquiditySuccess}
                    isError={isSupplyCollateralError || isSupplyLiquidityError}
                    errorMessage={
                      supplyCollateralWriteError?.message ||
                      supplyCollateralConfirmError?.message ||
                      supplyLiquidityWriteError?.message ||
                      supplyLiquidityConfirmError?.message
                    }
                  />
                )}

              {/* Withdraw Collateral Transaction Status */}
              {type === "withdraw_collateral" && withdrawCollateralTxHash && (
                <TransactionStatus
                  type="withdraw"
                  txHash={withdrawCollateralTxHash}
                  chainId={chainId}
                  isConfirming={isWithdrawCollateralConfirming}
                  isSuccess={isWithdrawCollateralSuccess}
                  isError={isWithdrawCollateralError}
                  errorMessage={withdrawCollateralWriteError?.message || withdrawCollateralConfirmError?.message}
                />
              )}

              {/* Withdraw Liquidity Transaction Status */}
              {type === "withdraw_liquidity" && withdrawLiquidityTxHash && (
                <TransactionStatus
                  type="withdraw"
                  txHash={withdrawLiquidityTxHash}
                  chainId={chainId}
                  isConfirming={isWithdrawLiquidityConfirming}
                  isSuccess={isWithdrawLiquiditySuccess}
                  isError={isWithdrawLiquidityError}
                  errorMessage={withdrawLiquidityWriteError?.message || withdrawLiquidityConfirmError?.message}
                />
              )}

              {/* Borrow Transaction Status */}
              {type === "borrow" && borrowTxHash && (
                <TransactionStatus
                  type="borrow"
                  txHash={borrowTxHash}
                  chainId={chainId}
                  isConfirming={isBorrowConfirming}
                  isSuccess={isBorrowSuccess}
                  isError={isBorrowError}
                  errorMessage={borrowWriteError?.message || borrowConfirmError?.message}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 