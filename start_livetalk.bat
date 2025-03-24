@echo off
echo 正在启动LiveTalking数字人服务...

REM 激活conda环境
call conda activate nerfstream

REM 切换到LiveTalking目录
cd /d D:\Code\GoldieRillChat\LiveTalking

REM 启动LiveTalking服务
python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1 --tts cosyvoice

echo LiveTalking服务已关闭。 