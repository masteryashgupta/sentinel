import express from "express";
import "express-async-errors";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import https from "https";

import casesRouter from "./routes/cases.js";
import campaignsRouter from "./routes/campaigns.js";
import reportsRouter from "./routes/reports.js";
import blacklistRouter from "./routes/blacklist.js";
import alertsRouter from "./routes/alerts.js";
import retentionRouter from "./routes/retention.js";

dotenv.config();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const agentOptions = {
  keepAlive: true,
  maxSockets: 20,
  maxFreeSockets: 5,
  timeout: 120_000,
};

export const mlHttpAgent = new http.Agent(agentOptions);
export const mlHttpsAgent = new https.Agent(agentOptions);

const app = express();
app.use(cors({
  origin: ["https://masteryashgupta.github.io", "http://localhost:5173"]
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Sentinel Backend API is running.");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "sentinel-backend", timestamp: new Date().toISOString() });
});

app.get("/api/system-status", async (req, res) => {
  const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/^"|"$/g, "");
  
  let mlStatus = "offline";
  let aiStatus = "offline";
  
  try {
    const isHttps = ML_SERVICE_URL.startsWith("https");
    const agent = isHttps ? mlHttpsAgent : mlHttpAgent;
    
    // Using fetch with an abort controller to prevent hanging if ML service is asleep
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout
    
    const mlRes = await fetch(`${ML_SERVICE_URL}/health`, { 
      agent: agent,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (mlRes.ok) {
      mlStatus = "online";
      const mlData = await mlRes.json();
      aiStatus = mlData.ai_engine || "offline";
    }
  } catch (err) {
    console.error("ML Service health check failed:", err.message);
  }
  
  res.json({
    backend: "online",
    ml_service: mlStatus,
    ai_engine: aiStatus
  });
});

app.use("/api/cases", casesRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/blacklist", blacklistRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/retention", retentionRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

const PORT = parseInt(process.env.PORT || "4000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sentinel backend running on port ${PORT}`);
});

// Increase keep-alive and header timeouts so slow upstream responses (ML service
// doing external DNS/WHOIS calls up to ~10 s) don't trigger premature 408/ECONNRESET.
server.keepAliveTimeout = 65_000;   // just over typical 60 s LB timeout
server.headersTimeout   = 70_000;
