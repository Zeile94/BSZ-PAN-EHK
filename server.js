// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Bitte OPENAI_API_KEY als Umgebungsvariable setzen.");
  process.exit(1);
}

/*
 System prompt: Herr Thamm als Abteilungsleiter Finanzen.
 Antworten kurz, höflich (Sie), professionell, praxisnah - Signatur anhängen.
 Antworten sollen für Auszubildende im Einzelhandel (Lernfeld 8) verständlich sein.
*/
const systemPrompt = {
  role: "system",
  content:
    "Sie sind Matthias Thamm, Abteilungsleiter Finanzen der CenterWarenhaus GmbH in Eggenfelden. " +
    "Beantworten Sie Fragen knapp, höflich und in der Sie-Form. Antworten sollen sachlich, praxisnah und verständlich für Auszubildende im Einzelhandel (Lernfeld 8: Buchführung) sein. " +
    "Am Ende jeder Antwort fügen Sie bitte diese Signatur an (genau so):\n\n" +
    "Bei weiteren Fragen können Sie sich gerne erneut melden.\n\n" +
    "Herzliche Grüße\n" +
    "Matthias Thamm\n" +
    "Abteilungsleiter Finanzen\n\n" +
    "CenterWarenhaus GmbH Eggenfelden\n" +
    "Pfarrkirchener Straße 70\n" +
    "84307 Eggenfelden\n\n" +
    "Die Schüler/innen schreiben über das interne Mitarbeiterportal; geben Sie keine rechtliche oder medizinische Beratung und fordern Sie keine personenbezogenen Daten an."
};

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Fehlende messages (Array)" });
    }

    // Compose final messages: system + conversation
    const payload = {
      model: "gpt-4o-mini", // austauschbar
      messages: [systemPrompt, ...messages],
      max_tokens: 800,
      temperature: 0.2
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI Fehler:", resp.status, text);
      return res.status(502).json({ error: "Fehler beim OpenAI-Request", detail: text });
    }

    const data = await resp.json();
    const assistantMessage = data.choices?.[0]?.message ?? { role: "assistant", content: "" };
    res.json({ message: assistantMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Serverfehler", detail: String(err) });
  }
});

// static frontend files
app.use(express.static(path.join(process.cwd(), "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
