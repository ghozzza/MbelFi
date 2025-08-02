"use client";
import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { factoryAbi } from "@/lib/abis/factoryAbi";
import { chains } from "@/constants/chainAddress";
import { defaultChain } from "@/lib/get-default-chain";
import { toast } from "sonner";

export type HexAddress = `0x${string}`;

export const useCreatePool = (onSuccess?: () => void) => {
  const [collateralToken, setCollateralToken] = useState<string>("");
  const [borrowToken, setBorrowToken] = useState<string>("");
  const [ltv, setLtv] = useState("");
  const [txHash, setTxHash] = useState<HexAddress | undefined>();
  const [isCreating, setIsCreating] = useState(false);

  const {
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess();
      setIsCreating(false);
      setTxHash(undefined);
    }
  }, [isSuccess, onSuccess]);

  // Handle transaction confirmation error
  useEffect(() => {
    if (isError && confirmError) {
      setIsCreating(false);
      setTxHash(undefined);
    }
  }, [isError, confirmError]);

  // Handle write error
  useEffect(() => {
    if (writeError) {
      setIsCreating(false);
    }
  }, [writeError]);

  const handleCreate = async (
    collateralTokenAddress: string,
    borrowTokenAddress: string,
    ltvValue: string
  ) => {
    const chain = chains.find((c) => c.id === defaultChain);

    if (!chain || !chain.contracts.factory) {
      toast.error("Factory contract not configured");
      return;
    }

    // Check for empty or invalid values
    if (!collateralTokenAddress || collateralTokenAddress === "") {
      toast.error("Collateral token is required");
      return;
    }

    if (!borrowTokenAddress || borrowTokenAddress === "") {
      toast.error("Borrow token is required");
      return;
    }

    if (!ltvValue || ltvValue === "") {
      toast.error("LTV is required");
      return;
    }

    const ltvFloat = parseFloat(ltvValue);
    if (isNaN(ltvFloat) || ltvFloat <= 0) {
      toast.error("LTV must be a valid number greater than 0");
      return;
    }

    try {
      setIsCreating(true);
      setTxHash(undefined);

      const ltvBigInt = BigInt(Math.floor(ltvFloat * 1e16));

      const tx = await writeContractAsync({
        address: chain.contracts.factory as HexAddress,
        abi: factoryAbi,
        functionName: "createLendingPool",
        args: [collateralTokenAddress as HexAddress, borrowTokenAddress as HexAddress, ltvBigInt],
      });

      setTxHash(tx as HexAddress);
    } catch (err) {
      setIsCreating(false);
      toast.error("Transaction submit error:");
    }
  };

  return {
    setCollateralToken,
    setBorrowToken,
    setLtv,
    handleCreate,
    isCreating: isCreating || isWritePending,
    isConfirming,
    isSuccess,
    isError,
    txHash,
    writeError,
    confirmError,
  };
};
