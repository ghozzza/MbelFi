"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useGoldskyHistory, Transaction } from "@/hooks/useGoldskyHistory";
import { TransactionCard } from "@/components/transaction/TransactionCard";
import {
  HistoryHeader,
  HistoryStats,
  TransactionTypeBreakdown,
  HistoryFilters,
  HistoryPagination,
  HistoryEmptyState,
  HistoryLoadingState,
  HistoryLoadMore,
  WalletConnectionRequired,
} from "./components";

const HistoryPage: React.FC = () => {
  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!account;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    transactions,
    loading,
    error,
    hasMore,
    fetchTransactions,
    refreshTransactions,
  } = useGoldskyHistory({ pageSize: 10, autoFetch: isConnected && !!address });

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((tx: Transaction) => {
      const matchesSearch =
        tx.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.methodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.pool.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || tx.status === filterStatus;
      const matchesType = filterType === "all" || tx.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort transactions
    filtered.sort((a: Transaction, b: Transaction) => {
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

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(
    filteredAndSortedTransactions.length / itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredAndSortedTransactions.slice(
    startIndex,
    endIndex
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    const successful = filteredAndSortedTransactions.filter(
      (tx: Transaction) => tx.status === "success"
    ).length;
    const failed = total - successful;
    const totalValue = filteredAndSortedTransactions.reduce((sum: number, tx: Transaction) => {
      return sum + parseFloat(tx.amount || "0");
    }, 0);

    // Calculate transaction type breakdown
    const typeBreakdown = filteredAndSortedTransactions.reduce((acc: Record<string, number>, tx: Transaction) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : "0",
      totalValue: (totalValue / Math.pow(10, 18)).toFixed(6),
      typeBreakdown,
    };
  }, [filteredAndSortedTransactions]);

  const handleViewDetails = (transaction: Transaction) => {
    // You can implement a modal or navigation to detailed view
    console.log("View details for transaction:", transaction);
  };

  const handleLoadMore = () => {
    fetchTransactions(Math.ceil(transactions.length / 10) + 1, true);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, sortBy]);

  // Show wallet connection required message
  if (!isConnected || !address) {
    return <WalletConnectionRequired />;
  }

  return (
    <div className="min-h-screen ">
      <div className="mx-auto max-w-7xl space-y-8 mt-5">
        {/* Header */}
        <HistoryHeader />

        {/* Statistics */}
        <HistoryStats stats={stats} />

        {/* Transaction Type Breakdown */}
        <TransactionTypeBreakdown typeBreakdown={stats.typeBreakdown} />

        {/* Filters */}
        <HistoryFilters
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          onRefresh={refreshTransactions}
          loading={loading}
        />

        {/* Transactions List */}
        <div className="space-y-4">
          {loading && transactions.length === 0 ? (
            <HistoryLoadingState />
          ) : currentTransactions.length === 0 ? (
            <HistoryEmptyState />
          ) : (
            <>
              {currentTransactions.map((tx: Transaction) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))}

              {/* Pagination */}
              <HistoryPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />

              {/* Load More for API */}
              <HistoryLoadMore
                hasMore={hasMore}
                loading={loading}
                onLoadMore={handleLoadMore}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
