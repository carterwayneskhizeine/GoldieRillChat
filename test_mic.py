import pyaudio
import wave
import os
import sys
import time

# 录音参数
CHUNK = 1024  # 每次读取的帧数
FORMAT = pyaudio.paInt16  # 16位整型
CHANNELS = 1  # 单声道
RATE = 16000  # 采样率
RECORD_SECONDS = 5  # 录音时长
OUTPUT_FILENAME = "test_recording.wav"  # 输出文件名

def test_microphone():
    """测试麦克风录音功能，并保存为WAV文件"""
    print(f"开始测试麦克风录音 ({RECORD_SECONDS}秒)...")
    
    # 创建PyAudio实例
    audio = pyaudio.PyAudio()
    
    try:
        # 获取可用设备信息
        print("\n可用的音频设备:")
        for i in range(audio.get_device_count()):
            device_info = audio.get_device_info_by_index(i)
            if device_info['maxInputChannels'] > 0:  # 仅显示输入设备
                print(f"设备 {i}: {device_info['name']}")
                print(f"  - 通道数: {device_info['maxInputChannels']}")
                print(f"  - 默认采样率: {device_info['defaultSampleRate']}")
                print()
        
        # 打开音频流
        stream = audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        print(f"正在录音... ({RECORD_SECONDS}秒)")
        
        # 收集音频数据
        frames = []
        for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)
            # 显示进度条
            sys.stdout.write(f"\r进度: {i/(RATE/CHUNK*RECORD_SECONDS)*100:.1f}%")
            sys.stdout.flush()
        
        print("\n录音完成!")
        
        # 停止并关闭流
        stream.stop_stream()
        stream.close()
        
        # 保存为WAV文件
        wf = wave.open(OUTPUT_FILENAME, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        print(f"录音已保存为: {os.path.abspath(OUTPUT_FILENAME)}")
        
        # 播放录音以验证
        print("播放录音...")
        play_stream = audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            output=True
        )
        
        wf = wave.open(OUTPUT_FILENAME, 'rb')
        data = wf.readframes(CHUNK)
        
        while data:
            play_stream.write(data)
            data = wf.readframes(CHUNK)
        
        play_stream.stop_stream()
        play_stream.close()
        wf.close()
        
        print("播放完成，测试结束。")
        
    finally:
        # 关闭PyAudio
        audio.terminate()

if __name__ == "__main__":
    # 运行测试
    test_microphone() 