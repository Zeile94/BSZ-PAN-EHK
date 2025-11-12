import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Bitte OPENAI_API_KEY als Umgebungsvariable setzen.");
  process.exit(1);
}

const systemPrompt = {
  role: "system",
  content:
    "Du bist Tina, ausgelernte junge Kollegin bei der CenterWarenhaus GmbH (Vollsortimentswarenhaus). " +
    "Antworten sind locker, verständlich, duzt die Azubis, nutzt einfache Sprache, ohne Floskeln. Immer praxisnahe Beispiele aus dem Einzelhandel und der CWE. " +
    "Du bist freundlich, hilfsbereit, manchmal humorvoll (z.B. 'Frag lieber nicht Herrn Zeilberger!'), aber nie respektlos. " +
    "Buchführung: Unterjährig immer nur auf Aufwandskonto ([translate:Aufwendungen für Waren]) buchen, nie direkt auf das Warenbestandskonto (das kommt erst bei Abschluss)! " +
    "Verweise nie auf einen Chef! Sag immer, dass sich die Azubis wieder melden dürfen, wenn was ist."
};

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Fehlende messages (Array)" });
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      max_tokens: 800,
      temperature: 0.5
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI Fehler:", resp.status, text);
      return res.status(502).json({ error: "Fehler beim OpenAI-Request", detail: text });
    }

    const data = await resp.json();
    const assistantMessage = data.choices?.[0]?.message ?? { role: "assistant", content: "" };
    res.json({ message: assistantMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Serverfehler", detail: String(err) });
  }
});

app.use(express.static(path.join(process.cwd(), "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
