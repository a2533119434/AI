# 🌟 AI修仙沙盒游戏 - AI Word

一个基于人工智能的沙盒式修仙世界构建和故事生成游戏，让玩家能够创建属于自己的修仙世界，并观看AI驱动的角色在其中演绎精彩故事。

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ 主要特性

### 🎯 智能世界构建
- **世界模版系统**：内置经典修仙世界模版，支持自定义模版创建和保存
- **AI世界生成**：一键生成完整世界设定，包括背景、势力、人物和地理
- **修炼体系**：自定义境界划分和修炼规则
- **地图系统**：多层级地理区域管理（州/城/山/区域）

### 👥 动态角色系统
- **智能人物生成**：AI创建具有独特性格、背景和目标的角色
- **势力关系**：复杂的势力间关系网络（友好/敌对/中立/联盟）
- **人物关系**：师父弟子、朋友敌人等多维度人际关系
- **角色成长**：随时间推移的能力提升和经历积累

### 📖 故事生成引擎
- **日志模拟**：按天推进世界时间，生成每日发生的事件
- **小说生成**：基于世界状态生成连载小说章节
- **多主题支持**：冒险、修炼、政治、情感等不同主题
- **多风格输出**：古典、现代、诗意等不同文风

### 🤖 AI聊天系统
- **角色对话**：与世界中的任何角色进行对话
- **智能回复**：基于角色性格和背景的个性化回应
- **多模型支持**：支持OpenAI、DeepSeek等多种AI模型

### 📱 现代化界面
- **响应式设计**：完美适配桌面和移动设备
- **实时更新**：流式响应，实时显示AI生成内容
- **直观操作**：简洁易用的用户界面
- **数据持久化**：本地SQLite数据库，数据安全可靠

## 🚀 快速开始

### 环境要求
- Python 3.8+
- 现代浏览器（Chrome、Firefox、Safari、Edge）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/AI_Word.git
cd AI_Word
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置AI模型**
   - 启动应用后，在设置页面配置您的AI API密钥
   - 支持OpenAI、DeepSeek等多种模型

4. **启动应用**
```bash
python run.py
```

5. **访问应用**
   - 打开浏览器访问 `http://localhost:5099`
   - 移动设备可通过网络IP访问

### 使用Windows批处理启动
双击 `start.bat` 文件即可一键启动应用。

## 🎮 使用指南

### 创建新世界
1. 点击"开始新游戏"
2. 选择世界模版或从零开始创建
3. 设置世界背景、修炼体系
4. 添加势力和人物
5. 保存并开始游戏

### 世界模版功能
- **选择模版**：从预设模版中选择，自动填充世界信息
- **AI生成**：一键生成包含背景、势力、人物的完整世界
- **保存模版**：将自定义世界保存为模版，便于重复使用
- **模版管理**：查看、删除和导入模版

### 故事模拟
- **时间推进**：选择推进天数，观看世界发展
- **故事指导**：输入情节方向，引导故事发展
- **事件查看**：查看每日发生的重要事件
- **小说生成**：基于世界状态生成小说章节

## 🛠️ 技术架构

### 后端技术
- **Flask**：轻量级Web框架
- **SQLite**：本地数据库存储
- **LangChain**：AI模型调用框架
- **OpenAI API**：大语言模型接口

### 前端技术
- **原生JavaScript**：无框架依赖，简洁高效
- **Bootstrap**：响应式UI框架
- **Fetch API**：现代化HTTP请求
- **WebSocket**：实时数据传输

### AI集成
- **多模型支持**：OpenAI GPT、DeepSeek等
- **提示工程**：精心设计的提示模版
- **流式响应**：实时显示生成内容
- **错误恢复**：智能处理API异常

## 📁 项目结构

```
AI_Word/
├── app.py              # Flask主应用
├── ai_engine.py        # AI引擎核心逻辑
├── run.py              # 启动脚本
├── start.bat           # Windows启动批处理
├── requirements.txt    # Python依赖
├── game.db            # SQLite数据库
├── templates/         # HTML模版
│   └── index.html     # 主界面
├── static/            # 静态资源
│   ├── css/          # 样式文件
│   ├── js/           # JavaScript文件
│   └── images/       # 图片资源
└── README.md          # 项目文档
```

## 🔧 API接口

### 世界管理
- `GET /api/saves` - 获取存档列表
- `POST /api/saves` - 创建新存档
- `GET /api/saves/{id}/load` - 加载存档
- `PUT /api/saves/{id}` - 更新存档

### AI生成
- `POST /api/ai/generate-world` - 生成世界设定
- `POST /api/ai/generate-factions` - 生成势力
- `POST /api/ai/generate-characters` - 生成人物
- `POST /api/ai/generate-all` - 生成完整世界

### 模版系统
- `GET /api/templates` - 获取模版列表
- `POST /api/templates` - 创建模版
- `GET /api/templates/{id}` - 获取模版详情
- `DELETE /api/templates/{id}` - 删除模版

### 故事生成
- `POST /api/saves/{id}/simulate` - 模拟世界发展
- `POST /api/ai/generate-novel` - 生成小说
- `POST /api/chat-stream` - 聊天对话

## 🔑 配置说明

### AI模型配置
在应用设置中配置您的AI模型：

```json
{
  "name": "DeepSeek",
  "api_key": "sk-your-api-key",
  "base_url": "https://api.deepseek.com",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 支持的AI模型
- **OpenAI GPT-3.5/GPT-4**
- **DeepSeek Chat**
- **其他兼容OpenAI API的模型**

## 📋 待办事项

- [ ] 增加更多世界模版
- [ ] 支持图片生成功能
- [ ] 添加多语言支持
- [ ] 开发角色头像生成
- [ ] 实现世界地图可视化
- [ ] 添加音效和背景音乐
- [ ] 支持多人协作模式

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 开源协议

本项目采用 MIT 协议，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Flask](https://flask.palletsprojects.com/) - Web框架
- [LangChain](https://langchain.com/) - AI应用框架
- [OpenAI](https://openai.com/) - AI模型提供商
- [DeepSeek](https://deepseek.com/) - AI模型提供商
- [Bootstrap](https://getbootstrap.com/) - UI框架

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/AI_Word/issues)
- 发送邮件至：your.email@example.com
- 项目主页：[https://github.com/yourusername/AI_Word](https://github.com/yourusername/AI_Word)

---

⭐ 如果这个项目对您有帮助，请不要忘记给个星标！ 
