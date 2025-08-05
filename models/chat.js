// models/chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        chat: String,
        user: {
            id: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
            name: String,
        },
        // --- ▼▼▼▼▼ 바로 이 부분을 추가해야 합니다 ▼▼▼▼▼ ---
        emoticon: {
            type: String, // 숫자 태그 '1', '2' 또는 이모티콘 '😊' 등을 저장
            default: ''   // 기본값은 빈 문자열로 설정
        }
        
    },
    { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);