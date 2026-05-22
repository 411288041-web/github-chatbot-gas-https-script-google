const SPREADSHEET_ID = "1DmuD-2esYlxvBCVUkk5rtPNesmW1Bdr3bYF5e7pHrYs";
const SHEET_NAME = "Chatbot紀錄";
const MODEL_NAME = "gpt-5.4-mini";
const TIME_ZONE = "Asia/Taipei";

function doGet(e) {
  const callback = sanitizeCallbackName_(e.parameter.callback || "callback");

  try {
    const message = String(e.parameter.message || "").trim();
    const sessionId = String(e.parameter.sessionId || "anonymous").trim();

    if (!message) {
      return jsonp_(callback, {
        ok: false,
        error: "請輸入訊息。"
      });
    }

    const now = new Date();
    const timeText = formatDateTime_(now);
    const sheet = getSheet_();
    const history = readRecentHistory_(sheet, sessionId, 12);

    appendRecord_(sheet, {
      timestamp: now,
      timeText: timeText,
      sessionId: sessionId,
      role: "user",
      content: message
    });

    const reply = callOpenAI_(message, history);
    const replyTime = formatDateTime_(new Date());

    appendRecord_(sheet, {
      timestamp: new Date(),
      timeText: replyTime,
      sessionId: sessionId,
      role: "chatbot",
      content: reply
    });

    return jsonp_(callback, {
      ok: true,
      reply: reply,
      time: replyTime
    });
  } catch (error) {
    return jsonp_(callback, {
      ok: false,
      error: "系統目前無法完成回覆。"
    });
  }
}

function doPost(e) {
  return doGet({
    parameter: JSON.parse(e.postData.contents || "{}")
  });
}

function callOpenAI_(message, history) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const input = [
    {
      role: "system",
      content: "你是 chatbot，一位開朗、溫暖、幽默、知識豐富的繁體中文聊天機器人。你會用自然正式的繁體中文回覆，讓使用者覺得被理解，也能在適合的時候加入輕鬆幽默。不要使用 Markdown 格式，不要輸出程式碼區塊，除非使用者明確要求。"
    }
  ];

  history.forEach(function (item) {
    input.push({
      role: item.role === "chatbot" ? "assistant" : "user",
      content: item.content
    });
  });

  input.push({
    role: "user",
    content: message
  });

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey
    },
    payload: JSON.stringify({
      model: MODEL_NAME,
      input: input
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error("OpenAI request failed: " + body);
  }

  const data = JSON.parse(body);
  const text = extractResponseText_(data);
  if (!text) {
    throw new Error("OpenAI response is empty.");
  }
  return text.trim();
}

function extractResponseText_(data) {
  if (data.output_text) return data.output_text;

  if (!data.output) return "";

  return data.output.map(function (item) {
    if (!item.content) return "";
    return item.content.map(function (content) {
      return content.text || "";
    }).join("");
  }).join("").trim();
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["時間戳記", "日期時間", "對話識別碼", "角色", "內容"]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function appendRecord_(sheet, record) {
  sheet.appendRow([
    record.timestamp,
    record.timeText,
    record.sessionId,
    record.role,
    record.content
  ]);
}

function readRecentHistory_(sheet, sessionId, limit) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const startRow = Math.max(2, lastRow - 80);
  const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
  const records = [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (String(row[2]) === sessionId && row[4]) {
      records.unshift({
        role: String(row[3]),
        content: String(row[4])
      });
      if (records.length >= limit) break;
    }
  }

  return records;
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, TIME_ZONE, "yyyy/MM/dd HH:mm:ss");
}

function sanitizeCallbackName_(callback) {
  const value = String(callback || "");
  if (/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(value)) {
    return value;
  }
  return "callback";
}

function jsonp_(callback, payload) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
