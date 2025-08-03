"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, ArrowRight, BookOpen, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

const DocsRedirectPage: React.FC = () => {
  const router = useRouter();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const targetUrl = "https://mbel-finance.gitbook.io/mbel-finance-docs";

  useEffect(() => {
    // Start the animation sequence
    const timer1 = setTimeout(() => setAnimationPhase(1), 500);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1500);
    const timer3 = setTimeout(() => setAnimationPhase(3), 2500);
    const timer4 = setTimeout(() => {
      setRedirecting(true);
      // Redirect after animation completes
      setTimeout(() => {
        window.open(targetUrl, '_blank');
        // Redirect back to home after opening docs
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }, 1000);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto px-6">
        {/* Logo/Icon Animation */}
        <div className="relative">
          <div className={`transition-all duration-1000 ease-out ${
            animationPhase >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}>
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
          </div>
          
          {/* Ripple effect */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 transition-all duration-1000 ${
            animationPhase >= 2 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}></div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className={`text-4xl md:text-5xl font-bold text-white transition-all duration-1000 ease-out ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            Mbel Finance
          </h1>
          
          <p className={`text-xl text-gray-300 transition-all duration-1000 delay-300 ease-out ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            Documentation
          </p>
        </div>

        {/* Redirect Message */}
        <div className={`transition-all duration-1000 delay-500 ease-out ${
          animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-3 text-blue-400">
            <Globe className="w-5 h-5" />
            <span className="text-lg font-medium">Redirecting to documentation...</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`w-full max-w-md mx-auto transition-all duration-1000 delay-700 ease-out ${
          animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-gray-800/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-3000 ease-out ${
              animationPhase >= 2 ? 'w-full' : 'w-0'
            }`}></div>
          </div>
        </div>

        {/* External Link Indicator */}
        <div className={`transition-all duration-1000 delay-1000 ease-out ${
          animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Opening external documentation</span>
            </div>
            <div className="text-xs text-gray-500">
              You'll be redirected back to home automatically
            </div>
          </div>
        </div>

        {/* Manual redirect button (fallback) */}
        <div className={`transition-all duration-1000 delay-1200 ease-out ${
          animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                window.open(targetUrl, '_blank');
                setTimeout(() => router.push('/'), 1000);
              }}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 border border-blue-500/40 hover:border-blue-400/60 rounded-lg text-white font-medium transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-blue-500/25"
            >
              <span>Open Documentation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-600 hover:to-gray-700 border border-gray-500/40 hover:border-gray-400/60 rounded-lg text-white font-medium transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-gray-500/25"
            >
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-blue-400/30 rounded-full animate-float-${i + 1}`}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Loading overlay for redirect */}
      {redirecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white font-medium">Redirecting...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-180deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(90deg); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(-90deg); }
        }
        @keyframes float-5 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-22px) rotate(45deg); }
        }
        @keyframes float-6 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(-45deg); }
        }
        .animate-float-1 { animation: float-1 3s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 3.5s ease-in-out infinite; }
        .animate-float-3 { animation: float-3 4s ease-in-out infinite; }
        .animate-float-4 { animation: float-4 3.2s ease-in-out infinite; }
        .animate-float-5 { animation: float-5 3.8s ease-in-out infinite; }
        .animate-float-6 { animation: float-6 3.3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default DocsRedirectPage;
