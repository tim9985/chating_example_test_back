require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
app.use(cors());


mongoose.connect(process.env.DB)
  .then(() => console.log("✅ DB 연결 성공"))
  .catch((err) => console.error("❌ DB 연결 실패:", err));

  module.exports = app
