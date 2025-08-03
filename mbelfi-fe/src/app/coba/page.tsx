"use client";
import React from "react";
import { useReadHealthFactor } from "@/hooks/read/useReadHealthFactor";

const Page = () => {
  const { healthFactor, isLoadingHealthFactor } = useReadHealthFactor(
    "0x47dAF2E09737E065b40d13271Bc46f89b783329D"
  );
  console.log("kontol : ",healthFactor);
  return (
    <div>
      <h1>{healthFactor}</h1>
    </div>
  );
};

export default Page;
