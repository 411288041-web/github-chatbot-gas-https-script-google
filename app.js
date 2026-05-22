(function () {
  "use strict";

  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwP4kvc8lQ56EiKsjwl1MwJ3x8u8EKY6bbaMxaaR5x4NwKGLoJ1Xu1wjXdQHSO3bqvS/exec";
  const messages = document.getElementById("messages");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const voiceButton = document.getElementById("voiceButton");
  const sessionId = getSessionId();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  setInitialTime();
  setupVoice();
  resizeInput();
  input.focus();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", resizeInput);

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || sendButton.disabled) return;

    appendMessage("user", text, formatNow());
    input.value = "";
    resizeInput();
    setBusy(true);

    const pending = appendMessage("bot", "chatbot 正在回覆", formatNow(), true);

    try {
      const result = await requestChatbot(text);
      pending.remove();
      appendMessage("bot", result.reply || "我剛才有點分心，請再說一次。", result.time || formatNow());
    } catch (error) {
      pending.remove();
      appendMessage("bot", "目前連線不太順利，請稍後再試。", formatNow());
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  function requestChatbot(message) {
    return new Promise(function (resolve, reject) {
      const callbackName = "__chatbotCallback_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(function () {
        cleanup();
        reject(new Error("Request timeout"));
      }, 45000);

      window[callbackName] = function (payload) {
        cleanup();
        if (payload && payload.ok) {
          resolve(payload);
          return;
        }
        reject(new Error((payload && payload.error) || "Request failed"));
      };

      function cleanup() {
        window.clearTimeout(timeoutId);
        delete window[callbackName];
        script.remove();
      }

      const params = new URLSearchParams({
        callback: callbackName,
        sessionId: sessionId,
        message: message
      });

      script.src = GAS_ENDPOINT + "?" + params.toString();
      script.onerror = function () {
        cleanup();
        reject(new Error("Network error"));
      };
      document.body.appendChild(script);
    });
  }

  function appendMessage(role, text, timeText, pending) {
    const article = document.createElement("article");
    article.className = "message " + role + (pending ? " pending" : "");

    if (role === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "c";
      article.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    const time = document.createElement("time");
    time.textContent = timeText;

    bubble.appendChild(paragraph);
    bubble.appendChild(time);
    article.appendChild(bubble);
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
  }

  function setBusy(isBusy) {
    sendButton.disabled = isBusy;
    input.disabled = isBusy;
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 148) + "px";
  }

  function setInitialTime() {
    const time = document.querySelector(".message.bot time");
    if (time) time.textContent = formatNow();
  }

  function formatNow() {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());
  }

  function getSessionId() {
    const key = "chatbot_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const value = "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, value);
    return value;
  }

  function setupVoice() {
    if (!SpeechRecognition) {
      voiceButton.disabled = true;
      voiceButton.title = "此瀏覽器不支援語音輸入";
      voiceButton.setAttribute("aria-label", "此瀏覽器不支援語音輸入");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = true;
    recognition.continuous = false;

    voiceButton.addEventListener("click", function () {
      if (isListening) {
        recognition.stop();
        return;
      }
      recognition.start();
    });

    recognition.addEventListener("start", function () {
      isListening = true;
      voiceButton.classList.add("listening");
      voiceButton.title = "停止語音輸入";
      voiceButton.setAttribute("aria-label", "停止語音輸入");
    });

    recognition.addEventListener("end", function () {
      isListening = false;
      voiceButton.classList.remove("listening");
      voiceButton.title = "語音輸入";
      voiceButton.setAttribute("aria-label", "開始語音輸入");
    });

    recognition.addEventListener("result", function (event) {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      input.value = transcript.trim();
      resizeInput();
    });
  }
})();
