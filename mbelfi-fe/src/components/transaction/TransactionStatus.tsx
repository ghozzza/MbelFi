import { ExternalLink } from "lucide-react";
import { getBlockExplorerUrl } from "@/lib/utils/blockExplorer";

interface TransactionStatusProps {
  type: "approve" | "supply" | "borrow" | "withdraw";
  txHash?: string;
  chainId: number;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  errorMessage?: string;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  type,
  txHash,
  chainId,
  isConfirming,
  isSuccess,
  isError,
  errorMessage,
}) => {
  if (!txHash && !isSuccess && !isError) return null;

  const getStatusConfig = () => {
    switch (type) {
      case "approve":
        return {
          bgColor: "from-blue-900/30 to-blue-800/20",
          borderColor: "border-blue-500/40",
          dotColor: "bg-blue-400",
          textColor: "text-blue-300",
          status: isConfirming
            ? "Approving Token..."
            : isSuccess
            ? "Token Approved ✓"
            : "Approval Pending",
        };
      case "supply":
        return {
          bgColor: "from-green-900/30 to-green-800/20",
          borderColor: "border-green-500/40",
          dotColor: "bg-green-400",
          textColor: "text-green-300",
          status: isConfirming
            ? "Supplying..."
            : isSuccess
            ? "Supply Success ✓"
            : "Supply Pending",
        };
      case "borrow":
        return {
          bgColor: "from-purple-900/30 to-purple-800/20",
          borderColor: "border-purple-500/40",
          dotColor: "bg-purple-400",
          textColor: "text-purple-300",
          status: isConfirming
            ? "Borrowing..."
            : isSuccess
            ? "Borrow Successful ✓"
            : "Borrow Pending",
        };
      case "withdraw":
        return {
          bgColor: "from-orange-900/30 to-orange-800/20",
          borderColor: "border-orange-500/40",
          dotColor: "bg-orange-400",
          textColor: "text-orange-300",
          status: isConfirming
            ? "Withdrawing..."
            : isSuccess
            ? "Withdraw Successful ✓"
            : "Withdraw Pending",
        };
    }
  };

  const config = getStatusConfig();

  if (isError) {
    return (
      <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/40 rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/30"></div>
          <span className="text-sm text-red-300 font-semibold">
            Transaction Failed
          </span>
        </div>
        <div className="mt-3 text-xs text-red-200 bg-gray-800/50 rounded-lg px-3 py-2">
          <span className="flex-1">{errorMessage || "Transaction failed"}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-r ${config.bgColor} border ${config.borderColor} rounded-xl p-4 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 ${config.dotColor} rounded-full animate-pulse shadow-lg shadow-${config.dotColor}/30`}
          ></div>
          <span className={`text-sm ${config.textColor} font-semibold`}>
            {config.status}
          </span>
        </div>
        {txHash && (
          <a
            href={getBlockExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${config.textColor} hover:text-${config.textColor.replace(
              "text-",
              ""
            )}-200 underline font-medium transition-colors duration-200`}
          >
            View on Explorer
          </a>
        )}
      </div>
      {txHash && (
        <div className="mt-3 text-xs text-gray-300 font-mono bg-gray-800/50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between">
            <code className="text-slate-200">
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </code>
            <a
              href={getBlockExplorerUrl(chainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#01ECBE] hover:text-[#01ECBE]/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}; 