

const chatController = require("../Controllers/chat.controller");
const userController = require("../Controllers/user.controller");
                                   // 모듈 전역에 보관

module.exports=function(io){
    io.on("connection", async(socket) => {
        console.log("🟢  새 클라이언트:", socket.id);
        
        socket.on("login", async(userName, cb)=>{
        //유저 정보저장
        try{
            const user = await userController.saveUser(userName, socket.id);
            const welcomeMessage = {
                chat: `${user.name} is joined to this room`,
                user: {id: null, name: "system"},
            };
            io.emit("message", welcomeMessage);
            cb({ok:true, data:user})
        }catch(error){
            cb({ok:false, error: error.message});
        }
      });

      socket.on("sendMessage", async(message, cb)=>{
        try{
            // 유저를 먼저 찾아 socket id로 
            const user = await userController.checkUser(socket.id);

            //메세지 저장 (유저 매개변수로 저장)
            const newMessage = await chatController.saveChat(message, user);
            
            //서버가 모든 유저에게 메세지 전파
            io.emit("message", newMessage)
            cb({ok: true});

        }catch(error){
            cb({ok:false, error: error.message});
        }
    });

      socket.on("disconnect", () => {
        console.log("🔴  연결 해제:", socket.id);
      });
    });
};




