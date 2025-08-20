const onlineUsers = {}; // { socket.id: {id, name} }
const chatController = require("../Controllers/chat.controller");
const userController = require("../Controllers/user.controller");
const axios = require("axios"); // 1. 서버끼리 통신하기 위한 라이브러리를 불러옵니다.

// 2. 우리가 켜놓은 파이썬 AI 서버의 주소를 변수로 저장합니다.
// 파이썬 main.py는 8000번 포트의 루트(/) 주소를 사용하도록 설정했습니다.
const AI_API_URL = "http://127.0.0.1:8000/";

module.exports = function (io) {
    io.on("connection", async (socket) => {
        console.log("🟢  새 클라이언트:", socket.id);

        // 회원가입 이벤트
        socket.on("register", async ({ name, password }, cb) => {
            try {
                const user = await userController.registerUser(name, password, socket.id);
                onlineUsers[socket.id] = { id: user._id, name: user.name }; // 추가
                io.emit("userList", Object.values(onlineUsers));            // 추가: 전체 broadcast
                cb({ ok: true, user });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        // 로그인 이벤트 (이름+비번)
        socket.on("login", async ({ name, password }, cb) => {
            try {
                const user = await userController.loginUser(name, password, socket.id);
                onlineUsers[socket.id] = { id: user._id, name: user.name }; // 추가
                io.emit("userList", Object.values(onlineUsers));            // 추가
                const welcomeMessage = {
                    chat: `${user.name} is joined to this room`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", welcomeMessage);
                cb({ ok: true, user });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });


        socket.on("sendMessage", async (message, cb) => {
            try {
                const user = await userController.checkUser(socket.id);
                let textForDB = message; // 기본 원본
                let emojiForDB = "";

                try {
                    const response = await axios.post(AI_API_URL, { sentence: message });
                    if (response.data) {
                        textForDB = response.data.text || message;
                        emojiForDB = response.data.emoji || "";
                    }
                } catch (err) {
                    console.error("AI 서버 통신 오류:", err.message);
                }

                // DB에 문장(text)과 이모티콘(emoji) 따로 저장
                const newMessage = await chatController.saveChat(textForDB, user, emojiForDB);

                io.emit("message", newMessage);
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });


        socket.on("disconnect", () => {
            delete onlineUsers[socket.id];
            io.emit("userList", Object.values(onlineUsers)); // 목록 재전송하여 실시간 반영
            console.log("🔴  연결 해제:", socket.id);
        });
    });
};