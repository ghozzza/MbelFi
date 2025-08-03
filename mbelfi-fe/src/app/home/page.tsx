"use client";
import Hero from "./components/hero";
import Sponsored from "./components/sponsored";

import React from "react";

const Page = () => {
  return (
    <div className="relative">
      <Hero />
      <div className="relative">
        <Sponsored />
      </div>
    </div>
  );
};

export default Page;
