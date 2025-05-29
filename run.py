#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AI沙盒游戏启动脚本
专为Windows环境优化，解决套接字错误问题
"""

import os
import sys
import signal
import socket
from contextlib import closing

# 禁用Flask自动加载.env文件
os.environ['FLASK_SKIP_DOTENV'] = '1'

def check_port(host, port):
    """检查端口是否被占用"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        return result == 0

def find_free_port(start_port=5099, max_attempts=10):
    """查找可用端口"""
    for i in range(max_attempts):
        port = start_port + i
        if not check_port('127.0.0.1', port):
            return port
    return None

def signal_handler(sig, frame):
    """处理中断信号"""
    print('\n正在关闭应用...')
    sys.exit(0)

if __name__ == '__main__':
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    
    print("=" * 50)
    print("AI沙盒游戏启动器")
    print("=" * 50)
    
    try:
        # 查找可用端口
        port = find_free_port()
        if port is None:
            print("❌ 错误：无法找到可用端口")
            sys.exit(1)
        
        if port != 5099:
            print(f"⚠️  端口5099被占用，使用端口{port}")
        
        print(f"✅ 端口{port}可用")
        print("🚀 正在启动应用...")
        
        # 导入并启动应用
        from app import app, init_db
        
        # 初始化数据库
        print("📄 初始化数据库...")
        init_db()
        
        print("🌐 DeepSeek API已配置")
        print(f"🔗 本地访问: http://localhost:{port}")
        print(f"🔗 网络访问: http://0.0.0.0:{port}")
        print("=" * 50)
        print("按 Ctrl+C 停止服务器")
        
        # 启动Flask应用
        app.run(
            debug=True,
            host='0.0.0.0',
            port=port,
            threaded=True,
            use_reloader=False,  # 禁用自动重载
            use_debugger=True
        )
        
    except KeyboardInterrupt:
        print("\n👋 应用已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("\n💡 解决方案:")
        print("1. 检查是否有其他程序占用端口")
        print("2. 尝试以管理员身份运行")
        print("3. 重启计算机后再试")
        sys.exit(1) 