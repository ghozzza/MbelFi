import { Plus, Minus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { EnrichedPool } from "@/lib/pair-token-address";

export type ActionType =
  | "supply_liquidity"
  | "supply_collateral"
  | "withdraw_liquidity"
  | "withdraw_collateral"
  | "repay"
  | "borrow";

export interface ActionConfig {
  label: string;
  buttonColor: "primary" | "secondary";
  buttonIcon: any;
  inputLabel: string;
  balanceLabel: string;
  balanceValue: (market: EnrichedPool) => string;
  apyLabel: string | null;
  apyValue: ((market: EnrichedPool) => string) | null;
  apyColor: string;
  showApy: boolean;
  tokenSymbol: (market: EnrichedPool) => string;
  buttonText: string;
  buttonClass: string;
}

export const actionConfig: Record<ActionType, ActionConfig> = {
  supply_liquidity: {
    label: "Supply",
    buttonColor: "primary",
    buttonIcon: Plus,
    inputLabel: "Amount to Supply",
    balanceLabel: "Your Wallet Balance",
    balanceValue: (market: EnrichedPool) =>
      `Loading... ${market.borrowTokenInfo?.symbol || market.borrowToken}`,
    apyLabel: "APY",
    apyValue: (_market: EnrichedPool) => `-`,
    apyColor: "text-green-400",
    showApy: true,
    tokenSymbol: (market: EnrichedPool) =>
      market.borrowTokenInfo?.symbol || market.borrowToken,
    buttonText: "Supply",
    buttonClass: "w-full bg-blue-600 hover:bg-blue-700",
  },
  supply_collateral: {
    label: "Supply Collateral",
    buttonColor: "primary",
    buttonIcon: Plus,
    inputLabel: "Amount to Supply",
    balanceLabel: "Your Wallet Balance",
    balanceValue: (market: EnrichedPool) =>
      `Loading... ${market.collateralTokenInfo?.symbol || market.collateralToken}`,
    apyLabel: "LTV",
    apyValue: (market: EnrichedPool) =>
      `${(Number(market.ltv) / 1e16).toFixed(2)}%`,
    apyColor: "text-blue-400",
    showApy: true,
    tokenSymbol: (market: EnrichedPool) =>
      market.collateralTokenInfo?.symbol || market.collateralToken,
    buttonText: "Supply Collateral",
    buttonClass: "w-full bg-blue-600 hover:bg-blue-700",
  },
  withdraw_liquidity: {
    label: "Withdraw",
    buttonColor: "secondary",
    buttonIcon: Minus,
    inputLabel: "Amount to Withdraw",
    balanceLabel: "Your Supplied Balance",
    balanceValue: (market: EnrichedPool) =>
      `Loading... ${market.borrowTokenInfo?.symbol || market.borrowToken}`,
    apyLabel: "APY",
    apyValue: (_market: EnrichedPool) => `-`,
    apyColor: "text-green-400",
    showApy: true,
    tokenSymbol: (market: EnrichedPool) =>
      market.borrowTokenInfo?.symbol || market.borrowToken,
    buttonText: "Withdraw",
    buttonClass: "w-full bg-gray-600 hover:bg-gray-700",
  },
  withdraw_collateral: {
    label: "Withdraw Collateral",
    buttonColor: "secondary",
    buttonIcon: Minus,
    inputLabel: "Amount to Withdraw",
    balanceLabel: "Your Collateral Balance",
    balanceValue: (market: EnrichedPool) =>
      `Loading... ${market.collateralTokenInfo?.symbol || market.collateralToken}`,
    apyLabel: null,
    apyValue: null,
    apyColor: "",
    showApy: false,
    tokenSymbol: (market: EnrichedPool) =>
      market.collateralTokenInfo?.symbol || market.collateralToken,
    buttonText: "Withdraw Collateral",
    buttonClass: "w-full bg-gray-600 hover:bg-gray-700",
  },
  repay: {
    label: "Repay",
    buttonColor: "secondary",
    buttonIcon: ArrowUpCircle,
    inputLabel: "Amount to Repay",
    balanceLabel: "Your Debt",
    balanceValue: (market: EnrichedPool) =>
      `450.00 ${market.borrowTokenInfo?.symbol || market.borrowToken}`,
    apyLabel: "Borrow APY",
    apyValue: (_market: EnrichedPool) => `-`,
    apyColor: "text-red-400",
    showApy: true,
    tokenSymbol: (market: EnrichedPool) =>
      market.borrowTokenInfo?.symbol || market.borrowToken,
    buttonText: "Repay",
    buttonClass: "w-full bg-red-600 hover:bg-red-700",
  },
  borrow: {
    label: "Borrow",
    buttonColor: "primary",
    buttonIcon: ArrowDownCircle,
    inputLabel: "Amount to Borrow",
    balanceLabel: "Available to Borrow",
    balanceValue: (market: EnrichedPool) =>
      `Loading... ${market.borrowTokenInfo?.symbol || market.borrowToken}`,
    apyLabel: "Borrow APY",
    apyValue: (_market: EnrichedPool) => `-`,
    apyColor: "text-red-400",
    showApy: true,
    tokenSymbol: (market: EnrichedPool) =>
      market.borrowTokenInfo?.symbol || market.borrowToken,
    buttonText: "Borrow",
    buttonClass: "w-full bg-purple-600 hover:bg-purple-700",
  },
}; 