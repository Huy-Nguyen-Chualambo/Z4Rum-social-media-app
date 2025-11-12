"use client";
import React, { useEffect, useState } from "react";
import { voteApi, VoteTopic, VoteComment } from "@/lib/api/voteApi";
import { useToast } from "@/lib/ui/toast";
import RequireAuth from "../_components/RequireAuth";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Plus, Clock, User, CheckCircle2, BarChart3, Loader2, MessageCircle, Image as ImageIcon, Send } from "lucide-react";

const fallbackAvatar = "https://avatars.githubusercontent.com/u/0?v=4";

const formatTimeRemaining = (endsAt: string) => {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Đã kết thúc";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
  return `Còn ${minutes} phút`;
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return "";
  }
};

export default function VotePage() {
  const { user } = useAuthStore();
  const { push } = useToast();
  const [topics, setTopics] = useState<VoteTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationHours, setDurationHours] = useState(24);
  
  // Comments state
  const [commentsByTopic, setCommentsByTopic] = useState<Record<string, VoteComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, { content: string; imageUrl: string }>>({});
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({});

  const loadTopics = async () => {
    setLoading(true);
    try {
      const data = await voteApi.list();
      setTopics(data);
    } catch (error: any) {
      push(error?.response?.data?.error || "Tải danh sách vote thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleVote = async (topicId: string, optionId: string) => {
    try {
      const updated = await voteApi.vote(topicId, optionId);
      setTopics((prev) => prev.map((t) => (t.id === topicId ? updated : t)));
      push("Đã vote thành công!", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Vote thất bại", "error");
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || options.filter((o) => o.trim()).length < 2) {
      push("Vui lòng nhập tiêu đề và ít nhất 2 lựa chọn", "error");
      return;
    }

    setCreating(true);
    try {
      const newTopic = await voteApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        options: options.filter((o) => o.trim()),
        durationHours,
      });
      setTopics((prev) => [newTopic, ...prev]);
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setDurationHours(24);
      push("Tạo topic vote thành công!", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Tạo topic thất bại", "error");
    } finally {
      setCreating(false);
    }
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const getTotalVotes = (topic: VoteTopic) => {
    return topic.options.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);
  };

  const getUserVote = (topic: VoteTopic) => {
    return topic.votes?.[0]?.optionId;
  };

  const loadComments = async (topicId: string) => {
    if (loadingComments[topicId]) return;
    setLoadingComments((prev) => ({ ...prev, [topicId]: true }));
    try {
      const data = await voteApi.comments.list(topicId, { limit: 50 });
      setCommentsByTopic((prev) => ({ ...prev, [topicId]: data.items }));
    } catch (error: any) {
      push(error?.response?.data?.error || "Tải bình luận thất bại", "error");
    } finally {
      setLoadingComments((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  const toggleComments = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
      if (!commentsByTopic[topicId]) {
        loadComments(topicId);
      }
    }
    setExpandedTopics(newExpanded);
  };

  const handleAddComment = async (topicId: string) => {
    const input = commentInputs[topicId] || { content: "", imageUrl: "" };
    if (!input.content.trim() && !input.imageUrl.trim()) {
      push("Vui lòng nhập nội dung hoặc URL ảnh", "error");
      return;
    }

    if (sendingComment[topicId]) return;
    setSendingComment((prev) => ({ ...prev, [topicId]: true }));

    try {
      const result = await voteApi.comments.create(topicId, {
        content: input.content.trim() || undefined,
        imageUrl: input.imageUrl.trim() || undefined,
      });
      setCommentsByTopic((prev) => ({
        ...prev,
        [topicId]: [result.item, ...(prev[topicId] || [])],
      }));
      setCommentInputs((prev) => ({ ...prev, [topicId]: { content: "", imageUrl: "" } }));
      push("Đã thêm bình luận!", "success");
    } catch (error: any) {
      push(error?.response?.data?.error || "Thêm bình luận thất bại", "error");
    } finally {
      setSendingComment((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] font-sans text-[#F1F5F9]">
      <RequireAuth />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-3xl font-bold flex items-center gap-3">
            <BarChart3 size={32} className="text-[#3B82F6]" />
            Bình chọn
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Tạo topic mới
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#3B82F6]" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8]">
            <p>Chưa có topic nào. Hãy tạo topic đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => {
              const totalVotes = getTotalVotes(topic);
              const userVote = getUserVote(topic);
              const isEnded = new Date(topic.endsAt) < new Date();

              return (
                <div
                  key={topic.id}
                  className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-white text-xl font-semibold mb-2">{topic.title}</h2>
                      {topic.description && (
                        <p className="text-[#cbd5e1] text-sm mb-3">{topic.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
                        {topic.author && (
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            <span>{topic.author.username}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span>{formatTimeRemaining(topic.endsAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 size={16} />
                          <span>{totalVotes} lượt vote</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {topic.options.map((option) => {
                      const voteCount = option._count?.votes || 0;
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      const isSelected = userVote === option.id;

                      return (
                        <button
                          key={option.id}
                          onClick={() => !isEnded && !isSelected && handleVote(topic.id, option.id)}
                          disabled={isEnded || isSelected}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                            isSelected
                              ? "border-[#3B82F6] bg-[#1e3a5a]"
                              : isEnded
                              ? "border-[#1e3a52] bg-[#091427] opacity-60 cursor-not-allowed"
                              : "border-[#1e3a52] bg-[#091427] hover:border-[#2d5a7b] hover:bg-[#0d1b2f] cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3 flex-1">
                              {isSelected && <CheckCircle2 size={20} className="text-[#3B82F6]" />}
                              <span className={`font-medium ${isSelected ? "text-white" : "text-[#cbd5e1]"}`}>
                                {option.text}
                              </span>
                            </div>
                            <div className="text-sm text-[#94a3b8]">
                              {voteCount} votes ({percentage.toFixed(1)}%)
                            </div>
                          </div>
                          {totalVotes > 0 && (
                            <div
                              className="absolute bottom-0 left-0 h-full bg-gradient-to-r from-[#3B82F6]/20 to-[#6366F1]/20 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comments Section */}
                  <div className="mt-6 border-t border-[#1e3a52] pt-4">
                    <button
                      onClick={() => toggleComments(topic.id)}
                      className="flex items-center gap-2 text-[#94a3b8] hover:text-white transition-colors mb-4"
                    >
                      <MessageCircle size={18} />
                      <span className="text-sm font-medium">
                        Bình luận {commentsByTopic[topic.id]?.length ? `(${commentsByTopic[topic.id].length})` : ""}
                      </span>
                    </button>

                    {expandedTopics.has(topic.id) && (
                      <div className="space-y-4">
                        {/* Comments List */}
                        {loadingComments[topic.id] ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-[#3B82F6]" />
                          </div>
                        ) : commentsByTopic[topic.id]?.length === 0 ? (
                          <div className="text-center py-8 text-[#64748b] text-sm">Chưa có bình luận nào</div>
                        ) : (
                          <div className="space-y-3">
                            {commentsByTopic[topic.id]?.map((comment) => (
                              <div key={comment.id} className="bg-[#091427] border border-[#1e3a52] rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                  <img
                                    src={comment.author.avatarUrl || fallbackAvatar}
                                    alt={comment.author.username}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1e3a52]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-white font-semibold text-sm">{comment.author.username}</span>
                                      <span className="text-[#64748b] text-xs">{formatDateTime(comment.createdAt)}</span>
                                    </div>
                                    {comment.content && (
                                      <p className="text-[#cbd5e1] text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>
                                    )}
                                    {comment.imageUrl && (
                                      <div className="mt-2 rounded-lg overflow-hidden">
                                        <img
                                          src={comment.imageUrl}
                                          alt="comment"
                                          className="max-w-full max-h-96 object-contain rounded-lg border border-[#1e3a52]"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Input */}
                        <div className="bg-[#091427] border border-[#1e3a52] rounded-xl p-4 space-y-3">
                          <textarea
                            value={commentInputs[topic.id]?.content || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [topic.id]: { ...(prev[topic.id] || { content: "", imageUrl: "" }), content: e.target.value },
                              }))
                            }
                            placeholder="Viết bình luận..."
                            rows={3}
                            className="w-full bg-transparent border border-[#1e3a52] rounded-lg px-3 py-2 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <ImageIcon size={18} className="text-[#64748b]" />
                            <input
                              value={commentInputs[topic.id]?.imageUrl || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [topic.id]: { ...(prev[topic.id] || { content: "", imageUrl: "" }), imageUrl: e.target.value },
                                }))
                              }
                              placeholder="URL ảnh (tùy chọn)"
                              className="flex-1 bg-transparent border-b border-[#1e3a52] px-2 py-1 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
                            />
                          </div>
                          <button
                            onClick={() => handleAddComment(topic.id)}
                            disabled={sendingComment[topic.id]}
                            className="w-full px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {sendingComment[topic.id] ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <>
                                <Send size={18} />
                                Gửi bình luận
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-white text-2xl font-bold mb-4">Tạo topic vote mới</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-semibold mb-2 block">Tiêu đề *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề topic..."
                    className="w-full bg-[#091427] border border-[#1e3a52] rounded-xl px-4 py-2 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-semibold mb-2 block">Mô tả (tùy chọn)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả..."
                    rows={3}
                    className="w-full bg-[#091427] border border-[#1e3a52] rounded-xl px-4 py-2 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-semibold mb-2 block">Lựa chọn * (tối thiểu 2)</label>
                  <div className="space-y-2">
                    {options.map((opt, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...options];
                            newOptions[index] = e.target.value;
                            setOptions(newOptions);
                          }}
                          placeholder={`Lựa chọn ${index + 1}...`}
                          className="flex-1 bg-[#091427] border border-[#1e3a52] rounded-xl px-4 py-2 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 bg-[#2a0f17] text-red-300 rounded-lg hover:bg-[#3a121c] transition-colors"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                    {options.length < 10 && (
                      <button
                        onClick={addOption}
                        className="w-full py-2 border-2 border-dashed border-[#1e3a52] text-[#94a3b8] rounded-xl hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors"
                      >
                        + Thêm lựa chọn
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-semibold mb-2 block">Thời gian vote (giờ)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full bg-[#091427] border border-[#1e3a52] rounded-xl px-4 py-2 text-[#cbd5e1] outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                    {creating ? "Đang tạo..." : "Tạo topic"}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-3 bg-[#2a0f17] text-red-300 font-semibold rounded-xl hover:bg-[#3a121c] transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
