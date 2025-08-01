import { Card } from "@/components/ui/card";
import React from "react";
import FaucetsCardHeader from "./faucets-header";
import FaucetsCardForm from "./faucets-form";

const FaucetsCard = () => {
  return (
    <div>
      <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl overflow-hidden backdrop-blur-sm">
        <FaucetsCardHeader />
        <FaucetsCardForm />
      </Card>
    </div>
  );
};

export default FaucetsCard;