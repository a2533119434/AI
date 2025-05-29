from flask import Flask, render_template, request, jsonify, session, Response
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
import uuid
from ai_engine import AIEngine
from openai import OpenAI
import traceback
import time

app = Flask(__name__)
app.secret_key = 'ai_sandbox_game_secret_2024'
CORS(app)

# 数据库初始化
def init_db():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    # 游戏存档表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            world_background TEXT,
            world_introduction TEXT,
            cultivation_system TEXT,
            map_data TEXT,
            current_day INTEGER DEFAULT 1,
            current_time TEXT DEFAULT '年初春日'
        )
    ''')
    
    # 世界模版表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS world_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            world_background TEXT,
            world_introduction TEXT,
            cultivation_system TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 模版势力表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS template_factions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            name TEXT NOT NULL,
            ideal TEXT,
            background TEXT,
            description TEXT,
            power_level INTEGER DEFAULT 50,
            headquarters_location TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES world_templates (id)
        )
    ''')
    
    # 模版人物表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS template_characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            template_faction_id INTEGER,
            name TEXT NOT NULL,
            personality TEXT,
            birthday TEXT,
            age INTEGER,
            location TEXT,
            position TEXT,
            realm TEXT,
            lifespan INTEGER DEFAULT 100,
            equipment TEXT,
            skills TEXT,
            experience TEXT,
            goals TEXT,
            relationships TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES world_templates (id),
            FOREIGN KEY (template_faction_id) REFERENCES template_factions (id)
        )
    ''')
    
    # 模版地区表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS template_regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            name TEXT NOT NULL,
            type TEXT,
            parent_id INTEGER,
            template_faction_id INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES world_templates (id),
            FOREIGN KEY (template_faction_id) REFERENCES template_factions (id)
        )
    ''')
    
    # 世界地图表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS map_regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            name TEXT NOT NULL,
            type TEXT, -- 州/区域/城/山等
            parent_id INTEGER, -- 父级区域ID
            faction_id INTEGER, -- 控制势力
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (faction_id) REFERENCES factions (id)
        )
    ''')
    
    # 势力表（扩展）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS factions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            name TEXT NOT NULL,
            ideal TEXT, -- 理想
            background TEXT, -- 背景
            description TEXT,
            status TEXT,
            power_level INTEGER DEFAULT 50,
            headquarters_location TEXT, -- 总部位置
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id)
        )
    ''')
    
    # 势力关系表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS faction_relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            faction1_id INTEGER,
            faction2_id INTEGER,
            relationship_type TEXT, -- 友好/敌对/中立/联盟等
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (faction1_id) REFERENCES factions (id),
            FOREIGN KEY (faction2_id) REFERENCES factions (id)
        )
    ''')
    
    # 人物表（扩展）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            faction_id INTEGER,
            name TEXT NOT NULL,
            status TEXT, -- 状态
            personality TEXT, -- 性格
            birthday TEXT, -- 生日
            age INTEGER, -- 年龄
            location TEXT, -- 地点
            position TEXT, -- 职位
            realm TEXT, -- 境界
            lifespan INTEGER, -- 寿命
            equipment TEXT, -- 装备（JSON）
            skills TEXT, -- 技能（JSON）
            experience TEXT, -- 人物经历
            goals TEXT,
            relationships TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (faction_id) REFERENCES factions (id)
        )
    ''')
    
    # 人际关系表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS character_relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            character1_id INTEGER,
            character2_id INTEGER,
            relationship_type TEXT, -- 师父/弟子/朋友/敌人等
            notes TEXT, -- 备注
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (character1_id) REFERENCES characters (id),
            FOREIGN KEY (character2_id) REFERENCES characters (id)
        )
    ''')
    
    # AI对话相关表
    # 创建chats表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        system_prompt TEXT,
        context_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    ''')
    
    # 创建chat_messages表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats (id)
    )
    ''')
    
    # 世界大事记表（扩展）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS world_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            day INTEGER,
            time_period TEXT, -- 时间段
            faction_id INTEGER, -- 相关势力
            theme TEXT, -- 主题
            event_title TEXT,
            event_description TEXT,
            region_id INTEGER, -- 相关地区
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (faction_id) REFERENCES factions (id),
            FOREIGN KEY (region_id) REFERENCES map_regions (id)
        )
    ''')
    
    # 势力大事记表（扩展）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS faction_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            faction_id INTEGER,
            day INTEGER,
            time_period TEXT,
            theme TEXT,
            event_title TEXT,
            event_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (faction_id) REFERENCES factions (id)
        )
    ''')
    
    # 人物大事记表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS character_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            character_id INTEGER,
            day INTEGER,
            time_period TEXT,
            theme TEXT,
            event_title TEXT,
            event_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (character_id) REFERENCES characters (id)
        )
    ''')
    
    # 地图事件表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS map_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            region_id INTEGER,
            day INTEGER,
            event_title TEXT,
            event_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id),
            FOREIGN KEY (region_id) REFERENCES map_regions (id)
        )
    ''')
    
    # 生成记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            guide_text TEXT, -- 引导文本
            result_summary TEXT, -- 结果摘要
            world_refreshed BOOLEAN DEFAULT FALSE, -- 世界刷新
            factions_refreshed BOOLEAN DEFAULT FALSE, -- 势力刷新
            characters_refreshed BOOLEAN DEFAULT FALSE, -- 人物刷新
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id)
        )
    ''')
    
    # 小说记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER,
            title TEXT NOT NULL,
            theme TEXT,
            style TEXT DEFAULT 'classic',
            content TEXT,
            day INTEGER,
            characters_involved TEXT, -- JSON格式存储相关人物
            factions_involved TEXT, -- JSON格式存储相关势力
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (save_id) REFERENCES saves (id)
        )
    ''')
    
    # AI配置表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_key TEXT,
            base_url TEXT,
            model TEXT,
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 2000,
            is_active BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 插入默认DeepSeek配置
    cursor.execute('''
        INSERT OR IGNORE INTO ai_configs (id, name, api_key, base_url, model, temperature, is_active)
        VALUES (1, 'DeepSeek', 'XXXX', 'https://api.deepseek.com', 'deepseek-chat', 0.7, 1)
    ''')
    
    # 插入默认世界模版
    cursor.execute('''
        INSERT OR IGNORE INTO world_templates (id, name, description, world_background, world_introduction, cultivation_system)
        VALUES (1, '经典修仙世界', '传统的修仙背景，包含仙门、魔道、散修等势力', 
                '这是一个以修仙为主题的奇幻世界，天地间灵气充沛，修炼者通过吸收天地灵气来提升境界。世界分为凡人界、修真界等多个层次。',
                '修真界历史悠久，各大仙门林立，正邪两道争斗不休。凡人羡慕修真者的力量，而修真者追求更高的境界和永生。',
                '修炼境界分为：练气期、筑基期、金丹期、元婴期、化神期、炼虚期、合体期、大乘期、渡劫期。每个境界又分为初期、中期、后期、圆满四个小境界。')
    ''')
    
    # 插入斗破苍穹世界模版
    cursor.execute('''
        INSERT OR IGNORE INTO world_templates (id, name, description, world_background, world_introduction, cultivation_system)
        VALUES (2, '斗破苍穹世界', '土豆经典玄幻小说背景，斗气大陆的热血传奇', 
                '斗气大陆，没有花俏的魔法，有的，仅仅是繁衍到巅峰的斗气！在这个世界，斗气就是一切，强者为尊，弱者为奴。这里有着无数的种族和势力，人类、魔兽、古族等各方势力错综复杂。',
                '斗气大陆广袤无垠，分为中州、西北大陆、黑角域等多个区域。中州是大陆的中心，强者如云，古族林立。各大势力为了争夺资源和地盘，战争不断。这是一个充满机遇与危险的世界，强者可以翻手为云覆手为雨，弱者只能在夹缝中求生存。',
                '斗气修炼分为：斗者、斗师、大斗师、斗灵、斗王、斗皇、斗宗、斗尊、斗圣、斗帝。每个境界又分为一至九星。斗帝为传说中的至高境界，整个大陆历史上只出现过屈指可数的几位斗帝强者。')
    ''')
    
    # 插入默认模版势力
    cursor.execute('''
        INSERT OR IGNORE INTO template_factions (id, template_id, name, ideal, background, description, power_level, headquarters_location)
        VALUES 
        (1, 1, '天剑门', '以剑道称雄天下，维护正道', '天剑门成立于三千年前，是修真界最古老的正道门派之一', '以剑法闻名的正道门派，门下弟子皆是剑道高手', 85, '天剑峰'),
        (2, 1, '万毒教', '称霸修真界，统治所有修炼者', '万毒教是修真界最大的魔道势力，擅长毒术和邪法', '魔道门派，以毒术和邪法著称，与正道为敌', 80, '万毒谷'),
        (3, 1, '散修联盟', '团结散修，对抗大门派的压迫', '由众多散修自发组成的松散联盟', '散修们为了对抗大门派的压迫而组成的联盟', 60, '自由城'),
        (4, 1, '丹药阁', '垄断丹药市场，积累巨大财富', '专门炼制和贩卖丹药的商业组织', '中立势力，专注于丹药买卖，与各方都有往来', 70, '丹药城'),
        (5, 2, '古族联盟', '维护古族血脉纯正，统治斗气大陆', '远古时期就存在的强大种族联盟，拥有最纯正的血脉', '由魂族、古族、炎族等八大古族组成的强大联盟', 95, '中州古族圣地'),
        (6, 2, '云岚宗', '发扬云岚宗威名，统一西北大陆', '西北大陆最强大的宗门，历史悠久', '西北大陆的霸主级势力，以风属性斗技著称', 75, '云岚山'),
        (7, 2, '黑角域', '利益至上，强者为尊', '黑角域是一个混乱无序的地方，强者如云', '充满混乱与杀戮的地域，各种邪恶势力聚集', 70, '黑角域中心'),
        (8, 2, '炼药师公会', '推广炼药术，维护炼药师地位', '大陆最权威的炼药师组织', '超然物外的中立势力，掌握着大陆的丹药资源', 85, '圣丹城'),
        (9, 2, '魔兽帝国', '建立魔兽统治的世界', '强大魔兽种族建立的庞大帝国', '以太虚古龙族为首的魔兽联盟，实力深不可测', 90, '兽域深处')
    ''')
    
    # 插入默认模版人物
    cursor.execute('''
        INSERT OR IGNORE INTO template_characters (id, template_id, template_faction_id, name, personality, age, position, realm, location, goals, experience)
        VALUES 
        (1, 1, 1, '剑无极', '正直刚毅，嫉恶如仇', 150, '掌门', '化神期后期', '天剑峰', '维护正道，消灭邪魔', '天剑门第十八代掌门，剑道天才'),
        (2, 1, 1, '李清风', '温和儒雅，智慧过人', 80, '大长老', '元婴期圆满', '天剑峰', '辅助掌门管理门派，培养后进', '天剑门资深长老，擅长阵法'),
        (3, 1, 2, '毒龙真人', '阴险狡诈，心狠手辣', 200, '教主', '化神期圆满', '万毒谷', '统一修真界，建立魔道王朝', '万毒教现任教主，毒术登峰造极'),
        (4, 1, 2, '血手屠夫', '嗜血残暴，杀人如麻', 120, '护法', '元婴期后期', '万毒谷', '为教主效力，杀尽正道', '万毒教四大护法之一，以残忍著称'),
        (5, 1, 3, '自由行者', '洒脱不羁，崇尚自由', 90, '盟主', '金丹期圆满', '自由城', '保护散修权益，建立公平秩序', '散修出身，靠自己努力达到现在的境界'),
        (6, 1, 4, '丹圣子', '精明能干，善于经商', 70, '阁主', '元婴期中期', '丹药城', '发展丹药事业，成为修真界首富', '年轻有为的丹药大师，商业天赋极高'),
        (7, 2, 5, '魂天帝', '冷酷无情，野心勃勃', 1000, '魂族族长', '九星斗圣巅峰', '魂界', '晋升斗帝，统治整个斗气大陆', '魂族最强者，距离斗帝只有一步之遥'),
        (8, 2, 5, '古元', '睿智稳重，守护族人', 800, '古族族长', '八星斗圣后期', '古界', '保护古族血脉，对抗魂族', '古族现任族长，实力深厚的斗圣强者'),
        (9, 2, 6, '云韵', '冷若冰霜，内心温柔', 30, '宗主', '斗皇巅峰', '云岚山', '振兴云岚宗，保护门下弟子', '年轻的云岚宗宗主，天赋异禀的风属性斗者'),
        (10, 2, 6, '云山', '固执己见，实力强大', 150, '太上长老', '斗宗', '云岚山', '让云岚宗重回巅峰', '云岚宗前宗主，实力强悍但性格偏执'),
        (11, 2, 7, '韩枫', '阴险狡诈，贪婪无度', 45, '黑皇', '斗皇', '黑角域', '称霸黑角域，获得更强力量', '黑角域的强者，心狠手辣的邪恶斗者'),
        (12, 2, 8, '法犸', '温和慈祥，德高望重', 200, '会长', '六品炼药师', '圣丹城', '培养更多炼药师，推广炼药术', '炼药师公会德高望重的会长'),
        (13, 2, 9, '烛坤', '桀骜不驯，实力恐怖', 2000, '太虚古龙皇', '九星斗圣', '兽域', '复兴太虚古龙一族', '太虚古龙族族长，被封印多年的绝世强者'),
        (14, 2, 6, '纳兰嫣然', '高傲自信，天赋卓越', 18, '少宗主', '大斗师', '云岚山', '成为强者，证明自己', '云岚宗年轻一代的佼佼者，纳兰家族天才'),
        (15, 2, 7, '萧炎', '坚韧不拔，天赋异禀，遭遇挫折后更加努力', 16, '平民', '斗者一星', '乌坦城', '恢复天才之名，报仇雪耻，追求更强的力量', '曾经是乌坦城天才少年，三年前修为突然跌落，被未婚妻纳兰嫣然退婚，与神秘的药老结识，开始了逆袭之路')
    ''')
    
    # 插入模版地区数据
    cursor.execute('''
        INSERT OR IGNORE INTO template_regions (id, template_id, name, type, parent_id, template_faction_id, description)
        VALUES 
        (1, 1, '天武大陆', '大陆', NULL, NULL, '修真界的主要大陆，灵气充沛'),
        (2, 1, '东方仙域', '区域', 1, 1, '正道势力聚集的东方区域'),
        (3, 1, '西方魔域', '区域', 1, 2, '魔道势力盘踞的西方区域'),
        (4, 1, '中央平原', '平原', 1, 3, '散修聚集的中立区域'),
        (5, 1, '南方丹域', '区域', 1, 4, '丹药师聚集的炼丹圣地'),
        (6, 2, '斗气大陆', '大陆', NULL, NULL, '斗气修炼者的主要栖息地'),
        (7, 2, '中州', '州', 6, 5, '大陆中心，古族林立的核心区域'),
        (8, 2, '西北大陆', '州', 6, 6, '云岚宗统治的西北区域'),
        (9, 2, '黑角域', '域', 6, 7, '混乱无序的危险地带'),
        (10, 2, '圣丹城', '城', 7, 8, '炼药师公会总部所在'),
        (11, 2, '兽域', '域', 6, 9, '魔兽种族的栖息地'),
        (12, 2, '云岚山', '山', 8, 6, '云岚宗总部山脉'),
        (13, 2, '迦南学院', '学院', 8, NULL, '大陆著名的修炼学院'),
        (14, 2, '乌坦城', '城', 8, NULL, '西北大陆的小城镇')
    ''')
    
    conn.commit()
    conn.close()

# 初始化AI引擎
ai_engine = AIEngine()

# 路由
@app.route('/')
def index():
    return render_template('index.html')

# AI配置相关API
@app.route('/api/ai-configs', methods=['GET'])
def get_ai_configs():
    print("获取AI配置列表")
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM ai_configs ORDER BY created_at DESC')
    configs = cursor.fetchall()
    conn.close()
    
    result = [{
        'id': config[0],
        'name': config[1],
        'api_key': config[2][:4] + '...' if config[2] else '',  # 隐藏完整API密钥
        'base_url': config[3],
        'model': config[4],
        'temperature': config[5],
        'max_tokens': config[6],
        'is_active': bool(config[7])
    } for config in configs]
    
    print(f"返回{len(result)}个AI配置")
    return jsonify(result)

@app.route('/api/ai-configs/<int:config_id>', methods=['GET'])
def get_ai_config(config_id):
    """获取单个AI配置的详细信息（用于编辑）"""
    print(f"获取AI配置详情 ID:{config_id}")
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM ai_configs WHERE id = ?', (config_id,))
    config = cursor.fetchone()
    conn.close()
    
    if not config:
        return jsonify({'error': '配置不存在'}), 404
    
    result = {
        'id': config[0],
        'name': config[1],
        'api_key': config[2],  # 返回完整的API密钥用于编辑
        'base_url': config[3],
        'model': config[4],
        'temperature': config[5],
        'max_tokens': config[6],
        'is_active': bool(config[7])
    }
    
    print(f"返回AI配置详情: {result['name']}")
    return jsonify(result)

@app.route('/api/ai-configs', methods=['POST'])
def create_ai_config():
    data = request.get_json()
    print(f"创建新AI配置: {data.get('name')}")
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    # 如果设为活跃，先将其他配置设为非活跃
    if data.get('is_active'):
        cursor.execute('UPDATE ai_configs SET is_active = 0')
    
    cursor.execute('''
        INSERT INTO ai_configs (name, api_key, base_url, model, temperature, max_tokens, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (data['name'], data['api_key'], data['base_url'], data['model'],
          data.get('temperature', 0.7), data.get('max_tokens', 2000), data.get('is_active', False)))
    
    config_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # 重新初始化AI引擎
    ai_engine.reload_config()
    
    return jsonify({'config_id': config_id, 'success': True})

