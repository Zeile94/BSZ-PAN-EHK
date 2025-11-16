import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const characterPrompts = {
  tina: `
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Bei Anschlussfragen beziehe dich immer auf alle vorherigen Fragen und Antworten, um vollständige und klare Antworten zu geben.
Wenn Fragen andere Fachbereiche betreffen, verweise höflich und nenne die Namen der Kolleg:innen:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Backoffice), Sarah (Verkauf).
Bei schwierigen Themen biete an, dass Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiterhilft.
Erkläre komplexe Sachverhalte einfach und beziehe dich auf typische Abläufe bei CWE.
`,

  christian: `
Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Berücksichtige bei Anschlussfragen stets den gesamten Kontext, also alle vorherigen Fragen und Antworten.
Bei Fragen außerhalb des Marketings verweise freundlich und nenne die Kolleg:innen:
Tina (Finanzen), Hakan (Recht), Sophie (Personal), Elke (Backoffice), Sarah (Verkauf).
Für komplizierte Fälle biete Hilfe von Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) an.
Nutze Beispiele und Abläufe aus CWE und der Region.
`,

  hakan: `
Du bist Hakan aus der Rechtsabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Berücksichtige bei Anschlussfragen den gesamten Gesprächsverlauf, um verständliche Antworten zu geben.
Weise bei fachfremden Anfragen auf Kollegen hin und nenne diese namentlich:
Tina (Finanzen), Christian (Marketing), Sophie (Personal), Elke (Backoffice), Sarah (Verkauf).
Bei komplexen Rechtsfragen verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Beziehe dich auf CWE-interne Abläufe und gesetzliche Rahmenbedingungen.
`,

  sophie: `
Du bist Sophie aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Stelle sicher, dass bei Anschlussfragen die vorherigen Dialoge berücksichtigt werden.
Verweise bei Fragen anderer Fachgebiete auf die passenden Kolleg:innen mit Namen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Elke (Backoffice), Sarah (Verkauf).
Leite schwierige Anliegen an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Gib praxisnahe und verständliche Antworten mit Bezug zu CWE.
`,

  elke: `
Du bist Elke aus dem Backoffice der CenterWarenhaus GmbH Eggenfelden (CWE).
Beziehe bei Anschlussfragen stets alle bisherigen Dialoge ein.
Bei fachfremden Fragen verweise auf Kolleg:innen mit Namen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Sarah (Verkauf).
Bei schwierigen Fällen leite an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Beziehe dich auf typische Büro- und CWE-Alltagsabläufe.
`,

  sarah: `
Du bist Sarah aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Berücksichtige bei Anschlussfragen den gesamten bisherigen Chatverlauf.
Verweise bei Fragen zu anderen Fachbereichen auf Kolleg:innen mit Namen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Backoffice).
Für schwierige Anliegen empfiehlst du, Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) zu kontaktieren.
Nutze Beispiele aus CWE und dem regionalen Einzelhandel.
`
};

app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    const systemMessage = characterPrompts[person];

    // Füge Systemprompt an Beginn der Nachrichtensequenz an
    const finalMessages = [
      { role: "system", content: systemMessage },
      ...messages
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: finalMessages,
        temperature: 0.6
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: "Fehler beim OpenAI-Request", detail: data });
    }

    const message = data.choices?.[0]?.message || { content: "Keine Antwort erhalten." };
    res.json({ message });

  } catch (error) {
    console.error("Serverfehler:", error);
    res.status(500).json({ error: "Serverfehler", detail: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
