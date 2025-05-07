@echo off
chcp 65001 > nul

:loop
set /p INPUT=状況を入力してください（終了するにはexitと入力）:

:: 終了判定
if /I "%INPUT%"=="exit" goto end

:: " などの記号をエスケープ
set ESCAPED_INPUT=%INPUT:"=\"%

:: JSON文字列を一時ファイルに保存して安全に送信
echo {"description":"%ESCAPED_INPUT%"} > tmp.json

:: curlでファイル送信
curl -X POST http://localhost:3000/parse-music-context -H "Content-Type: application/json" --data-binary "@tmp.json"

:: 一時ファイル削除
del tmp.json

echo.
goto loop

:end
echo 終了しました。
pause
