"use client";

import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Users, Zap, Shield, Sparkles, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Chat với người lạ",
      description: "Kết nối với mọi người thông qua các cuộc trò chuyện ngẫu nhiên"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Nhắn tin real-time",
      description: "Trò chuyện mượt mà với giao diện trực quan"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Cộng đồng sôi động",
      description: "Chia sẻ và kết nối với những người có cùng sở thích"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Bảo mật tuyệt đối",
      description: "Thông tin của bạn được bảo vệ an toàn"
    }
  ];

  const stats = [
    { number: "A", label: "As" },
    { number: "S", label: "Soon" },
    { number: "A", label: "As"},
    { number: "P", label: "Possible" }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#3B82F6] rounded-full mix-blend-multiply filter blur-xl animate-pulse" 
             style={{ transform: `translateY(${scrollY * 0.1}px)` }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#6366F1] rounded-full mix-blend-multiply filter blur-xl animate-pulse" 
             style={{ animationDelay: '700ms', transform: `translateY(${scrollY * 0.15}px)` }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-[#8B5CF6] rounded-full mix-blend-multiply filter blur-xl animate-pulse"
             style={{ animationDelay: '1000ms', transform: `translateY(${scrollY * 0.2}px)` }}></div>
      </div>

      {/* Hero Section */}
      <div className={`relative flex flex-col items-center text-center px-4 pt-20 pb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Logo with glow effect */}
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse"></div>
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-3xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
            Z
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4">
          Chào mừng đến với Z4rum
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#94a3b8] max-w-2xl mb-8 leading-relaxed">
          Một không gian xã hội hiện đại để khám phá, trò chuyện, và hơn hết là sự kết nối. 
          <span className="block mt-2">"Cuộc sống là một cuộc đối thoại. Hãy tham gia vào nó." - Anonymous</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <a href="/login" className="group relative px-8 py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 flex items-center gap-2">
            Đăng nhập
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a href="/register" className="px-8 py-3 rounded-xl border-2 border-[#1e3a52] text-[#cbd5e1] font-semibold hover:bg-[#1e293b] backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
            Đăng ký
          </a>
        </div>

        <a href="/home" className="text-[#94a3b8] hover:text-white underline transition-colors duration-300 flex items-center gap-2">
          Đi đến trang chủ
          <Zap className="w-4 h-4" />
        </a>
      </div>

      {/* Stats Section */}
      <div className="relative max-w-6xl mx-auto px-4 py-16 -mt-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="backdrop-blur-lg bg-[#1e293b]/50 rounded-2xl p-6 border border-[#1e3a52] hover:border-[#3B82F6]/50 transform hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {stat.number}
              </div>
              <div className="text-[#94a3b8] text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="relative max-w-6xl mx-auto px-4 py-16 -mt-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Tính năng nổi bật
          </h2>
          <p className="text-[#94a3b8] max-w-2xl mx-auto">
            Trải nghiệm những tính năng độc đáo và mang tính kết nối được thiết kế bởi Z4rum 
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group backdrop-blur-lg bg-[#1e293b]/50 rounded-2xl p-8 border border-[#1e3a52] hover:border-[#3B82F6]/50 transform hover:scale-105 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center text-white mb-4 group-hover:rotate-6 transition-transform shadow-lg shadow-blue-500/30">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-[#94a3b8]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials Section 
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Người dùng nói gì về chúng tôi
          </h2>
        </div>*/}

      {/* <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="backdrop-blur-lg bg-[#1e293b]/50 rounded-2xl p-6 border border-[#1e3a52] hover:border-[#6366F1]/50 transition-all duration-300">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-[#cbd5e1] mb-4">
                "Z4rum đã giúp tôi tìm được những người bạn tuyệt vời. Giao diện đẹp, dễ sử dụng!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]"></div>
                <div>
                  <div className="text-white font-semibold">Người dùng {i}</div>
                  <div className="text-[#94a3b8] text-sm">Thành viên từ 2024</div>
                </div>
              </div>
            </div>
          ))}
        </div> 
      </div>*/}

      {/* CTA Section */}
      <div className="relative max-w-4xl mx-auto px-4 py-20 text-center -mt-10">
        <div className="backdrop-blur-lg bg-[#1e293b]/50 rounded-3xl p-12 border border-[#1e3a52]">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Sẵn sàng bắt đầu hành trình?
          </h2>
          <p className="text-[#94a3b8] mb-8 max-w-2xl mx-auto">
            Hãy bắt đầu hành trình kết nối và khám phá cùng Z4rum ngay bây giờ.
          </p>
          <a href="/register" className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-bold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300">
            Đăng ký miễn phí
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-[#1e3a52] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[#94a3b8]">
          <p>© 2024 Z4rum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}