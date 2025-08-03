"use client";
import { NavbarNeon } from "@/components/navbar";
import animateOrb from "./animate-orb";

import React from "react";

const Hero = () => {
  return (
    <div className="w-full min-h-[120vh]  text-white relative overflow-hidden">
      {animateOrb()}
    </div>
  );
};

export default Hero;
