import {
  createLearningOffer,
  parseRequestBody,
  sendLearningError
} from "../lib/learning-materials.js";

export const config = {
  maxDuration: 120
};

function normalizedPreviousQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item =>
      typeof item === "string"
    )
    .slice(-12)
    .map(item =>
      item.slice(0, 1000)
    );
}

export default async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

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
      error: "Ungültige Anfrage."
    });
  }

  if (
    !body ||
    typeof body.topic !== "string" ||
    !body.topic.trim() ||
    body.topic.length > 500
  ) {
    return res.status(400).json({
      error:
        "Bitte ein Thema mit höchstens 500 Zeichen angeben."
    });
  }

  /*
    Die Oberfläche wartet bisher ungefähr 115 Sekunden.
    Das Backend beendet den Ablauf deshalb nach
    höchstens 100 Sekunden mit einer verständlichen Meldung.
  */
  const signal = AbortSignal.timeout(100000);

  try {
    const result = await createLearningOffer({
      kind: "quiz",
      requestedTopic: body.topic.trim(),
      count: 1,

      previousQuestions:
        normalizedPreviousQuestions(
          body.previousQuestions
        ),

      signal
    });

    return res.status(200).json(result);
  } catch (error) {
    return sendLearningError(
      res,
      error
    );
  }
}
