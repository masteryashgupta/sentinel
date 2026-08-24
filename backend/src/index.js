import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

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

// Shared keep-alive HTTP agent for all outbound calls (node-fetch to ML service).
// Prevents "socket hang up" / ECONNRESET when multiple /analyze requests hit the
// ML service concurrently — reuses TCP connections instead of opening a new one per request.
export const mlHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 20,        // allow up to 20 concurrent connections to ML service
  maxFreeSockets: 5,     // keep 5 idle sockets warm
  timeout: 120_000,      // 2 min socket inactivity timeout
});

const app = express();
app.use(cors({
  origin: ["https://masteryashgupta.github.io", "http://localhost:5173"]
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "sentinel-backend", timestamp: new Date().toISOString() });
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

const PORT = parseInt(process.env.PORT || "4000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sentinel backend running on port ${PORT}`);
});

// Increase keep-alive and header timeouts so slow upstream responses (ML service
// doing external DNS/WHOIS calls up to ~10 s) don't trigger premature 408/ECONNRESET.
server.keepAliveTimeout = 65_000;   // just over typical 60 s LB timeout
server.headersTimeout   = 70_000;
