const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // v2!
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const { exec } = require("child_process");
const open = require("open").default;

//デバイスの現在時刻
let date = new Date();
let nowTime = date.getHours() + ":" + date.getMinutes();


dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// let spotifyAccessToken = null;
// let spotifyRefreshToken = process.env.REFRESH_TOKEN || null;
// let tokenExpiresAt = null;

// app.get("/login", (req, res) => {
//   const state = Math.random().toString(36).substring(2);
//   const authURL =`
//     https://accounts.spotify.com/authorize? +
//     client_id=${process.env.SPOTIFY_CLIENT_ID} +
//     &response_type=code +
//     &redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)} +
//     &scope=${encodeURIComponent("user-read-private")} +
//     &state=${state} +
//     &prompt=consent`;

//   res.redirect(authURL);
// // });

// app.get("/callback", async (req, res) => {
//   const code = req.query.code;
//   const params = new URLSearchParams();
//   params.append("grant_type", "authorization_code");
//   params.append("code", code);
//   params.append("redirect_uri", process.env.SPOTIFY_REDIRECT_URI);
//   params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
//   params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

//   try {
//     const response = await fetch("https://accounts.spotify.com/api/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params,
//     });

//     const text = await response.text();
//     console.log("Spotifyのレスポンス:", text);

//     const data = JSON.parse(text);
//     if (data.error) {
//       console.error("Spotifyエラー:", data.error, data.error_description);
//       return res.status(400).send(`Spotifyエラー: ${data.error_description}`);
//     }

//     spotifyAccessToken = data.access_token;
//     if (data.refresh_token) spotifyRefreshToken = data.refresh_token;
//     tokenExpiresAt = Date.now() + data.expires_in * 1000;

//     console.log("Spotifyトークン取得成功:", spotifyAccessToken);
// console.log("ask.batを自動的に起動します！");
// exec(
//   'start "" "C:\\Users\\ityan\\Desktop\\My works\\music-etc\\ask.bat"',
//   (error, stdout, stderr) => {
//     if (error) {
//       console.error(`ask.bat 起動失敗: ${error.message}`);
//       return;
//     }
//     console.log("ask.bat を起動しました");
//   }
// );
//   } catch (err) {
//     console.error("トークン取得中の例外:", err);
//     res.status(500).send("トークンの取得に失敗しました。");
//   }
// });

// async function getAccessToken() {
//   if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
//     return spotifyAccessToken;
//   }

//   if (!spotifyRefreshToken) {
//     throw new Error(
//       "Spotifyのアクセストークンが未取得またはリフレッシュトークンがありません。"
//     );
//   }

//   const params = new URLSearchParams();
//   params.append("grant_type", "refresh_token");
//   params.append("refresh_token", spotifyRefreshToken);
//   params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
//   params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

//   const response = await fetch("https://accounts.spotify.com/api/token", {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body: params,
//   });

//   const data = await response.json();
//   if (data.access_token) {
//     spotifyAccessToken = data.access_token;
//     tokenExpiresAt = Date.now() + data.expires_in * 1000;
//     if (data.refresh_token) spotifyRefreshToken = data.refresh_token;
//     console.log("Spotifyトークンをリフレッシュしました:", spotifyAccessToken);
//     return spotifyAccessToken;
//   }

//   throw new Error("Spotifyのアクセストークンが取得できませんでした。");
// }
// );

async function callGeminiWithRetry(prompt, maxRetries = 3) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Geminiの返事:", text);

      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/{[\s\S]*}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("GeminiがJSONを返しませんでした！！");
      }
    } catch (err) {
      console.warn(`Gemini失敗（${attempt}回目）: ${err.message}`);
      if (attempt === maxRetries) throw err;
    }
  }
}

// async function getSpotifyRecommendations(token, params) {
//   const queryParams = new URLSearchParams(params).toString();
//   const url = `https://api.spotify.com/v1/recommendations?${queryParams}`;
//   console.log("Spotifyに送ってるURL:", url);

//   try {
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     });

//     console.log("Spotifyレスポンスステータス:", response.status);

//     const text = await response.text();
//     console.log("Spotifyから帰ってきた生のレスポンス:", text);

//     if (!text || !text.trim().startsWith("{")) {
//       throw new Error("Spotifyのレスポンスが不正です！");
//     }

//     const data = JSON.parse(text);
//     console.log("Spotifyから返ってきた生の回答をJSONにパースしたら:", data);

