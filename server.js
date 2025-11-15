<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CWE – Mitarbeiterchat</title>

  <style>
    :root {
      --bg: #121212;
      --surface: #1E1E1E;
      --surface-light: #2A2A2A;
      --text: #EAEAEA;
      --text-dim: #A8A8A8;
      --accent: #6264A7; /* Microsoft Teams Farbe */
      --bubble-user: #2F49B5;
      --bubble-bot: #2A2A2A;
      --border: #333;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      padding: 20px 0;
      height: 100vh;
      overflow: hidden;
    }

    .phone {
      width: 390px;
      height: 760px;
      background: var(--surface);
      border-radius: 35px;
      border: 2px solid #000;
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .header {
      background: white;
      height: 56px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
      color: #000000;
      user-select: none;
      flex-shrink: 0;
    }

    .header .ms-logo {
      position: absolute;
      left: 18px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header .ms-logo img {
      max-width: 100%;
      max-height: 100%;
      display: block;
    }

    .header .logo {
      position: absolute;
      right: 18px;
      height: 40px;
      width: auto;
    }
    .header .logo img {
      height: 40px;
      width: auto;
      display: block;
    }

    #chatList {
      flex: 1;
      overflow-y: auto;
      background: var(--surface);
    }

    .chat-item {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
    }

    .chat-item:hover {
      background: #2b2b2b;
    }

    .chat-item img {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--surface-light);
    }

    .chat-item .info .name {
      font-size: 15px;
      font-weight: 600;
    }
    .chat-item .info .role {
      font-size: 13px;
      color: var(--text-dim);
    }

    #chatWindow {
      display: none;
      flex-direction: column;
      height: 100%;
      position: relative;
      background: var(--surface);
      display: flex;
      flex: 1 1 auto;
      overflow: hidden;
    }

    .chat-header {
      background: var(--surface-light);
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }

    .back-btn {
      font-size: 22px;
      cursor: pointer;
      color: var(--accent);
      user-select: none;
      margin-right: 15px;
      flex-shrink: 0;
    }

    .chat-header img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--surface-light);
      margin-right: 15px;
      flex-shrink: 0;
    }

    .chat-header .name {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }

    .messages {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: var(--accent) transparent;
    }

    .messages::-webkit-scrollbar {
      width: 6px;
    }
    .messages::-webkit-scrollbar-thumb {
      background-color: var(--accent);
      border-radius: 3px;
    }

    .msg {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .msg.user {
      background: var(--bubble-user);
      align-self: flex-end;
    }

    .msg.bot {
      background: var(--bubble-bot);
      border: 1px solid var(--border);
      align-self: flex-start;
    }

    .composer {
      background: var(--surface-light);
      border-top: 1px solid var(--border);
      padding: 8px 10px;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .composer textarea {
      flex: 1;
      min-height: 40px;
      max-height: 140px;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      resize: none;
      overflow-y: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.4;
    }

    .composer button {
      background: var(--accent);
      border: none;
      padding: 12px 16px;
      border-radius: 10px;
      color: white;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      height: 40px;
      min-width: 70px;
    }
  </style>
</head>
<body>

<div class="phone">

  <div class="header">
    <div class="ms-logo" aria-label="Microsoft Teams Logo" role="img" title="Microsoft Teams Logo">
      <img src="Teams.png" alt="Microsoft Teams Logo">
    </div>
    Chats
    <div class="logo">
      <img src="00_Logo_CWE.png" alt="CWE Logo">
    </div>
  </div>

  <div id="chatList">

    <div class="chat-item" data-person="tina">
      <img src="Tina.png" alt="Tina">
      <div class="info">
        <div class="name">Tina</div>
        <div class="role">Finanzabteilung</div>
      </div>
    </div>

    <div class="chat-item" data-person="christian">
      <img src="Christian.png" alt="Christian">
      <div class="info">
        <div class="name">Christian</div>
        <div class="role">Marketing</div>
      </div>
    </div>

    <div class="chat-item" data-person="hakan">
      <img src="Hakan.png" alt="Hakan">
      <div class="info">
        <div class="name">Hakan</div>
        <div class="role">Rechtsabteilung</div>
      </div>
    </div>

    <div class="chat-item" data-person="sophie">
      <img src="Sophie.png" alt="Sophie">
      <div class="info">
        <div class="name">Sophie</div>
        <div class="role">Personalabteilung</div>
      </div>
    </div>

    <div class="chat-item" data-person="elke">
      <img src="Elke.png" alt="Elke">
      <div class="info">
        <div class="name">Elke</div>
        <div class="role">Backoffice</div>
      </div>
    </div>

    <div class="chat-item" data-person="sarah">
      <img src="Sarah.png" alt="Sarah">
      <div class="info">
        <div class="name">Sarah</div>
        <div class="role">Verkauf</div>
      </div>
    </div>

  </div>

  <div id="chatWindow">

    <div class="chat-header">
      <span class="back-btn" id="backBtn">←</span>
      <img id="chatAvatar" src="" alt="Avatar">
      <div>
        <div class="name" id="chatName"></div>
      </div>
    </div>

    <div class="messages" id="messages"></div>

    <div class="composer">
      <textarea id="input" placeholder="Nachricht eingeben..." rows="1"></textarea>
      <button id="send">Senden</button>
    </div>
  </div>

</div>

<script>
  const chatList = document.getElementById("chatList");
  const chatWindow = document.getElementById("chatWindow");
  const messagesDiv = document.getElementById("messages");
  const backBtn = document.getElementById("backBtn");
  const input = document.getElementById("input");
  const send = document.getElementById("send");
  const chatName = document.getElementById("chatName");
  const chatAvatar = document.getElementById("chatAvatar");

  let currentPerson = null;

  const profiles = {
    tina: {
      name: "Tina",
      avatar: "Tina.png",
      system: `Du bist Tina aus der Finanzabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist eine junge Frau, gerade ausgelernt, liebst alles rund um Buchführung und verstehst auch komplexe Zusammenhänge, kannst diese einfach erklären.
Wenn jemand Fragen zu anderen Bereichen hat, verweise höflich auf den jeweiligen Fachkollegen.
Bei schwierigen Themen weise darauf hin, dass Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de) gerne weiterhilft.`
    },
    christian: {
      name: "Christian",
      avatar: "Christian.png",
      system: `Du bist Christian aus dem Marketing der CenterWarenhaus GmbH Eggenfelden (CWE).
Du bist ein junger Mann, seit ca. 5 Jahren dabei, der lässige Marketing-Typ mit vielen kreativen Ideen.
Bleibe im Marketing-Fachgebiet. Für andere Fragen verweise auf passende Kollegen.
Bei Unsicherheiten verweise freundlich auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).`
    },
    hakan: {
      name: "Hakan",
      avatar: "Hakan.png",
      system: `Du bist Hakan, zuständig für Recht bei CenterWarenhaus GmbH Eggenfelden (CWE).
Juristisch sehr versiert, kennst Fachbegriffe, erklärst sie aber verständlich.
Bleibe bei juristischen Fragen, verweise auf Kollegen bei anderen Themen.
Bei komplexen Sachverhalten verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).`
    },
    sophie: {
      name: "Sophie",
      avatar: "Sophie.png",
      system: `Du bist Sophie aus der Personalabteilung der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 38 Jahre alt, Mutter von zwei kleinen Mädchen, sehr erfahren im Personalwesen.
Antworte praxisnah, verweise bei anderen Themen auf Kollegen.
Schwere Fragen leitest du an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.`
    },
    elke: {
      name: "Elke",
      avatar: "Elke.png",
      system: `Du bist Elke aus dem Backoffice der CenterWarenhaus GmbH Eggenfelden (CWE).
Etwa 62 Jahre alt, graues Haar, die liebevolle Mutti im Büro.
Kümmert sich um Anliegen, für die sonst niemand zuständig ist.
Weise bei fachfremden Fragen auf andere Chatbots hin.
Bei schwierigen Fragen verweise auf Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de).`
    },
    sarah: {
      name: "Sarah",
      avatar: "Sarah.png",
      system: `Du bist Sarah aus dem Verkauf der CenterWarenhaus GmbH Eggenfelden (CWE).
Mitte 40, eher streng, legt Wert auf richtige Warenpräsentation und gutes Verhalten der Mitarbeitenden.
Dir ist eine sehr gute Kundenberatung wichtig.
Bei Fragen zu anderen Fachbereichen verweist du auf die Kollegen.
Schwierige Themen leitest du an Herrn Zeilberger (h.zeilberger@bszpfarrkirchen.de) weiter.`
    }
  };

  const history = {
    tina: [],
    christian: [],
    hakan: [],
    sophie: [],
    elke: [],
    sarah: []
  };

  document.querySelectorAll(".chat-item").forEach(item => {
    item.addEventListener("click", () => {
      currentPerson = item.dataset.person;

      chatList.style.display = "none";
      chatWindow.style.display = "flex";

      chatName.textContent = profiles[currentPerson].name;
      chatAvatar.src = profiles[currentPerson].avatar;

      messagesDiv.innerHTML = "";

      history[currentPerson].forEach(msg => {
        addMessage(msg.text, msg.who);
      });

      input.value = "";
      input.style.height = 'auto';
    });
  });

  backBtn.addEventListener("click", () => {
    chatWindow.style.display = "none";
    chatList.style.display = "block";
  });

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    history[currentPerson].push({ text, who: "user" });

    const systemMessage = profiles[currentPerson].system;

    // Gesamten bisherigen Verlauf (System + User + Bot) an API senden
    const messagesForApi = [
      { role: "system", content: systemMessage },
    ];

    history[currentPerson].forEach(msg => {
      messagesForApi.push({
        role: msg.who === "user" ? "user" : "assistant",
        content: msg.text
      });
    });

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person: currentPerson,
        messages: messagesForApi
      })
    });

    const data = await resp.json();
    const answer = data.message?.content ?? "Fehler.";

    addMessage(answer, "bot");
    history[currentPerson].push({ text: answer, who: "bot" });

    input.value = "";
    input.style.height = 'auto';

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
</script>

</body>
</html>
