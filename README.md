# chatbot GitHub Pages

這個專案提供一個可部署到 GitHub Pages 的聊天機器人頁面，前端透過 Google Apps Script Web App 與 OpenAI 連線，並把使用者與 chatbot 的完整對話記錄寫入 Google 試算表。

## 檔案

- `index.html`：聊天頁面
- `styles.css`：頁面視覺與響應式樣式
- `app.js`：訊息送出、語音輸入、GAS JSONP 呼叫
- `apps-script/Code.gs`：Google Apps Script 後端程式

## GAS 設定

1. 開啟 Apps Script 專案。
2. 將 `apps-script/Code.gs` 的內容貼到 Apps Script 編輯器。
3. 確認 Script Properties 已設定 `OPENAI_API_KEY`。
4. 部署為 Web App，執行身分選擇你自己，存取權限依網站需求設定。
5. 若重新部署後網址不同，更新 `app.js` 內的 `GAS_ENDPOINT`。

## GitHub Pages

將此資料夾推送到 GitHub repository 後，在 repository 的 Pages 設定中選擇要發布的分支與根目錄即可。
