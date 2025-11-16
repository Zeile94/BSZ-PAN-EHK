// ===============================
// server.js — VOLLSTÄNDIGE DATEI
// ===============================

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Falls du Bilder/HTML lokal hostest

// --------------------------------
// 🔑 OpenAI-Client
// --------------------------------
const client = new OpenAI({
  apiKey: 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
});

// --------------------------------
// 🧠 Speicher, welcher Bot beleidigt wurde
// --------------------------------
const insultedBots = new Set();

// --------------------------------
// 📌 Bot-Profile
// --------------------------------
const profiles = {
  tina: { name: "Tina Meyer" },
  christian: { name: "Christian Hofer" },
  hakan: { name: "Hakan Serdar" },
  sophie: { name: "Sophie Kampelsberger" },
  elke: { name: "Elke Göldner" },
  sarah: { name: "Sarah Hosse" },
  claudia: { name: "Claudia Weber" }
};

// =====================================================================================
// 1) KI-BASIERTE BELEIDIGUNGSKONTROLLE
// =====================================================================================
async function isInsultByAI(userMessage) {
  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Du bist ein analytisches Moderationssystem.
Entscheide strikt mit "JA" oder "NEIN".
Frage: Enthält die folgende Nachricht eine Beleidigung, Herabwürdigung, Respektlosigkeit oder aggressive Beschimpfung?

Antworte nur mit:
JA  -> wenn es eindeutig eine Beleidigung ist
NEIN -> wenn nicht
`
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1,
      temperature: 0
    });

    const answer = result.choices[0].message.content.trim().toUpperCase();
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei KI-Beleidigungserkennung:", err);
    return false; // Im Fehlerfall lieber kein false positive
  }
}

// =====================================================================================
// 2) KI-BASIERTE ENT-SCHULDIGUNGSERKENNUNG
// =====================================================================================
async function isApologyByAI(userMessage) {
  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Du erkennst, ob der Nutzer sich entschuldigt.
Antworte NUR mit JA oder NEIN.
"Entschuldigung", "Tut mir leid", "Sorry", "Ich bitte um Verzeihung" usw. zählen.
`
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1,
      temperature: 0
    });

    const answer = result.choices[0].message.content.trim().toUpperCase();
    return answer === "JA";
  } catch (err) {
    console.error("Fehler bei KI-Entschuldigungsanalyse:", err);
    return false;
  }
}

// =====================================================================================
// 3) CHAT-ENDPUNKT
// =====================================================================================
app.post("/api/chat", async (req, res) => {
  const { person, messages } = req.body;

  if (!person || !profiles[person]) {
    return res.status(400).json({ error: "Ungültige Person." });
  }

  const userMessage = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";

  // =====================================================
  // A) Entschuldigung → Bot wird wieder aktiv
  // =====================================================
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

    // Bot bleibt komplett stumm
    return res.json({ silent: true });
  }

  // =====================================================
  // B) Neue Beleidigung → Bot wird stumm
  // =====================================================
  const insultDetected = await isInsultByAI(userMessage);

  if (insultDetected && person !== "claudia") {
    insultedBots.add(person);

    // Claudia bekommt ihre Erst-Nachricht
    return res.json({
      insult: true,
      notifyClaudia: true,
      message: {
        role: "assistant",
        content: "" // Leer → Frontend soll NICHTS anzeigen
      }
    });
  }

  // =====================================================
  // C) Normaler Chat, keine Beleidigung
  // =====================================================
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4
    });

    return res.json({
      message: response.choices[0].message
    });
  } catch (e) {
    console.error("Fehler:", e);
    return res.status(500).json({ error: "Serverfehler." });
  }
});

// =====================================================================================
// 4) SERVER START
// =====================================================================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
