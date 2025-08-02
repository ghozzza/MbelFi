"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, Address } from "viem";
import { lendingPoolAbi } from "@/lib/abis/lendingPoolAbi";
import { toast } from "sonner";

interface SwapTokenParams {
  fromToken: {
    address: `0x${string}`;
    name: string;
    decimals: number;
  };
  toToken: {
    address: `0x${string}`;
    name: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  positionAddress: Address;
  lendingPoolAddress: Address;
}

export const useSwapToken = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  onSuccess,
  onError,
  positionAddress,
  lendingPoolAddress,
}: SwapTokenParams) => {
  const { address } = useAccount();
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const {
    writeContractAsync,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle success
  useEffect(() => {
    if (isSuccess && txHash) {
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [isSuccess, txHash]); // Remove onSuccess from dependencies

  // Handle error
  useEffect(() => {
    if (isError && confirmError) {
      if (onError) {
        onError(confirmError);
      }
    }
  }, [isError, confirmError]); // Remove onError from dependencies

  const swapToken = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setError("");
      setTxHash(undefined);

      const amountIn = parseUnits(fromAmount, fromToken.decimals);

      const tx = await writeContractAsync({
        address: lendingPoolAddress,
        abi: lendingPoolAbi,
        functionName: "swapTokenByPosition",
        args: [fromToken.address, toToken.address, BigInt(amountIn)],
      });

      if (tx) {
        setTxHash(tx);
      }
    } catch (err) {
      console.error("Error during swap:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to execute swap. Please try again.";
      setError(errorMessage);

      if (onError && err instanceof Error) {
        onError(err);
      }

      throw err;
    }
  };

  return {
    swapToken,
    isLoading: isWritePending,
    isConfirming,
    isSuccess,
    isError,
    txHash,
    error,
    setError,
  };
};
