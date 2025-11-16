// ===============================
// server.js – funktionierend
// ===============================

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("FEHLER: OPENAI_API_KEY ist nicht gesetzt!");
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===============================
// Pfade
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// Bots
// ===============================
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

// ===============================
// KI-Check: Beleidigung
// ===============================
async function isInsultByAI(userMessage) {
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Entscheide strikt: Ist die Nachricht eine Beleidigung? Antworte nur JA oder NEIN.` },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1,
      temperature: 0
    });
    const answer = resp.choices[0].message.content.trim().toUpperCase();
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei KI-Beleidigungserkennung:", err);
    return false;
  }
}

// ===============================
// KI-Check: Entschuldigung
// ===============================
async function isApologyByAI(userMessage) {
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Erkenne, ob der Nutzer sich entschuldigt hat. Nur JA oder NEIN.` },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1,
      temperature: 0
    });
    const answer = resp.choices[0].message.content.trim().toUpperCase();
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei KI-Entschuldigung:", err);
    return false;
  }
}

// ===============================
// Chat-Endpunkt
// ===============================
app.post("/api/chat", async (req, res) => {
  const { person, messages } = req.body;
  if (!person || !profiles[person]) return res.status(400).json({ error: "Ungültige Person." });

  const userMessage = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";

  // 1) Entschuldigung → Bot wieder aktiv
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
    return res.json({ silent: true });
  }

  // 2) Neue Beleidigung → Bot stumm + Claudia Notification
  const insultDetected = await isInsultByAI(userMessage);
  if (insultDetected && person !== "claudia") {
    insultedBots.add(person);
    return res.json({
      insult: true,
      notifyClaudia: true,
      message: { role: "assistant", content: "" } // leer → Frontend zeigt nichts
    });
  }

  // 3) Normaler Chat
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4
    });
    return res.json({ message: response.choices[0].message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// ===============================
// Statische Dateien: alle Routen
// ===============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ===============================
// Server starten
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