@app.route('/api/ai-configs/<int:config_id>', methods=['PUT'])
def update_ai_config(config_id):
    data = request.get_json()
    print(f"更新AI配置 ID:{config_id}, 数据:{data}")
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    try:
        # 获取当前配置信息
        cursor.execute('SELECT * FROM ai_configs WHERE id = ?', (config_id,))
        current_config = cursor.fetchone()
        
        if not current_config:
            conn.close()
            print(f"错误: 未找到ID为{config_id}的AI配置")
            return jsonify({'success': False, 'error': f'未找到ID为{config_id}的配置'}), 404
        
        # 如果只更新活跃状态
        if len(data) == 1 and 'is_active' in data:
            if data['is_active']:
                print(f"将配置 {config_id} 设置为活跃状态")
                cursor.execute('UPDATE ai_configs SET is_active = 0')
                cursor.execute('UPDATE ai_configs SET is_active = 1 WHERE id = ?', (config_id,))
            else:
                cursor.execute('UPDATE ai_configs SET is_active = 0 WHERE id = ?', (config_id,))
        else:
            # 完整更新
            # 如果设为活跃，先将其他配置设为非活跃
            if data.get('is_active'):
                cursor.execute('UPDATE ai_configs SET is_active = 0')
            
            cursor.execute('''
                UPDATE ai_configs 
                SET name = ?, api_key = ?, base_url = ?, model = ?, temperature = ?, max_tokens = ?, is_active = ?
                WHERE id = ?
            ''', (
                data.get('name', current_config[1]),
                data.get('api_key', current_config[2]),
                data.get('base_url', current_config[3]),
                data.get('model', current_config[4]),
                data.get('temperature', current_config[5]),
                data.get('max_tokens', current_config[6]),
                data.get('is_active', current_config[7]),
                config_id
            ))
        
        conn.commit()
        
        # 重新读取更新后的配置信息
        cursor.execute('SELECT * FROM ai_configs WHERE id = ?', (config_id,))
        updated_config = cursor.fetchone()
        
        conn.close()
        
        # 重新初始化AI引擎
        ai_engine.reload_config()
        
        # 返回更新后的配置信息
        return jsonify({
            'success': True,
            'config': {
                'id': updated_config[0],
                'name': updated_config[1],
                'is_active': bool(updated_config[7])
            }
        })
    
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"更新AI配置时出错: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/saves', methods=['GET'])
def get_saves():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM saves ORDER BY updated_at DESC')
    saves = cursor.fetchall()
    conn.close()
    
    return jsonify([{
        'id': save[0],
        'name': save[1],
        'created_at': save[2],
        'updated_at': save[3],
        'current_day': save[8],
        'current_time': save[9]
    } for save in saves])

