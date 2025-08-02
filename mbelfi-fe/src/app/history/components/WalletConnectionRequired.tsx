import React from "react";
import { Wallet } from "lucide-react";

const WalletConnectionRequired: React.FC = () => {
  return (
    <div className="min-h-screen md:p-8 mt-20">
      <div className="mx-auto max-w-4xl space-y-8 mt-5">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Wallet className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Wallet Connection Required
          </h1>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionRequired; 