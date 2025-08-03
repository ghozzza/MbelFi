import Orb from "@/components/ui/orb";
import AnimateBlurText from "./animate-blur-text";

import React from "react";

function animateOrb() {
  return (
    <div>
      <div className="absolute inset-0 flex items-center justify-center z-10 overflow-visible -mt-100 md:-mt-70 lg:-mt-60  ">
        <div className="overflow-visible flex items-center justify-center transform -translate-y-16 md:-translate-y-20 lg:-translate-y-24">
          <div className="w-[80vw] h-[80vh] relative">
            {/* Orb dengan pointer-events-auto untuk memungkinkan hover */}
            <div className="absolute inset-0 pointer-events-auto">
              <Orb
                hoverIntensity={1.5}
                rotateOnHover={true}
                hue={0}
                forceHoverState={false}
              />
            </div>
            {/* Text overlay dengan pointer-events-none kecuali untuk button */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="pointer-events-auto">
                <AnimateBlurText />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default animateOrb;
