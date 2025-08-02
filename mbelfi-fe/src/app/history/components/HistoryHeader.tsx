import React from "react";

interface HistoryHeaderProps {
  title?: string;
}

const HistoryHeader: React.FC<HistoryHeaderProps> = ({ 
  title = "Your Transaction History" 
}) => {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
        {title}
      </h1>
    </div>
  );
};

export default HistoryHeader; 