import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chains } from "@/constants/chainAddress";

interface ChainSelectorProps {
  fromChain?: any;
  toChainId: string;
  setToChainId: (value: string) => void;
  isBorrowMode?: boolean; // New prop for borrow mode
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  fromChain,
  toChainId,
  setToChainId,
  isBorrowMode = false,
}) => {
  // Filter chains for borrow mode
  const availableChains = isBorrowMode 
    ? chains.filter(chain => 
        chain.name === "Etherlink Testnet" || 
        chain.name === "Base" || 
        chain.name === "Arbitrum"
      )
    : chains;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex-1 w-full">
        <div className="text-xs text-gray-300 mb-2 font-medium">From</div>
        {fromChain && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl px-4 py-3 border border-gray-600/50 shadow-sm hover:border-blue-400/60 transition-all duration-200">
            <Image
              src={fromChain.logo}
              alt={fromChain.name}
              width={28}
              height={28}
              className="rounded-full ring-2 ring-blue-500/20"
            />
            <span className="text-white font-semibold text-sm">
              {fromChain.name}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 w-full">
        <div className="text-xs text-gray-300 mb-2 font-medium">To</div>
        <Select value={toChainId} onValueChange={(value) => setToChainId(value)}>
          <SelectTrigger className="w-full bg-gradient-to-r py-7 from-gray-800 to-gray-700 border border-gray-600/50 hover:border-blue-400/60 text-gray-100 rounded-xl shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
            <SelectValue
              placeholder="Select destination chain"
              className="text-gray-200 "
            />
          </SelectTrigger>
          <SelectContent className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-xl z-[1000]">
            {availableChains.length === 0 ? (
              <SelectItem
                value="none"
                className="text-gray-400 hover:bg-gray-700/50 focus:bg-gray-700/50"
              >
                No chains available
              </SelectItem>
            ) : (
              availableChains.map((chain) => (
                <SelectItem
                  key={String(chain.id)}
                  value={String(chain.id)}
                  className="text-gray-200 hover:bg-gray-700/50 focus:bg-gray-700/50 rounded-lg mx-1 my-0.5 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 py-1">
                    <Image
                      src={chain.logo}
                      alt={chain.name}
                      width={24}
                      height={24}
                      className="rounded-full ring-1 ring-gray-500/30"
                    />
                    <span className="font-medium">{chain.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}; 