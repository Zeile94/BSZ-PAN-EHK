import {
  parseRequestBody,
  sendLearningError
} from "../lib/learning-materials.js";

import {
  requestQuiz
} from "../lib/quiz-service.js";

export const config = {
  maxDuration: 120
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Nur POST ist erlaubt."
    });
  }

  let body;

  try {
    body = parseRequestBody(req.body);
  } catch {
    return res.status(400).json({
      error: "Ungültige JSON-Anfrage.",
      code: "INVALID_REQUEST"
    });
  }

  try {
    const result = await requestQuiz(body, {
      signal: AbortSignal.timeout(100000)
    });

    return res.status(200).json(result);
  } catch (error) {
    return sendLearningError(res, error);
  }
}