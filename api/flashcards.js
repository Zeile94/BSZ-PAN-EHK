import {
  createLearningOffer,
  parseRequestBody,
  sendLearningError
} from "../lib/learning-materials.js";

export const config = { maxDuration: 120 };

const ALLOWED_COUNTS = [5, 10, 15, 20];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Nur POST ist erlaubt." });
  }
  let body;
  try { body = parseRequestBody(req.body); }
  catch { return res.status(400).json({ error: "Ungültige Anfrage." }); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.topic !== "string" || !body.topic.trim() || body.topic.length > 500) {
    return res.status(400).json({ error: "Bitte ein Thema mit höchstens 500 Zeichen angeben." });
  }
  if (!ALLOWED_COUNTS.includes(body.count)) {
    return res.status(400).json({ error: "Bitte 5, 10, 15 oder 20 Lernkarten auswählen." });
  }
  try {
    const result = await createLearningOffer({
      kind: "flashcards",
      requestedTopic: body.topic.trim(),
      count: body.count,
      previousQuestions: [],
      signal: AbortSignal.timeout(100000)
    });
    return res.status(200).json(result);
  } catch (error) {
    return sendLearningError(res, error);
  }
}
