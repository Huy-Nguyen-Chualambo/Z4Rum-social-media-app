"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { useMatchStore } from "@/lib/store/useMatchStore";
import RequireAuth from "../_components/RequireAuth";
import { Search, X, Send, Loader2, Users, Heart } from "lucide-react";
import { useToast } from "@/lib/ui/toast";

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
  const messages = useMatchStore((state) => state.messages);
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
    <div className="min-h-screen bg-[#101010] font-sans text-[#ededed]">
      <RequireAuth />
      <div className="w-full">
        <div className="overflow-hidden">
          {!sessionId ? (
            <div className="px-5 py-5">
                <div className="space-y-5">
                  <div className="border-b border-neutral-800 pb-4 mb-5">
                    <h1 className="text-white text-xl font-bold mb-2 flex items-center gap-2">

                      Chat với người lạ
                    </h1>
                    <p className="text-[#a3a3a3] text-sm">Bảnh ghép kèo. Anh em mở lời.</p>
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-3 block">Chọn chế độ ghép đôi:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        aria-pressed={selectedMode === "normal"}
                        onClick={() => setSelectedMode("normal")}
                        disabled={finding}
                        className={`p-3 rounded-sm border transition-all ${
                          selectedMode === "normal"
                            ? "border-[#3B82F6] bg-[#1c1c1c] text-white"
                            : "border-[#303030] bg-[#181818] text-[#dedede] hover:border-[#525252]"
                        } ${finding ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Users size={18} className="mb-2" />
                        <div className="font-semibold">Bình thường</div>
                        <div className="text-xs text-[#a3a3a3] mt-1">Ghép cả nam và nữ</div>
                      </button>
                      <button
                        aria-pressed={selectedMode === "opposite"}
                        onClick={() => setSelectedMode("opposite")}
                        disabled={finding}
                        className={`p-3 rounded-sm border transition-all ${
                          selectedMode === "opposite"
                            ? "border-[#3B82F6] bg-[#1c1c1c] text-white"
                            : "border-[#303030] bg-[#181818] text-[#dedede] hover:border-[#525252]"
                        } ${finding ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Heart size={18} className="mb-2" />
                        <div className="font-semibold">Khác giới</div>
                        <div className="text-xs text-[#a3a3a3] mt-1">Chỉ ghép khác giới</div>
                      </button>
                    </div>
                  </div>

                  {!finding ? (
                    <button
                      onClick={handleStartFinding}
                      className="w-full py-2.5 px-4 bg-blue-500 text-white font-semibold rounded-sm   transition-all flex items-center justify-center gap-2"
                    >
                      <Search size={20} />
                      Bắt đầu tìm kiếm
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-[#181818] border border-[#303030] rounded-sm p-6 text-center">
                        <Loader2 size={32} className="animate-spin text-[#3B82F6] mx-auto mb-3" />
                        <div className="text-white font-semibold mb-1">Đang tìm kiếm người để chat...</div>
                        <div className="text-[#a3a3a3] text-sm">Vui lòng đợi trong giây lát</div>
                      </div>
                      <button
                        onClick={handleStopFinding}
                        className="w-full py-3 px-6 bg-[#2a0f17] text-red-300 font-semibold rounded-sm hover:bg-[#3a121c] transition-all flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Hủy tìm kiếm
                      </button>
                    </div>
                  )}
                </div>
            </div>
          ) : (
            <div className="mobile-chat-panel flex flex-col h-[80dvh]">
              {/* Header - Anonymous chat */}
              <div className="shrink-0 px-3 sm:px-6 py-3 border-b border-[#292929] flex items-center justify-between bg-[#141414]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center  ">
                    <span className="text-white font-bold text-lg">?</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Người lạ</div>
                    <div className="text-[#a3a3a3] text-xs">Chat ẩn danh</div>
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
              <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 bg-[#101010]">
                {messages.length === 0 ? (
                  <div className="text-center text-[#969696] py-8">
                    <p>Bắt đầu cuộc trò chuyện với người lạ...</p>
                  </div>
                ) : (
                  messages.map((msg: { id: string; content: string; senderId: string; createdAt: string }) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`min-w-0 max-w-[85%] sm:max-w-[70%] ${isMine ? "order-2" : "order-1"}`}>
                          <div
                            className={`whitespace-pre-wrap [overflow-wrap:anywhere] px-3 py-2 rounded-sm ${
                              isMine
                                ? "bg-blue-500 text-white"
                                : "bg-[#292929] text-[#dedede]"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className={`text-[#969696] text-xs mt-1 ${isMine ? "text-right" : "text-left"}`}>
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
              <div className="chat-input-row shrink-0 px-3 py-2 border-t border-[#292929] bg-[#141414] flex items-center gap-3">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  aria-label="Tin nhắn"
                  placeholder="Nhập tin nhắn..."
                  className="min-w-0 min-h-11 flex-1 bg-[#181818] border border-[#303030] rounded-sm px-4 py-2 text-[#dedede] placeholder:text-[#858585] outline-none focus:border-[#3B82F6] transition-colors"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  aria-label="Gửi tin nhắn"
                  disabled={sending || !messageInput.trim()}
                  className="min-h-11 min-w-11 shrink-0 flex items-center justify-center p-2 bg-blue-500 text-white rounded-sm   transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
