import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Damit Vercel weiß, wo der API-Key herkommt:
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔹 Pfad-Einstellungen, damit public-Files gefunden werden:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public"))); // 👈 WICHTIG

// 🟣 POST /api/chat – unsere API-Route für Tina & Christian
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];

    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessage = messages.find(m => m.role === "user")?.content || "";

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Fehlender API-Key" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Du bist ein Chatbot für die CenterWarenhaus GmbH Eggenfelden (CWE).
Deine Rolle ist aus der folgenden Beschreibung ersichtlich:
${systemMessage}

Bitte beachte:
- Antworte kurz und klar (max. 4 Sätze).
- Verwende einfache, verständliche Sprache.
- Sei höflich und freundlich.
- Verweise ggf. auf interne Abläufe der CWE, falls sinnvoll.
- Verwende keine langen Einleitungen.
            `
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({
        error: "Fehler beim OpenAI-Request",
        detail: data
      });
    }

    const message = data.choices?.[0]?.message || { content: "Keine Antwort erhalten." };
    res.json({ message });

  } catch (error) {
    console.error("Fehler:", error);
    res.status(500).json({ error: "Serverfehler", detail: error.message });
  }
});

// 🔹 Fallback: index.html ausliefern, wenn nichts anderes passt
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
