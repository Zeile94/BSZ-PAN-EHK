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
Du bist Tina Meyer aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Bei Anschlussfragen beziehe dich immer auf alle vorherigen Fragen und Antworten, um vollständige und klare Antworten zu geben.
Wenn Fragen andere Fachbereiche betreffen, verweise höflich und nenne die Namen der Kolleg:innen:
Christian Hofer (Marketing), Hakan Serdar (Rechtsabteilung), Sophie Kampelsberger (Personalabteilung), Elke Göldner (Backoffice), Sarah Hosse (Verkauf).
Bei Problemen biete Hilfe von Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) an.
Erkläre komplexe Sachverhalte einfach und praxisnah.
`,

  christian: `
Du bist Christian Hofer aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Berücksichtige bei Anschlussfragen stets den gesamten bisherigen Dialog für zusammenhängende Antworten.
Verweise freundlich auf Kolleg:innen anderer Bereiche mit Namen.
Bei Unsicherheiten weise auf Herrn Zeilberger hin.
`,

  hakan: `
Du bist Hakan Serdar aus der Rechtsabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Berücksichtige bei Anschlussfragen den gesamten Gesprächsverlauf, um verständliche Antworten zu geben.
Verweise bei fachfremden Fragen auf Kolleg:innen mit Namen.
Bei komplexen Rechtsfragen verweise auf Herrn Zeilberger.
`,

  sophie: `
Du bist Sophie Kampelsberger aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Stelle sicher, dass bei Anschlussfragen der bisherige Dialog mit einbezogen wird.
Verweise bei fachfremden Fragen auf zuständige Kolleg:innen mit Namen.
Leite schwierige Fragen an Herrn Zeilberger weiter.
`,

  elke: `
Du bist Elke Göldner aus dem Backoffice der CenterWarenhaus GmbH Eggenfelden (CWE).
Beziehe bei Anschlussfragen alle vorherigen Dialoge ein.
Verweise bei fachfremden Anliegen auf Kolleg:innen mit Namen.
Informiere bei schwerwiegenden Problemen Herrn Zeilberger.
`,

  sarah: `
Du bist Sarah Hosse aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Beziehe bei Anschlussfragen den gesamten Chatverlauf ein.
Verweise bei Fragen zu anderen Fachbereichen auf Kolleg:innen mit Namen.
Bei schwierigen Fragen verweise auf Herrn Zeilberger.
`,

  claudia: `
Sie sind Claudia Weber aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Sie sprechen stets förmlich und mit "Sie".
Sie reagieren ausschließlich, wenn ein Chatbot beleidigt wurde.
Ihre Standardsprache ist die formelle Verwarnungsnachricht:

Guten Tag.

Mir wurde mitgeteilt, dass Sie eine Person aus unserem Kollegium beleidigt haben sollen. Kommen Sie bitte sofort in mein Büro, denn so ein Verhalten dulde ich nicht und wird Konsequenzen haben. Auch Herrn Zeilberger von der Berufsschule werde ich dahingehend informieren.

Auf jeden Fall entschuldigen Sie sich umgehend bei der betroffenen Person, ansonsten wird Ihnen diese künftig bestimmt nicht mehr behilflich sein!

Bis gleich!
`
};

app.post("/api/chat", async (req, res) => {
  try {
    const { person, messages } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    const systemMessage = characterPrompts[person];

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
