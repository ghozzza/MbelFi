"use client";
 
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Data sponsor dengan logo dan informasi
const sponsorData = [
  {
    name: "Etherlink",
    description: "Blockchain Platform",
    logo: "/sponsored/etherlink-logo.jpg"
  },
  {
    name: "Goldsky", 
    description: "Data Infrastructure",
    logo: "/sponsored/goldsky-logo.png"
  },
  {
    name: "Hyperlane",
    description: "Interchain Protocol", 
    logo: "/sponsored/hyperlane-logo.png"
  },
  {
    name: "RedStone",
    description: "Oracle Network",
    logo: "/sponsored/redstone-logo.jpeg"
  },
  {
    name: "Thirdweb",
    description: "Web3 Development",
    logo: "/sponsored/thirdweb-logo.png"
  }
];

export default function Sponsored() {
  return (
    <section className="w-full mb-4 py-0 -mt-150 md:-mt-130 lg:-mt-110">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SponsorInfiniteCards />
      </div>
    </section>
  );
}

// Custom component untuk menampilkan sponsor cards yang bergerak dengan logo
const SponsorInfiniteCards = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      // Duplicate items untuk efek infinite scroll
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      // Set animation properties
      containerRef.current.style.setProperty("--animation-direction", "forwards");
      containerRef.current.style.setProperty("--animation-duration", "25s");
      setStart(true);
    }
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "scroller relative overflow-hidden w-full",
        "[mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]"
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-4",
          start && "animate-scroll",
          "hover:[animation-play-state:paused]"
        )}
      >
        {sponsorData.map((sponsor, idx) => (
          <li
            key={`${sponsor.name}-${idx}`}
            className="relative w-[180px] md:w-[200px] lg:w-[220px] max-w-full shrink-0 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-center h-[120px] md:h-[140px] lg:h-[160px]">
              {/* Logo only */}
              <Image
                src={sponsor.logo}
                alt={`${sponsor.name} logo`}
                width={150}
                height={150}
                className="object-contain w-full h-full max-w-[120px] md:max-w-[140px] lg:max-w-[160px] max-h-[100px] md:max-h-[120px] lg:max-h-[140px]"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};