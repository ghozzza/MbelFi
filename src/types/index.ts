import { Address } from "viem";

export interface Token {
    name: string;
    symbol: string;
    logo: string;
    decimals: number;
    addresses: {
      [chainId: number]: Address;
    };
    priceFeed: {
      [chainId: number]: Address;
    };
  }

export interface Chain {
  id: number;
  name: string;
  logo: string;
  color: string;
  destination: number;
  contracts: {
    lendingPool: string;
    factory: string;
    position: string;
    protocol: string;
    isHealthy: string;
    lendingPoolDeployer: string;
    blockExplorer: string;
  };
} 