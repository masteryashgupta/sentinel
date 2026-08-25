import express from "express";
import { createUserClient } from "../lib/supabase.js";

const router = express.Router();

/** GET /api/campaigns — list all correlated campaigns with case counts */
router.get("/", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** GET /api/campaigns/:id — campaign detail with linked cases */
router.get("/:id", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { data: campaign, error } = await userClient
    .from("campaigns")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Campaign not found" });

  const { data: links } = await userClient
    .from("campaign_cases")
    .select("cases(*)")
    .eq("campaign_id", req.params.id);

  res.json({ ...campaign, cases: links?.map((l) => l.cases) || [] });
});

export default router;
