const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const runtimeDir = process.env.VERCEL ? "/tmp/soundcart-data" : dataDir;
const isVercel = Boolean(process.env.VERCEL);

function ensureDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}
function filePath(name) { return path.join(runtimeDir, name); }
function read(name, fallback = []) {
  ensureDir();
  const target = filePath(name);
  try {
    if (fs.existsSync(target)) return JSON.parse(fs.readFileSync(target, "utf8"));
    // Seed catalog is bundled read-only and copied to the writable runtime area on first access.
    if (name === "products.json") {
      const seed = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
      fs.writeFileSync(target, JSON.stringify(seed, null, 2));
      return seed;
    }
    fs.writeFileSync(target, JSON.stringify(fallback, null, 2));
    return fallback;
  } catch (error) {
    console.error("Store read error:", error.message);
    return fallback;
  }
}
function write(name, value) {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(value, null, 2));
}
module.exports = { read, write, isVercel };