@echo off
chcp 65001 >nul 2>&1

rem スクリプト自身のフォルダに移動（日本語パス対応）
pushd "%~dp0"

echo Building extensions...
echo.

rem === Chrome ===
if exist dist\chrome rmdir /s /q dist\chrome
mkdir dist\chrome
mkdir dist\chrome\icons

copy src\manifest.json       dist\chrome\manifest.json >nul
copy src\background.js       dist\chrome\ >nul
copy src\content.js          dist\chrome\ >nul
copy src\popup.js            dist\chrome\ >nul
copy src\popup.html          dist\chrome\ >nul
copy src\popup.css           dist\chrome\ >nul
copy src\styles.css          dist\chrome\ >nul
copy src\icons\icon16.png    dist\chrome\icons\ >nul
copy src\icons\icon48.png    dist\chrome\icons\ >nul
copy src\icons\icon128.png   dist\chrome\icons\ >nul

echo   [OK] dist\chrome\

rem === Firefox ===
if exist dist\firefox rmdir /s /q dist\firefox
mkdir dist\firefox
mkdir dist\firefox\icons

copy src\manifest_firefox.json dist\firefox\manifest.json >nul
copy src\background.js         dist\firefox\ >nul
copy src\content.js            dist\firefox\ >nul
copy src\popup.js              dist\firefox\ >nul
copy src\popup.html            dist\firefox\ >nul
copy src\popup.css             dist\firefox\ >nul
copy src\styles.css            dist\firefox\ >nul
copy src\icons\icon16.png      dist\firefox\icons\ >nul
copy src\icons\icon48.png      dist\firefox\icons\ >nul
copy src\icons\icon128.png     dist\firefox\icons\ >nul

echo   [OK] dist\firefox\

echo.
echo Done!
echo.
echo Chrome:  dist\chrome\
echo Firefox: dist\firefox\
echo.
echo Chrome:  chrome://extensions  - パッケージ化されていない拡張機能を読み込む
echo Firefox: about:debugging#/runtime/this-firefox - 一時的なアドオンを読み込む

popd
pause
