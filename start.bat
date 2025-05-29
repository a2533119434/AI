@echo off
chcp 65001 > nul
title AI沙盒游戏

echo ========================================
echo           AI沙盒游戏启动器
echo ========================================
echo.

echo 正在检查Python环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或未添加到PATH
    echo 请先安装Python 3.8+
    pause
    exit /b 1
)

echo ✅ Python环境正常

echo.
echo 正在启动应用...
echo 如果出现端口占用错误，请先关闭其他占用端口的程序
echo.

python run.py

echo.
echo 应用已停止
pause 