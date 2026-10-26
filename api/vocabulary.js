export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Methode nicht erlaubt."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY fehlt."
    });
  }

  const topic = String(req.body?.topic || "").trim();
  const count = Number(req.body?.count || 10);

  if (!topic || topic.length > 500) {
    return res.status(400).json({
      error: "Bitte ein Thema mit höchstens 500 Zeichen eingeben."
    });
  }

  if (!Number.isInteger(count) || count < 5 || count > 20) {
    return res.status(400).json({
      error: "Bitte zwischen 5 und 20 Vokabeln auswählen."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          store: false,
          reasoning: {
            effort: "low"
          },
          max_output_tokens: 6000,
          instructions: `
Du erstellst Lernvokabeln für kaufmännische Berufsschülerinnen und Berufsschüler.

Regeln:
- Erstelle genau ${count} unterschiedliche Vokabeln.
- Thema: "${topic}".
- Verwende praxisnahes, schulrelevantes Englisch.
- Keine sehr seltenen oder fachfremden Begriffe.
- Deutsche Begriffe: übliche Schreibweise, gegebenenfalls mit Artikel.
- Englische Begriffe: übliche Schreibweise, gegebenenfalls mit Artikel.
- Keine doppelten Vokabeln.
- Keine Erklärungen, Beispielsätze oder zusätzliche Felder.
- Gib ausschließlich gültiges JSON gemäß Schema zurück.
`.trim(),
          input: `Erstelle ${count} Englisch-Vokabeln zum Thema „${topic}“.`,
          text: {
            format: {
              type: "json_schema",
              name: "vocabulary_deck",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  topic: {
                    type: "string"
                  },
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        de: {
                          type: "string"
                        },
                        en: {
                          type: "string"
                        }
                      },
                      required: ["de", "en"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["topic", "cards"],
                additionalProperties: false
              }
            }
          }
        })
      }
    );

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("Unlesbare API-Antwort.");
    }

    if (!response.ok) {
      console.error("Vokabel-API-Fehler:", response.status, data);
      return res.status(502).json({
        error: "Die Vokabeln konnten nicht erstellt werden."
      });
    }

    const content = data.output
      ?.filter(item => item.type === "message")
      ?.flatMap(item => item.content || [])
      ?.find(part => part.type === "output_text");

    let deck;

    try {
      deck = JSON.parse(content?.text || "{}");
    } catch {
      throw new Error("Unvollständige Vokabeldaten.");
    }

    const cards = Array.isArray(deck.cards) ? deck.cards : [];

    const validCards = cards.filter(
      card =>
        card &&
        typeof card.de === "string" &&
        card.de.trim().length > 0 &&
        typeof card.en === "string" &&
        card.en.trim().length > 0
    );

    if (validCards.length < 5) {
      return res.status(502).json({
        error: "Es wurden nicht genügend gültige Vokabeln erstellt."
      });
    }

    return res.status(200).json({
      topic:
        typeof deck.topic === "string" && deck.topic.trim()
          ? deck.topic.trim()
          : topic,
      cards: validCards,
      materialContext: {
        basis: "",
        materialUsed: false,
        materialFiles: [],
        materialState: "unavailable",
        materialUnavailable: true,
        webSearchUsed: false,
        webSearchPerformed: false,
        currentCheckRequired: false,
        researchedAt: null,
        message:
          "Diese Vokabeln wurden ohne Zugriff auf die Unterrichtsmaterialien erstellt.",
        sources: []
      },
      sources: []
    });
  } catch (error) {
    console.error("Vokabel-Serverfehler:", error.message);

    return res.status(500).json({
      error: "Die Vokabeln konnten nicht erstellt werden."
    });
  }
}
