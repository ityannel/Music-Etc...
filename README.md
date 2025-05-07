# Music-Etc...

🎧 環境に合わせて音楽を自動でレコメンドするモバイルアプリ

> ⚠️ このREADMEは、ChatGPT（GPT-4）により生成され、本人の確認と一部編集を経て掲載されています。

## 📝 概要

「Music-Etc...」は、天気・時間・気分などの情報をもとに、自動的に音楽を提案するReact Nativeアプリです。  
Google Gemini APIを用いて状況を解析し、Spotify APIと連携しておすすめの曲を再生します。

## 🛠 使用技術

- React Native + Expo（フロントエンド / アプリ側）
- Node.js + Express（バックエンド）
- Spotify Web API（音楽推薦）
- Google Gemini API（状況文解析）
- Windows Batchfile（入力支援・自動化）

## 📱 主な機能

- ユーザーの状況（時間・天候・気分など）から楽曲を選出
- Geminiを使って自然文を分析し、音楽特性（valence、energyなど）に変換
- Spotifyと連携して楽曲を検索・取得
- 将来的には完全自動選曲＆再生まで対応予定

## 💻 セットアップ（開発者向け）

```bash
git clone https://github.com/ityannel/Music-Etc....git
cd Music-Etc...
npm install
npx expo start