@app.route('/api/saves', methods=['POST'])
def create_save():
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO saves (name, world_background, world_introduction, cultivation_system, map_data)
        VALUES (?, ?, ?, ?, ?)
    ''', (data['name'], data.get('world_background', ''), 
          data.get('world_introduction', ''), data.get('cultivation_system', ''), '{}'))
    
    save_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'save_id': save_id, 'success': True})

@app.route('/api/saves/<int:save_id>/load', methods=['GET'])
def load_save(save_id):
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    # 获取存档基本信息
    cursor.execute('SELECT * FROM saves WHERE id = ?', (save_id,))
    save = cursor.fetchone()
    
    if not save:
        conn.close()
        return jsonify({'error': '存档不存在'}), 404
    
    # 获取地图区域
    cursor.execute('SELECT * FROM map_regions WHERE save_id = ?', (save_id,))
    regions = cursor.fetchall()
    
    # 获取势力信息
    cursor.execute('SELECT * FROM factions WHERE save_id = ?', (save_id,))
    factions = cursor.fetchall()
    
    # 获取势力关系
    cursor.execute('''
        SELECT fr.*, f1.name as faction1_name, f2.name as faction2_name
        FROM faction_relationships fr
        JOIN factions f1 ON fr.faction1_id = f1.id
        JOIN factions f2 ON fr.faction2_id = f2.id
        WHERE fr.save_id = ?
    ''', (save_id,))
    faction_relationships = cursor.fetchall()
    
    # 获取人物信息
    cursor.execute('''
        SELECT c.*, f.name as faction_name
        FROM characters c
        LEFT JOIN factions f ON c.faction_id = f.id
        WHERE c.save_id = ?
    ''', (save_id,))
    characters = cursor.fetchall()
    
    # 获取人际关系
    cursor.execute('''
        SELECT cr.*, c1.name as character1_name, c2.name as character2_name
        FROM character_relationships cr
        JOIN characters c1 ON cr.character1_id = c1.id
        JOIN characters c2 ON cr.character2_id = c2.id
        WHERE cr.save_id = ?
    ''', (save_id,))
    character_relationships = cursor.fetchall()
    
    # 获取世界大事记
    cursor.execute('''
        SELECT we.*, f.name as faction_name, mr.name as region_name
        FROM world_events we
        LEFT JOIN factions f ON we.faction_id = f.id
        LEFT JOIN map_regions mr ON we.region_id = mr.id
        WHERE we.save_id = ? ORDER BY we.day DESC
    ''', (save_id,))
    world_events = cursor.fetchall()
    
    # 获取势力事件
    cursor.execute('''
        SELECT fe.*, f.name as faction_name
        FROM faction_events fe
        JOIN factions f ON fe.faction_id = f.id
        WHERE fe.save_id = ? ORDER BY fe.day DESC
    ''', (save_id,))
    faction_events = cursor.fetchall()
    
    # 获取人物事件
    cursor.execute('''
        SELECT ce.*, c.name as character_name
        FROM character_events ce
        JOIN characters c ON ce.character_id = c.id
        WHERE ce.save_id = ? ORDER BY ce.day DESC
    ''', (save_id,))
    character_events = cursor.fetchall()
    
    # 获取生成记录
    cursor.execute('''
        SELECT * FROM generation_logs WHERE save_id = ? ORDER BY created_at DESC LIMIT 10
    ''', (save_id,))
    generation_logs = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'save': {
            'id': save[0],
            'name': save[1],
            'world_background': save[4],
            'world_introduction': save[5],
            'cultivation_system': save[6],
            'map_data': json.loads(save[7]) if save[7] else {},
            'current_day': save[8],
            'current_time': save[9]
        },
        'regions': [{
            'id': r[0],
            'name': r[2],
            'type': r[3],
            'parent_id': r[4],
            'faction_id': r[5],
            'description': r[6]
        } for r in regions],
        'factions': [{
            'id': f[0],
            'name': f[2],
            'ideal': f[3],
            'background': f[4],
            'description': f[5],
            'status': f[6],
            'power_level': f[7],
            'headquarters_location': f[8]
        } for f in factions],
        'faction_relationships': [{
            'id': fr[0],
            'faction1_id': fr[2],
            'faction2_id': fr[3],
            'relationship_type': fr[4],
            'description': fr[5],
            'faction1_name': fr[6],
            'faction2_name': fr[7]
        } for fr in faction_relationships],
        'characters': [{
            'id': c[0],
            'faction_id': c[2],
            'name': c[3],
            'status': c[4],
            'personality': c[5],
            'birthday': c[6],
            'age': c[7],
            'location': c[8],
            'position': c[9],
            'realm': c[10],
            'lifespan': c[11],
            'equipment': json.loads(c[12]) if c[12] else [],
            'skills': json.loads(c[13]) if c[13] else [],
            'experience': c[14],
            'goals': c[15],
            'relationships': c[16],
            'faction_name': c[18] if len(c) > 18 else None
        } for c in characters],
        'character_relationships': [{
            'id': cr[0],
            'character1_id': cr[2],
            'character2_id': cr[3],
            'relationship_type': cr[4],
            'notes': cr[5],
            'character1_name': cr[6],
            'character2_name': cr[7]
        } for cr in character_relationships],
        'world_events': [{
            'id': e[0],
            'day': e[2],
            'time_period': e[3],
            'faction_id': e[4],
            'theme': e[5],
            'title': e[6],
            'description': e[7],
            'region_id': e[8],
            'faction_name': e[10] if len(e) > 10 else None,
            'region_name': e[11] if len(e) > 11 else None
        } for e in world_events],
        'faction_events': [{
            'id': e[0],
            'faction_id': e[2],
            'day': e[3],
            'time_period': e[4],
            'theme': e[5],
            'title': e[6],
            'description': e[7],
            'faction_name': e[9] if len(e) > 9 else None
        } for e in faction_events],
        'character_events': [{
            'id': e[0],
            'character_id': e[2],
            'day': e[3],
            'time_period': e[4],
            'theme': e[5],
            'title': e[6],
            'description': e[7],
            'character_name': e[9] if len(e) > 9 else None
        } for e in character_events],
        'generation_logs': [{
            'id': g[0],
            'guide_text': g[2],
            'result_summary': g[3],
            'world_refreshed': bool(g[4]),
            'factions_refreshed': bool(g[5]),
            'characters_refreshed': bool(g[6]),
            'created_at': g[7]
        } for g in generation_logs]
    })

@app.route('/api/ai/generate-world', methods=['POST'])
def generate_world():
    data = request.get_json()
    background = data.get('background', '')
    save_id = data.get('save_id')
    
    try:
        world_data = ai_engine.generate_world(background)
        
        # 记录生成日志
        if save_id:
            conn = sqlite3.connect('game.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO generation_logs (save_id, guide_text, result_summary, world_refreshed)
                VALUES (?, ?, ?, ?)
            ''', (save_id, background, world_data.get('summary', ''), True))
            conn.commit()
            conn.close()
        
        return jsonify(world_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/generate-factions', methods=['POST'])
def generate_factions():
    data = request.get_json()
    world_background = data.get('world_background', '')
    save_id = data.get('save_id')
    
    try:
        factions = ai_engine.generate_factions(world_background)
        
        # 记录生成日志
        if save_id:
            conn = sqlite3.connect('game.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO generation_logs (save_id, guide_text, result_summary, factions_refreshed)
                VALUES (?, ?, ?, ?)
            ''', (save_id, world_background, f'生成了{len(factions)}个势力', True))
            conn.commit()
            conn.close()
        
        return jsonify({'factions': factions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/generate-characters', methods=['POST'])
def generate_characters():
    data = request.get_json()
    world_background = data.get('world_background', '')
    factions = data.get('factions', [])
    save_id = data.get('save_id')
    
    try:
        characters = ai_engine.generate_characters(world_background, factions)
        
        # 记录生成日志
        if save_id:
            conn = sqlite3.connect('game.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO generation_logs (save_id, guide_text, result_summary, characters_refreshed)
                VALUES (?, ?, ?, ?)
            ''', (save_id, world_background, f'生成了{len(characters)}个人物', True))
            conn.commit()
            conn.close()
        
        return jsonify({'characters': characters})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/saves/<int:save_id>/factions', methods=['POST'])
def add_faction(save_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO factions (save_id, name, ideal, background, description, status, power_level, headquarters_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (save_id, data['name'], data.get('ideal', ''), data.get('background', ''),
          data.get('description', ''), data.get('status', '活跃'), 
          data.get('power_level', 50), data.get('headquarters_location', '')))
    
    faction_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'faction_id': faction_id, 'success': True})

