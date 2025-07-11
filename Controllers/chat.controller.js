const chat = require("../models/chat");
const chatController = {};

chatController.saveChat = async(message, user)=>{
    const newMessage = new chat({
        chat:message,
        user:{
            id:user._id,
            name:user.name
        }
    });
    await newMessage.save();
    return newMessage;
};

module.exports=chatController;