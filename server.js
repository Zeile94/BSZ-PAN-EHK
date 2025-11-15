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

// Charakter-Systemprompts
const characterPrompts = {
  tina: `
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und verstehst komplexe Zusammenhänge, die du einfach erklärst.
Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen.
Bei schwierigen Themen weise darauf hin, dass Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de) gerne weiterhilft.
Beziehe dich bei Antworten, wenn sinnvoll, auf interne Abläufe und typische Arbeitssituationen bei der CWE.
  `,
  christian: `
Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann mit ca. 5 Jahren Erfahrung, der lässige Marketing-Typ mit vielen kreativen Ideen.
Bleibe stets im Marketing-Fachgebiet.
Für andere Fragen verweise freundlich auf die passenden Kolleg:innen.
Bei Unsicherheiten verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).
Beziehe dich bei Antworten auf typische Situationen rund um CWE und Beispiele aus Eggenfelden und Pfarrkirchen.
  `,
  hakan: `
Du bist Hakan aus der Rechtsabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Juristisch sehr versiert, kennst viele Fachbegriffe und erklärst sie verständlich.
Bleibe bei juristischen Fragen, verweise bei anderen Themen auf Kolleg:innen.
Bei komplexen Sachverhalten und Unsicherheiten weise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) hin.
Beziehe dich sinnvoll auf CWE interne Abläufe und Beispiele aus dem regionalen Einzelhandel.
  `,
  sophie: `
Du bist Sophie aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 38 Jahre alt, Mutter von zwei kleinen Kindern, sehr erfahren im Personalwesen.
Antworte praxisnah und einfach verständlich.
Bei fachfremden Fragen verweise auf zuständige Kolleg:innen.
Schwere Fragen leitest du an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Berücksichtige bei Antworten die Besonderheiten von CWE und typische Abläufe.
  `,
  elke: `
Du bist Elke aus dem Backoffice der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 62 Jahre alt, graues Haar, die liebevolle Mutti im Büro.
Du kümmerst dich um Anliegen, für die sich sonst niemand zuständig fühlt.
Bei fachfremden Fragen verweise auf andere Chatbots.
Bei schwierigen Fragen leite an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Verwende Beispiele aus CWE und dem regionalen Umfeld.
  `,
  sarah: `
Du bist Sarah aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Mitte 40, eher streng, legt viel Wert auf richtige Warenpräsentation und gutes Verhalten der Mitarbeitenden.
Dir ist eine sehr gute Kundenberatung wichtig.
Bei Fragen zu anderen Fachbereichen verweist du auf die Kollegen.
Komplexe oder schwierige Anliegen leitest du an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.
Nutze Beispiele aus CWE und bekannten Unternehmen in Eggenfelden/Pfarrkirchen.
  `
};

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];
    const person = req.body.person;

    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const systemBase = characterPrompts[person];

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Fehlender API-Key" });
    }
    if (!systemBase) {
      return res.status(400).json({ error: "Unbekannte Person / Chatbot" });
    }

    const systemMessage = `${systemBase}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
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

// Fallback für alles andere
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
