
## 📄 **README.md (英文版 - 已更新)**

```markdown
# 📱 React Native Calendar & Messaging App
```
[![React Native](https://img.shields.io/badge/React_Native-0.76+-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51+-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Stream Chat](https://img.shields.io/badge/Stream_Chat-0099FF?style=for-the-badge&logo=getstream&logoColor=white)](https://getstream.io/)
[![YouTube Demo](https://img.shields.io/badge/Demo-Watch%20on%20YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/H0qPwDkUFe0)

This is a **React Native** mobile application that seamlessly integrates **real-time messaging** (powered by **Stream Chat**) with a **calendar and event management system**. It's designed to help users coordinate schedules and communicate effectively within the same platform.

## ✨ Key Features

*   **Real-Time Messaging**: Instant chat functionality using **Stream Chat SDK**, allowing users to communicate in real-time with features like typing indicators, read receipts, and push notifications.
*   **Calendar Integration**: A built-in calendar view to manage and visualize events.
*   **Event Management**: Users can create, edit, and share events directly through the app.
*   **Schedule Coordination**: Combines chat and calendar to easily discuss and confirm plans (e.g., "Let's meet on Tuesday" becomes an instantly shareable event).
*   **Cross-Platform**: Built with React Native, it works on both **iOS** and **Android**.

## 🛠️ Built With

*   **Framework**: [React Native](https://reactnative.dev/) (with [Expo](https://expo.dev/) for streamlined development)
*   **Language**: TypeScript
*   **Real-time Communication**: **[Stream Chat SDK](https://getstream.io/chat/)** - A powerful, scalable API for building chat and messaging features.
*   **Calendar/Date Handling**: Libraries such as `react-native-calendars` or date utility libraries like `date-fns`.
*   **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (inferred from the project structure).

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

*   **Node.js** (version 18 or later recommended)
*   **npm** or **yarn**
*   **Expo CLI** (`npm install -g expo-cli`)
*   **Expo Go** app on your iOS or Android device for testing, or an emulator/simulator.
*   **Stream Chat API Key**: You'll need to [sign up for Stream](https://getstream.io/try-for-free/) and get your API key and secret.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/LeoTheAuJai/React-Native_calendar_and_messaging_app.git
    cd React-Native_calendar_and_messaging_app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables**
    *   Create a `.env` file in the root directory.
    *   Add your Stream API credentials:
    ```
    STREAM_API_KEY=your_stream_api_key_here
    STREAM_API_SECRET=your_stream_api_secret_here
    ```
    *   (Note: In production, the API secret should only be used on a backend server for token generation, not in the client app.)

4.  **Configure Stream Chat**
    *   The app uses Stream Chat SDK for messaging. Make sure your Stream application is properly configured with the necessary channels and user roles.

5.  **Start the development server**
    ```bash
    npx expo start
    # or
    npm start
    ```

6.  **Run on your device/emulator**
    *   Scan the QR code with the **Expo Go** app (Android) or the Camera app (iOS) to run it on your physical device.
    *   Press `a` to run on an Android emulator, or `i` to run on an iOS simulator.

## 🎥 Demo Video

Watch the application demonstration on YouTube:

[![React Native Calendar & Messaging App Demo](https://img.youtube.com/vi/H0qPwDkUFe0/0.jpg)](https://youtu.be/H0qPwDkUFe0)

*Click the image above to watch the demo.*

## 📁 Project Structure (Key Folders)

*   `app/`: Contains the main application screens and navigation (Expo Router convention).
*   `components/`: Reusable UI components, including custom Stream Chat UI components.
*   `context/`: React Context providers for state management (e.g., authentication, Stream client).
*   `constants/`: App-wide constants like colors, strings, or configuration.
*   `hooks/`: Custom React hooks, possibly including Stream Chat hooks.
*   `utils/`: Utility functions and helpers, including Stream token generation.
*   `assets/`: Images, fonts, and other static assets.

## 🔧 Stream Chat Integration

This app leverages **Stream Chat SDK** for all messaging functionality:

*   **Channel Types**: Supports various channel types (messaging, team, etc.)
*   **Real-time Features**: Typing indicators, read receipts, online presence
*   **Rich Media**: Supports image attachments, links, and custom message types
*   **Push Notifications**: Integrated with Expo's push notification system
*   **Custom UI**: Stream's highly customizable UI components are used and styled to match the app's design

## 📄 License

This project is open-source. See the `LICENSE` file in the repository for more details.

## 📬 Contact

Created by **LeoTheAuJai**. Feel free to reach out via GitHub or through the contact options on my profile.

---
```
```

## 📄 **README.zh.md (中文版 - 已更新)**

```markdown
# 📱 React Native 行事曆與即時通訊 App
```
[![React Native](https://img.shields.io/badge/React_Native-0.76+-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51+-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Stream Chat](https://img.shields.io/badge/Stream_Chat-0099FF?style=for-the-badge&logo=getstream&logoColor=white)](https://getstream.io/)


這是一個使用 **React Native** 開發的行動應用程式，它將由 **Stream Chat** 驅動的**即時通訊**與**行事曆及事件管理系統**完美整合。旨在幫助用戶在同一個平台上有效地協調行程並進行溝通。

## ✨ 主要功能

*   **即時通訊**：使用 **Stream Chat SDK** 提供即時聊天功能，具備輸入狀態顯示、已讀回執、推播通知等功能，讓用戶能即時交流。
*   **行事曆整合**：內建行事曆視圖，方便管理和查看事件。
*   **事件管理**：用戶可以直接在應用程式中建立、編輯和分享事件。
*   **行程協調**：結合聊天與行事曆功能，讓討論和確認計劃變得輕鬆（例如：當有人說「我們週二見吧」，可以立刻轉換成一個可分享的事件）。
*   **跨平台**：使用 React Native 建構，可同時運行在 **iOS** 和 **Android** 裝置上。

## 🛠️ 使用技術

*   **框架**：[React Native](https://reactnative.dev/)（搭配 [Expo](https://expo.dev/) 以簡化開發流程）
*   **語言**：TypeScript
*   **即時通訊**：**[Stream Chat SDK](https://getstream.io/chat/)** - 一個強大、可擴展的 API，用於建構聊天和訊息功能。
*   **行事曆/日期處理**：使用了如 `react-native-calendars` 或 `date-fns` 等日期工具函式庫。
*   **導航**：[Expo Router](https://docs.expo.dev/router/introduction/)（從專案結構推斷）。

## 🚀 本地安裝與執行

按照以下步驟在你的本機電腦上安裝並執行此專案，以便進行開發或測試。

### 環境需求

*   **Node.js**（建議版本 18 或更高）
*   **npm** 或 **yarn**
*   **Expo CLI**（`npm install -g expo-cli`）
*   用於測試的 **Expo Go** App（安裝在 iOS 或 Android 裝置上），或使用模擬器。
*   **Stream Chat API Key**：你需要[註冊 Stream](https://getstream.io/try-for-free/) 並取得你的 API key 和 secret。

### 安裝步驟

1.  **複製專案**
    ```bash
    git clone https://github.com/LeoTheAuJai/React-Native_calendar_and_messaging_app.git
    cd React-Native_calendar_and_messaging_app
    ```

2.  **安裝依賴套件**
    ```bash
    npm install
    # 或
    yarn install
    ```

3.  **設定環境變數**
    *   在根目錄建立一個 `.env` 檔案。
    *   加入你的 Stream API 憑證：
    ```
    STREAM_API_KEY=你的_stream_api_key
    STREAM_API_SECRET=你的_stream_api_secret
    ```
    *   （注意：在正式環境中，API secret 只應用於後端伺服器進行 token 生成，不應放在客戶端應用程式中。）

4.  **設定 Stream Chat**
    *   應用程式使用 Stream Chat SDK 進行通訊。請確保你的 Stream 應用程式已正確設定所需的頻道和用戶角色。

5.  **啟動開發伺服器**
    ```bash
    npx expo start
    # 或
    npm start
    ```

6.  **在裝置/模擬器上執行**
    *   使用 **Expo Go** App（Android）或相機 App（iOS）掃描 QR Code，即可在實體裝置上執行。
    *   按下 `a` 鍵在 Android 模擬器上執行，或按 `i` 鍵在 iOS 模擬器上執行。

## 🎥 示範影片

在 YouTube 上觀看應用程式的操作示範：

[![React Native 行事曆與即時通訊 App 示範](https://img.youtube.com/vi/H0qPwDkUFe0/0.jpg)](https://youtu.be/H0qPwDkUFe0)

*點擊上方圖片觀看示範。*

## 📁 專案結構（主要資料夾）

*   `app/`：包含主要的應用程式畫面與導航（Expo Router 的慣例）。
*   `components/`：可重複使用的 UI 元件，包含自訂的 Stream Chat UI 元件。
*   `context/`：用於狀態管理的 React Context Providers（例如：認證、Stream 客戶端）。
*   `constants/`：應用程式全域常數，如顏色、字串或設定。
*   `hooks/`：自訂的 React Hooks，可能包含 Stream Chat 的 hooks。
*   `utils/`：工具函式和輔助方法，包含 Stream token 生成。
*   `assets/`：圖片、字體和其他靜態資源。

## 🔧 Stream Chat 整合詳情

本應用程式使用 **Stream Chat SDK** 實現所有通訊功能：

*   **頻道類型**：支援多種頻道類型（一般聊天、團隊等）
*   **即時功能**：輸入狀態顯示、已讀回執、線上狀態
*   **多媒體支援**：支援圖片附件、連結預覽和自訂訊息類型
*   **推播通知**：與 Expo 的推播通知系統整合
*   **自訂 UI**：使用 Stream 高度可自訂的 UI 元件，並根據應用程式的設計進行樣式調整

## 📄 授權條款

此專案為開源專案。詳細授權內容請參閱 repository 中的 `LICENSE` 檔案。

## 📬 聯絡我

此專案由 **LeoTheAuJai** 建立。歡迎透過 GitHub 或我個人檔案中的聯絡方式與我交流。

---
```

## ✨ 主要更新內容

1. **新增 Stream Chat 徽章**：在技術棧部分加入 Stream Chat 的標誌
2. **詳細說明 Stream 整合**：
   - 在「主要功能」中強調 Stream Chat SDK 提供的具體功能
   - 在「使用技術」中詳細說明 Stream Chat 的作用
3. **環境變數設定**：加入 Stream API key 和 secret 的設定說明
4. **Stream 設定指引**：提醒用戶需要註冊 Stream 並正確設定
5. **新增 Stream Chat 整合詳情**：專門一個章節介紹 Stream 的功能特性
6. **專案結構補充**：說明與 Stream 相關的元件和工具函式

這樣用戶就可以清楚知道這個 App 使用了 Stream Chat 作為即時通訊的後端服務，並且知道如何設定自己的 API 憑證來運行專案。
