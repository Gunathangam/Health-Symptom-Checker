/**
 * Agentic AI Health Symptom Checker — Express Server
 * Powered by IBM Granite (watsonx.ai)
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const symptomsRouter = require("./routes/symptoms");

// ─── Validate required environment variables ──────────────────────────────────
const PLACEHOLDER_VALUES = ["your_ibm_cloud_api_key_here", "your_watsonx_project_id_here", ""];
const isPlaceholder = (v) => !v || PLACEHOLDER_VALUES.includes(v.trim());

const DEMO_MODE =
  isPlaceholder(process.env.IBM_API_KEY) ||
  isPlaceholder(process.env.WATSONX_PROJECT_ID);

if (DEMO_MODE) {
  console.warn("\n⚠️  [DEMO MODE] IBM credentials not set — using mock responses.");
  console.warn("   To use real IBM Granite AI, fill in your credentials in .env\n");
}

// Export so routes can check it
process.env._DEMO_MODE = DEMO_MODE ? "true" : "false";

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS — allow frontend origin
const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Rate limiting — 60 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});
app.use("/api/", limiter);

// ─── Serve static frontend ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/symptoms", symptomsRouter);

// Root info endpoint
app.get("/api", (_req, res) => {
  res.json({
    name: "Agentic AI Health Symptom Checker API",
    version: "1.0.0",
    poweredBy: "IBM Granite (watsonx.ai)",
    endpoints: {
      analyze: "POST /api/symptoms/analyze",
      health: "GET /api/symptoms/health",
    },
  });
});

// ─── Fallback: serve frontend for any unknown route ───────────────────────────
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Global Error]", err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Agentic AI Health Symptom Checker — Backend    ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  🟢  Server running at: http://localhost:${PORT}`);
  console.log(`  🤖  IBM Granite Model : ${process.env.GRANITE_MODEL_ID || "ibm/granite-13b-instruct-v2"}`);
  console.log(`  🌍  Environment       : ${process.env.NODE_ENV || "development"}`);
  console.log(`  🔑  Mode              : ${DEMO_MODE ? "DEMO (mock responses)" : "LIVE (IBM Granite)"}\n`);
  console.log("  Open in browser → http://localhost:" + PORT + "\n");
});

module.exports = app;
