import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, ExternalLink } from "lucide-react";

interface HistoryStatsProps {
  stats: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    totalValue: string;
  };
}

const HistoryStats: React.FC<HistoryStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xl font-bold text-white">
                {stats.successRate}%
              </p>
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
              <p className="text-xl font-bold text-white">
                {stats.successful}
              </p>
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
  );
};

export default HistoryStats; 