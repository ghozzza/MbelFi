import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface HistoryLoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const HistoryLoadMore: React.FC<HistoryLoadMoreProps> = ({
  hasMore,
  loading,
  onLoadMore
}) => {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="text-center pt-4">
      <Button
        onClick={onLoadMore}
        disabled={loading}
        className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-blue-500/25"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          "Load More"
        )}
      </Button>
    </div>
  );
};

export default HistoryLoadMore; 