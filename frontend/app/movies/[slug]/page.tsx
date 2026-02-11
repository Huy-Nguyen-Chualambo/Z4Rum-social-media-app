"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { movieApi } from "@/lib/api/movieApi";
import {
    Play,
    Clock,
    Calendar,
    Globe,
    List,
    Info,
    ArrowLeft,
    Tv,
    Users,
    Star
} from "lucide-react";
import Link from "next/link";

interface Episode {
    name: string;
    slug: string;
    link_embed: string;
    link_m3u8: string;
}

interface Server {
    server_name: string;
    server_data: Episode[];
}

interface MovieDetail {
    id: string;
    name: string;
    origin_name: string;
    content: string;
    type: string;
    status: string;
    thumb_url: string;
    poster_url: string;
    year: number;
    time: string;
    episode_current: string;
    episode_total: string;
    quality: string;
    lang: string;
    actor: string[];
    director: string[];
    category: { name: string }[];
    country: { name: string }[];
}

export default function MovieDetailPage() {
    const { slug } = useParams();
    const [data, setData] = useState<{ movie: MovieDetail; episodes: Server[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
    const [activeServer, setActiveServer] = useState(0);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await movieApi.getMovieDetail(slug as string);
                setData(res);
                if (res.episodes && res.episodes.length > 0 && res.episodes[0].server_data.length > 0) {
                    setCurrentEpisode(res.episodes[0].server_data[0]);
                }
            } catch (error) {
                console.error("Error fetching movie detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#071029] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#071029] text-white flex flex-col items-center justify-center gap-4">
                <p className="text-xl text-[#94a3b8]">Không tìm thấy thông tin phim.</p>
                <Link href="/movies" className="text-blue-500 hover:underline">Quay lại trang phim</Link>
            </div>
        );
    }

    const { movie, episodes } = data;

    return (
        <div className="min-h-screen bg-[#071029] text-white pb-20 overflow-x-hidden">
            {/* Back Button */}
            <div className="max-w-6xl mx-auto p-4">
                <Link href="/movies" className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-white transition-colors mb-4">
                    <ArrowLeft size={18} /> Quay lại
                </Link>
            </div>

            {/* Player Section - Aggressive Breakout for Mobile Fullscreen button visibility */}
            <div className="relative w-full sm:max-w-6xl sm:mx-auto sm:px-4 mb-8">
                <div className="w-screen sm:w-full relative left-1/2 sm:static -translate-x-1/2 sm:translate-x-0">
                    <div className="bg-black aspect-video sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border-y sm:border border-[#1e3a52]">
                        {currentEpisode ? (
                            <iframe
                                src={currentEpisode.link_embed}
                                className="w-full h-full"
                                allowFullScreen={true}
                                // @ts-ignore
                                webkitallowfullscreen="true"
                                // @ts-ignore
                                mozallowfullscreen="true"
                                // @ts-ignore
                                oallowfullscreen="true"
                                // @ts-ignore
                                msallowfullscreen="true"
                                allow="autoplay; encrypted-media; fullscreen *; picture-in-picture"
                                frameBorder="0"
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-4">
                                <Tv size={64} className="text-[#1e3a52]" />
                                <p className="text-[#475569]">Phim hiện chưa có link xem</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                {/* Left Content: Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{movie.quality}</span>
                            <span className="bg-[#1e293b] text-[10px] font-bold px-2 py-0.5 rounded uppercase">{movie.lang}</span>
                            <span className="text-[#94a3b8] text-sm">• {movie.year}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-white">{movie.name}</h1>
                        <p className="text-[#64748b] text-lg font-medium italic">{movie.origin_name}</p>
                    </div>

                    <div className="flex flex-wrap gap-6 py-6 border-y border-[#1e3a52]">
                        <InfoItem icon={<Clock size={16} />} label="Thời lượng" value={movie?.time || "Đang cập nhật"} />
                        <InfoItem icon={<Tv size={16} />} label="Tình trạng" value={movie?.status === "completed" ? "Hoàn thành" : movie?.episode_current} />
                        <InfoItem icon={<Globe size={16} />} label="Quốc gia" value={movie?.country?.map(c => c.name).join(", ") || "Đang cập nhật"} />
                        <InfoItem icon={<Star size={16} />} label="Năm" value={movie?.year?.toString() || "Đang cập nhật"} />
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                            <Info size={18} className="text-blue-500" /> Nội dung phim
                        </h3>
                        <div
                            className="text-[#94a3b8] leading-relaxed text-sm md:text-base space-y-4"
                            dangerouslySetInnerHTML={{ __html: movie.content }}
                        ></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                                <Users size={16} className="text-blue-500" /> Diễn viên
                            </h3>
                            <p className="text-[#94a3b8] text-sm">{movie?.actor?.filter(a => a !== "").join(", ") || "Đang cập nhật"}</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                                <List size={16} className="text-blue-500" /> Thể loại
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {movie?.category?.map(cat => (
                                    <span key={cat.name} className="px-3 py-1 bg-[#0f1e30] border border-[#1e3a52] rounded-full text-xs text-[#cbd5e1]">
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content: Episodes */}
                <div className="space-y-6">
                    <div className="bg-[#0f1e30] border border-[#1e3a52] rounded-3xl p-6 sticky top-24">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            <Play size={18} className="text-blue-500 fill-blue-500" /> Danh sách tập
                        </h3>

                        {episodes.length > 1 && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                {episodes.map((server, idx) => (
                                    <button
                                        key={server.server_name}
                                        onClick={() => setActiveServer(idx)}
                                        className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${activeServer === idx ? "bg-blue-600 text-white" : "bg-[#1e293b] text-[#94a3b8] hover:text-white"
                                            }`}
                                    >
                                        {server.server_name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {episodes[activeServer]?.server_data.map((ep) => (
                                <button
                                    key={ep.slug}
                                    onClick={() => setCurrentEpisode(ep)}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${currentEpisode?.slug === ep.slug
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400"
                                        : "bg-[#1e293b] text-[#94a3b8] hover:bg-[#2d3a4f] hover:text-white"
                                        }`}
                                >
                                    {ep.name.replace("Tập ", "")}
                                </button>
                            ))}
                        </div>

                        {(!episodes[activeServer] || episodes[activeServer].server_data.length === 0) && (
                            <p className="text-center text-[#475569] text-sm py-10">Chưa có dữ liệu tập phim</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2 text-[#475569] text-xs font-bold uppercase tracking-wider">
                {icon} {label}
            </div>
            <div className="text-sm font-semibold">{value}</div>
        </div>
    );
}
