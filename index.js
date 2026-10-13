const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { read, write, isVercel } = require("../lib/store");

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
const SECRET = process.env.JWT_SECRET || "development-only-change-me";
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  app: "SoundCart API",
  storage: isVercel ? "temporary /tmp JSON (not persistent on Vercel)" : "local JSON files"
}));

app.get("/api/products", (req, res) => {
  let products = read("products.json");
  const q = String(req.query.q || "").toLowerCase().trim();
  const category = String(req.query.category || "").trim();
  if (q) products = products.filter(p => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q));
  if (category && category !== "All") products = products.filter(p => p.category === category);
  res.json({ products });
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || !emailOk(email) || password.length < 8)
    return res.status(400).json({ error: "Enter a name, valid email and password of at least 8 characters." });
  const users = read("users.json");
  if (users.some(u => u.email === email)) return res.status(409).json({ error: "An account with this email already exists." });
  const user = { id: `u_${Date.now()}`, name, email, passwordHash: await bcrypt.hash(password, 12) };
  users.push(user); write("users.json", users);
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = read("users.json").find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: "Invalid email or password." });
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/orders", (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer || !String(customer.name || "").trim() || !emailOk(customer.email) ||
      String(customer.phone || "").trim().length < 8 || String(customer.address || "").trim().length < 8)
    return res.status(400).json({ error: "Please provide your name, valid email, phone and full delivery address." });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Your cart is empty." });
  const products = read("products.json");
  const cleanItems = [];
  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    const qty = Number(item.quantity);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20)
      return res.status(400).json({ error: "One of the cart items is invalid. Please refresh and try again." });
    cleanItems.push({ id: product.id, name: product.name, price: product.price, quantity: qty });
  }
  const total = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orders = read("orders.json");
  const order = {
    id: `SC-${Date.now().toString().slice(-8)}`,
    customer: { name: String(customer.name).trim(), email: String(customer.email).trim(), phone: String(customer.phone).trim(), address: String(customer.address).trim() },
    items: cleanItems, total, status: "Received", createdAt: new Date().toISOString()
  };
  orders.unshift(order); write("orders.json", orders);
  res.status(201).json({ message: "Order received!", order, persistenceNotice: isVercel ? "Demo deployment: JSON writes on Vercel are temporary and may disappear. Use persistent storage for real orders." : undefined });
});

app.use("/assets", express.static(path.join(__dirname, "..", "public", "assets")));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
module.exports = app;