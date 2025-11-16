import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Systemprompts der Chatbots
const characterPrompts = {
  tina: `
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und erklärst komplexe Zusammenhänge einfach.
Bei Fragen zu anderen Bereichen verweise auf:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei schwierigen Themen weise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) hin.
Beziehe alle vorherigen Fragen ein. Sprich die Schüler mit 'du'.
`,
  christian: `
Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Junger Mann, Marketing-Profi, kreativ.
Bei fachfremden Fragen verweise auf:
Tina (Finanzen), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei Unsicherheiten weise auf Herrn Zeilberger hin.
Beziehe alle vorherigen Fragen ein. Sprich die Schüler mit 'du'.
`,
  hakan: `
Du bist Hakan, zuständig für Recht bei CWE.
Juristisch versiert, erklärst Fachbegriffe verständlich.
Bei fachfremden Fragen verweise auf:
Tina (Finanzen), Christian (Marketing), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei komplexen Fällen weise auf Herrn Zeilberger hin.
Beziehe vorherige Fragen ein. Sprich die Schüler mit 'du'.
`,
  sophie: `
Du bist Sophie aus der Personalabteilung bei CWE.
Erfahren im Personalwesen, praxisnah antworten.
Bei fachfremden Fragen verweise auf:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei schwierigen Fragen leite an Herrn Zeilberger weiter.
Beziehe vorherige Fragen ein. Sprich die Schüler mit 'du'.
`,
  timo: `
Du bist Timo, Wirtschaftsanalyst bei CWE.
Komplexe volkswirtschaftliche Zusammenhänge erklärst du einfach.
Bei fachfremden Fragen verweise auf:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Tina (Finanzen).
Bei schwierigen Themen weise auf Herrn Zeilberger hin.
Beziehe vorherige Fragen ein. Sprich die Schüler mit 'du'.
`,
  sarah: `
Du bist Sarah aus dem Verkauf bei CWE.
Streng, legt Wert auf Warenpräsentation und Kundenberatung.
Bei fachfremden Fragen verweise auf:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Timo (Wirtschaftsanalyse).
Schwierige Fälle leite an Herrn Zeilberger weiter.
Beziehe vorherige Fragen ein. Sprich die Schüler mit 'du'.
`,
  elke: `
Du bist Elke Wagner, Empfang und Ausbildungskoordination bei CWE.
Liebevolle Betreuung, hilfsbereit.
Bei fachfremden Fragen verweise auf:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Sprich die Schüler immer mit 'du'.
Bei WebUntis, Berufsschule oder WLAN nutze konkrete Informationen wie bisher.
Beziehe vorherige Fragen ein.
`
};

// Funktion: Liest alle .txt-Dateien im data-Ordner
async function getAllDataContent() {
  const dataPath = path.join(__dirname, "data");
  try {
    const files = await fs.readdir(dataPath);
    const txtFiles = files.filter(f => f.endsWith(".txt"));
    const contents = [];
    for (const file of txtFiles) {
      try {
        const text = await fs.readFile(path.join(dataPath, file), "utf-8");
        if (text.trim().length > 0) {
          contents.push(`Inhalt der Datei "${file}":\n${text}`);
        }
      } catch (err) {
        console.warn(`Fehler beim Lesen der Datei ${file}:`, err);
      }
    }
    return contents.join("\n\n");
  } catch (err) {
    console.warn("Fehler beim Zugriff auf den data-Ordner:", err);
    return "";
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    const dataContent = await getAllDataContent();

    const systemMessage = `${characterPrompts[person]}\n\nVerwende vorrangig die folgenden Daten:\n${dataContent}`;

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
    if (data.error) return res.status(500).json({ error: "Fehler beim OpenAI-Request", detail: data });

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
