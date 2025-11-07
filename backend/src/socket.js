export default function initSocket(io, prisma) {
  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("send_message", async (msg) => {
      io.emit("receive_message", msg);
    });

    socket.on("match_request", async ({ senderId, receiverId }) => {
      const existing = await prisma.match.findFirst({
        where: { senderId: receiverId, receiverId: senderId, status: "pending" },
      });
      if (existing) {
        await prisma.match.update({
          where: { id: existing.id },
          data: { status: "matched" },
        });
        io.emit("match_success", { senderId, receiverId });
      } else {
        await prisma.match.create({ data: { senderId, receiverId } });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
}
