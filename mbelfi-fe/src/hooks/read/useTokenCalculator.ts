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
  const decimalsIn = tokens.find(
    (token) => token.addresses[defaultChain] === tokenIn
  )?.decimals;
  const decimalsOut = tokens.find(
    (token) => token.addresses[defaultChain] === tokenOut
  )?.decimals;

  const amountInBigInt = BigInt(Math.round(amountIn * 10 ** (decimalsIn ?? 0)));
  const tokenInPrice = tokens.find(
    (token) => token.addresses[defaultChain] === tokenIn
  )?.priceFeed[defaultChain] as Address;
  const tokenOutPrice = tokens.find(
    (token) => token.addresses[defaultChain] === tokenOut
  )?.priceFeed[defaultChain] as Address;

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

  const calculatedPrice = price ? Number(price) / 10 ** (decimalsOut ?? 0) : 0;

  // Debug: Monitor hook lifecycle
  useEffect(() => {}, [
    tokenIn,
    tokenOut,
    amountIn,
    addressPosition,
    isLoading,
    error,
    calculatedPrice,
  ]);

  return {
    price: calculatedPrice,
    isLoading: isLoading,
    error: error,
  };
};
