import quizHandler from "../api/quiz.js";
import flashcardsHandler from "../api/flashcards.js";

async function test(name, handler, body) {
  let statusCode = 200;
  let payload;
  const started = Date.now();
  const req = { method: "POST", body };
  const res = {
    setHeader() { return this; },
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; }
  };
  console.log(`\n========== ${name} ==========`);
  console.log("Thema:", body.topic);
  try {
    await handler(req, res);
    console.log("Dauer in Sekunden:", ((Date.now() - started) / 1000).toFixed(1));
    console.log("HTTP-Status:", statusCode);
    console.log(JSON.stringify(payload, null, 2));
    if (statusCode !== 200) process.exitCode = 1;
  } catch (error) {
    console.error("Nicht abgeschlossen:", error.code || error.name);
    process.exitCode = 1;
  }
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY fehlt. Bitte mit --env-file=.env.local starten.");
  process.exitCode = 1;
} else {
  await test("QUIZ – vorbereiteter Materialindex", quizHandler, {
    topic: "Werbung und Verkaufsförderung im Einzelhandel",
    previousQuestions: []
  });
  await test("LERNKARTEN – vorbereiteter Materialindex", flashcardsHandler, {
    topic: "Werbung und Verkaufsförderung im Einzelhandel",
    count: 5
  });
  if (process.argv.includes("--web")) {
    await test("LERNKARTEN – zusätzliche aktuelle Webrecherche", flashcardsHandler, {
      topic: "Aktuell geltende gesetzliche Gewährleistungsrechte beim Kauf neuer Waren im deutschen Einzelhandel",
      count: 5
    });
  }
}
