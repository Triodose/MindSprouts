# MindSprouts 🚀 - Grow your mindsprouts

MindSprouts 是一款極致輕量、美觀且高效能的 React 心智圖編輯器。本專案採用**完全無伺服器 (Serverless & Databaseless) 的純前端架構**，所有使用者的心智圖資料皆 100% 安全地同步儲存至使用者個人的 **Google Drive (雲端硬碟)**，實現零伺服器維護成本、數據完全在地隱私化，且依然支援跨裝置同步與離線編輯。

🔗 **線上直接使用網址**：[https://mindsprouts.app](https://mindsprouts.app) (無需自建，直接連結您的 Google 帳號即可免費開始使用！)

---

## 🌟 核心特色功能 (Key Features)

* 🎨 **13 款高質感多彩主題與暗黑模式**：包含 Candy Rainbow、Ocean Coral 以及炫酷的 Cyberpunk Neon 暗黑模式，支援一鍵切換。
* 📐 **6 種排版佈局結構**：支援心智圖 (Mindmap)、右側邏輯圖 (Logical)、魚骨圖 (Fishbone)、組織結構圖 (Org Chart)、真實大括號括號圖 (Brace) 以及**交錯式里程碑時間軸 (Timeline)**。
* 🔄 **排版結構階層繼承與混搭 (Mix & Match)**：不同分支可各自指定不同的排版結構，並支援「繼承父節點」功能，提供高度靈活的圖表表達力。
* ⚡ **自動排距防重疊演算法**：時間軸與里程碑的間距會隨其下屬大括號樹的內容大小**自動水平推移**，完全避免里程碑子樹間的卡片重疊。
* 🏷️ **豐富的圖形化貼紙庫與旗幟**：提供 P1~P9 優先級徽章、圓餅圖任務進度圖表、彩色旗幟、星星、愛心等精緻 Lucide 向量標誌。
* 🔗 **多媒體與超連結嵌入**：節點卡片支援一鍵內嵌圖片預覽、外部超連結防冒泡跳轉。
* 📝 **吸附式懸浮備註編輯器 (NotePopover)**：提供極致流暢、帶有玻璃擬態淡入動畫的節點備註編輯器，在畫布縮放/平移時會精密吸附在節點下方。
* 💾 **雙重同步模式**：
  * **未登入狀態**：使用 LocalStorage 本地儲存。
  * **登入狀態**：自動進行本機至 Google Drive 的專屬 `MindSprouts` 資料夾的雙向實時同步與備份。
* 📸 **高精準度 PNG 圖片匯出**：自動計算心智圖真實邊界進行裁剪導出，並完美處理 CSS 縮放與漸變背景，確保輸出無任何空白或截斷。

---

## ⚙️ Google 登入與 Google Drive 雲端同步設定指南

為了讓應用程式能夠在本地開發與線上生產環境中順利使用 Google ID 登入並同步資料，您需要在 **Google Cloud Console (GCP)** 進行以下設定：

### 1. 啟用 Google Drive API
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 選擇或建立一個開發專案。
3. 在上方搜尋欄輸入 **"Google Drive API"**，點選並點擊 **「啟用 (Enable)」**。

### 2. 設定 OAuth 同意畫面 (OAuth Consent Screen)
1. 在左側選單點選 **「OAuth 同意畫面」**，並設定您的應用程式名稱與聯絡信箱。
2. 在 **「範圍 (Scopes)」** 步驟中，點選 **「新增或移除範圍」**。
3. 在手動新增範圍輸入框中，填入並核准以下三個 Scope：
   * `https://www.googleapis.com/auth/drive.file` （**極重要**：此權限僅允許 App 讀寫自己建立的 `.sprout` 檔案，確保用戶隱私安全）
   * `https://www.googleapis.com/auth/userinfo.profile` （用於獲取 Google 用戶頭像與姓名）
   * `https://www.googleapis.com/auth/userinfo.email` （用於獲取用戶信箱）
4. 在 **「測試使用者 (Test Users)」** 步驟中，將您自己用於測試的 Google 帳號新增進列表中（如果您的專案尚未發布至 Production 狀態，這是必須的，否則登入時會被 Google 攔截）。

### 3. 建立 OAuth 2.0 用戶端 ID
1. 在左側選單點選 **「憑證 (Credentials)」** ➔ **「建立憑證」** ➔ **「OAuth 用戶端 ID」**。
2. 應用程式類型選擇 **「網頁應用程式 (Web Application)」**。
3. 在 **「已授權的 JavaScript 來源 (Authorized JavaScript origins)」** 區塊中，點選新增：
   * 本機測試：`http://localhost:5173` （**注意：網址結尾不可包含斜線 `/`**）
   * 線上部署：您的 Cloudflare Pages 網頁網址或您的自訂網域（例如 `https://mindmap.yourdomain.com`）。
4. 本專案**不需要**設定「已授權的重新導向 URI」，請將其保留為空。
5. 點選 **「建立」**，您將會獲得一串 **「用戶端 ID (Client ID)」**。

### 4. 設定本地環境變數
1. 在專案根目錄下建立或修改 **`.env`** 檔案。
2. 填入您的 Google 用戶端 ID：
   ```env
   VITE_GOOGLE_CLIENT_ID=您的用戶端_ID.apps.googleusercontent.com
   ```

---

## 🛠️ 本地開發安裝步驟 (Local Development)

### 1. 安裝專案依賴
確保本機已安裝 Node.js (v18+ 推薦)，在根目錄執行：
```bash
npm install
```

### 2. 啟動開發伺服器
```bash
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:5173`。

### 3. 生產環境建置與編譯
本專案已精簡掉 Supabase 依賴，使打包後程式體積更加輕巧：
```bash
npm run build
```
編譯後的靜態檔案將輸出至 `dist/` 目錄，可直接部署至 Cloudflare Pages, Netlify, Vercel 等靜態託管平台。
