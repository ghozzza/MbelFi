"use client";
import React, { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ConnectButton } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { NetworkSwitcherDialog } from "./network/NetworkSwitcherDialog";

export const NavbarNeon = () => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const [bgStyle, setBgStyle] = useState({});
  const navRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: "home", label: "Home", href: "/home" },
    { id: "dashboard", label: "Dashboard", href: "/dashboard" },
    { id: "swap", label: "Swap", href: "/swap" },
    { id: "history", label: "History", href: "/history" },
    { id: "docs", label: "Docs", href: "/docs" },
    { id: "faucet", label: "Faucets", href: "/faucets" },
  ];

  useEffect(() => {
    const found = navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    );
    setActiveTab(found ? found.id : "home");
  }, [pathname]);

  useEffect(() => {
    const updateBackground = () => {
      const activeElement = document.querySelector(
        `[data-neon="${activeTab}"]`
      );
      if (activeElement && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        setBgStyle({
          left: activeRect.left - navRect.left,
          width: activeRect.width,
        });
      }
    };

    updateBackground();
    window.addEventListener("resize", updateBackground);
    return () => window.removeEventListener("resize", updateBackground);
  }, [activeTab]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuVisible(true);
    } else {
      const timeout = setTimeout(() => setIsMobileMenuVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isMobileMenuOpen]);

  return (
    <nav className="relative bg-gray-950/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl mx-auto my-4 max-w-7xl shadow-lg shadow-cyan-500/10">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 animate-pulse"></div>
      <div className="relative bg-gray-950/90 rounded-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/mbelbluelogo.png"
              alt="MbelFi Logo"
              width={50}
              height={50}
              className="drop-shadow-lg hover:scale-105 transition-transform duration-200"
            />
          <div className="text-2xl font-bold text-cyan-400 drop-shadow-lg">
            <span className="text-shadow-neon">MbelFi</span>
          </div>
          </Link>
          <div
            ref={navRef}
            className="hidden md:flex items-center space-x-2 relative"
          >
            <div
              className="absolute h-10 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-400/30 transition-all duration-300 ease-out"
              style={bgStyle}
            />

            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                data-neon={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg z-10 ${
                  activeTab === item.id
                    ? "text-cyan-300 drop-shadow-lg"
                    : "text-gray-400 hover:text-cyan-400"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3">
              <NetworkSwitcherDialog variant="button" />
              <ConnectButton client={thirdwebClient} />
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <AnimatePresence>
          {isMobileMenuVisible && (
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{
                opacity: isMobileMenuOpen ? 1 : 0,
                y: isMobileMenuOpen ? 0 : -24,
              }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden mt-4 space-y-2 border-t border-gray-800 pt-4"
              style={{ overflow: "hidden" }}
              aria-hidden={!isMobileMenuOpen}
            >
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-3 text-sm hover:text-cyan-400 font-medium transition-all duration-300 rounded-lg ${
                    activeTab === item.id
                      ? "text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
                      : "text-gray-400 hover:text-cyan-400 hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="space-y-3">
                <div className="px-4 py-2">
                  <NetworkSwitcherDialog variant="icon" />
                </div>
                <div className="px-4">
                  <ConnectButton client={thirdwebClient} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
