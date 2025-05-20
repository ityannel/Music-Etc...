@echo off
chcp 65001 > nul

:loop
set /p INPUT=状況を入力してください（終了するにはexitと入力）:
if /I "%INPUT%"=="exit" goto end

set ESCAPED_INPUT=%INPUT:"=\"%
echo {"description":"%ESCAPED_INPUT%"} > tmp.json

echo データを送信中...
curl -s -X POST http://localhost:3000/parse-music-context ^
     -H "Content-Type: application/json" ^
     --data-binary "@tmp.json" ^
     -o response.json

echo サーバーからの返答:
type response.json

del tmp.json
echo.

goto loop

:end
echo 終了しました。
pause
