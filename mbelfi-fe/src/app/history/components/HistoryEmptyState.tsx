import React from "react";
import { Clock } from "lucide-react";

const HistoryEmptyState: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="relative mb-4">
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-full border border-gray-600/50 mx-auto w-16 h-16 flex items-center justify-center">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
      </div>
      <p className="text-gray-300 font-medium mb-2">
        No transactions found for your wallet
      </p>
      <p className="text-sm text-gray-500">
        Make sure you have performed lending pool transactions with this
        wallet address.
      </p>
    </div>
  );
};

export default HistoryEmptyState; 