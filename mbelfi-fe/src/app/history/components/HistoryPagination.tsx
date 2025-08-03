import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const HistoryPagination: React.FC<HistoryPaginationProps> = ({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center space-x-4 pt-6 mb-20">
      <Button
        onClick={onPrevPage}
        disabled={currentPage === 1}
        variant="outline"
        className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 text-gray-300 hover:from-gray-700/50 hover:to-gray-600/50 hover:border-gray-500/70 hover:text-white disabled:opacity-50 transition-all duration-300 backdrop-blur-sm"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>

      <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 px-4 py-2 rounded-lg border border-gray-600/30 backdrop-blur-sm">
        <span className="text-gray-300 font-medium">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <Button
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        variant="outline"
        className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 text-gray-300 hover:from-gray-700/50 hover:to-gray-600/50 hover:border-gray-500/70 hover:text-white disabled:opacity-50 transition-all duration-300 backdrop-blur-sm"
      >
        Next
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};

export default HistoryPagination; 