//     if (!data.tracks || !Array.isArray(data.tracks)) {
//       throw new Error("Spotifyから曲情報が返されませんでした。");
//     }

//     return data.tracks.slice(0, 10).map((track) => track.name);
//   } catch (err) {
//     console.error("Spotifyへのfetchが失敗しました:", err);
//     throw new Error("Spotifyへのリクエスト失敗orレスポンス失敗！！");
//   }
// }

app.post("/parse-music-context", async (req, res) => {
  const userLanguage = "";
  const { description } = req.body;
  if (!description) { 
    return res.status(400).json({ error: "何か入力してください！！" });
  }

  const prompt1 =`
    以下の文章は、ある状況を表しています。
    この文章から、Spotifyのrecommendations APIに使えるパラメータを推測してください。

    【状況説明】
    ${description}

    【使用可能なseed_genres一覧】
    次の中から５個まで選んでくださいこれ以外を入れるとエラーになります。
    もしこれ以外を出力した場合、アプリはクラッシュし、ユーザーが怒ります。
    絶対に守ってください。：
    [
      "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime",
      "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat",
      "british", "cantopop", "chicago-house", "children", "chill", "classical",
      "club", "comedy", "country", "dance", "dancehall", "death-metal",
      "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub",
      "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french",
      "funk", "garage", "german", "gospel", "goth", "grindcore", "groove",
      "grunge", "guitar", "hard-rock", "hardcore", "hardstyle", "heavy-metal",
      "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie",
      "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock",
      "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal",
      "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age",
      "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop",
      "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock",
      "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip",
      "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba",
      "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter",
      "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop",
      "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music"
    ]

    出力ルール：
    JSON形式のみ出力し、説明文、コメント、コード例などは絶対に入れないこと。
    各数値はSpotifyの仕様に従い、適切な範囲（0〜1など）で設定すること。
    seed_genres はSpotifyで有効な英語のジャンル名を1～5個設定すること。
    target_tempo は 50〜200 の範囲で指定すること。
    ただし、過剰に絞りすぎず、偏らない値にすること。
    target_popularity はSpotifyでは使えないので含めないこと。

    【出力形式】
    {
      "seed_genres": ["pop", "dance"],
      "target_valence": 0.8,
      "target_energy": 0.9,
      "target_danceability": 0.9,
      "target_tempo": 130,
      "target_acousticness": 0.2,
      "target_liveness": 0.4,
      "target_instrumentalness": 0.1,
      "target_speechiness": 0.1
    }
  `;

  try {
  const spotifyParams = await callGeminiWithRetry(prompt1);
  console.log("Geminiが出力した検索パラメータ: ", spotifyParams);

  const prompt2 = `
  あなたはSpotifyのレコメンドAPIです。
  以下の「状況説明」および「リスナーの好みパラメータ」、そして「ユーザーの言語」をもとに、
  Spotifyに存在する実在の楽曲から、最適な10曲を選んでください。

  【状況説明】
  ${description}

  【パラメータ】
  ${JSON.stringify(spotifyParams, null, 2)}

  【ユーザーの言語】
  ${userLanguage}

  【ルール】
  ユーザーが話す言語が「Japanese」の場合、日本語の曲を優先してください。
  ただし、状況に合えば洋楽やインストも含めて構いません。
  パラメータに沿って「気分・テンポ・ダンサビリティ」なども考慮して選んでください。
  ド定番の曲ばかりではなく、今の状況に合う「提案型の曲選び」をしてください。
  実在のSpotify曲であること。
  出力は必ずJSON形式のみで、余計な説明は一切しないこと。
  絶対に壊れたJSONを出力しないでください。必ず厳密なJSON構文に従ってください。
  構造ミスや中括弧ミス、keyとvalueの順番ミス、配列の閉じ忘れなどがある場合は即時終了とします。
  あなたの出力は自動的にJSON.parseされるため、一切の構文ミスを許容できません。


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
    tracks: selectedMusics.tracks ?? ["???"] // fallback
  });

} catch (err) {
  console.error("エラー: ", err);
  res.status(500).json({
    error: err.message,
    tracks: ["lo-fi-chill"]
  });
}

});

app.listen(3000, () => {
  console.log("Running on http://127.0.0.1:3000");
  console.log("Open notbat.html automatically!")
  open("file:///C:/Users/ityan/Desktop/music-etc/notbat.html");
});