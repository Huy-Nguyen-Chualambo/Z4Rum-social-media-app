"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { useMatchStore } from "@/lib/store/useMatchStore";
import RequireAuth from "../_components/RequireAuth";
import { Search, X, Send, Loader2, Users, Heart } from "lucide-react";
import { useToast } from "@/lib/ui/toast";

const fallbackAvatar = "https://avatars.githubusercontent.com/u/0?v=4";

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export default function MatchPage() {
  const { token, user } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const finding = useMatchStore((state) => state.finding);
  const sessionId = useMatchStore((state) => state.sessionId);
  const peer = useMatchStore((state) => state.peer);
  const messages = useMatchStore((state) => state.messages);
  const matchMode = useMatchStore((state) => state.matchMode);
  const startFinding = useMatchStore((state) => state.startFinding);
  const setFound = useMatchStore((state) => state.setFound);
  const addMessage = useMatchStore((state) => state.addMessage);
  const endSession = useMatchStore((state) => state.endSession);
  const { push } = useToast();
  const [selectedMode, setSelectedMode] = useState<"normal" | "opposite">("normal");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    if (token) connect(token);
    return () => disconnect();
  }, [token, connect, disconnect]);

  // Check if user is near bottom of chat
  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Auto scroll only if user is near bottom or sent a message
  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Track scroll position
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;

    const onFound = (payload: any) => {
      setFound(payload.sessionId, payload.peer);
      push("Đã tìm thấy người để chat!", "success");
      shouldAutoScrollRef.current = true;
      setTimeout(() => scrollToBottom(true), 100);
    };

    const onMessage = (payload: any) => {
      // Check if message already exists to avoid duplicates
      const messageId = payload.id || `${payload.from}-${payload.createdAt || Date.now()}`;
      const isMyMessage = payload.from === user?.id;
      
      addMessage({
        id: messageId,
        content: payload.content,
        senderId: payload.from,
        createdAt: payload.createdAt || new Date().toISOString(),
      });

      // Auto scroll if it's my message or if user is near bottom
      if (isMyMessage) {
        shouldAutoScrollRef.current = true;
        scrollToBottom(true);
      } else {
        // Only scroll if user is already near bottom
        scrollToBottom(false);
      }
    };

    const onEnded = () => {
      endSession();
      push("Cuộc trò chuyện đã kết thúc", "info");
    };

    const onError = (payload: any) => {
      push(payload.message || "Có lỗi xảy ra", "error");
      endSession();
    };

    socket.on("match:found", onFound);
    socket.on("message:receive", onMessage);
    socket.on("session:ended", onEnded);
    socket.on("error", onError);

    return () => {
      socket.off("match:found", onFound);
      socket.off("message:receive", onMessage);
      socket.off("session:ended", onEnded);
      socket.off("error", onError);
    };
  }, [socket, setFound, addMessage, endSession, push, user]);

  // Initial scroll when messages first load
  useEffect(() => {
    if (messages.length > 0 && messages.length !== lastMessageCountRef.current) {
      const isNewMessage = messages.length > lastMessageCountRef.current;
      lastMessageCountRef.current = messages.length;
      
      if (isNewMessage) {
        // Only scroll if it's a new message and user is near bottom
        scrollToBottom(false);
      }
    }
  }, [messages.length]);

  const handleStartFinding = () => {
    if (!socket || !user) return;
    startFinding(selectedMode);
    socket.emit("match:join", { mode: selectedMode });
  };

  const handleStopFinding = () => {
    if (!socket) return;
    socket.emit("match:leave");
    endSession();
  };

  const handleEndSession = () => {
    if (!socket || !sessionId || !user) return;
    socket.emit("session:end", { sessionId, by: user.id });
    endSession();
  };

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !socket || !sessionId || !user || sending) return;

    setSending(true);
    try {
      // Force scroll when sending message
      shouldAutoScrollRef.current = true;
      socket.emit("message:send", {
        sessionId,
        from: user.id,
        content: text,
      });
      // Don't add optimistically - wait for server response to avoid duplicates
      setMessageInput("");
    } catch (error: any) {
      push(error?.message || "Gửi tin nhắn thất bại", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] font-sans text-[#F1F5F9]">
      <RequireAuth />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-[#0f1e30] to-[#0a1628] border border-[#1e3a52] rounded-2xl overflow-hidden">
          {!sessionId ? (
            <div className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-white text-3xl font-bold mb-2 flex items-center justify-center gap-3">
                  <Heart className="text-pink-500" size={32} />
                  Chat với người lạ
                </h1>
                <p className="text-[#94a3b8] text-sm">Kết nối và trò chuyện với những người mới</p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">Chọn chế độ ghép đôi:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedMode("normal")}
                      disabled={finding}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedMode === "normal"
                          ? "border-[#3B82F6] bg-[#1e3a5a] text-white"
                          : "border-[#1e3a52] bg-[#091427] text-[#cbd5e1] hover:border-[#2d5a7b]"
                      } ${finding ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Users size={24} className="mx-auto mb-2" />
                      <div className="font-semibold">Bình thường</div>
                      <div className="text-xs text-[#94a3b8] mt-1">Ghép cả nam và nữ</div>
                    </button>
                    <button
                      onClick={() => setSelectedMode("opposite")}
                      disabled={finding}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedMode === "opposite"
                          ? "border-[#F97316] bg-[#3a1e0a] text-white"
                          : "border-[#1e3a52] bg-[#091427] text-[#cbd5e1] hover:border-[#2d5a7b]"
                      } ${finding ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Heart size={24} className="mx-auto mb-2" />
                      <div className="font-semibold">Khác giới</div>
                      <div className="text-xs text-[#94a3b8] mt-1">Chỉ ghép khác giới</div>
                    </button>
                  </div>
                </div>

                {!finding ? (
                  <button
                    onClick={handleStartFinding}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={20} />
                    Bắt đầu tìm kiếm
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-[#091427] border border-[#1e3a52] rounded-xl p-6 text-center">
                      <Loader2 size={32} className="animate-spin text-[#3B82F6] mx-auto mb-3" />
                      <div className="text-white font-semibold mb-1">Đang tìm kiếm người để chat...</div>
                      <div className="text-[#94a3b8] text-sm">Vui lòng đợi trong giây lát</div>
                    </div>
                    <button
                      onClick={handleStopFinding}
                      className="w-full py-3 px-6 bg-[#2a0f17] text-red-300 font-semibold rounded-xl hover:bg-[#3a121c] transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Hủy tìm kiếm
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-[80vh]">
              {/* Header - Anonymous chat */}
              <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0d1b2f]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center ring-2 ring-[#1e3a52]">
                    <span className="text-white font-bold text-lg">?</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Người lạ</div>
                    <div className="text-[#94a3b8] text-xs">Chat ẩn danh</div>
                  </div>
                </div>
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-[#2a0f17] text-red-300 rounded-lg hover:bg-[#3a121c] transition-colors flex items-center gap-2 text-sm font-semibold"
                >
                  <X size={16} />
                  Kết thúc
                </button>
              </div>

              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0f1e]">
                {messages.length === 0 ? (
                  <div className="text-center text-[#64748b] py-8">
                    <p>Bắt đầu cuộc trò chuyện với người lạ...</p>
                  </div>
                ) : (
                  messages.map((msg: { id: string; content: string; senderId: string; createdAt: string }) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] ${isMine ? "order-2" : "order-1"}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isMine
                                ? "bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white"
                                : "bg-[#1e293b] text-[#cbd5e1]"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className={`text-[#64748b] text-xs mt-1 ${isMine ? "text-right" : "text-left"}`}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-[#1e293b] bg-[#0d1b2f] flex items-center gap-3">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-[#091427] border border-[#1e3a52] rounded-xl px-4 py-2 text-[#cbd5e1] placeholder:text-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  className="p-2 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
