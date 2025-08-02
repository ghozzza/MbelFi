"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

interface WarningMessageProps {
  show: boolean;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

const WarningMessage: React.FC<WarningMessageProps> = ({
  show,
  message = "You need to create a position first by supplying collateral and borrowing assets. Visit the Borrow page to get started.",
  actionText = "Borrow",
  onAction,
}) => {
  if (!show) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-yellow-400">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="size-5" />
        <span className="font-medium">No Active Position Found</span>
      </div>
      <p className="text-sm text-yellow-300">
        {message.split(actionText).map((part, index, array) => (
          <React.Fragment key={index}>
            {part}
            {index < array.length - 1 && (
              <button
                onClick={onAction}
                className="font-medium hover:underline cursor-pointer"
              >
                {actionText}
              </button>
            )}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
};

export default WarningMessage;
