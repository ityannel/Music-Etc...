const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // v2
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
// Render環境では不要なためコメントアウト
// const { exec } = require("child_process");
// const open = require("open").default;

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Gemini APIのクライアントを初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// (Spotify関連のコードは変更なしのため、省略)
// ...

/**
 * Gemini APIをリトライ機能付きで呼び出します。
 */
async function callGeminiWithRetry(prompt, maxRetries = 3) {
  // 安定して動作するモデル名を指定
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // console.log("Geminiの返事:", text);

      try {
        const match = text.match(/{[\s\S]*}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("レスポンスからJSONオブジェクトが見つかりません。");
      } catch (e) {
        console.error("JSONのパースに失敗しました:", e);
        throw new Error("Geminiが有効なJSONを返しませんでした。");
      }
    } catch (err) {
      console.warn(`Gemini呼び出し失敗（${attempt}回目）: ${err.message}`);
      if (attempt === maxRetries) throw err;
    }
  }
}

/**
 * メインのAPIエンドポイント。
 */
app.post("/parse-music-context", async (req, res) => {
  // リクエストごとに現在時刻を取得するように修正
  const date = new Date();
  const currentTime = date.getHours() + ":" + date.getMinutes();
  const userLanguage = "Japanese"; // デフォルト言語を設定

  const { description } = req.body;
  if (!description) { 
    return res.status(400).json({ error: "何か入力してください！！" });
  }

  const prompt1 =`
    以下の【状況説明】と【補足情報】を総合的に判断し、Spotifyのrecommendations APIに使えるパラメータを推測してください。

    【状況説明】
    ${description}

    【補足情報】
    - 現在時刻: ${currentTime}
    
    【使用可能なseed_genres一覧】
    ...（以前と同じ）...

    出力ルール：
    ...（以前と同じ）...

    【出力形式】
    ...（以前と同じ）...
  `;

  try {
    const spotifyParams = await callGeminiWithRetry(prompt1);
    console.log("Geminiが出力した検索パラメータ: ", spotifyParams);

    const prompt2 = `
      あなたは優秀な選曲AIです。
      以下の「状況説明」と「音楽パラメータ」をもとに、実在する楽曲から最適な10曲を選んでください。

      【状況説明】
      ${description}

      【音楽パラメータ】
      ${JSON.stringify(spotifyParams, null, 2)}

      【ユーザーの言語】
      ${userLanguage}

      【ルール】
      - ユーザーが話す言語が「Japanese」の場合、日本語の曲を優先してください。
      - ...（以前と同じ）...
      - 出力は必ず厳密なJSON形式のみとし、説明は一切しないこと。

      【出力形式】
      {
          "tracks": [
              { "artist": "アーティスト名", "title": "曲名" },
              ...
          ]
      }
    `;

    const selectedMusics = await callGeminiWithRetry(prompt2);
    console.log("Geminiが選んだ曲たち: ", selectedMusics);

    res.json({
      params: spotifyParams,
      tracks: selectedMusics.tracks ?? []
    });

  } catch (err) {
    console.error("エラー: ", err);
    res.status(500).json({
      error: err.message,
      tracks: []
    });
  }
});

// Render環境で動作するように修正
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました。`);
});
