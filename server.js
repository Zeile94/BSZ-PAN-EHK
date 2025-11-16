// ===============================
// server.js – VOLLSTÄNDIGE DATEI
// ===============================

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------
// OpenAI API-Key aus .env oder Umgebung
// -------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("FEHLER: OPENAI_API_KEY ist nicht gesetzt!");
  process.exit(1);
}

// -------------------------------
// Pfade für statische Dateien
// -------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------
// Bot-Profile
// -------------------------------
const insultedBots = new Set();
const profiles = {
  tina: { name: "Tina Meyer" },
  christian: { name: "Christian Hofer" },
  hakan: { name: "Hakan Serdar" },
  sophie: { name: "Sophie Kampelsberger" },
  elke: { name: "Elke Göldner" },
  sarah: { name: "Sarah Hosse" },
  claudia: { name: "Claudia Weber" }
};

// -------------------------------
// KI-Beleidigungserkennung
// -------------------------------
async function isInsultByAI(userMessage) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du bist ein Moderationssystem. Entscheide strikt mit JA oder NEIN: Ist die Nachricht eine Beleidigung, Herabwürdigung oder aggressive Beschimpfung?`
          },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1,
        temperature: 0
      })
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() || "NEIN";
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei Beleidigungserkennung:", err);
    return false;
  }
}

// -------------------------------
// KI-Entschuldigungsprüfung
// -------------------------------
async function isApologyByAI(userMessage) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Erkenne, ob der Nutzer sich entschuldigt. Antworte nur JA oder NEIN.`
          },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1,
        temperature: 0
      })
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() || "NEIN";
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei Entschuldigungserkennung:", err);
    return false;
  }
}

// -------------------------------
// Chat-Endpunkt
// -------------------------------
app.post("/api/chat", async (req, res) => {
  const { person, messages } = req.body;

  if (!person || !profiles[person]) return res.status(400).json({ error: "Ungültige Person." });

  const userMessage = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";

  // Entschuldigung → Bot wird wieder aktiv
  if (insultedBots.has(person)) {
    const apology = await isApologyByAI(userMessage);
    if (apology) {
      insultedBots.delete(person);
      return res.json({
        message: {
          role: "assistant",
          content: "Alles klar – Entschuldigung akzeptiert. Wie kann ich Ihnen helfen?"
        }
      });
    }
    // Bot bleibt stumm
    return res.json({ silent: true });
  }

  // Neue Beleidigung → Bot wird stumm + Claudia Notification
  const insultDetected = await isInsultByAI(userMessage);
  if (insultDetected && person !== "claudia") {
    insultedBots.add(person);
    return res.json({
      insult: true,
      notifyClaudia: true,
      message: { role: "assistant", content: "" }
    });
  }

  // Normaler Chat → OpenAI
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4
      })
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message || { content: "Keine Antwort erhalten." };
    return res.json({ message: answer });
  } catch (err) {
    console.error("Serverfehler beim OpenAI-Request:", err);
    return res.status(500).json({ error: "Serverfehler", detail: err.message });
  }
});

// -------------------------------
// Alle anderen Routen → index.html
// -------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// -------------------------------
// Server starten
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
