# MindSprouts 🚀 - Grow your mindsprouts

[繁體中文](#繁體中文) | [English](#english) | [日本語](#日本語)

---

## 繁體中文

MindSprouts 是一款極致輕量、美觀且高效能的 React 心智圖編輯器。本專案採用**完全無伺服器 (Serverless & Databaseless) 的純前端架構**，所有使用者的心智圖資料皆 100% 安全地同步儲存至使用者個人的 **Google Drive (雲端硬碟)**，實現零伺服器維護成本、數據完全在地隱私化，且依然支援跨裝置同步與離線編輯。

🔗 **線上直接使用網址**：[https://mindsprouts.app](https://mindsprouts.app) (無需自建，直接連結您的 Google 帳號即可免費開始使用！)

---

### 🌟 核心特色功能

* 🎨 **13 款高質感多彩主題與暗黑模式**：包含 Candy Rainbow、Ocean Coral 以及炫酷的 Cyberpunk Neon 暗黑模式，支援一鍵切換。
* 📐 **6 種排版佈局結構**：支援心智圖 (Mindmap)、右側邏輯圖 (Logical)、左側邏輯圖、魚骨圖 (Fishbone)、組織結構圖 (Org Chart)、真實大括號括號圖 (Brace) 以及**交錯式里程碑時間軸 (Timeline)**。
* 🔄 **排版結構階層繼承與混搭 (Mix & Match)**：不同分支可各自指定不同的排版結構，並支援「繼承父節點」功能，提供高度靈活的圖表表達力。
* ⚡ **自動排距防重疊演算法**：時間軸與里程碑的間距會隨其下屬大括號樹的內容大小**自動水平推移**，完全避免里程碑子樹間的卡片重疊。
* 🏷️ **豐富的圖形化貼紙庫與旗幟**：提供 P1~P9 優先級徽章、圓餅圖任務進度圖表、彩色旗幟、星星、愛心等精緻 Lucide 向量標誌。
* 🔗 **多媒體與超連結嵌入**：節點卡片支援一鍵內嵌圖片預覽、外部超連結防冒泡跳轉。
* 📝 **吸附式懸浮備註編輯器 (NotePopover)**：提供極致流暢、帶有玻璃擬態淡入動畫的節點備註編輯器，在畫布縮放/平移時會精密吸附在節點下方。
* 💾 **雙重同步模式**：
  * **未登入狀態**：使用 LocalStorage 本地儲存。
  * **登入狀態**：自動進行本機至 Google Drive 的專屬 `MindSprouts` 資料夾的雙向實時同步與備份。
* 📸 **高精準度 PNG 圖片匯出**：自動計算心智圖真實邊界進行裁剪導出，並完美處理 CSS 縮放與漸變背景，確保輸出無任何空白或截斷。
* 🌐 **多語系支援 (i18n)**：支援 **繁體中文、English、日本語**，可在工具列上即時切換。
* 💾 **精緻手動同步與自動存檔**：設有同步狀態指示燈（已存、未存、同步中、錯誤），並於切換心智圖時自動進行舊圖備份。
* 📥 **支援匯入 `.sprout` 檔案**：支援匯入 JSON 心智圖以及標準的 `.sprout` 雲端檔案，方便跨帳號傳輸。

---

### ⚙️ Google 登入與 Google Drive 雲端同步設定指南

為了讓應用程式能夠在本地開發與線上生產環境中順利使用 Google ID 登入並同步資料，您需要在 **Google Cloud Console (GCP)** 進行以下設定：

#### 1. 啟用 Google Drive API
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 選擇或建立一個開發專案。
3. 在上方搜尋欄輸入 **"Google Drive API"**，點選並點擊 **「啟用 (Enable)」**。

#### 2. 設定 OAuth 同意畫面 (OAuth Consent Screen)
1. 在左側選單點選 **「OAuth 同意畫面」**，並設定您的應用程式名稱與聯絡信箱。
2. 在 **「範圍 (Scopes)」** 步驟中，點選 **「新增或移除範圍」**。
3. 在手動新增範圍輸入框中，填入並核准以下三個 Scope：
   * `https://www.googleapis.com/auth/drive.file` （**極重要**：此權限僅允許 App 讀寫自己建立的 `.sprout` 檔案，確保用戶隱私安全）
   * `https://www.googleapis.com/auth/userinfo.profile` （用於獲取 Google 用戶頭像與姓名）
   * `https://www.googleapis.com/auth/userinfo.email` （用於獲取用戶信箱）
4. 在 **「測試使用者 (Test Users)」** 步驟中，將您自己用於測試的 Google 帳號新增進列表中（如果您的專案尚未發布至 Production 狀態，這是必須的，否則登入時會被 Google 攔截）。

#### 3. 建立 OAuth 2.0 用戶端 ID
1. 在左側選單點選 **「憑證 (Credentials)」** ➔ **「建立憑證」** ➔ **「OAuth 用戶端 ID」**。
2. 應用程式類型選擇 **「網頁應用程式 (Web Application)」**。
3. 在 **「已授權的 JavaScript 來源 (Authorized JavaScript origins)」** 區塊中，點選新增：
   * 本機測試：`http://localhost:5173` （**注意：網址結尾不可包含斜線 `/`**）
   * 線上部署：您的 Cloudflare Pages 網頁網址或您的自訂網域（例如 `https://mindmap.yourdomain.com`）。
4. 本專案**不需要**設定「已授權的重新導向 URI」，請將其保留為空。
5. 點選 **「建立」**，您將會獲得一串 **「用戶端 ID (Client ID)」**。

#### 4. 設定本地環境變數
1. 在專案根目錄下建立或修改 **`.env`** 檔案。
2. 填入您的 Google 用戶端 ID：
   ```env
   VITE_GOOGLE_CLIENT_ID=您的用戶端_ID.apps.googleusercontent.com
   ```

---

### 🛠️ 本地開發安裝步驟

#### 1. 安裝專案依賴
確保本機已安裝 Node.js (v18+ 推薦)，在根目錄執行：
```bash
npm install
```

#### 2. 啟動開發伺服器
```bash
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:5173`。

#### 3. 生產環境建置與編譯
```bash
npm run build
```
編譯後的靜態檔案將輸出至 `dist/` 目錄，可直接部署至 Cloudflare Pages, Netlify, Vercel 等靜態託管平台。

---

## English

MindSprouts is an extremely lightweight, beautiful, and high-performance React mind map editor. Built with a **fully serverless and databaseless pure front-end architecture**, it securely saves and syncs all of your mind map data 100% privately into your personal **Google Drive**. This allows for zero server maintenance costs and absolute data ownership while maintaining cross-device synchronization and offline edit capabilities.

🔗 **Try it online**: [https://mindsprouts.app](https://mindsprouts.app) (No setup required, connect your Google Account and get started for free!)

---

### 🌟 Key Features

* 🎨 **13 Premium Colorful Themes & Dark Mode**: One-click toggle between themes including Candy Rainbow, Ocean Coral, and sleek Cyberpunk Neon.
* 📐 **6 Layout Structures**: Mind Map, Logic Chart (Right/Left), Fishbone, Org Chart, Brace Map, and intercrossed **Milestone Timeline**.
* 🔄 **Hierarchical Layout Inheritance & Mix-and-match**: Apply different layout structures to different branches, with support for "Inherit parent" for maximum diagram flexibility.
* ⚡ **Anti-overlap Auto Spacing Algorithm**: Distances between milestones automatically shift horizontally based on the sizes of their child trees, completely preventing milestone overlap.
* 🏷️ **Rich Graphical Markers & Flags**: Priority badges (P1~P9), circular task progress pies, colorful flags, stars, hearts, and info tips using vector Lucide icons.
* 🔗 **Multimedia & Link Embeds**: Inline image preview and external hyperlinks within node cards.
* 📝 **Magnetic Note Popover**: A fluid, glassmorphism popover note editor with fade-in transition that stays snapped to the node during zoom and pan.
* 💾 **Dual Sync Modes**:
  * **Offline Mode**: Uses LocalStorage to save your data locally.
  * **Cloud Mode**: Auto-saves and syncs in real-time to the dedicated `MindSprouts` folder in your personal Google Drive.
* 📸 **High-Fidelity PNG Export**: Automatically computes mind map boundaries, captures gradients, and handles CSS scaling to export clean, cropped PNG images.
* 🌐 **Multi-language Support (i18n)**: Seamlessly toggle between **Traditional Chinese, English, and Japanese** directly from the toolbar.
* 💾 **Smart Manual Sync & Auto-Backup**: Real-time status indicators (Synced, Unsaved, Syncing, Error) with automatic old map cloud backup when switching maps.
* 📥 **Import `.sprout` Files**: Supports importing general mindmap JSON and standard cloud `.sprout` files for easy sharing.

---

### ⚙️ Google Login & Google Drive Cloud Sync Configuration

To configure Google Identity and Drive synchronization for local development and production environments, perform the following settings in the **Google Cloud Console (GCP)**:

#### 1. Enable Google Drive API
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project.
3. Search for **"Google Drive API"** and click **Enable**.

#### 2. Configure OAuth Consent Screen
1. Go to **OAuth Consent Screen**, set the app name, and provide developer support email.
2. In the **Scopes** stage, click **Add or Remove Scopes**.
3. Under manually input scopes, authorize the following scopes:
   * `https://www.googleapis.com/auth/drive.file` (**Critical**: This scope only allows the app to read and write files that it created, ensuring maximum user privacy).
   * `https://www.googleapis.com/auth/userinfo.profile` (Gets profile name and picture).
   * `https://www.googleapis.com/auth/userinfo.email` (Gets email address).
4. In the **Test Users** screen, add the Google Accounts you will use for testing (mandatory if the project is in testing status).

#### 3. Create OAuth 2.0 Client ID
1. Click **Credentials** ➔ **Create Credentials** ➔ **OAuth Client ID**.
2. Select **Web Application** as application type.
3. In **Authorized JavaScript origins**, add:
   * Local: `http://localhost:5173` (**Note: Do not add a trailing slash `/`**)
   * Production: Your domain name or deployment URL (e.g. `https://mindmap.yourdomain.com`).
4. Keep the "Authorized redirect URIs" field empty.
5. Click **Create** to receive your **Client ID**.

#### 4. Setup Environment Variables
1. Create or edit a **`.env`** file in the root directory.
2. Fill in your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

---

### 🛠️ Local Development & Setup

#### 1. Install Dependencies
Make sure you have Node.js (v18+ recommended) installed, and run:
```bash
npm install
```

#### 2. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

#### 3. Production Build
```bash
npm run build
```
Static production bundle will be outputted into `dist/` directory, which can be deployed to Cloudflare Pages, Netlify, Vercel, etc.

---

## 日本語

MindSprouts は、極めて軽量で美しく、高性能な React マインドマップエディタです。**完全サーバーレス・データベースレス（Serverless & Databaseless）の純フロントエンド構成**を採用しており、すべてのデータはお客様個人の **Google ドライブ** に安全かつプライベートに同期・保存されます。サーバー管理費用ゼロでデータ所有権を保護しながら、デバイス間の同期とオフライン編集をサポートします。

🔗 **オンラインデモ**: [https://mindsprouts.app](https://mindsprouts.app) (登録不要、お持ちの Google アカウントに接続して今すぐ無料で開始できます！)

---

### 🌟 主な特徴

* 🎨 **13種類の高品質テーマとダークモード**: Candy Rainbow、Ocean Coral、Cyberpunk Neon、ダークモードを一クリックで切り替え。
* 📐 **6種類のマップ構造**: クラシックマインドマップ、ロジックチャート（右/左）、魚の骨図、組織構造図、括弧マップ、および**マイルストーンタイムライン**。
* 🔄 **レイアウトの階層継承と混在 (Mix & Match)**: ブランチごとに個別の構造を指定でき、「親から継承」機能もサポートし、高度で柔軟な図表表現力を提供。
* ⚡ **自動配置・重なり防止アルゴリズム**: タイムライン内の milestone 子ノードは重ならないよう自動的に水平方向の距離を計算して推移し、重なりを防止します。
* 🏷️ **豊富なマークとフラグ**: P1~P9 優先度、進捗円グラフ、旗、星、ハートなどの Lucide ベクターマーク。
* 🔗 **画像プレビューとリンク埋め込み**: カード内に画像プレビューと外部リンクナビゲーションを埋め込み可能。
* 📝 **マグネティックメモエディタ (NotePopover)**: ズームやスクロール時もノードに吸着するガラス模倣デザインのメモエディタ。
* 💾 **ダブル同期モード**:
  * **オフラインモード**: ローカルの LocalStorage を使用してデータを保存。
  * **クラウドモード**: Google ドライブ上の専用 `MindSprouts` フォルダへのリアルタイム両方向同期。
* 📸 **高精度PNG画像エクスポート**: マップの境界を自動計算し、グラデーション背景を維持したまま、鮮明なPNG画像を出力。
* 🌐 **多言語対応 (i18n)**: **繁体字中国語、英語、日本語**をツールバーからリアルタイムで切り替え可能。
* 💾 **手動同期と自動バックアップ**: 状態インジケータ（保存済み、未同期、同期中、エラー）と、マップ切り替え時の自動バックアップ。
* 📥 **`.sprout` ファイルのインポート**: JSON 形式および Google ドライブの `.sprout` 形式をシームレスにインポート可能。

---

### ⚙️ Google ログインと Google ドライブ同期設定ガイド

ローカル開発環境および本番環境において Google ログインとドライブ同期を正しく動作させるため、**Google Cloud Console (GCP)** で以下の設定を行ってください。

#### 1. Google Drive API の有効化
1. [Google Cloud Console](https://console.cloud.google.com/) を開きます。
2. プロジェクトを選択または作成します。
3. 検索窓で **"Google Drive API"** を検索し、**「有効にする (Enable)」** をクリックします。

#### 2. OAuth 同意画面 (OAuth Consent Screen) の設定
1. **「OAuth 同意画面」** メニューから、アプリ名とサポート用メールアドレスを設定します。
2. **「スコープ (Scopes)」** 画面に進み、**「スコープの追加または削除」** をクリックします。
3. 以下のスコープを手動で追加・承認します：
   * `https://www.googleapis.com/auth/drive.file` （**重要**：アプリ自身が作成した `.sprout` ファイルのみへの読み書きアクセス権。ユーザーのプライバシーを最大限に保護します）
   * `https://www.googleapis.com/auth/userinfo.profile` （ユーザー名とアバター画像の取得）
   * `https://www.googleapis.com/auth/userinfo.email` （メールアドレスの取得）
4. **「テストユーザー (Test Users)」** 画面で、テストに使用する Google アカウントを登録します（プロジェクトのステータスがテスト中である場合に必須）。

#### 3. OAuth 2.0 クライアント ID の作成
1. **「認証情報 (Credentials)」** ➔ **「認証情報を作成」** ➔ **「OAuth クライアント ID」** をクリックします。
2. アプリケーションの種類で **「ウェブ アプリケーション (Web Application)」** を選択します。
3. **「承認された JavaScript 生成元 (Authorized JavaScript origins)」** に以下を追加します：
   * ローカル環境: `http://localhost:5173` （**注意：末尾にスラッシュ `/` を入れないでください**）
   * 本番環境: デプロイ先ドメインまたはURL (例: `https://mindmap.yourdomain.com`)。
4. 「承認されたリダイレクト URI」フィールドは空のままにします。
5. **「作成」** をクリックすると、**クライアント ID (Client ID)** が発行されます。

#### 4. ローカル環境変数の設定
1. プロジェクトのルートディレクトリに **`.env`** ファイルを作成または編集します。
2. 取得したクライアント ID を記入します：
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

---

### 🛠️ ローカル環境での実行方法

#### 1. 依存関係のインストール
Node.js (v18+ 推奨) がインストールされていることを確認し、以下を実行します：
```bash
npm install
```

#### 2. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで `http://localhost:5173` を開きます。

#### 3. 本番用ビルドの作成
```bash
npm run build
```
ビルドされた静的ファイルは `dist/` ディレクトリに出力されます。Cloudflare Pages、Netlify、Vercel 等の静的ホスティングサービスに直接デプロイ可能です。
