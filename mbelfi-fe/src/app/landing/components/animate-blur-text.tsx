import React from "react";
import BlurText from "@/components/ui/blur-text";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

function AnimateBlurText() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/home");
  };

  return (
    <div className="text-center flex flex-col items-center justify-center mt-4 md:mt-8 px-4">
      <motion.h1 
        className="gradient-text text-lg sm:text-2xl md:text-3xl lg:text-6xl mb-1 md:mb-2 font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-all duration-500 ease-in-out"
        initial={{ opacity: 0, y: -50, filter: "blur(10px)", scale: 0.8 }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
        transition={{ 
          duration: 1.2, 
          delay: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        whileHover={{ 
          scale: 1.05,
          rotate: [0, -1, 1, 0],
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.95 }}
      >
        MbelFi
      </motion.h1>
      <BlurText
        text="Built on Etherlink"
        delay={150}
        animateBy="words"
        direction="top"
        className="text-lg sm:text-2xl md:text-3xl lg:text-5xl mb-1 md:mb-2 font-bold"
      />
      <BlurText
        text="powered Hyperlane"
        delay={300}
        animateBy="words"
        direction="top"
        className="text-lg sm:text-2xl md:text-3xl lg:text-5xl mb-6 md:mb-8 font-bold"
      />
      <div className="flex z-50 pointer-events-auto mt-4 md:mt-8">
        <button
          onClick={handleGetStarted}
          className="bg-transparent border cursor-pointer border-gray-400 text-white px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2.5 lg:px-8 lg:py-3 rounded-full text-xs sm:text-sm md:text-base lg:text-lg font-semibold hover:bg-white hover:text-black transition-all duration-300 pointer-events-auto group"
        >
          Get Started 
          <ArrowUpRight className="inline-block ml-1 sm:ml-1.5 md:ml-2 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
}

export default AnimateBlurText;
