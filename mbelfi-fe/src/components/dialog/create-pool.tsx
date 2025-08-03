import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, PlusCircle, CheckCircle, AlertCircle, AlertTriangle, ExternalLink } from "lucide-react";
import React from "react";
import { tokens as tokenList } from "@/constants/tokenAddress";
import { chains } from "@/constants/chainAddress";
import Image from "next/image";
import { useCreatePool } from "@/hooks/write/useCreatePool";
import { defaultChain } from "@/lib/get-default-chain";
import { useAccount, useChainId } from "wagmi";
import { toast } from "sonner";
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";

interface CreatePoolDialogProps {
  open: boolean;
  onClose: () => void;
  onPoolCreated?: () => void;
}

// Helper function to get block explorer URL from chain constants
const getBlockExplorerUrl = (chainId: number, txHash: string) => {
  const chain = chains.find((c) => c.id === chainId);
  if (!chain || !chain.contracts.blockExplorer) {
    return `https://testnet.explorer.etherlink.com/tx/${txHash}`; // fallback
  }
  return `${chain.contracts.blockExplorer}/tx/${txHash}`;
};

export const CreatePoolDialog: React.FC<CreatePoolDialogProps> = ({
  open,
  onClose,
  onPoolCreated,
}) => {
  const [formData, setFormData] = React.useState({
    loanToken: "",
    collateralToken: "",
    ltv: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const tokens = tokenList;
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();

  const {
    setCollateralToken: setHookCollateralToken,
    setBorrowToken: setHookBorrowToken,
    setLtv: setHookLtv,
    handleCreate,
    isCreating,
    isConfirming,
    isSuccess: hookIsSuccess,
    isError,
    txHash,
    writeError,
    confirmError,
  } = useCreatePool(() => {
    // Show success state without immediately resetting
    setIsSuccess(true);
    // Don't reset form immediately, let user see the success state
    onPoolCreated?.();
  });

  // Store the transaction hash when it's available
  const [storedTxHash, setStoredTxHash] = React.useState<string | undefined>();

  // Update stored transaction hash when txHash changes
  React.useEffect(() => {
    if (txHash) {
      setStoredTxHash(txHash);
    }
  }, [txHash]);

  const resetForm = () => {
    setFormData({ loanToken: "", collateralToken: "", ltv: "" });
    setError(null);
    setIsSuccess(false);
    setStoredTxHash(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSuccess(false);

    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (connectedChainId !== defaultChain) {
      setError(`Please switch to Etherlink Testnet (Chain ID: ${defaultChain})`);
      return;
    }

    const borrowTokenData = tokens.find((t) => t.symbol === formData.loanToken);
    const collateralTokenData = tokens.find(
      (t) => t.symbol === formData.collateralToken
    );

    const borrowTokenAddress = borrowTokenData?.addresses[defaultChain];
    const collateralTokenAddress = collateralTokenData?.addresses[defaultChain];

    try {
      await handleCreate(
        collateralTokenAddress as `0x${string}`,
        borrowTokenAddress as `0x${string}`,
        formData.ltv
      );
    } catch (err: any) {
      toast.error("Failed to create pool", {
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
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderTokenOption = (token: any) => (
    <div className="flex items-center gap-3">
      <Image
        src={token.logo}
        alt={token.symbol}
        width={24}
        height={24}
        className="rounded-full ring-1 ring-gray-500/30"
      />
      <span className="font-medium">{token.symbol}</span>
    </div>
  );

  const renderStatusMessage = () => {
    // Use stored transaction hash if available, otherwise use current txHash
    const displayTxHash = storedTxHash || txHash;

    if (hookIsSuccess) {
      return (
        <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/30"></div>
              <span className="text-sm text-green-300 font-semibold">
                Pool Created Successfully! ✓
              </span>
            </div>
            {displayTxHash && (
              <a
                href={getBlockExplorerUrl(connectedChainId, displayTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-300 hover:text-green-200 underline font-medium transition-colors duration-200 flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="mt-3 text-xs text-green-200 bg-gray-800/50 rounded-lg px-3 py-2">
            Your lending pool has been created and is now available for use.
          </div>
          {displayTxHash && (
            <div className="mt-3 text-xs text-gray-300 font-mono bg-gray-800/50 rounded-lg px-3 py-2">
              {displayTxHash.slice(0, 6)}...{displayTxHash.slice(-4)}
            </div>
          )}
        </div>
      );
    }

    if (isCreating || isConfirming) {
      return (
        <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/30"></div>
              <span className="text-sm text-blue-300 font-semibold">
                {isCreating ? "Creating Pool..." : "Confirming Transaction..."}
              </span>
            </div>
            {displayTxHash && (
              <a
                href={getBlockExplorerUrl(connectedChainId, displayTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-300 hover:text-blue-200 underline font-medium transition-colors duration-200 flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {displayTxHash && (
            <div className="mt-3 text-xs text-gray-300 font-mono bg-gray-800/50 rounded-lg px-3 py-2">
              {displayTxHash.slice(0, 6)}...{displayTxHash.slice(-4)}
            </div>
          )}
        </div>
      );
    }

    if (writeError || confirmError) {
      return (
        <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/30"></div>
            <span className="text-sm text-red-300 font-semibold">Transaction Failed</span>
          </div>
          <div className="mt-3 text-xs text-red-200 bg-gray-800/50 rounded-lg px-3 py-2">
            {writeError?.message || confirmError?.message || "Transaction failed"}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/30"></div>
            <span className="text-sm text-yellow-300 font-semibold">{error}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  const isFormValid =
    formData.loanToken && formData.collateralToken && formData.ltv;
  const isChainValid = connectedChainId === defaultChain;
  const canSubmit =
    isConnected &&
    isChainValid &&
    isFormValid &&
    !isCreating &&
    !isConfirming &&
    !hookIsSuccess;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="bg-gray-900 text-gray-100 border border-cyan-800 max-w-lg md:max-w-xl lg:max-w-2xl w-full mx-2 md:mx-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <PlusCircle className="text-blue-400 w-6 h-6" />
            <DialogTitle className="text-2xl font-bold text-blue-400">
              Create New Pool
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 pb-4 pt-2">
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
                    Please connect your wallet to create a new pool
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
                    Please switch to Etherlink Testnet (Chain ID: {defaultChain})
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Token Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Borrow Token
                  </label>
                  <Select
                    value={formData.loanToken}
                    onValueChange={(value) => updateFormData("loanToken", value)}
                  >
                    <SelectTrigger className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 hover:border-blue-400/60 text-gray-100 rounded-xl px-4 py-3 shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                      <SelectValue placeholder="Select borrow token" className="text-gray-200" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-xl z-[1000] max-h-60">
                      {tokens.map((token) => (
                        <SelectItem 
                          key={token.symbol} 
                          value={token.symbol}
                          className="text-gray-200 hover:bg-gray-700/50 focus:bg-gray-700/50 rounded-lg mx-1 my-0.5 transition-colors duration-150"
                        >
                          {renderTokenOption(token)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Collateral Token
                  </label>
                  <Select
                    value={formData.collateralToken}
                    onValueChange={(value) => updateFormData("collateralToken", value)}
                  >
                    <SelectTrigger className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 hover:border-blue-400/60 text-gray-100 rounded-xl px-4 py-3 shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                      <SelectValue placeholder="Select collateral token" className="text-gray-200" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-xl z-[1000] max-h-60">
                      {tokens.map((token) => (
                        <SelectItem 
                          key={token.symbol} 
                          value={token.symbol}
                          className="text-gray-200 hover:bg-gray-700/50 focus:bg-gray-700/50 rounded-lg mx-1 my-0.5 transition-colors duration-150"
                        >
                          {renderTokenOption(token)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* LTV Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  LTV Ratio (%)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  step="1"
                  placeholder="80"
                  value={formData.ltv}
                  onChange={(e) => updateFormData("ltv", e.target.value)}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 hover:border-blue-400/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 text-gray-100 rounded-xl px-4 py-3 transition-all duration-200"
                />
              </div>

              {/* Status Messages */}
              {renderStatusMessage()}

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full md:w-auto rounded-xl px-6 py-3 transition-all duration-200"
                  onClick={handleClose}
                  disabled={isCreating || isConfirming}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200 px-6"
                  onClick={canSubmit ? handleSubmit : undefined}
                  disabled={!canSubmit}
                >
                  {isCreating || isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Pool...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 w-5 h-5" />
                      Create Pool
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
