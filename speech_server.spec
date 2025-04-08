# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('python_env\\Lib\\site-packages\\flask', 'flask'), ('python_env\\Lib\\site-packages\\dashscope', 'dashscope'), ('python_env\\Lib\\site-packages\\flask_cors', 'flask_cors'), ('python_env\\Lib\\site-packages\\werkzeug', 'werkzeug'), ('python_env\\Lib\\site-packages\\pyaudio', 'pyaudio')]
binaries = []
hiddenimports = ['engineio.async_drivers.threading', 'werkzeug', 'flask', 'flask_cors', 'pyaudio', 'dashscope', 'json', 'os', 're']
tmp_ret = collect_all('dashscope')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('flask')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('flask_cors')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('pyaudio')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['speech_server.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='speech_server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['resources\\favicon.ico'],
)
