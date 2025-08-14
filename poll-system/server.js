const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");
const Poll = require("./models/Poll");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

// Home - List all polls
app.get("/", async (req, res) => {
  const polls = await Poll.find();
  res.render("index", { polls });
});

// Create poll form
app.get("/create", (req, res) => {
  res.render("create");
});

// Handle poll creation
app.post("/create", async (req, res) => {
  const { question, options } = req.body;
  const poll = new Poll({
    id: Date.now().toString(),
    question,
    options: options.split(",").map(o => o.trim()),
    votes: Array(options.split(",").length).fill(0),
    voters: []
  });
  await poll.save();
  res.redirect("/");
});

// Show single poll
app.get("/poll/:id", async (req, res) => {
  const poll = await Poll.findOne({ id: req.params.id });
  if (!poll) return res.status(404).send("Poll not found.");
  res.render("poll", { poll });
});

// Vote
app.post("/vote/:id", async (req, res) => {
  const poll = await Poll.findOne({ id: req.params.id });
  if (!poll) return res.status(404).send("Poll not found.");

  const voterId = `${req.session.id}-${req.ip}`;
  if (poll.voters.includes(voterId)) {
    return res.send("❌ You already voted in this poll!");
  }

  poll.votes[req.body.option]++;
  poll.voters.push(voterId);
  await poll.save();

  io.to(poll.id).emit("voteUpdate", {
    votes: poll.votes,
    totalVotes: poll.votes.reduce((a, b) => a + b, 0)
  });

  res.redirect(`/poll/${poll.id}`);
});

// Socket.io for live updates
io.on("connection", (socket) => {
  socket.on("joinPoll", (pollId) => {
    socket.join(pollId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




