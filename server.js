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
app.use(express.static(path.join(__dirname, "public"))); // Frontend ausliefern

// 🟣 POST /api/chat – unsere API-Route für Tina & Christian
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];

    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessage = messages.find(m => m.role === "user")?.content || "";

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Fehlender API-Key" });
    }

    // 🔹 Anfrage an OpenAI
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
Du bist ein Chatbot der CenterWarenhaus GmbH Eggenfelden (CWE).
Deine Rolle ergibt sich aus dem jeweiligen Chatkontext:

${systemMessage}

Verhaltensrichtlinien:
- Verwende stets eine freundliche, respektvolle und klare Ausdrucksweise.
- Formuliere kurz und prägnant (max. 4 Sätze).
- Verwende einfache Sprache, die auch Auszubildende verstehen.
- Mache nur eine kurze Begrüßung zu Beginn und keinen Abschied, außer die Nutzer:innen tun es zuerst.
- Antworte fachlich korrekt, aber nicht bürokratisch oder zu ausführlich.
- Verwende „du“ als Anrede.
- Beziehe dich, wenn sinnvoll, auf interne Abläufe oder typische Arbeitssituationen bei der CWE.
            `
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6
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

// 🔹 Fallback: index.html ausliefern
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
