#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
# 禁用Flask自动加载.env文件
os.environ['FLASK_SKIP_DOTENV'] = '1'

from app import app, init_db

if __name__ == '__main__':
    print("正在启动AI沙盒游戏...")
    print("DeepSeek API已配置")
    print("访问地址: http://localhost:5099")
    
    # 初始化数据库
    init_db()
    
    # 使用更稳定的启动配置
    app.run(
        debug=True, 
        host='0.0.0.0', 
        port=5099,
        threaded=True,
        use_reloader=False  # 禁用自动重载以避免Windows套接字错误
    ) 