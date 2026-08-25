import express from "express";
import { createUserClient } from "../lib/supabase.js";

const router = express.Router();

/**
 * GET /api/retention/eligible
 * Lists cases that are older than their retention_days window.
 * Does NOT delete anything — real deletion requires explicit legal sign-off.
 */
router.get("/eligible", async (req, res) => {
  try {
    const userClient = createUserClient(req.token);
    const { data: cases, error } = await userClient
      .from("cases")
      .select("id, subject, from_address, fraud_score, category, status, created_at, retention_days");

    if (error) return res.status(500).json({ error: error.message });

    const now = new Date();
    const eligible = cases.filter((c) => {
      const retentionDays = c.retention_days ?? 90;
      const createdAt = new Date(c.created_at);
      const ageMs = now - createdAt;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      return ageDays >= retentionDays;
    });

    res.json({
      total_cases: cases.length,
      eligible_for_purge: eligible.length,
      note: "These cases have exceeded their retention window. No automatic deletion occurs — explicit legal sign-off is required before purging.",
      cases: eligible,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/retention/:id — update the retention period for a specific case
 */
router.patch("/:id", async (req, res) => {
  const { retention_days } = req.body;
  if (!retention_days || typeof retention_days !== "number") {
    return res.status(400).json({ error: "retention_days must be a number" });
  }

  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("cases")
    .update({ retention_days })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
