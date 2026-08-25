import express from "express";
import { createUserClient } from "../lib/supabase.js";

const router = express.Router();

/** GET /api/blacklist — list all blacklisted indicators */
router.get("/", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("known_bad_indicators")
    .select("*")
    .order("added_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** POST /api/blacklist — add a new indicator to the analyst blacklist */
router.post("/", async (req, res) => {
  const { type, value, source } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: "Missing required fields: type and value" });
  }

  const userClient = createUserClient(req.token);
  const { data, error } = await userClient
    .from("known_bad_indicators")
    .insert({
      user_id: req.userId,
      type: type.toLowerCase(),
      value: value.trim(),
      source: source || "analyst_entry",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
/** DELETE /api/blacklist/:id — remove an indicator from the blacklist */
router.delete("/:id", async (req, res) => {
  const userClient = createUserClient(req.token);
  const { error } = await userClient
    .from("known_bad_indicators")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId); // Ensure they can only delete their own

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
