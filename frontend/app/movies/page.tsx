"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { movieApi } from "@/lib/api/movieApi";
import { Search, Play, Star, ChevronRight, Filter } from "lucide-react";

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
    const [searchKey, setSearchKey] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await movieApi.getNewUpdates();
                setNewMovies(res.items);
            } catch (error) {
                console.error("Error fetching movies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchKey.trim()) {
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        setLoading(true);
        try {
            const res = await movieApi.search(searchKey);
            setSearchResults(res.data.items);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (url: string) => {
        if (url.startsWith("http")) return url;
        return `https://phimimg.com/${url}`;
    };

    return (
        <div className="min-h-screen bg-[#071029] text-white p-4 sm:p-8">
            {/* Search Header */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Z4Cinema
                        </h1>
                        <p className="text-[#94a3b8] mt-1">Khám phá hàng ngàn bộ phim miễn phí</p>
                    </div>

                    <form onSubmit={handleSearch} className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Tìm tên phim, diễn viên..."
                            value={searchKey}
                            onChange={(e) => setSearchKey(e.target.value)}
                            className="w-full bg-[#0f1e30] border border-[#1e3a52] rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-[#475569] focus:border-[#3B82F6] transition-all outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" size={20} />
                    </form>
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                {isSearching ? (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                Kết quả tìm kiếm cho: <span className="text-[#3B82F6]">"{searchKey}"</span>
                            </h2>
                            <button
                                onClick={() => { setIsSearching(false); setSearchKey(""); }}
                                className="text-sm text-[#94a3b8] hover:text-white transition-colors"
                            >
                                Quay lại
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {searchResults.map((movie) => (
                                    <MovieCard key={movie.slug} movie={movie} getImageUrl={getImageUrl} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-[#64748b]">Không tìm thấy bộ phim nào.</div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* New Updates Section */}
                        <div className="mb-12">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                    Phim mới cập nhật
                                </h2>
                                <Link href="/movies/new" className="text-[#3B82F6] flex items-center gap-1 text-sm hover:underline">
                                    Xem tất cả <ChevronRight size={16} />
                                </Link>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="aspect-[2/3] bg-[#0f1e30] rounded-2xl animate-pulse"></div>
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

                        {/* Quick Categories */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <CategoryLink title="Phim Bộ" href="/movies/type/phim-bo" color="from-blue-600 to-indigo-700" />
                            <CategoryLink title="Phim Lẻ" href="/movies/type/phim-le" color="from-purple-600 to-pink-700" />
                            <CategoryLink title="Hoạt Hình" href="/movies/type/hoat-hinh" color="from-orange-500 to-red-600" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function MovieCard({ movie, getImageUrl }: { movie: Movie; getImageUrl: (url: string) => string }) {
    return (
        <Link href={`/movies/${movie.slug}`}>
            <div className="group relative flex flex-col bg-[#0f1e30] border border-[#1e3a52] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-[#3B82F6] hover:shadow-2xl hover:shadow-blue-500/20">
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
        </Link>
    );
}

function CategoryLink({ title, href, color }: { title: string; href: string; color: string }) {
    return (
        <Link href={href} className={`relative overflow-hidden rounded-2xl p-6 h-32 flex items-center bg-gradient-to-br ${color} transition-all hover:scale-[1.02] hover:shadow-xl`}>
            <div className="z-10">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                <p className="text-white/70 text-sm mt-1">Xem chi tiết <ChevronRight className="inline" size={14} /></p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-20 transform rotate-12">
                <Play size={100} />
            </div>
        </Link>
    );
}
