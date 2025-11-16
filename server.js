// ===============================
// server.js — VOLLSTÄNDIGE DATEI
// ===============================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------
// 🔑 OpenAI-Key aus Umgebungsvariable setzen
// ------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Fehler: Bitte Umgebungsvariable OPENAI_API_KEY setzen!");
  process.exit(1);
}

// ------------------------------
// 🧠 Speicher für beleidigte Bots
// ------------------------------
const insultedBots = new Set();

// ------------------------------
// 👥 Profile
// ------------------------------
const profiles = {
  tina: { name: "Tina Meyer" },
  christian: { name: "Christian Hofer" },
  hakan: { name: "Hakan Serdar" },
  sophie: { name: "Sophie Kampelsberger" },
  elke: { name: "Elke Göldner" },
  sarah: { name: "Sarah Hosse" },
  claudia: { name: "Claudia Weber" }
};

// ------------------------------
// 🔍 KI-Beleidigungscheck
// ------------------------------
async function isInsultByAI(userMessage) {
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Du bist ein Moderationssystem. Antworte nur JA oder NEIN. Ist die folgende Nachricht eine Beleidigung, Respektlosigkeit oder Beschimpfung?` },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1,
        temperature: 0
      })
    });

    if (!resp.ok) {
      console.error("OpenAI Fehler beim Insult-Check:", await resp.text());
      return false;
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "NEIN";
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei Insult-Check:", err);
    return false;
  }
}

// ------------------------------
// 🔍 KI-Entschuldigungscheck
// ------------------------------
async function isApologyByAI(userMessage) {
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Erkenne, ob der Nutzer sich entschuldigt. Antworte nur JA oder NEIN.` },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1,
        temperature: 0
      })
    });

    if (!resp.ok) return false;

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "NEIN";
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei Apology-Check:", err);
    return false;
  }
}

// ------------------------------
// 💬 Chat-Endpunkt
// ------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;
    if (!person || !profiles[person]) return res.status(400).json({ error: "Ungültige Person." });

    const userMessage = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";

    // Entschuldigung → Bot reaktivieren
    if (insultedBots.has(person)) {
      const apology = await isApologyByAI(userMessage);
      if (apology) {
        insultedBots.delete(person);
        return res.json({
          message: {
            role: "assistant",
            content: "Alles gut – Entschuldigung akzeptiert. Wie kann ich Ihnen helfen?"
          }
        });
      }
      // Bot bleibt stumm
      return
