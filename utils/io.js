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
    // 클라이언트가 연결되었을 때의 기본 설정
    io.on("connection", async (socket) => {
        console.log("🟢  새 클라이언트:", socket.id);

        // 사용자가 로그인했을 때의 이벤트 처리 
        socket.on("login", async (userName, cb) => {
            try {
                const user = await userController.saveUser(userName, socket.id);
                const welcomeMessage = {
                    chat: `${user.name} is joined to this room`,
                    user: { id: null, name: "system" },
                };
                io.emit("message", welcomeMessage);
                cb({ ok: true, data: user });
            } catch (error) {
                cb({ ok: false, error: error.message });
            }
        });

        // ▼▼▼▼▼ 여기가 바로 두 서버가 소통하는 핵심 부분입니다 ▼▼▼▼▼
        // 사용자가 메시지를 보냈을 때의 이벤트 처리
        socket.on("sendMessage", async (message, cb) => {
            try {
                const user = await userController.checkUser(socket.id);
                let emoticon = ""; // 숫자 태그를 저장할 변수

                try {
                    const response = await axios.post(AI_API_URL, { sentence: message });
                    const resultString = response.data.result; // 예: "{'화남': 43.21, '슬픔': 22.71}"
                    console.log("🤖 AI 서버로부터 받은 원본 응답:", resultString);

                    // --- ▼▼▼▼▼ 여기가 핵심 수정사항입니다 ▼▼▼▼▼ ---
                    // 1. 위에서 만든 '해독기'로 가장 점수가 높은 감정을 찾아냅니다.
                    const topEmotion = findTopEmotion(resultString);
                    console.log("👑 가장 높은 감정:", topEmotion);

                    // 2. 찾아낸 최고 감정에 따라 숫자 태그를 할당합니다.
                    if (topEmotion === '화남') {
                        emoticon = '😡'; // 또는 '\u{1F620}'
                    } else if (topEmotion === '불안') {
                        emoticon = '😟'; // 또는 '\u{1F625}' (유사한 이모티콘으로 대체)
                    } else if (topEmotion === '당황') {
                        emoticon = '😳'; // 또는 '\u{1F633}'
                    } else if (topEmotion === '행복') {
                        emoticon = '😊'; // 또는 '\u{1F604}'
                    } else if (topEmotion === '상심') { // 상심과 슬픔을 구분하려면 모델이 더 세분화되어야 합니다.
                        emoticon = '💔'; // 또는 '\u{1F494}'
                    } else if (topEmotion === '슬픔') {
                        emoticon = '😭'; // 또는 '\u{1F622}'
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
        // ▲▲▲▲▲ 여기까지가 두 서버의 소통이 일어나는 곳입니다 ▲▲▲▲▲

        // 사용자가 연결을 끊었을 때의 이벤트 처리 (기존과 동일)
        socket.on("disconnect", () => {
            console.log("🔴  연결 해제:", socket.id);
        });
    });
};