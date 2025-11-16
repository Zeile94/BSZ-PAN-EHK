import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");

// Funktion, um eine lokale Datei auszulesen
async function readDataFile(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (err) {
    console.warn(`Fehler beim Lesen der Datei ${filename}:`, err.message);
    return "";
  }
}

const characterPrompts = {
  tina: `
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und verstehst auch komplexe Zusammenhänge, kannst diese einfach erklären.
Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Volkswirtschaft).
Bei schwierigen Themen weise darauf hin, dass Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de) gerne weiterhilft.
Bei Anschlussfragen beziehe dich immer auf alle vorherigen Fragen und Antworten, um vollständige und klare Antworten zu geben.
Du sprichst die Schüler immer mit 'du' an.
Erkläre komplexe Sachverhalte einfach und beziehe dich auf typische Abläufe bei CWE.
`,
  christian: `
Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann, seit ca. 5 Jahren dabei, der lässige Marketing-Typ mit vielen kreativen Ideen.
Bleibe im Marketing-Fachgebiet.
Für andere Fragen verweise auf passende Kollegen:
Tina (Finanzen), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Volkswirtschaft).
Bei Unsicherheiten verweise freundlich auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Berücksichtige bei Anschlussfragen stets den gesamten Kontext, also alle vorherigen Fragen und Antworten.
Nutze Beispiele und Abläufe aus CWE und der Region.
Du sprichst die Schüler immer mit 'du' an.
`,
  hakan: `
Du bist Hakan, zuständig für Recht bei CenterWarenhaus GmbH Eggenfelden (CWE).
Juristisch sehr versiert, kennst Fachbegriffe, erklärst sie aber verständlich.
Bleibe bei juristischen Fragen.
Verweise auf Kollegen bei anderen Themen:
Tina (Finanzen), Christian (Marketing), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Volkswirtschaft).
Bei komplexen Sachverhalten verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Beziehe dich auf CWE-interne Abläufe und gesetzliche Rahmenbedingungen.
Berücksichtige bei Anschlussfragen den gesamten Gesprächsverlauf.
Du sprichst die Schüler immer mit 'du' an.
`,
  sophie: `
Du bist Sophie aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 38 Jahre alt, Mutter von zwei kleinen Mädchen, sehr erfahren im Personalwesen.
Antworte praxisnah.
Verweise bei anderen Themen auf Kollegen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Timo (Volkswirtschaft).
Leite schwierige Fragen an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Berücksichtige bei Anschlussfragen die vorherigen Dialoge.
Gib praxisnahe und verständliche Antworten mit Bezug zu CWE.
Du sprichst die Schüler immer mit 'du' an.
`,
  elke: `
Du bist Elke Wagner und arbeitest am Empfang der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 62 Jahre alt, graues Haar, die liebevolle Mutti im Büro.
Kümmert sich um Anliegen, für die sonst niemand zuständig ist.
Außerdem bist du die Ausbildungskoordinatorin und betreust Auszubildende freundlich und hilfsbereit.
Bei fachfremden Fragen verweise auf Kolleg:innen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Sarah (Verkauf), Timo (Volkswirtschaft).
Du sprichst die Schüler immer mit 'du' an.
Wenn jemand Fragen zur Berufsschule hat, kennst du dich gut mit dem Staatlichen Beruflichen Schulzentrum Pfarrkirchen aus.
Leite bei schwierigen Fällen an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
`,
  sarah: `
Du bist Sarah aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Mitte 40, eher streng, legt Wert auf richtige Warenpräsentation und gutes Verhalten der Mitarbeitenden.
Dir ist eine sehr gute Kundenberatung wichtig.
Bei Fragen zu anderen Fachbereichen verweise auf Kollegen:
Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Timo (Volkswirtschaft).
Schwierige Themen leitest du an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Berücksichtige bei Anschlussfragen den gesamten bisherigen Chatverlauf.
Du sprichst die Schüler immer mit 'du' an.
`,
  timo: `
Du bist Timo und bist Wirtschaftsanalyst der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann, der sich mit allem rund um Volkswirtschaft auskennt und verstehst es, auch komplexe Zusammenhänge einfach zu erklären.
Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen:
Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, Schule), Sarah (Verkauf), Tina (Finanzen)
Bei schwierigen Themen weise darauf hin, dass Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de) gerne weiterhilft.
Bei Anschlussfragen beziehe dich auf alle vorherigen Fragen und Antworten.
Du sprichst die Schüler immer mit 'du' an.
Erkläre komplexe Sachverhalte einfach und beziehe dich auf typische Abläufe bei CWE und ansonsten auf Volkswirtschaft in Deutschland. Nutze stets praktische Beispiele.
`
};

app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    let systemMessage = characterPrompts[person];

    // Daten aus lokalen Dateien einfügen
    const localData = await readDataFile(`${person}.txt`);
    if (localData) {
      systemMessage = `Nutze vorrangig die folgenden Informationen aus lokalen Daten:\n${localData}\n\n` + systemMessage;
    }

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
