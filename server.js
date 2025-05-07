const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // v2!
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const { exec } = require("child_process");
const open = require("open").default;

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Geminiにプロンプトを送る関数
async function callGeminiWithRetry(prompt, maxRetries = 3) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Geminiの出力:", text);

      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Geminiが有効なJSON配列を返しませんでした。");
      }
    } catch (err) {
      console.warn(`Gemini失敗（${attempt}回目）: ${err.message}`);
      if (attempt === maxRetries) throw err;
    }
  }
}

// Spotifyログイン（使ってないけど一応残しておく）
let spotifyAccessToken = null;
let spotifyRefreshToken = process.env.REFRESH_TOKEN || null;
let tokenExpiresAt = null;

app.get("/login", (req, res) => {
  const state = Math.random().toString(36).substring(2);
  const authURL =
    `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent("user-read-private")}` +
    `&state=${state}` +
    `&prompt=consent`;

  res.redirect(authURL);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", process.env.SPOTIFY_REDIRECT_URI);
  params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
  params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const text = await response.text();
    console.log("Spotifyのレスポンス:", text);

    const data = JSON.parse(text);
    if (data.error) {
      console.error("Spotifyエラー:", data.error, data.error_description);
      return res.status(400).send(`Spotifyエラー: ${data.error_description}`);
    }

    spotifyAccessToken = data.access_token;
    if (data.refresh_token) spotifyRefreshToken = data.refresh_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;

    console.log("Spotifyトークン取得成功:", spotifyAccessToken);
    res.send("ログインしました！ask.batを自動的に起動します！");
    exec(
      'start "" "C:\\Users\\ityan\\Desktop\\My works\\music-etc\\ask.bat"',
      (error, stdout, stderr) => {
        if (error) {
          console.error(`ask.bat 起動失敗: ${error.message}`);
          return;
        }
        console.log("ask.bat を起動しました");
      }
    );
  } catch (err) {
    console.error("トークン取得中の例外:", err);
    res.status(500).send("トークンの取得に失敗しました。");
  }
});

app.post("/parse-music-context", async (req, res) => {
  console.log("受信したBODY: ", req.body);
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "何か入力してください！" });
  }

  const { language } = "Japan";

  const prompt = `
以下は、ある状況説明です。この状況に合った音楽を考えてください。
Spotify APIなどの制限は考慮せず、あなたの知識から最適な曲を10曲、曲名とアーティスト名のリスト形式で提案してください。
曲は、実在する有名なもので、リスナーが検索しやすいようにしてください。リスナーの話す言語についても考えなさい。
ただし、日本人でも英語の曲を聴くように、多少は織り交ぜてください。
また、曲の雰囲気や音の大きさ、喋り言葉の具合、音の圧などを考えたうえで出力しなさい。

【状況説明】
${description}

【リスナーの言語】
${language}

【出力形式】
[
  "曲名 - アーティスト名",
  ...
] ※10曲のみ。説明やコメントは禁止。
`;

  try {
    const songs = await callGeminiWithRetry(prompt);
    console.log("Geminiが返した曲リスト:", songs);
    if (!Array.isArray(songs)) throw new Error("配列じゃない！");
    res.json({ tracks: songs });
  } catch (err) {
    console.error("エラー:", err);
    res.status(500).json({
      error: err.message,
      tracks: [
        "Weightless - Marconi Union",
        "Clair de Lune - Claude Debussy"
      ]
    });
  }
});

app.listen(3000, () => {
  console.log("Running on http://127.0.0.1:3000");
  open("http://127.0.0.1:3000/login");
});
