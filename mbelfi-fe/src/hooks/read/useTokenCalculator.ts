import { chains } from "@/constants/chainAddress";
import { tokens } from "@/constants/tokenAddress";
import { positionAbi } from "@/lib/abis/positionAbi";
import { defaultChain } from "@/lib/get-default-chain";
import { Address } from "viem";
import { useReadContract } from "wagmi";

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
  const amountInBigInt = BigInt(amountIn * 10 ** (decimalsIn ?? 0));
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
    address: addressPosition,
    abi: positionAbi,
    functionName: "tokenCalculator",
    args: [tokenIn, tokenOut, amountInBigInt, tokenInPrice, tokenOutPrice],
  });

  return {
    price: price ? Number(price) / 10 ** (decimalsOut ?? 0) : 0,
    isLoading: isLoading,
    error: error,
  };
};
