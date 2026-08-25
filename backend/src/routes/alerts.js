import express from "express";
import { createUserClient } from "../lib/supabase.js";

const router = express.Router();

/** GET /api/alerts — list all alerts, most recent first */
router.get("/", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("alerts")
    .select("*, cases(subject, from_address, fraud_score, category)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** PATCH /api/alerts/:id/acknowledge — acknowledge an alert */
router.patch("/:id/acknowledge", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("alerts")
    .update({ acknowledged: true })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
