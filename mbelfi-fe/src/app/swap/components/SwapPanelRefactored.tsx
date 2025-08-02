"use client";

import React from "react";
import { formatUnits } from "viem";
import { useSwapLogic } from "../hooks/useSwapLogic";
import PoolSelector from "./PoolSelector";
import TokenSelector from "./TokenSelector";
import SwapButton from "./SwapButton";
import SwapInfo from "./SwapInfo";
import WarningMessage from "./WarningMessage";
import { defaultChain } from "@/lib/get-default-chain";

export default function SwapPanelRefactored() {
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    slippage,
    lpAddress,
    lpAddressSelected,
    addressPosition,
    selectedCollateralToken,
    fromTokenBalance,
    toTokenBalance,
    userCollateral,
    priceExchangeRate,
    isLoading,
    error,
    setFromToken,
    setToToken,
    setFromAmount,
    setToAmount,
    setSlippage,
    setLpAddressSelected,
    tokenName,
    tokenLogo,
    switchTokens,
    formatExchangeRate,
    getButtonText,
    formatButtonClick,
    formatButtonClassName,
  } = useSwapLogic();

  const isPositionDisabled = !addressPosition || addressPosition === "0x0000000000000000000000000000000000000000";

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

  return (
    <div className="max-w-md mx-auto w-full px-2 py-2">
      {/* Pool Selector */}
      <PoolSelector
        lpAddress={lpAddress}
        lpAddressSelected={lpAddressSelected}
        setLpAddressSelected={setLpAddressSelected}
        addressPosition={addressPosition}
        tokenName={tokenName}
        tokenLogo={tokenLogo}
      />

      <div className="space-y-4 w-full">
        {/* Warning Message */}
        <WarningMessage
          show={isPositionDisabled && !!lpAddressSelected}
          message="You need to create a position first by supplying collateral and borrowing assets. Visit the Borrow page to get started."
          actionText="Borrow"
          onAction={() => window.open('/borrow', '_blank')}
        />

        {/* From Token */}
        <TokenSelector
          selectedToken={fromToken}
          onTokenChange={setFromToken}
          amount={fromAmount}
          onAmountChange={setFromAmount}
          balance={formatBalance(
            fromToken.name,
            fromToken.addresses[defaultChain],
            fromToken.decimals,
            Number(fromTokenBalance ?? 0)
          ).toString()}
          label="From"
          disabled={isPositionDisabled}
          tokenName={tokenName}
          tokenLogo={tokenLogo}
        />

        {/* Switch Button */}
        <SwapButton
          onSwitch={switchTokens}
          disabled={isPositionDisabled}
        />

        {/* To Token */}
        <TokenSelector
          selectedToken={toToken}
          onTokenChange={setToToken}
          amount={toAmount}
          onAmountChange={setToAmount}
          balance={formatBalance(
            toToken.name,
            toToken.addresses[defaultChain],
            toToken.decimals,
            Number(toTokenBalance ?? 0)
          ).toString()}
          label="To"
          readOnly
          disabled={isPositionDisabled}
          tokenName={tokenName}
          tokenLogo={tokenLogo}
        />

        {/* Swap Info */}
        <SwapInfo
          exchangeRate={formatExchangeRate(priceExchangeRate)}
          slippage={slippage}
          onSlippageChange={setSlippage}
          disabled={isPositionDisabled}
        />

        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/30">
            {error}
          </div>
        )}

        {/* Swap Button */}
        <button 
          onClick={formatButtonClick} 
          className={formatButtonClassName()}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
