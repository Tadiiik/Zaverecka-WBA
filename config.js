const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Připojeno k MongoDB"))
  .catch(err => console.error("Chyba připojení k MongoDB:", err));