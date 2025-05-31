const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();
require("./config");

const app = express();
app.use(cors());
app.use(express.json());

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isPublic: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);
const Post = mongoose.model("Post", PostSchema);

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ message: "Uživatel už existuje." });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: "Registrováno." });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Špatné přihlašovací údaje." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Špatné heslo." });

  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get("/posts", authenticateToken, async (req, res) => {
  const posts = await Post.find({
    $or: [
      { isPublic: true },
      { author: req.user.id }
    ]
  });
  res.json(posts);
});

app.post("/posts", authenticateToken, async (req, res) => {
  const { title, content, isPublic } = req.body;
  const post = new Post({ title, content, isPublic: !!isPublic, author: req.user.id });
  await post.save();
  res.json(post);
});

app.get("/posts/:id", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post nenalezen." });
    if (post.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Nemáš oprávnění tento post zobrazit." });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Chyba serveru." });
  }
});

app.put("/posts/:id", authenticateToken, async (req, res) => {
  const { title, content, isPublic } = req.body;

  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post nenalezen." });
    if (post.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Nemáš oprávnění tento post upravit." });

    post.title = title;
    post.content = content;
    post.isPublic = !!isPublic;

    await post.save();
    res.json({ message: "Příspěvek upraven.", post });
  } catch (err) {
    res.status(500).json({ message: "Chyba serveru při úpravě." });
  }
});

app.delete("/posts/:id", authenticateToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post nenalezen." });
  if (post.author.toString() !== req.user.id)
    return res.status(403).json({ message: "Nemáš oprávnění tento post smazat." });

  await Post.deleteOne({ _id: req.params.id });
  res.json({ message: "Smazáno." });
});

app.listen(3000, () => {
  console.log("Server běží na portu 3000");
});