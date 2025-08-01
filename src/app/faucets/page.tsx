import React from "react";
import PositionHeader from "./_components/position-header";
import FaucetsCard from "./_components/faucets-card";


const page = () => {
  return (
    <div className="min-h-screen md:p-8 mt-20">
      <div className="mx-auto max-w-xl space-y-8 mt-5">
        <PositionHeader />
        <FaucetsCard />
      </div>
    </div>
  );
};

export default page;
