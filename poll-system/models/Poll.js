const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  id: String,
  question: String,
  options: [String],
  votes: [Number],
  voters: [String] // store IP + session combo for duplicate prevention
});

module.exports = mongoose.model("Poll", pollSchema);
