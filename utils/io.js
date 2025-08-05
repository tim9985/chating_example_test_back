const chatController = require("../Controllers/chat.controller");
const userController = require("../Controllers/user.controller");
const axios = require("axios"); // 1. 서버끼리 통신하기 위한 라이브러리를 불러옵니다.

// 2. 우리가 켜놓은 파이썬 AI 서버의 주소를 변수로 저장합니다.
// 파이썬 main.py는 8000번 포트의 루트(/) 주소를 사용하도록 설정했습니다.
const AI_API_URL = "http://127.0.0.1:8000/";

function findTopEmotion(resultString) {
    try {
        // 1. 문자열에서 숫자와 한글, 쉼표, 콜론만 남기고 정리합니다.
        const cleanedString = resultString.replace(/[{'}\s]/g, '');
        if (!cleanedString) return null;

        // 2. 쉼표(,)를 기준으로 각 감정 쌍으로 나눕니다. -> ["화남:43.21", "슬픔:22.71"]
        const pairs = cleanedString.split(',');

        let topEmotion = null;
        let maxScore = -1;

        // 3. 각 감정 쌍을 순회하며 가장 높은 점수를 찾습니다.
        for (const pair of pairs) {
            const [emotion, scoreStr] = pair.split(':'); // -> ["화남", "43.21"]
            const score = parseFloat(scoreStr);

            if (score > maxScore) {
                maxScore = score;
                topEmotion = emotion;
            }
        }
        return topEmotion; // -> '화남'
    } catch (error) {
        console.error("감정 결과 문자열 파싱 중 오류:", error);
        return null;
    }
}

module.exports = function (io) {
    io.on("connection", async (socket) => {
        console.log("🟢  새 클라이언트:", socket.id);

        // 회원가입 이벤트
        socket.on("register", async ({ name, password }, cb) => {
            try {
                const user = await userController.registerUser(name, password, socket.id);
                cb({ ok: true, user });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        // 로그인 이벤트 (이름+비번)
        socket.on("login", async ({ name, password }, cb) => {
            try {
                const user = await userController.loginUser(name, password, socket.id);
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

        // sendMessage 등 이하 기존 코드 동일
        socket.on("sendMessage", async (message, cb) => {
            try {
                const user = await userController.checkUser(socket.id);
                let emoticon = "";
                try {
                    const response = await axios.post(AI_API_URL, { sentence: message });
                    const resultString = response.data.result;
                    const topEmotion = findTopEmotion(resultString);
                    // 이모티콘 매핑 코드 ...
                    if (topEmotion === '화남') {
                        emoticon = '😡';
                    } else if (topEmotion === '불안') {
                        emoticon = '😟';
                    } else if (topEmotion === '당황') {
                        emoticon = '😳';
                    } else if (topEmotion === '행복') {
                        emoticon = '😊';
                    } else if (topEmotion === '상심') {
                        emoticon = '💔';
                    } else if (topEmotion === '슬픔') {
                        emoticon = '😭';
                    }
                } catch (aiError) {
                    console.error("AI 서버와 통신 중 오류 발생:", aiError.message);
                }

                const newMessage = await chatController.saveChat(message, user, emoticon);
                io.emit("message", newMessage);
                cb({ ok: true });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        socket.on("disconnect", () => {
            console.log("🔴  연결 해제:", socket.id);
        });
    });
};