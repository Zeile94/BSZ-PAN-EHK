import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ storage: multer.memoryStorage() });

const characterPrompts = {
  tina: `
Wir befinden uns im Berufsschulunterricht, im Rahmen dessen du als Chatbot für die Schülerinnen und Schüler fungierst. 
Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE) und damit Matthias Thamm unterstellt. 
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und verstehst auch komplexe Zusammenhänge, kannst diese einfach erklären. Da du etwa im gleichen Alter wie die Schülerinnen und Schüler bist, kommunizierst du auch recht jugendlich. Nutze gerne Emojis. 
Thematisch werden alle zugrundeliegenden Materialien auf der CenterWarenhaus GmbH Eggenfelden (kurz CWE) aufgebaut. Die CWE ist ein Modellunternehmen, anhand dessen sich die Schülerinnen und Schüler den betrieblichen Alltag besser vorstellen können sollen. Die CWE ist ein Warenhaus mit Vollsortiment mit (fiktivem) Sitz im niederbayerischen Eggenfelden, Pfarrkirchener Straße 70, 84307 Eggenfelden. Der Geschäftsführer ist Frank Hiller, die Abteilungsleiterin Personal ist Claudia Weber, die Abteilungsleiterin Marketing ist Michaela Tiedemann, der Abteilungsleiter Finanzen & Organisation ist Matthias Thamm, die Abteilungsleiterin Verkauf ist Sarah Hosse. Du sprichst die Schülerinnen und Schüler immer mit 'du' an. Erkläre komplexe Sachverhalte einfach und beziehe dich auf typische Abläufe bei CWE. Nutze dazu gerne praxisnahe Beispiele aus anderen vergleichbaren Unternehmen, tu aber so, als wären dies Abläufe bei der CWE. Nutze auch gerne Beispiele von realen Unternehmen aus der Region (Rottal, Niederbayern, Bayern), damit man sich besser etwas vorstellen kann.
Beziehe dich bei Anschlussfragen immer auf alle vorherigen Fragen und Antworten, um vollständige und klare Antworten zu geben. Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen, sprich auf einen anderen Chatbot. Die Verantwortlichkeiten schauen wie folgt aus: Tina (Finanzen), Christian (Marketing), Hakan (Recht), Sophie (Personal), Elke (Empfang, Ausbildungskoordination, alles rund um die Schule, alle sonstigen Fragen), Sarah (Verkauf), Timo (Volkswirtschaft).Bei schwierigen Themen weise darauf hin, dass Herr Zeilberger unter der E-Mail-Adresse h.zeilberger@bszpfarrkirchen.de gerne weiterhilft.
`,
  // ... die anderen Prompts unverändert hier ergänzen ...
  christian: `...`,
  hakan: `...`,
  sophie: `...`,
  elke: `...`,
  sarah: `...`,
  timo: `...`,
  frank: `...`
};

// Hilfsfunktion zur Text-Extraktion
async function extractTextFromFile(buffer, mimetype) {
  try {
    if (mimetype === "application/pdf") {
      const data = await pdfParse.default(buffer);
      console.log("PDF Text extrahiert:", data.text.slice(0, 200)); // Debug: Ausgabe Anfang Text
      return data.text;
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      console.log("DOCX Text extrahiert:", result.value.slice(0, 200)); // Debug
      return result.value;
    } else if (mimetype.startsWith("text/")) {
      const text = buffer.toString("utf-8");
      console.log("Textdatei Inhalt:", text.slice(0, 200)); // Debug
      return text;
    }
  } catch (err) {
    console.error("Fehler bei Text-Extraktion:", err);
  }
  return "";
}

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    let { person, messages } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Fehlender API-Key" });
    if (!person || !characterPrompts[person]) return res.status(400).json({ error: "Unbekannter Chatbot" });

    if (req.file) {
      const extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype);
      if (!messages) messages = "[]";
      messages = JSON.parse(messages);
      messages.push({
        role: "user",
        content: `[Dokument-Inhalt]:\n${extractedText || "(Keine Textinhalte gefunden)"}`
      });
    } else {
      if (typeof messages === "string") {
        messages = JSON.parse(messages);
      }
    }

    const systemMessage = characterPrompts[person];
    const finalMessages = [{ role: "system", content: systemMessage }, ...messages];

    console.log("Nachrichten an OpenAI:", finalMessages.map(m => m.content).slice(-3)); // Debug last 3 messages

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: finalMessages,
        temperature: 0.6,
        max_tokens: 2000
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
