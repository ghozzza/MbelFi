import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react";
import { EnrichedPool } from "@/lib/pair-token-address";
import { ActionModalView } from "@/components/dialog/action-dialog";

interface DetailsModalProps {
  open: boolean;
  onClose: () => void;
  market: EnrichedPool | null;
}

type Action =
  | "supply_liquidity"
  | "supply_collateral"
  | "withdraw_liquidity"
  | "withdraw_collateral"
  | "repay"
  | "borrow";

const actions: { value: Action; label: string }[] = [
  { value: "supply_liquidity", label: "Supply Liquidity" },
  { value: "supply_collateral", label: "Supply Collateral" },
  { value: "withdraw_liquidity", label: "Withdraw Liquidity" },
  { value: "withdraw_collateral", label: "Withdraw Collateral" },
  { value: "repay", label: "Repay" },
  { value: "borrow", label: "Borrow" },
];

export const DetailsModal = ({ open, onClose, market }: DetailsModalProps) => {
  const [selectedAction, setSelectedAction] =
    React.useState<Action>("supply_liquidity");

  // Reset txHash when action type changes
  React.useEffect(() => {
    // This will trigger a re-render of ActionModalView with fresh state
    // The hooks will be re-initialized with clean txHash state
  }, [selectedAction]);

  // Reset selectedAction when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedAction("supply_liquidity");
    }
  }, [open]);

  const handleActionSuccess = (amount: string, toChainId?: string) => {
    // For supply collateral, the hook handles the success internally
    // For other actions, we can add specific logic here if needed

  };

  const renderActionView = () => {
    if (!market) return null;
    return (
      <ActionModalView 
        key={selectedAction} // Force re-creation when action changes
        type={selectedAction} 
        market={market} 
        onAction={handleActionSuccess}
      />
    );
  };

  if (!market) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="bg-gray-900 text-gray-100 border border-cyan-800 w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-2 md:mx-0">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-400">
            {(market.borrowTokenInfo?.symbol || market.borrowToken)} / {(market.collateralTokenInfo?.symbol || market.collateralToken)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Action
            </label>
            <Select
              value={selectedAction}
              onValueChange={(value) => setSelectedAction(value as Action)}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 hover:border-blue-500 text-gray-100">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white">
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">{renderActionView()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
