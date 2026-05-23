const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Lưu trạng thái phòng trong RAM (đơn giản, không cần Redis cho bài tập)
const rooms = {};

io.on('connection', (socket) => {
    console.log(`🔌 Kết nối mới: ${socket.id}`);

    // Người dùng vào phòng
    socket.on('join-room', (roomId) => {
        socket.join(roomId);

        // Tạo phòng nếu chưa có
        if (!rooms[roomId]) {
            rooms[roomId] = { url: '', title: '', currentTime: 0, isPlaying: false };
        }

        // Gửi trạng thái hiện tại của phòng cho người mới vào
        socket.emit('sync-music', { action: 'init', ...rooms[roomId] });
        console.log(`🏠 ${socket.id} vào phòng: ${roomId}`);
    });

    // Nhận lệnh điều khiển nhạc từ host, broadcast cho cả phòng
    socket.on('music-control', (data) => {
        const { roomId, action, url, title, currentTime } = data;

        // Cập nhật trạng thái phòng
        if (rooms[roomId]) {
            if (action === 'change-song') {
                rooms[roomId].url = url;
                rooms[roomId].title = title;
                rooms[roomId].currentTime = 0;
                rooms[roomId].isPlaying = true;
            } else if (action === 'play') {
                rooms[roomId].isPlaying = true;
                rooms[roomId].currentTime = currentTime;
            } else if (action === 'pause') {
                rooms[roomId].isPlaying = false;
                rooms[roomId].currentTime = currentTime;
            }
        }

        console.log(`🎵 Phòng ${roomId} — ${action}`);

        // Gửi cho tất cả MÁY KHÁC trong phòng (không gửi lại cho người gửi)
        socket.to(roomId).emit('sync-music', data);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Ngắt kết nối: ${socket.id}`);
    });
});

// Health check endpoint
app.get('/health', (req, res) => res.send({ status: 'ok' }));

server.listen(3003, () => console.log('🚀 Room Service chạy tại cổng 3003'));
