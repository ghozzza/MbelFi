import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Wallet, Clock, ExternalLink } from "lucide-react";

interface TransactionTypeBreakdownProps {
  typeBreakdown: Record<string, number>;
}

const TransactionTypeBreakdown: React.FC<TransactionTypeBreakdownProps> = ({ 
  typeBreakdown 
}) => {
  if (Object.keys(typeBreakdown).length === 0) {
    return null;
  }

  const colors = [
    'from-blue-500/10 to-blue-600/10 border-blue-500/20',
    'from-green-500/10 to-green-600/10 border-green-500/20',
    'from-purple-500/10 to-purple-600/10 border-purple-500/20',
    'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20',
    'from-red-500/10 to-red-600/10 border-red-500/20',
    'from-indigo-500/10 to-indigo-600/10 border-indigo-500/20'
  ];

  const icons = [
    <TrendingUp key="trending" className="w-4 h-4 text-green-400" />,
    <TrendingUp key="trending-down" className="w-4 h-4 text-red-400" />,
    <Wallet key="wallet" className="w-4 h-4 text-yellow-400" />,
    <Clock key="clock" className="w-4 h-4 text-blue-400" />,
    <BarChart3 key="chart" className="w-4 h-4 text-purple-400" />,
    <ExternalLink key="external" className="w-4 h-4 text-indigo-400" />
  ];

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-gray-900/80 border border-gray-700/60 backdrop-blur-md shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Transaction Types Overview
          </h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(typeBreakdown).map(([type, count], index) => (
            <div 
              key={type} 
              className={`relative group p-4 rounded-xl bg-gradient-to-br ${colors[index % colors.length]} border border-opacity-30 backdrop-blur-sm`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  {icons[index % icons.length]}
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-300 font-medium capitalize leading-tight">
                    {type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xl font-bold text-white mt-1">
                    {count}
                  </p>
                </div>
              </div>
              
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionTypeBreakdown; 