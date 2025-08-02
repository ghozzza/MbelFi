"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Hash,
  Calendar,
  Coins,
  Activity,
  User,
  Building
} from "lucide-react";
import { Transaction } from "@/hooks/useGoldskyHistory";

interface TransactionCardProps {
  transaction: Transaction;
  onViewDetails?: (transaction: Transaction) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onViewDetails,
}) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: string, decimals: number = 18) => {
    const numValue = parseFloat(value) / Math.pow(10, decimals);
    return numValue.toFixed(6);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "supply_liquidity":
      case "supply_collateral":
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case "withdraw_liquidity":
        return <ArrowUpRight className="w-4 h-4 text-blue-400" />;
      case "borrow_debt":
        return <ArrowUpRight className="w-4 h-4 text-yellow-400" />;
      case "repay_collateral":
        return <ArrowDownLeft className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "success" ? (
      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getMethodBadge = (type: string) => {
    switch (type) {
      case "supply_liquidity":
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Supply Liquidity</Badge>;
      case "withdraw_liquidity":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Withdraw Liquidity</Badge>;
      case "borrow_debt":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Borrow Debt</Badge>;
      case "repay_collateral":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Repay Collateral</Badge>;
      case "supply_collateral":
        return <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Supply Collateral</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Other</Badge>;
    }
  };

  const openBlockExplorer = (hash: string, chainId: number) => {
    const explorerUrl = chainId === 421614 ? 
      `https://sepolia.arbiscan.io/tx/${hash}` : 
      chainId === 11155111 ?
      `https://sepolia.etherscan.io/tx/${hash}` :
      `https://etherscan.io/tx/${hash}`;
    window.open(explorerUrl, '_blank');
  };

  const getTransactionType = (type: string) => {
    switch (type) {
      case "supply_liquidity":
        return "Supply Liquidity";
      case "withdraw_liquidity":
        return "Withdraw Liquidity";
      case "borrow_debt":
        return "Borrow Debt";
      case "repay_collateral":
        return "Repay Collateral";
      case "supply_collateral":
        return "Supply Collateral";
      default:
        return "Transaction";
    }
  };

  const getAssetInfo = (asset: string) => {
    // Since we don't have collateral/borrow token info, we'll use a generic approach
    return { symbol: "TOKEN", name: "Token" };
  };

  const assetInfo = getAssetInfo(transaction.asset);

  return (
    <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Transaction Icon */}
            <div className="flex-shrink-0">
              {getTransactionIcon(transaction.type)}
            </div>

            {/* Transaction Details */}
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-white text-lg">
                  {getTransactionType(transaction.type)}
                </h3>
                {getMethodBadge(transaction.type)}
                {getStatusBadge(transaction.status)}
              </div>

              {/* Transaction Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Hash className="w-4 h-4" />
                    <span>Hash:</span>
                    <span className="text-white font-mono">{formatAddress(transaction.transactionHash)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Activity className="w-4 h-4" />
                    <span>Block:</span>
                    <span className="text-white">{transaction.blockNumber}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Time:</span>
                    <span className="text-white">{formatTimestamp(transaction.timestamp)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-400">
                    <User className="w-4 h-4" />
                    <span>User:</span>
                    <span className="text-white font-mono">{formatAddress(transaction.user.id)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Coins className="w-4 h-4" />
                    <span>Amount:</span>
                    <span className="text-white">
                      {formatValue(transaction.amount)} {assetInfo.symbol}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Building className="w-4 h-4" />
                    <span>Pool:</span>
                    <span className="text-white font-mono">{formatAddress(transaction.pool.id)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Coins className="w-4 h-4" />
                    <span>Asset:</span>
                    <span className="text-white font-mono">{formatAddress(transaction.asset)}</span>
                  </div>

                  {/* Additional fields based on transaction type */}
                  {transaction.onBehalfOf && (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <User className="w-4 h-4" />
                      <span>On Behalf Of:</span>
                      <span className="text-white font-mono">{formatAddress(transaction.onBehalfOf)}</span>
                    </div>
                  )}

                  {transaction.to && (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>To:</span>
                      <span className="text-white font-mono">{formatAddress(transaction.to)}</span>
                    </div>
                  )}

                  {transaction.repayer && (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <User className="w-4 h-4" />
                      <span>Repayer:</span>
                      <span className="text-white font-mono">{formatAddress(transaction.repayer)}</span>
                    </div>
                  )}

                  {transaction.borrowRate && (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Activity className="w-4 h-4" />
                      <span>Borrow Rate:</span>
                      <span className="text-white">{transaction.borrowRate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pool Information */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Pool: {formatAddress(transaction.pool.id)}</div>
                <div>Asset: {formatAddress(transaction.asset)}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBlockExplorer(transaction.transactionHash, transaction.chainId)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(transaction)}
                className="border-blue-600 text-blue-300 hover:bg-blue-700 hover:text-white"
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 