"use client";
import React, { useEffect, useState } from "react";
import { movieApi } from "@/lib/api/movieApi";
import { Play, Star, ChevronRight, ExternalLink, Film } from "lucide-react";

interface Movie {
    slug: string;
    name: string;
    origin_name: string;
    thumb_url: string;
    poster_url: string;
    year: number;
}

export default function MoviesPage() {
    const [newMovies, setNewMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await movieApi.getNewUpdates();
                // Chỉ lấy 10 phim mới nhất để giản lược
                setNewMovies(res?.items?.slice(0, 10) || []);
            } catch (error) {
                console.error("Error fetching movies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getImageUrl = (url: string) => {
        if (url.startsWith("http")) return url;
        return `https://phimimg.com/${url}`;
    };

    return (
        <div className="min-h-screen bg-[#071029] text-white p-4 sm:p-8">
            {/* Redirect Banner */}
            <div className="max-w-6xl mx-auto mb-16 mt-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-purple-900/40 border border-blue-500/30 rounded-[2.5rem] p-8 md:p-16 text-center backdrop-blur-md shadow-2xl">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Nền tảng mới đã sẵn sàng
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent tracking-tight">
                            Z4PHIM
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
                            Cả nhà vào web này của Bảnh để có trải nghiệm phim tốt nhất nha chứ để hết trong này Bảnh không scale hết được 😢
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://z4phim.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] active:scale-95"
                            >
                                Truy cập ngay <ExternalLink size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                            Phim đề cử
                        </h2>
                        <a
                            href="https://z4phim.vercel.app"
                            className="text-[#94a3b8] hover:text-white flex items-center gap-2 text-sm font-medium transition-colors group"
                        >
                            Khám phá tất cả <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="aspect-[2/3] bg-[#0f1e30] border border-[#1e3a52] rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {newMovies.map((movie) => (
                                <MovieCard key={movie.slug} movie={movie} getImageUrl={getImageUrl} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Direct Access Card 
                <div className="mb-20">
                    <a
                        href="https://z4phim.vercel.app"
                        target="_blank"
                        className="group flex flex-col md:flex-row items-center justify-between bg-[#0f1e30] hover:bg-[#162a42] border border-[#1e3a52] hover:border-blue-500/50 rounded-3xl p-8 transition-all gap-8"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                                <Film size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">
                                    Bạn đang tìm phim bộ hoặc phim lẻ?
                                </h3>
                                <p className="text-[#94a3b8]">
                                    Tại Z4Phim chúng tôi có đầy đủ các thể loại phim bạn yêu thích.
                                </p>
                            </div>
                        </div>
                        <div className="bg-white text-black px-8 py-4 rounded-xl font-bold group-hover:scale-105 transition-transform">
                            Mở Z4Phim
                        </div>
                    </a>
                </div>*/}
            </div>
        </div>
    );
}

function MovieCard({ movie, getImageUrl }: { movie: Movie; getImageUrl: (url: string) => string }) {
    return (
        <a
            href={`https://z4phim.vercel.app/phim/${movie.slug}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <div className="group relative flex flex-col bg-[#0f1e30] border border-[#1e3a52] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
                <div className="aspect-[2/3] overflow-hidden relative">
                    <img
                        src={getImageUrl(movie.poster_url || movie.thumb_url)}
                        alt={movie.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071029] via-transparent to-transparent opacity-80"></div>

                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10 shrink-0">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-bold">{movie.year}</span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                            <Play size={24} className="text-white fill-white translate-x-0.5" />
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {movie.name}
                    </h3>
                    <p className="text-[#64748b] text-[11px] mt-1 line-clamp-1 italic">{movie.origin_name}</p>
                </div>
            </div>
        </a>
    );
}

