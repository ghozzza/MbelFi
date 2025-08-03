import { chains } from "@/constants/chainAddress";
import { helperAddress, tokens } from "@/constants/tokenAddress";
import { positionAbi } from "@/lib/abis/positionAbi";
import { helperAbi } from "@/lib/abis/helperAbi";
import { defaultChain } from "@/lib/get-default-chain";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { useEffect } from "react";

export const useTokenCalculator = (
  tokenIn: Address,
  tokenOut: Address,
  amountIn: number,
  addressPosition: Address
) => {
  // Debug: Log input parameters
  console.log("🔍 useTokenCalculator Debug:", {
    tokenIn,
    tokenOut,
    amountIn,
    addressPosition,
    defaultChain,
  });

  const decimalsIn = tokens.find(
    (token) => token.addresses[defaultChain] === tokenIn
  )?.decimals;
  const decimalsOut = tokens.find(
    (token) => token.addresses[defaultChain] === tokenOut
  )?.decimals;

  // Debug: Log token lookup results
  console.log("🔍 Token Lookup Debug:", {
    decimalsIn,
    decimalsOut,
    tokenInFound: tokens.find((token) => token.addresses[defaultChain] === tokenIn),
    tokenOutFound: tokens.find((token) => token.addresses[defaultChain] === tokenOut),
    allTokens: tokens.map(t => ({ symbol: t.symbol, address: t.addresses[defaultChain] }))
  });

  const amountInBigInt = BigInt(Math.round(amountIn * 10 ** (decimalsIn ?? 0)));
  const tokenInPrice = tokens.find(
    (token) => token.addresses[defaultChain] === tokenIn
  )?.priceFeed[defaultChain] as Address;
  const tokenOutPrice = tokens.find(
    (token) => token.addresses[defaultChain] === tokenOut
  )?.priceFeed[defaultChain] as Address;

  // Debug: Log calculated values
  console.log("🔍 Calculated Values Debug:", {
    amountInBigInt: amountInBigInt.toString(),
    tokenInPrice,
    tokenOutPrice,
    amountInWithDecimals: amountIn * 10 ** (decimalsIn ?? 0),
    rawAmountIn: amountIn
  });

  const {
    data: price,
    isLoading,
    error,
  } = useReadContract({
    address: helperAddress,
    abi: helperAbi,
    functionName: "getExchangeRate",
    args: [tokenIn, tokenOut, amountInBigInt, addressPosition],
  });

  // Debug: Log contract call results
  console.log("🔍 Contract Call Debug:", {
    contractAddress: helperAddress,
    functionName: "getExchangeRate",
    args: [tokenIn, tokenOut, amountInBigInt.toString(), addressPosition],
    price: price ? price.toString() : null,
    isLoading,
    error: error ? {
      name: error.name,
      message: error.message,
      cause: error.cause
    } : null
  });

  const calculatedPrice = price ? Number(price) / 10 ** (decimalsOut ?? 0) : 0;

  // Debug: Log final calculation
  console.log("🔍 Final Calculation Debug:", {
    rawPrice: price ? price.toString() : null,
    decimalsOut,
    calculatedPrice,
    priceWithDecimals: price ? Number(price) : null,
    divisionResult: price ? Number(price) / 10 ** (decimalsOut ?? 0) : 0
  });

  // Debug: Monitor hook lifecycle
  useEffect(() => {
    console.log("🔍 useTokenCalculator Hook Lifecycle:", {
      tokenIn,
      tokenOut,
      amountIn,
      addressPosition,
      isLoading,
      hasError: !!error,
      calculatedPrice
    });
  }, [tokenIn, tokenOut, amountIn, addressPosition, isLoading, error, calculatedPrice]);

  return {
    price: calculatedPrice,
    isLoading: isLoading,
    error: error,
  };
};
