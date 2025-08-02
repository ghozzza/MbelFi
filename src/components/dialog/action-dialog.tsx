import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { EnrichedPool } from "@/lib/pair-token-address";
import { useSupplyCollateral } from "@/hooks/write/useSupplyCollateral";
import { useSupplyLiquidity } from "@/hooks/write/useSupplyLiquidity";
import { useApprove } from "@/hooks/write/useApprove";
import { useBorrow } from "@/hooks/write/useBorrow";
import { toast } from "sonner";
import { actionConfig, ActionType } from "@/constants/actionConfig";
import { useActionLogic } from "@/hooks/useActionLogic";
import { TransactionStatus } from "@/components/transaction/TransactionStatus";
import { ChainSelector } from "@/components/chain/ChainSelector";
import { useChainId } from "wagmi";

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
    toChain?.id
  );

  const config = actionConfig[type];

  // Handle amount change
  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (type === "supply_collateral") {
      const amountToSet = value === "max" ? "2.5" : value;
      setApproveAmount(amountToSet);
      setSupplyCollateralAmount(amountToSet);
    } else if (type === "supply_liquidity") {
      const amountToSet = value === "max" ? "1000" : value;
      setApproveAmount(amountToSet);
      setSupplyLiquidityAmount(amountToSet);
    } else if (type === "borrow") {
      const amountToSet = value === "max" ? "500" : value;
      setBorrowAmount(amountToSet);
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
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-300 font-medium">{config.balanceLabel}</span>
        <span className="font-semibold text-white">
          {config.balanceValue(market)}
        </span>
      </div>
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
              onClick={() => {
                navigator.clipboard.writeText(
                  config.tokenSymbol(market) || ""
                );
                toast.success("Token symbol copied to clipboard!");
              }}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Copy className="w-4 h-4" />
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
    </div>
  );
} 