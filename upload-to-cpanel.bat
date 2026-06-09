@echo off
echo ============================================
echo    رفع مشروع Hijaz Showroom إلى cPanel
echo ============================================
echo.
echo سيتم فتح المتصفح على cPanel - الرجاء تسجيل الدخول
echo.
echo المستخدم: gkldeed
echo كلمة السر: Alpha02#
echo.
echo بعد الدخول اذهب إلى File Manager ^> public_html
echo وارفع محتويات مجلد build/
echo.
echo اضغط أي زر لفتح cPanel...
pause >nul

start https://server2.web-hosting.com:2083

echo.
echo ============================================
echo للرفع يدوياً عبر FTP:
echo -------------------------------------------
echo Host: server2.web-hosting.com
echo Port: 21
echo User: gkldeed
echo Pass: Alpha02#
echo --------------------------------------------
echo.
echo أو استخدم File Manager في cPanel
echo ============================================
pause
