import React from "react";
import { Loader2 } from "lucide-react";

const HistoryLoadingState: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm"></div>
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-full border border-gray-600/50 mx-auto w-16 h-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </div>
      <p className="text-gray-400 mt-4 font-medium">Loading your transactions...</p>
    </div>
  );
};

export default HistoryLoadingState; 