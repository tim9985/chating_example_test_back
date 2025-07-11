const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "User must type name"],
        unique:true,
    },
    token:{
        type:String, // 연결 ID 정보
    },
    online:{
        type:Boolean,
        default:false,
    },
});
module.exports = mongoose.model("User", userSchema);