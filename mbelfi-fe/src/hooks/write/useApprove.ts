"use client";
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { mockErc20Abi } from "@/lib/abis/mockErc20Abi";
import { chains } from "@/constants/chainAddress";

export type HexAddress = `0x${string}`;

export const useApprove = (chainId: number, decimals: number, onSuccess?: () => void) => {
  const { address } = useAccount();

  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<HexAddress | undefined>();
  const [successTxHash, setSuccessTxHash] = useState<HexAddress | undefined>();
  const [isApproving, setIsApproving] = useState(false);

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
      setIsApproving(false);
      setSuccessTxHash(txHash);
      setTxHash(undefined);
      toast.success("Token approved successfully!", {
        description: "You can now proceed with your transaction.",
        duration: 5000,
        style: {
          background: 'rgba(34, 197, 94, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#86efac',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)'
        }
      });
    }
  }, [isSuccess, onSuccess, txHash]);

  // Handle transaction confirmation error
  useEffect(() => {
    if (isError && confirmError) {

      toast.error("Approval failed to confirm", {
        description: confirmError.message || "Please try again.",
        duration: 5000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      setIsApproving(false);
      setTxHash(undefined);
    }
  }, [isError, confirmError]);

  // Handle write error
  useEffect(() => {
    if (writeError) {

      toast.error("Approval failed to submit", {
        description: writeError.message || "Please check your wallet and try again.",
        duration: 5000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      setIsApproving(false);
    }
  }, [writeError]);

  const handleApprove = async (tokenAddress: HexAddress, spenderAddress: HexAddress) => {
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

    const chain = chains.find((c) => c.id === chainId);
    if (!chain) {
      toast.error("Unsupported chain", {
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

    if (!amount || parseFloat(amount) <= 0) {
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

    try {
      setIsApproving(true);
      setTxHash(undefined);

      // Convert amount to BigInt with proper decimal conversion
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));



      const tx = await writeContractAsync({
        address: tokenAddress,
        abi: mockErc20Abi,
        functionName: "approve",
        args: [spenderAddress, amountBigInt],
      });

      setTxHash(tx as HexAddress);
      toast.success("Approval transaction submitted!", {
        description: "Waiting for confirmation on the blockchain...",
        duration: 5000,
        style: {
          background: 'rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#93c5fd',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)'
        }
      });
    } catch (err) {
      toast.error("Transaction failed to submit", {
        description: "Please check your wallet and try again.",
        duration: 5000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
        }
      });
      setIsApproving(false);
    }
  };

  return {
    setAmount,
    handleApprove,
    isApproving: isApproving || isWritePending,
    isConfirming,
    isSuccess,
    isError,
    txHash: txHash || successTxHash,
    writeError,
    confirmError,
  };
}; 