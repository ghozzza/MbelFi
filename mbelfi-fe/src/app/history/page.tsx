"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  ExternalLink, 
  Clock, 
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Wallet
} from "lucide-react";
import { useGoldskyHistory, Transaction } from "@/hooks/useGoldskyHistory";
import { TransactionCard } from "@/components/transaction/TransactionCard";

const HistoryPage: React.FC = () => {
  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!account;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");

  // Debug wallet connection
  useEffect(() => {
    console.log("=== WALLET CONNECTION DEBUG ===");
    console.log("isConnected:", isConnected);
    console.log("address:", address);
    console.log("account:", account);
    console.log("================================");
  }, [isConnected, address, account]);

  const {
    transactions,
    loading,
    error,
    hasMore,
    currentPage,
    fetchTransactions,
    refreshTransactions,
  } = useGoldskyHistory({ pageSize: 20, autoFetch: isConnected && !!address });

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      const matchesSearch = 
        tx.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.methodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.pool.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || tx.status === filterStatus;
      const matchesType = filterType === "all" || tx.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "timestamp":
          return parseInt(b.timestamp) - parseInt(a.timestamp);
        case "amount":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "blockNumber":
          return parseInt(b.blockNumber) - parseInt(a.blockNumber);
        default:
          return parseInt(b.timestamp) - parseInt(a.timestamp);
      }
    });

    return filtered;
  }, [transactions, searchTerm, filterStatus, filterType, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    const successful = filteredAndSortedTransactions.filter(tx => tx.status === "success").length;
    const failed = total - successful;
    const totalValue = filteredAndSortedTransactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount || "0");
    }, 0);

    // Calculate transaction type breakdown
    const typeBreakdown = filteredAndSortedTransactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : "0",
      totalValue: (totalValue / Math.pow(10, 18)).toFixed(6),
      typeBreakdown,
    };
  }, [filteredAndSortedTransactions]);

  const handleViewDetails = (transaction: Transaction) => {
    // You can implement a modal or navigation to detailed view
    console.log("View details for transaction:", transaction);
  };

  const handleLoadMore = () => {
    fetchTransactions(currentPage + 1, true);
  };

  // Show wallet connection required message
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen md:p-8 mt-20">
        <div className="mx-auto max-w-4xl space-y-8 mt-5">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Wallet className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Wallet Connection Required</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Please connect your wallet to view your personal transaction history. 
              This page only shows transactions for the currently connected wallet address.
            </p>
            
            {/* Debug Information */}
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/40 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">Debug Info:</h3>
              <div className="text-sm text-yellow-200 space-y-1 text-left">
                <div>Is Connected: {isConnected ? "Yes" : "No"}</div>
                <div>Address: {address || "None"}</div>
                <div>Account: {account ? "Present" : "None"}</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/40 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-2">What you'll see:</h3>
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li>• Your supply liquidity transactions</li>
                <li>• Your withdraw liquidity transactions</li>
                <li>• Your borrow debt transactions</li>
                <li>• Your repay collateral transactions</li>
                <li>• Your supply collateral transactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:p-8 mt-20">
      <div className="mx-auto max-w-6xl space-y-8 mt-5">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Your Transaction History</h1>
          <p className="text-gray-400">
            View all your lending pool transactions for address: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          
          {/* Debug Information for Connected State */}
          <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-green-300 mb-2">Wallet Connected ✓</h3>
            <div className="text-sm text-green-200 space-y-1">
              <div>Address: {address}</div>
              <div>Transactions Found: {transactions.length}</div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border-blue-500/40">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-blue-300">Total Transactions</p>
                  <p className="text-xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-900/30 to-green-800/20 border-green-500/40">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-green-300">Success Rate</p>
                  <p className="text-xl font-bold text-white">{stats.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-yellow-500/40">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm text-yellow-300">Successful</p>
                  <p className="text-xl font-bold text-white">{stats.successful}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-500/40">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm text-red-300">Failed</p>
                  <p className="text-xl font-bold text-white">{stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Type Breakdown */}
        {Object.keys(stats.typeBreakdown).length > 0 && (
          <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Your Transaction Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <p className="text-sm text-gray-400 capitalize">
                      {type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xl font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search your transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white"
                />
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="supply_liquidity">Supply Liquidity</SelectItem>
                  <SelectItem value="withdraw_liquidity">Withdraw Liquidity</SelectItem>
                  <SelectItem value="borrow_debt">Borrow Debt</SelectItem>
                  <SelectItem value="repay_collateral">Repay Collateral</SelectItem>
                  <SelectItem value="supply_collateral">Supply Collateral</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="timestamp">Latest First</SelectItem>
                  <SelectItem value="amount">Highest Amount</SelectItem>
                  <SelectItem value="blockNumber">Block Number</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button
                onClick={refreshTransactions}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-500/40">
            <CardContent className="p-4">
              <p className="text-red-300 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <div className="space-y-4">
          {loading && transactions.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400 mb-4" />
              <p className="text-gray-400">Loading your transactions...</p>
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No transactions found for your wallet</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure you have performed lending pool transactions with this wallet address.
              </p>
            </div>
          ) : (
            <>
              {filteredAndSortedTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onViewDetails={handleViewDetails}
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;