@app.route('/api/saves/<int:save_id>/characters', methods=['POST'])
def add_character(save_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO characters (save_id, faction_id, name, status, personality, birthday, age, 
                              location, position, realm, lifespan, equipment, skills, experience, goals, relationships)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (save_id, data.get('faction_id'), data['name'], data.get('status', '活跃'),
          data.get('personality', ''), data.get('birthday', ''), data.get('age', 0),
          data.get('location', ''), data.get('position', ''), data.get('realm', ''),
          data.get('lifespan', 100), json.dumps(data.get('equipment', [])),
          json.dumps(data.get('skills', [])), data.get('experience', ''),
          data.get('goals', ''), data.get('relationships', '')))
    
    character_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'character_id': character_id, 'success': True})

@app.route('/api/saves/<int:save_id>/regions', methods=['POST'])
def add_region(save_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO map_regions (save_id, name, type, parent_id, faction_id, description)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (save_id, data['name'], data.get('type', '区域'), 
          data.get('parent_id'), data.get('faction_id'), data.get('description', '')))
    
    region_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'region_id': region_id, 'success': True})

@app.route('/api/saves/<int:save_id>/simulate', methods=['POST'])
def simulate_days(save_id):
    data = request.get_json()
    days = data.get('days', 1)
    story_guide = data.get('story_guide', '')
    model_config_id = data.get('model_config_id')  # 新增：获取模型ID
    
    try:
        # 获取当前游戏状态
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM saves WHERE id = ?', (save_id,))
        save = cursor.fetchone()
        
        cursor.execute('SELECT * FROM factions WHERE save_id = ?', (save_id,))
        factions = cursor.fetchall()
        
        cursor.execute('SELECT * FROM characters WHERE save_id = ?', (save_id,))
        characters = cursor.fetchall()
        
        cursor.execute('SELECT * FROM map_regions WHERE save_id = ?', (save_id,))
        regions = cursor.fetchall()
        
        # 使用AI生成事件，传入指定的模型ID
        simulation_result = ai_engine.simulate_days(
            world_background=save[4],
            factions=factions,
            characters=characters,
            regions=regions,
            days=days,
            story_guide=story_guide,
            current_day=save[8],
            model_config_id=model_config_id  # 新增：传入模型ID
        )
        
        # 保存结果到数据库
        for event in simulation_result.get('world_events', []):
            cursor.execute('''
                INSERT INTO world_events (save_id, day, time_period, faction_id, theme, event_title, event_description, region_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (save_id, event['day'], event.get('time_period', ''), 
                  event.get('faction_id'), event.get('theme', ''), 
                  event['title'], event['description'], event.get('region_id')))
        
        for event in simulation_result.get('faction_events', []):
            cursor.execute('''
                INSERT INTO faction_events (save_id, faction_id, day, time_period, theme, event_title, event_description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (save_id, event.get('faction_id'), event['day'], 
                  event.get('time_period', ''), event.get('theme', ''), 
                  event['title'], event['description']))
        
        for event in simulation_result.get('character_events', []):
            cursor.execute('''
                INSERT INTO character_events (save_id, character_id, day, time_period, theme, event_title, event_description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (save_id, event.get('character_id'), event['day'], 
                  event.get('time_period', ''), event.get('theme', ''), 
                  event['title'], event['description']))
        
        # 处理势力更新
        for update in simulation_result.get('faction_updates', []):
            if update.get('action') == 'create':
                # 创建新势力
                cursor.execute('''
                    INSERT INTO factions (save_id, name, ideal, background, description, status, power_level, headquarters_location)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (save_id, update['name'], update.get('ideal', ''), update.get('background', ''),
                      update.get('description', ''), update.get('status', '活跃'), 
                      update.get('power_level', 50), update.get('headquarters_location', '')))
            elif update.get('action') == 'update' and update.get('faction_id'):
                # 更新现有势力
                cursor.execute('''
                    UPDATE factions 
                    SET status = ?, power_level = ?, description = ?, headquarters_location = ?
                    WHERE id = ? AND save_id = ?
                ''', (update.get('status', ''), update.get('power_level', 50),
                      update.get('description', ''), update.get('headquarters_location', ''),
                      update.get('faction_id'), save_id))
        
        # 处理人物更新
        for update in simulation_result.get('character_updates', []):
            if update.get('action') == 'create':
                # 创建新人物
                cursor.execute('''
                    INSERT INTO characters (save_id, faction_id, name, status, personality, birthday, age, 
                                          location, position, realm, lifespan, equipment, skills, experience, goals, relationships)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (save_id, update.get('faction_id'), update['name'], update.get('status', '活跃'),
                      update.get('personality', ''), update.get('birthday', ''), update.get('age', 25),
                      update.get('location', ''), update.get('position', ''), update.get('realm', ''),
                      update.get('lifespan', 100), json.dumps(update.get('equipment', [])),
                      json.dumps(update.get('skills', [])), update.get('experience', ''),
                      update.get('goals', ''), update.get('relationships', '')))
            elif update.get('action') == 'update' and update.get('character_id'):
                # 更新现有人物
                cursor.execute('''
                    UPDATE characters 
                    SET status = ?, age = ?, location = ?, position = ?, realm = ?, 
                        experience = ?, goals = ?, faction_id = ?
                    WHERE id = ? AND save_id = ?
                ''', (update.get('status', ''), update.get('age', 0), update.get('location', ''),
                      update.get('position', ''), update.get('realm', ''), update.get('experience', ''),
                      update.get('goals', ''), update.get('faction_id'), 
                      update.get('character_id'), save_id))
        
        # 记录生成日志
        cursor.execute('''
            INSERT INTO generation_logs (save_id, guide_text, result_summary, world_refreshed, factions_refreshed, characters_refreshed)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (save_id, story_guide, simulation_result.get('summary', ''), True, True, True))
        
        # 更新存档的当前天数和时间
        new_day = save[8] + days
        new_time = simulation_result.get('new_time', save[9])
        cursor.execute('UPDATE saves SET current_day = ?, current_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                      (new_day, new_time, save_id))
        
        conn.commit()
        conn.close()
        
        return jsonify(simulation_result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/saves/<int:save_id>', methods=['PUT'])
def update_save(save_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    # 更新存档基本信息
    cursor.execute('''
        UPDATE saves 
        SET name = ?, world_background = ?, world_introduction = ?, cultivation_system = ?, 
            current_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data.get('name', ''), data.get('world_background', ''), 
          data.get('world_introduction', ''), data.get('cultivation_system', ''),
          data.get('current_time', ''), save_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/saves/<int:save_id>/factions/<int:faction_id>', methods=['PUT'])
def update_faction(save_id, faction_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE factions 
        SET name = ?, ideal = ?, background = ?, description = ?, status = ?, 
            power_level = ?, headquarters_location = ?
        WHERE id = ? AND save_id = ?
    ''', (data.get('name', ''), data.get('ideal', ''), data.get('background', ''),
          data.get('description', ''), data.get('status', ''), 
          data.get('power_level', 50), data.get('headquarters_location', ''),
          faction_id, save_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/saves/<int:save_id>/characters/<int:character_id>', methods=['PUT'])
def update_character(save_id, character_id):
    data = request.get_json()
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE characters 
        SET name = ?, status = ?, personality = ?, birthday = ?, age = ?, 
            location = ?, position = ?, realm = ?, lifespan = ?, equipment = ?, 
            skills = ?, experience = ?, goals = ?, relationships = ?, faction_id = ?
        WHERE id = ? AND save_id = ?
    ''', (data.get('name', ''), data.get('status', ''), data.get('personality', ''),
          data.get('birthday', ''), data.get('age', 0), data.get('location', ''),
          data.get('position', ''), data.get('realm', ''), data.get('lifespan', 100),
          json.dumps(data.get('equipment', [])), json.dumps(data.get('skills', [])),
          data.get('experience', ''), data.get('goals', ''), data.get('relationships', ''),
          data.get('faction_id'), character_id, save_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# 小说生成API
@app.route('/api/ai/generate-novel', methods=['POST'])
def generate_novel():
    # 在函数开始时就创建数据库连接
    conn = None
    try:
        data = request.json
        save_id = data.get('save_id')
        day = data.get('day', 1)
        theme = data.get('theme', '')
        style = data.get('style', 'classic')
        model_config_id = data.get('model_config_id')  # 新增：获取用户指定的模型ID
        
        if not save_id:
            return jsonify({'error': '需要提供存档ID'}), 400
            
        # 获取当前存档的世界背景、势力和人物信息
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 获取世界背景
        cursor.execute('SELECT world_background FROM saves WHERE id = ?', (save_id,))
        save_row = cursor.fetchone()
        if not save_row:
            return jsonify({'error': '存档不存在'}), 404
        world_background = save_row[0]
        
        # 获取势力信息
        cursor.execute('SELECT * FROM factions WHERE save_id = ?', (save_id,))
        faction_rows = cursor.fetchall()
        factions = [{
            'id': f[0],
            'name': f[2],
            'ideal': f[3],
            'background': f[4],
            'description': f[5],
            'status': f[6],
            'power_level': f[7],
            'headquarters_location': f[8]
        } for f in faction_rows]
        
        # 获取人物信息
        cursor.execute('SELECT * FROM characters WHERE save_id = ?', (save_id,))
        character_rows = cursor.fetchall()
        characters = [{
            'id': c[0],
            'faction_id': c[2],
            'name': c[3],
            'status': c[4],
            'personality': c[5],
            'birthday': c[6],
            'age': c[7],
            'location': c[8],
            'position': c[9],
            'realm': c[10]
        } for c in character_rows]
        
        # 调用AI引擎生成小说
        novel_data = ai_engine.generate_novel(
            save_id=save_id,
            theme=theme,
            style=style,
            day=day,
            world_background=world_background,
            factions=factions,
            characters=characters,
            model_config_id=model_config_id
        )
        
        # 保存生成记录
        cursor.execute('''
            INSERT INTO generation_logs (save_id, guide_text, result_summary, world_refreshed)
            VALUES (?, ?, ?, ?)
        ''', (save_id, theme, f"生成了{style}风格的小说：{novel_data.get('title', '未命名小说')}", True))
        
        log_id = cursor.lastrowid
        
        # 保存小说记录
        cursor.execute('''
            INSERT INTO novels (save_id, title, theme, style, content, day, characters_involved, factions_involved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (save_id, novel_data.get('title', '未命名小说'), theme, style, 
              json.dumps(novel_data), day, json.dumps([c.get('name', '') for c in characters[:8]]), 
              json.dumps([f.get('name', '') for f in factions[:5]])))
        
        novel_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'novel': novel_data,
            'generation_id': log_id,
            'novel_id': novel_id
        })
            
    except Exception as e:
        print(f"Generate novel error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        # 在函数结束时确保数据库连接被关闭
        if conn:
            try:
                conn.close()
                print("数据库连接已关闭")
            except Exception as e:
                print(f"关闭数据库连接时出错: {e}")

# 获取小说记录
@app.route('/api/saves/<int:save_id>/novels', methods=['GET'])
def get_novels(save_id):
    conn = None
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 从novels表中获取小说记录
        cursor.execute('''
            SELECT id, title, theme, style, content, day, characters_involved, factions_involved, created_at
            FROM novels 
            WHERE save_id = ?
            ORDER BY created_at DESC
        ''', (save_id,))
        
        rows = cursor.fetchall()
        novels = []
        
        for row in rows:
            novel_content = ''
            try:
                # 检查content是否为JSON字符串
                if row[4] and row[4].strip().startswith('{'):
                    # 尝试解析JSON
                    content_data = json.loads(row[4])
                    
                    # 检查是否有章节结构
                    if isinstance(content_data, dict) and 'chapters' in content_data and isinstance(content_data['chapters'], list):
                        # 连接所有章节内容
                        chapter_texts = []
                        for chapter in content_data['chapters']:
                            if isinstance(chapter, dict) and 'content' in chapter:
                                chapter_texts.append(chapter['content'])
                        
                        novel_content = '\n\n'.join(chapter_texts)
                    else:
                        # 直接使用content字段
                        novel_content = content_data.get('content', '')
                else:
                    # 不是JSON，直接使用原始内容
                    novel_content = row[4] or ''
            except Exception as e:
                print(f"解析小说内容时出错: {e}")
                # 发生错误时使用原始内容
                novel_content = row[4] or ''
            
            novel = {
                'id': row[0],
                'title': row[1] or '未命名小说',
                'theme': row[2] or '未知主题',
                'style': row[3] or 'classic',
                'content': novel_content,
                'day': row[5] or 1,
                'characters_involved': json.loads(row[6]) if row[6] else [],
                'factions_involved': json.loads(row[7]) if row[7] else [],
                'created_at': row[8]
            }
            novels.append(novel)
        
        return jsonify({
            'novels': novels,
            'success': True
        })
        
    except Exception as e:
        print(f"Get novels error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception as e:
                print(f"关闭数据库连接时出错: {e}")

# 获取小说原始内容
@app.route('/api/saves/<int:save_id>/novels/original/<int:novel_id>', methods=['GET'])
def get_novel_original_content(save_id, novel_id):
    conn = None
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 从novels表中获取小说原始内容
        cursor.execute('''
            SELECT content
            FROM novels 
            WHERE save_id = ? AND id = ?
        ''', (save_id, novel_id))
        
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': '找不到小说记录'}), 404
        
        return jsonify({
            'original_content': row[0],
            'success': True
        })
        
    except Exception as e:
        print(f"Get novel original content error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception as e:
                print(f"关闭数据库连接时出错: {e}")

# 获取事件记录
@app.route('/api/saves/<int:save_id>/events', methods=['GET'])
def get_events(save_id):
    conn = None
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 获取世界事件
        cursor.execute('''
            SELECT id, day, time_period, theme, event_title, event_description, 'world' as type, created_at
            FROM world_events 
            WHERE save_id = ?
        ''', (save_id,))
        world_events = cursor.fetchall()
        
        # 获取势力事件
        cursor.execute('''
            SELECT fe.id, fe.day, fe.time_period, fe.theme, fe.event_title, fe.event_description, 'faction' as type, fe.created_at
            FROM faction_events fe
            WHERE fe.save_id = ?
        ''', (save_id,))
        faction_events = cursor.fetchall()
        
        # 获取人物事件
        cursor.execute('''
            SELECT ce.id, ce.day, ce.time_period, ce.theme, ce.event_title, ce.event_description, 'character' as type, ce.created_at
            FROM character_events ce
            WHERE ce.save_id = ?
        ''', (save_id,))
        character_events = cursor.fetchall()
        
        # 合并所有事件
        all_events = []
        
        for event in world_events + faction_events + character_events:
            event_data = {
                'id': event[0],
                'day': event[1],
                'time_period': event[2] or '',
                'theme': event[3] or '',
                'title': event[4] or '',
                'description': event[5] or '',
                'type': event[6],
                'created_at': event[7]
            }
            all_events.append(event_data)
        
        # 按天数和创建时间排序
        all_events.sort(key=lambda x: (x['day'], x['created_at']), reverse=True)
        
        return jsonify({
            'events': all_events,
            'success': True
        })
        
    except Exception as e:
        print(f"Get events error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception as e:
                print(f"关闭数据库连接时出错: {e}")

# 世界模版相关API
@app.route('/api/templates', methods=['GET'])
def get_templates():
    """获取所有世界模版"""
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, created_at, updated_at
            FROM world_templates 
            ORDER BY updated_at DESC
        ''')
        templates = cursor.fetchall()
        conn.close()
        
        template_list = []
        for template in templates:
            template_list.append({
                'id': template[0],
                'name': template[1],
                'description': template[2],
                'created_at': template[3],
                'updated_at': template[4]
            })
        
        return jsonify(template_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates', methods=['POST'])
def create_template():
    """创建新的世界模版"""
    try:
        data = request.get_json()
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 创建模版基础信息
        cursor.execute('''
            INSERT INTO world_templates (name, description, world_background, world_introduction, cultivation_system)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['name'], data.get('description', ''), data.get('world_background', ''),
              data.get('world_introduction', ''), data.get('cultivation_system', '')))
        
        template_id = cursor.lastrowid
        
        # 保存模版势力
        template_faction_mapping = {}  # 映射原始势力索引到新的模版势力ID
        for i, faction in enumerate(data.get('factions', [])):
            cursor.execute('''
                INSERT INTO template_factions (template_id, name, ideal, background, description, power_level, headquarters_location)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (template_id, faction['name'], faction.get('ideal', ''), faction.get('background', ''),
                  faction.get('description', ''), faction.get('power_level', 50), faction.get('headquarters_location', '')))
            
            template_faction_id = cursor.lastrowid
            template_faction_mapping[i] = template_faction_id
        
        # 保存模版人物
        for character in data.get('characters', []):
            template_faction_id = None
            if 'faction_index' in character and character['faction_index'] in template_faction_mapping:
                template_faction_id = template_faction_mapping[character['faction_index']]
            
            cursor.execute('''
                INSERT INTO template_characters (template_id, template_faction_id, name, personality, birthday, age, 
                                               location, position, realm, lifespan, equipment, skills, experience, goals, relationships)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (template_id, template_faction_id, character['name'], character.get('personality', ''),
                  character.get('birthday', ''), character.get('age', 25), character.get('location', ''),
                  character.get('position', ''), character.get('realm', ''), character.get('lifespan', 100),
                  json.dumps(character.get('equipment', [])), json.dumps(character.get('skills', [])),
                  character.get('experience', ''), character.get('goals', ''), character.get('relationships', '')))
        
        # 保存模版地区
        for region in data.get('regions', []):
            template_faction_id = None
            if 'faction_index' in region and region['faction_index'] in template_faction_mapping:
                template_faction_id = template_faction_mapping[region['faction_index']]
            
            cursor.execute('''
                INSERT INTO template_regions (template_id, name, type, parent_id, template_faction_id, description)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (template_id, region['name'], region.get('type', '区域'), region.get('parent_id'),
                  template_faction_id, region.get('description', '')))
        
        conn.commit()
        conn.close()
        
        return jsonify({'template_id': template_id, 'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates/<int:template_id>', methods=['GET'])
def get_template(template_id):
    """获取指定模版的详细信息"""
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 获取模版基础信息
        cursor.execute('SELECT * FROM world_templates WHERE id = ?', (template_id,))
        template = cursor.fetchone()
        
        if not template:
            conn.close()
            return jsonify({'error': '模版不存在'}), 404
        
        # 获取模版势力
        cursor.execute('SELECT * FROM template_factions WHERE template_id = ?', (template_id,))
        factions = cursor.fetchall()
        
        # 获取模版人物
        cursor.execute('''
            SELECT tc.*, tf.name as faction_name
            FROM template_characters tc
            LEFT JOIN template_factions tf ON tc.template_faction_id = tf.id
            WHERE tc.template_id = ?
        ''', (template_id,))
        characters = cursor.fetchall()
        
        # 获取模版地区
        cursor.execute('''
            SELECT tr.*, tf.name as faction_name
            FROM template_regions tr
            LEFT JOIN template_factions tf ON tr.template_faction_id = tf.id
            WHERE tr.template_id = ?
        ''', (template_id,))
        regions = cursor.fetchall()
        
        conn.close()
        
        # 构建返回数据
        template_data = {
            'id': template[0],
            'name': template[1],
            'description': template[2],
            'world_background': template[3],
            'world_introduction': template[4],
            'cultivation_system': template[5],
            'created_at': template[6],
            'updated_at': template[7],
            'factions': [],
            'characters': [],
            'regions': []
        }
        
        # 处理势力数据
        for faction in factions:
            template_data['factions'].append({
                'id': faction[0],
                'name': faction[2],
                'ideal': faction[3],
                'background': faction[4],
                'description': faction[5],
                'power_level': faction[6],
                'headquarters_location': faction[7]
            })
        
        # 处理人物数据
        for character in characters:
            template_data['characters'].append({
                'id': character[0],
                'name': character[3],
                'faction_name': character[17] if character[17] else '',
                'personality': character[4],
                'birthday': character[5],
                'age': character[6],
                'location': character[7],
                'position': character[8],
                'realm': character[9],
                'lifespan': character[10],
                'equipment': json.loads(character[11]) if character[11] else [],
                'skills': json.loads(character[12]) if character[12] else [],
                'experience': character[13],
                'goals': character[14],
                'relationships': character[15]
            })
        
        # 处理地区数据
        for region in regions:
            template_data['regions'].append({
                'id': region[0],
                'name': region[2],
                'type': region[3],
                'parent_id': region[4],
                'faction_name': region[7] if region[7] else '',
                'description': region[6]
            })
        
        return jsonify(template_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """删除指定模版"""
    try:
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        
        # 删除模版人物
        cursor.execute('DELETE FROM template_characters WHERE template_id = ?', (template_id,))
        
        # 删除模版地区
        cursor.execute('DELETE FROM template_regions WHERE template_id = ?', (template_id,))
        
        # 删除模版势力
        cursor.execute('DELETE FROM template_factions WHERE template_id = ?', (template_id,))
        
        # 删除模版
        cursor.execute('DELETE FROM world_templates WHERE id = ?', (template_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 合并AI生成功能
@app.route('/api/ai/generate-all', methods=['POST'])
def generate_all():
    """AI生成完整世界（包括背景、势力、人物）"""
    try:
        data = request.get_json()
        background = data.get('background', '')
        
        if not background.strip():
            return jsonify({'error': '请提供世界背景'}), 400
        
        # 使用AI引擎生成完整世界
        result = ai_engine.generate_complete_world(background)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# AI对话相关路由
@app.route('/api/chats', methods=['GET'])
def get_chats():
    try:
        conn = sqlite3.connect('game.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # 获取所有对话，按创建时间倒序排序
        chats = cursor.execute('SELECT * FROM chats ORDER BY created_at DESC').fetchall()
        conn.close()
        
        # 格式化输出
        chats_list = []
        for chat in chats:
            chats_list.append({
                'id': chat['id'],
                'title': chat['title'],
                'created_at': chat['created_at'],
                'system_prompt': chat['system_prompt'],
                'context_count': chat['context_count']
            })
        
        return jsonify({
            'success': True,
            'chats': chats_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats', methods=['POST'])
def create_chat():
    try:
        data = request.json
        title = data.get('title', '新对话')
        system_prompt = data.get('system_prompt', '')
        context_count = data.get('context_count', 1)
        created_at = data.get('created_at', datetime.now().isoformat())
        
        conn = sqlite3.connect('game.db')
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO chats (title, system_prompt, context_count, created_at) VALUES (?, ?, ?, ?)',
            (title, system_prompt, context_count, created_at)
        )
        chat_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'chat_id': chat_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['PUT'])
def update_chat(chat_id):
    try:
        data = request.json
        updates = {}
        
        if 'title' in data:
            updates['title'] = data['title']
        if 'system_prompt' in data:
            updates['system_prompt'] = data['system_prompt']
        if 'context_count' in data:
            updates['context_count'] = data['context_count']
        
        if not updates:
            return jsonify({
                'success': False,
                'error': '没有要更新的内容'
            }), 400
        
        conn = sqlite3.connect('game.db')
        conn.row_factory = sqlite3.Row
        
        # 构建更新语句
        set_clause = ', '.join([f"{key} = ?" for key in updates.keys()])
        values = list(updates.values())
        values.append(chat_id)
        
        conn.execute(
            f"UPDATE chats SET {set_clause} WHERE id = ?",
            values
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    try:
        conn = sqlite3.connect('game.db')
        
        # 先删除关联的消息
        conn.execute('DELETE FROM chat_messages WHERE chat_id = ?', (chat_id,))
        
        # 再删除对话
        conn.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    try:
        conn = sqlite3.connect('game.db')
        conn.row_factory = sqlite3.Row
        messages = conn.execute(
            'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY id ASC',
            (chat_id,)
        ).fetchall()
        conn.close()
        
        # 格式化输出
        messages_list = []
        for message in messages:
            messages_list.append({
                'id': message['id'],
                'role': message['role'],
                'content': message['content'],
                'timestamp': message['timestamp']
            })
        
        return jsonify({
            'success': True,
            'messages': messages_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>/messages', methods=['POST'])
def add_chat_message(chat_id):
    try:
        data = request.json
        role = data.get('role')
        content = data.get('content')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        if not role or not content:
            return jsonify({
                'success': False,
                'error': '缺少必要参数 role 或 content'
            }), 400
        
        conn = sqlite3.connect('game.db')
        conn.execute(
            'INSERT INTO chat_messages (chat_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
            (chat_id, role, content, timestamp)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat-stream', methods=['POST'])
def chat_stream():
    try:
        data = request.json
        message = data.get('message')
        model_id = data.get('model_id')
        system_prompt = data.get('system_prompt', '')
        context_messages = data.get('context_messages', [])
        chat_id = data.get('chat_id')
        
        if not message or not model_id:
            return jsonify({
                'success': False,
                'error': '缺少必要参数 message 或 model_id'
            }), 400
        
        # 从AI引擎中获取对应的模型
        llm = ai_engine.get_llm_by_config_id(model_id)
        if not llm:
            return jsonify({
                'success': False,
                'error': '指定的AI模型不存在或配置错误'
            }), 400
        
        # 准备消息列表
        messages = []
        
        # 添加系统提示词
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # 添加上下文消息
        for ctx_msg in context_messages:
            messages.append({"role": ctx_msg['role'], "content": ctx_msg['content']})
        
        # 添加用户当前消息
        messages.append({"role": "user", "content": message})
        
        # 创建流式响应
        def generate():
            try:
                # 调用模型的流式生成方法
                for chunk in llm.stream(messages):
                    # 详细调试输出
                    # print(f"流式生成chunk类型: {type(chunk)}")
                    # print(f"流式生成chunk属性: {dir(chunk)}")
                    # print(f"流式生成chunk: {chunk}")
                    
                    # 方法1: 直接检查chunk是否有content属性
                    if hasattr(chunk, 'content') and chunk.content:
                        print(f"从content属性获取内容: {chunk.content}")
                        # 保留换行符，将其转换为特殊标记
                        modified_content = chunk.content.replace('\n', '\\n')
                        yield modified_content
                        continue
                        
                    # # 方法2: 检查choices属性
                    # if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                    #     # 检查delta.content方式
                    #     if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                    #         content = chunk.choices[0].delta.content
                    #         if content:
                    #             print(f"从choices[0].delta.content获取内容: {content}")
                    #             yield content
                    #             continue
                        
                    #     # 检查chunk.choices[0].content方式
                    #     if hasattr(chunk.choices[0], 'content') and chunk.choices[0].content:
                    #         content = chunk.choices[0].content
                    #         print(f"从choices[0].content获取内容: {content}")
                    #         yield content
                    #         continue
                    
                    # # 方法3: 尝试将chunk转换为字典并提取content
                    # try:
                    #     if isinstance(chunk, dict) and 'content' in chunk:
                    #         print(f"从字典提取content: {chunk['content']}")
                    #         yield chunk['content']
                    #         continue
                    # except:
                    #     pass
                    
                    # # 方法4: 尝试将chunk直接转为字符串
                    # try:
                    #     chunk_str = str(chunk)
                    #     if chunk_str and chunk_str != "None":
                    #         print(f"将chunk转为字符串: {chunk_str}")
                    #         yield chunk_str
                    #         continue
                    # except:
                    #     pass
                    
                    # 如果所有方法都失败，发送空字符保持连接
                    # print("所有提取方法失败，发送空字符保持连接")                 
                    yield " "
            except Exception as e:
                print(f"Stream error: {e}")
                print(f"错误详情: {str(e)}")
                traceback.print_exc()  # 打印完整的错误堆栈
                yield f"错误: {str(e)}"
        
        return Response(generate(), mimetype='text/plain')
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 合并的故事推进和小说生成API（支持流式响应）
@app.route('/api/saves/<int:save_id>/generate-story-novel', methods=['POST'])
def generate_story_and_novel_stream(save_id):
    # 在请求上下文中获取数据
    data = request.get_json()
    story_guide = data.get('story_guide', '')
    model_config_id = data.get('model_config_id')
    
    def generate():
        try:
            if not story_guide:
                yield f"data: {json.dumps({'type': 'error', 'error': '需要提供故事引导词'})}\n\n"
                return
            
            # 获取当前游戏状态
            conn = sqlite3.connect('game.db')
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM saves WHERE id = ?', (save_id,))
            save = cursor.fetchone()
            if not save:
                yield f"data: {json.dumps({'type': 'error', 'error': '存档不存在'})}\n\n"
                return
            
            cursor.execute('SELECT * FROM factions WHERE save_id = ?', (save_id,))
            factions = cursor.fetchall()
            
            cursor.execute('SELECT * FROM characters WHERE save_id = ?', (save_id,))
            characters = cursor.fetchall()
            
            cursor.execute('SELECT * FROM map_regions WHERE save_id = ?', (save_id,))
            regions = cursor.fetchall()
            
            conn.close()
            
            # 使用新的流式生成方法
            full_data = None
            for stream_data in ai_engine.generate_story_and_novel_stream(
                save_id=save_id,
                story_guide=story_guide,
                current_day=save[8],
                world_background=save[4],
                factions=factions,
                characters=characters,
                regions=regions,
                model_config_id=model_config_id
            ):
                # 直接转发流式数据到前端
                yield f"data: {json.dumps(stream_data)}\n\n"
                
                # 保存完整数据用于后续数据库操作
                if stream_data.get('type') == 'complete':
                    full_data = stream_data.get('full_data')
            
            # 流式输出完成后，保存数据到数据库
            if full_data:
                conn = sqlite3.connect('game.db')
                cursor = conn.cursor()
                
                try:
                    # 保存故事推进数据
                    story_progress = full_data.get('story_progress', {})
                    
                    # 保存世界事件
                    for event in story_progress.get('world_events', []):
                        cursor.execute('''
                            INSERT INTO world_events (save_id, day, time_period, faction_id, theme, event_title, event_description, region_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (save_id, event['day'], event.get('time_period', ''), 
                              event.get('faction_id'), event.get('theme', ''), 
                              event['title'], event['description'], event.get('region_id')))
                    
                    # 保存势力事件
                    for event in story_progress.get('faction_events', []):
                        cursor.execute('''
                            INSERT INTO faction_events (save_id, faction_id, day, time_period, theme, event_title, event_description)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (save_id, event.get('faction_id'), event['day'], 
                              event.get('time_period', ''), event.get('theme', ''), 
                              event['title'], event['description']))
                    
                    # 保存人物事件
                    for event in story_progress.get('character_events', []):
                        cursor.execute('''
                            INSERT INTO character_events (save_id, character_id, day, time_period, theme, event_title, event_description)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (save_id, event.get('character_id'), event['day'], 
                              event.get('time_period', ''), event.get('theme', ''), 
                              event['title'], event['description']))
                    
                    # 处理势力更新
                    for update in story_progress.get('faction_updates', []):
                        if update.get('action') == 'create':
                            cursor.execute('''
                                INSERT INTO factions (save_id, name, ideal, background, description, status, power_level, headquarters_location)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (save_id, update['name'], update.get('ideal', ''), update.get('background', ''),
                                  update.get('description', ''), update.get('status', '活跃'), 
                                  update.get('power_level', 50), update.get('headquarters_location', '')))
                        elif update.get('action') == 'update' and update.get('faction_id'):
                            cursor.execute('''
                                UPDATE factions 
                                SET status = ?, power_level = ?, description = ?, headquarters_location = ?
                                WHERE id = ? AND save_id = ?
                            ''', (update.get('status', ''), update.get('power_level', 50),
                                  update.get('description', ''), update.get('headquarters_location', ''),
                                  update.get('faction_id'), save_id))
                    
                    # 处理人物更新
                    for update in story_progress.get('character_updates', []):
                        if update.get('action') == 'create':
                            cursor.execute('''
                                INSERT INTO characters (save_id, faction_id, name, status, personality, birthday, age, 
                                                      location, position, realm, lifespan, equipment, skills, experience, goals, relationships)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (save_id, update.get('faction_id'), update['name'], update.get('status', '活跃'),
                                  update.get('personality', ''), update.get('birthday', ''), update.get('age', 25),
                                  update.get('location', ''), update.get('position', ''), update.get('realm', ''),
                                  update.get('lifespan', 100), json.dumps(update.get('equipment', [])),
                                  json.dumps(update.get('skills', [])), update.get('experience', ''),
                                  update.get('goals', ''), update.get('relationships', '')))
                        elif update.get('action') == 'update' and update.get('character_id'):
                            cursor.execute('''
                                UPDATE characters 
                                SET status = ?, age = ?, location = ?, position = ?, realm = ?, 
                                    experience = ?, goals = ?, faction_id = ?
                                WHERE id = ? AND save_id = ?
                            ''', (update.get('status', ''), update.get('age', 0), update.get('location', ''),
                                  update.get('position', ''), update.get('realm', ''), update.get('experience', ''),
                                  update.get('goals', ''), update.get('faction_id'), 
                                  update.get('character_id'), save_id))
                    
                    # 保存小说记录
                    novel = full_data.get('novel', {})
                    novel_title = novel.get('title', '未命名小说')
                    cursor.execute('''
                        INSERT INTO novels (save_id, title, theme, style, content, day, characters_involved, factions_involved)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (save_id, novel_title, story_guide, 'integrated', 
                          json.dumps(novel), save[8] + 1, 
                          json.dumps([c[3] for c in characters[:8]]), 
                          json.dumps([f[2] for f in factions[:5]])))
                    
                    novel_id = cursor.lastrowid
                    
                    # 记录生成日志
                    cursor.execute('''
                        INSERT INTO generation_logs (save_id, guide_text, result_summary, world_refreshed, factions_refreshed, characters_refreshed)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (save_id, story_guide, story_progress.get('summary', ''), True, True, True))
                    
                    # 更新存档的当前天数和时间
                    new_day = save[8] + 1
                    new_time = story_progress.get('new_time', save[9])
                    cursor.execute('UPDATE saves SET current_day = ?, current_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                                  (new_day, new_time, save_id))
                    
                    conn.commit()
                    
                    # 发送数据保存完成信号
                    yield f"data: {json.dumps({'type': 'data_saved', 'novel_id': novel_id, 'new_day': new_day, 'new_time': new_time, 'summary': story_progress.get('summary', '')})}\n\n"
                    
                except Exception as e:
                    print(f"保存数据时出错: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'error': f'保存数据失败: {str(e)}'})}\n\n"
                finally:
                    conn.close()
            
            # 发送最终完成信号
            yield f"data: {json.dumps({'type': 'final_complete'})}\n\n"
            
        except Exception as e:
            print(f"生成故事和小说时出错: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    })

if __name__ == '__main__':
    init_db()
    # 修复Windows下套接字错误的配置
    app.run(
        debug=True, 
        host='0.0.0.0', 
        port=5099,
        threaded=True,
        use_reloader=False  # 禁用自动重载以避免套接字错误
    ) 