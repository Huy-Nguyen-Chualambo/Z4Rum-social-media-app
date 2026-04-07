"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

// Simple Floating Particle Component
const Particle = ({ delay }: { delay: number }) => (
  <motion.div
    initial={{ y: "110vh", x: Math.random() * 100 + "%", opacity: 0 }}
    animate={{ 
      y: "-10vh", 
      opacity: [0, 1, 1, 0],
      x: (Math.random() * 20 - 10) + "%" 
    }}
    transition={{ 
      duration: Math.random() * 10 + 15, 
      repeat: Infinity, 
      delay: delay,
      ease: "linear" 
    }}
    className="absolute w-1 h-1 bg-white/40 rounded-full blur-[1px] pointer-events-none"
  />
);

export default function LandingPage() {
  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen bg-[#0a0c16] overflow-hidden selection:bg-purple-500/30">
      {/* Immersive Chill Background */}
      <motion.div 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute inset-0 z-0 bg-cover bg-center brightness-[0.7] contrast-[1.1]"
        style={{ backgroundImage: 'url("/chill-bg.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0c16]/30 to-[#0a0c16]" />
      </motion.div>

      {/* Film Grain / Noise Overlay for "GIF" feel */}
      <div className="absolute inset-0 z-1 pointer-events-none opacity-[0.15] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

      {/* Floating Chill Particles */}
      {[...Array(20)].map((_, i) => (
        <Particle key={i} delay={i * 2} />
      ))}

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="relative group cursor-pointer">
            <motion.div 
              animate={{ 
                boxShadow: ["0 0 20px rgba(168,85,247,0.3)", "0 0 50px rgba(168,85,247,0.6)", "0 0 20px rgba(168,85,247,0.3)"] 
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-black shadow-2xl relative z-10"
            >
              Z
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse" />
            </motion.div>
            <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
        </motion.div>

        {/* Minimalist Intro */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: 0.5, duration: 1.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tighter">
            Z4RUM<span className="text-purple-400">.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-sm mx-auto leading-relaxed opacity-80 mb-12">
            Không gian xã hội hiện đại. 
            <br />
            Nơi chỉ có niềm vui và sự chia sẻ.
          </p>
        </motion.div>

        {/* Auth Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-xs"
        >
          <Link href="/login" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,1)" }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 bg-white/90 text-indigo-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-white/5 transition-all text-lg"
            >
              <LogIn size={20} />
              Đăng nhập
            </motion.button>
          </Link>

          <Link href="/register" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,1)" }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 bg-white/5 border-2 border-white/20 text-white font-bold rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md transition-all text-lg"
            >
              <UserPlus size={20} />
              Tham gia
            </motion.button>
          </Link>
        </motion.div>

        {/* Hidden Enter Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          className="mt-12"
        >
          <Link href="/home" className="text-slate-500 text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:text-white transition-all">
            Khám phá ẩn danh
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}