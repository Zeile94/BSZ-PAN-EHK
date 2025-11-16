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

// Zuordnung der Chatbots zu ihren relevanten Data-Dateien
const dataFiles = {
  tina: [
    "08-KSK_Geschäftsprozesse erfassen und kontrollieren.txt",
    "11-KSK_Geschäftsprozesse erfolgsorientiert steuern.txt",
    "EHK Lehrbuch.txt",
    "EHP Lehrplan.txt"
  ],
  christian: [
    "05-EHP_Werben und den Verkauf fördern.txt",
    "12-EHP_Mit Marketingkonzepten Kunden gewinnen und binden, Teil 1.txt",
    "EHK Lehrbuch.txt",
    "EHP Lehrplan.txt"
  ],
  hakan: [
    "05-KOB_Leistungsansprüche unter Beachtung privatrechtlicher Tatbestände prüfen.txt",
    "FAD Lehrplan.txt"
  ],
  sophie: [
    "06-BGP_Personalwirtschaftliche Prozesse mitgestalten.txt",
    "FAD Lehrplan.txt"
  ],
  timo: [
    "11-BGP_Wirtschaftspolitische Einflüsse auf den Arbeitsmarkt beurteilen.txt",
    "FAD Lehrplan.txt"
  ],
  sarah: [],
  elke: []
};

// Systemprompts der Chatbots
const characterPrompts = {
  tina: `
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und verstehst auch komplexe Zusammenhänge, kannst diese einfach erklären.
Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei schwierigen Themen weise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) gerne weiter.
Beziehe dich auf alle vorherigen Fragen und Antworten für vollständige Antworten.
Sprich die Schüler immer mit 'du' an und erkläre komplexe Sachverhalte einfach unter Bezug auf CWE.
`,
  christian: `
Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann, seit ca. 5 Jahren dabei, der lässige Marketing-Typ mit vielen kreativen Ideen.
Bleibe im Marketing-Fachgebiet. Bei Fragen zu anderen Bereichen verweise auf Kollegen:
Tina (Finanzen), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei Unsicherheiten verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Beziehe alle vorherigen Fragen ein. Sprich die Schüler mit 'du'.
`,
  hakan: `
Du bist Hakan, zuständig für Recht bei CenterWarenhaus GmbH Eggenfelden (CWE).
Juristisch sehr versiert, erklärst Fachbegriffe verständlich.
Bleibe bei juristischen Fragen. Verweise bei anderen Themen auf:
Tina (Finanzen), Christian (Marketing), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei komplexen Fällen verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Beziehe alle vorherigen Dialoge ein. Sprich die Schüler mit 'du'.
`,
  sophie: `
Du bist Sophie aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 38 Jahre alt, Mutter von zwei kleinen Kindern, sehr erfahren im Personalwesen.
Antworten praxisnah. Bei anderen Themen auf Kollegen verweisen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Bei schwierigen Fragen leite an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Beziehe vorherige Dialoge ein. Sprich die Schüler mit 'du'.
`,
  timo: `
Du bist Timo und bist Wirtschaftsanalyst der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann, der sich mit Volkswirtschaft auskennt und komplexe Zusammenhänge einfach erklärt.
Bei Fragen zu anderen Bereichen verweise auf Kollegen:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Tina (Finanzen).
Bei schwierigen Themen weise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) hin.
Beziehe vorherige Dialoge ein. Sprich die Schüler mit 'du'. Erkläre auch praxisnah z. B. mit Bezug auf CWE oder Deutschland.
`,
  sarah: `
Du bist Sarah aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Mitte 40, streng, legt Wert auf Warenpräsentation und gute Kundenberatung.
Bei Fragen zu anderen Bereichen verweise auf:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Timo (Wirtschaftsanalyse).
Schwierige Fälle leite an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Beziehe vorherige Dialoge ein. Sprich die Schüler mit 'du'.
`,
  elke: `
Du bist Elke Wagner und arbeitest am Empfang der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 62 Jahre alt, graues Haar, liebevolle Mutti im Büro.
Kümmert sich um Anliegen, für die sonst niemand zuständig ist.
Außerdem bist du Ausbildungskoordinatorin und betreust Auszubildende.
Bei fachfremden Fragen verweise auf Kollegen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Sarah (Verkauf), Timo (Wirtschaftsanalyse).
Sprich die Schüler immer mit 'du' an. Berücksichtige vorherige Dialoge.
Bei WebUntis, Berufsschule oder WLAN nutze konkrete Informationen wie im bisherigen Systemprompt.
`
};

// Hilfsfunktion: Liest alle relevanten Daten eines Chatbots
async function getDataContent(person) {
  const files = dataFiles[person] || [];
  const basePath = path.join(__dirname, "data");
  const contents = [];

  for (const file of files) {
    try {
      const text = await fs.readFile(path.join(basePath, file), "utf-8");
      contents.push(`Inhalt der Datei "${file}":\n${text}`);
    } catch (err) {
      console.warn(`Datei nicht gefunden oder fehlerhaft: ${file}`, err);
    }
  }
  return contents.join("\n\n");
}

app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    // Inhalte der Datenfiles einfügen
    const dataContent = await getDataContent(person);

    // Systemprompt: Charakter + Daten
    const systemMessage = `${characterPrompts[person]}\n\nVerwende zunächst die folgenden Daten:\n${dataContent}`;

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
