// 移动端兼容性处理
class MobileCompatibility {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.setupEventListeners();
        this.preventZoom();
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 使用事件委托处理所有按钮点击
        document.addEventListener('click', this.handleClick.bind(this), true);
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // 防止移动端双击缩放
        document.addEventListener('dblclick', this.preventDoubleClick.bind(this), { passive: false });
        
        // 处理键盘显示/隐藏
        if (this.isMobile) {
            window.addEventListener('resize', this.handleResize.bind(this));
        }
    }
    
    // 处理点击事件
    handleClick(event) {
        const target = event.target;
        const button = target.closest('button, .btn, .menu-btn, .nav-btn, .tab-btn, .option-btn, .save-item, .event-item, .faction-status-item, .character-status-item');
        
        if (button && !button.disabled) {
            // 添加点击反馈
            this.addClickFeedback(button);
            
            // 防止重复点击
            if (button.dataset.clicking) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            
            button.dataset.clicking = 'true';
            setTimeout(() => {
                delete button.dataset.clicking;
            }, 300);
        }
    }
    
    // 触摸开始
    handleTouchStart(event) {
        const target = event.target;
        const button = target.closest('button, .btn, .menu-btn, .nav-btn, .tab-btn, .option-btn');
        
        if (button) {
            button.classList.add('touching');
        }
    }
    
    // 触摸结束
    handleTouchEnd(event) {
        const target = event.target;
        const button = target.closest('button, .btn, .menu-btn, .nav-btn, .tab-btn, .option-btn');
        
        if (button) {
            setTimeout(() => {
                button.classList.remove('touching');
            }, 150);
        }
    }
    
    // 防止双击缩放
    preventDoubleClick(event) {
        event.preventDefault();
        return false;
    }
    
    // 防止缩放
    preventZoom() {
        // 防止双指缩放
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });
        
        document.addEventListener('gesturechange', function(e) {
            e.preventDefault();
        });
        
        document.addEventListener('gestureend', function(e) {
            e.preventDefault();
        });
        
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    // 添加点击反馈
    addClickFeedback(element) {
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            element.style.transform = '';
            setTimeout(() => {
                element.style.transition = '';
            }, 100);
        }, 100);
    }
    
    // 处理窗口大小变化（键盘显示/隐藏）
    handleResize() {
        // 当键盘显示时，滚动到当前活动元素
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}

// 初始化移动端兼容性
const mobileCompat = new MobileCompatibility();

// 游戏状态管理
let gameState = {
    currentSave: null,
    currentStep: 1,
    worldData: {},
    factions: [],
    characters: [],
    regions: [],
    selectedBackground: null,
    aiConfigs: [],
    factionRelationships: [],
    characterRelationships: [],
    generationLogs: [],
    rightPanelCollapsed: false,
    templates: [],
    selectedTemplate: null,
    panelSections: {
        map: true,      // 地图默认展开
        factions: false, // 势力默认收起
        characters: false // 人物默认收起
    }
};

// DOM元素
const screens = {
    mainMenu: document.getElementById('main-menu'),
    aiConfig: document.getElementById('ai-config'),
    aiChat: document.getElementById('ai-chat'),
    loadGame: document.getElementById('load-game'),
    newGame: document.getElementById('new-game'),
    gameScreen: document.getElementById('game-screen')
};

// 界面切换函数
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

function showMainMenu() {
    showScreen('mainMenu');
}

function showAIConfigScreen() {
    // 确保模态框存在
    createAIConfigModal();
    
    showScreen('aiConfig');
    loadAIConfigs();
}

function showNewGameScreen() {
    showScreen('newGame');
    resetGameSetup();
    loadTemplatesList();
}

function showLoadGameScreen() {
    showScreen('loadGame');
    loadSavesList();
}

function showGameScreen(saveData) {
    showScreen('gameScreen');
    initializeGameScreen(saveData);
}

// 右侧面板控制函数
function toggleRightPanel() {
    const rightPanel = document.getElementById('right-panel');
    const toggleIcon = document.getElementById('panel-toggle-icon');
    
    // 检查元素是否存在
    if (!rightPanel || !toggleIcon) {
        console.warn('右侧面板元素不存在，跳过切换操作');
        return;
    }
    
    gameState.rightPanelCollapsed = !gameState.rightPanelCollapsed;
    
    if (gameState.rightPanelCollapsed) {
        rightPanel.classList.add('collapsed');
        toggleIcon.className = 'fas fa-chevron-right';
    } else {
        rightPanel.classList.remove('collapsed');
        toggleIcon.className = 'fas fa-chevron-left';
    }
}

// 面板内容收起/展开
function togglePanelSection(sectionName) {
    const body = document.getElementById(`${sectionName}-panel-body`);
    const toggle = document.getElementById(`${sectionName}-toggle`);
    
    // 检查元素是否存在
    if (!body || !toggle) {
        console.warn(`面板元素不存在: ${sectionName}`);
        return;
    }
    
    const panel = body.closest('.collapsible-panel');
    
    gameState.panelSections[sectionName] = !gameState.panelSections[sectionName];
    
    if (gameState.panelSections[sectionName]) {
        body.classList.remove('collapsed');
        toggle.style.transform = 'rotate(0deg)';
        if (panel) panel.classList.remove('collapsed');
    } else {
        body.classList.add('collapsed');
        toggle.style.transform = 'rotate(-90deg)';
        if (panel) panel.classList.add('collapsed');
    }
}

// 事件筛选功能
function filterEvents() {
    const filter = document.getElementById('events-filter').value;
    const eventItems = document.querySelectorAll('#world-events .event-item');
    
    eventItems.forEach(item => {
        const eventType = item.dataset.eventType || 'world';
        if (filter === 'all' || eventType === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// 按天筛选事件
function filterEventsByDay() {
    const dayFilter = document.getElementById('day-filter-input').value;
    const eventItems = document.querySelectorAll('#world-events .event-item');
    
    if (!dayFilter) {
        eventItems.forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    const targetDay = parseInt(dayFilter);
    eventItems.forEach(item => {
        const eventDay = item.querySelector('.event-day');
        if (eventDay) {
            const dayText = eventDay.textContent;
            const dayMatch = dayText.match(/第(\d+)天/);
            if (dayMatch) {
                const eventDayNum = parseInt(dayMatch[1]);
                if (eventDayNum === targetDay) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        }
    });
}

// 清除天数筛选
function clearDayFilter() {
    document.getElementById('day-filter-input').value = '';
    filterEventsByDay();
}

// 小说生成功能
async function generateNovel() {
    try {
        // 显示加载提示
        showLoading(true);
        
        // 获取小说生成参数
        const theme = document.getElementById('novel-theme').value;
        const style = document.getElementById('novel-style').value || 'classic';
        const day = parseInt(document.getElementById('novel-day').value) || 1;
        const modelId = document.getElementById('novel-model-id').value;
        
        // 如果未加载存档或未设置主题，则无法生成
        if (!gameState.currentSave || !theme) {
            alert('请先加载游戏存档并设置小说主题');
            showLoading(false);
            return;
        }
        
        // 构建请求数据
        const requestData = {
            save_id: gameState.currentSave.id,
            theme: theme,
            style: style,
            day: day
        };
        
        // 如果有指定模型ID，添加到请求数据中
        if (modelId) {
            requestData.model_config_id = parseInt(modelId);
        }
        
        // 发送API请求
        const response = await fetch('/api/ai/generate-novel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('生成小说失败: ' + data.error);
            showLoading(false);
            return;
        }
        
        // 显示小说详情
        if (data.novel_id) {
            showNovelDetails(data.novel_id);
        } else {
            alert('小说生成成功，但获取ID失败');
        }
    } catch (error) {
        console.error('生成小说时出错:', error);
        alert('生成小说时发生错误: ' + error.message);
    } finally {
        // 隐藏加载提示
        showLoading(false);
    }
}

// 显示选中的章节
function showSelectedChapter() {
    const selectElement = document.getElementById('chapter-select');
    if (!selectElement) return;
    
    const selectedValue = selectElement.value;
    const chaptersContainer = document.getElementById('chapters-container');
    if (!chaptersContainer) return;
    
    // 隐藏所有章节
    document.querySelectorAll('.chapter-content').forEach(chapter => {
        chapter.style.display = 'none';
    });
    
    // 如果选择了"查看全文"
    if (selectedValue === 'all') {
        document.querySelectorAll('.chapter-content').forEach(chapter => {
            chapter.style.display = 'block';
        });
        
        // 更新全文切换按钮
        const toggleButton = document.getElementById('toggle-full-novel');
        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-compress"></i> 章节模式';
            toggleButton.setAttribute('data-showing-full', 'true');
        }
        return;
    }
    
    // 显示选中的章节
    const selectedChapter = document.getElementById(`chapter-${selectedValue}`);
    if (selectedChapter) {
        selectedChapter.style.display = 'block';
    }
    
    // 更新全文切换按钮
    const toggleButton = document.getElementById('toggle-full-novel');
    if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-book-open"></i> 查看全文';
        toggleButton.setAttribute('data-showing-full', 'false');
    }
}

// 切换全文显示/章节显示
function toggleFullNovel() {
    const chaptersContainer = document.getElementById('chapters-container');
    const toggleButton = document.getElementById('toggle-full-novel');
    const chapterSelect = document.getElementById('chapter-select');
    if (!chaptersContainer || !toggleButton || !chapterSelect) return;
    
    const isShowingFull = toggleButton.getAttribute('data-showing-full') === 'true';
    
    if (isShowingFull) {
        // 切换回章节模式
        document.querySelectorAll('.chapter-content').forEach((chapter, index) => {
            chapter.style.display = index === 0 ? 'block' : 'none';
        });
        
        // 显示章节选择器并重置为第一章
        chapterSelect.value = 0;
        
        toggleButton.innerHTML = '<i class="fas fa-book-open"></i> 查看全文';
        toggleButton.setAttribute('data-showing-full', 'false');
    } else {
        // 切换到全文模式
        document.querySelectorAll('.chapter-content').forEach(chapter => {
            chapter.style.display = 'block';
        });
        
        // 更新下拉选择器为全文选项
        chapterSelect.value = 'all';
        
        toggleButton.innerHTML = '<i class="fas fa-compress"></i> 章节模式';
        toggleButton.setAttribute('data-showing-full', 'true');
    }
}

function saveNovel() {
    const content = document.getElementById('novel-content');
    if (!content || !content.textContent.trim()) {
        alert('没有小说内容可保存！');
        return;
    }
    
    const novelText = content.textContent;
    const blob = new Blob([novelText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `小说_${gameState.currentSave.name}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 新游戏设置相关函数
function resetGameSetup() {
    gameState.currentStep = 1;
    gameState.factions = [];
    gameState.characters = [];
    gameState.regions = [];
    gameState.selectedBackground = null;
    gameState.selectedTemplate = null;
    
    document.getElementById('save-name').value = '';
    document.getElementById('world-background').value = '';
    document.getElementById('world-introduction').value = '';
    document.getElementById('cultivation-system').value = '';
    document.getElementById('template-select').value = '';
    
    updateStepDisplay();
    showStep(1);
}

function selectBackground(type) {
    gameState.selectedBackground = type;
    
    // 移除所有选中状态
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 添加选中状态
    event.target.classList.add('selected');
    
    // 预设背景文本
    const backgrounds = {
        fantasy: '一个充满魔法与神话的奇幻世界，有着古老的王国、神秘的森林和传说中的生物...',
        scifi: '未来科技高度发达的世界，星际旅行成为现实，人工智能与人类共存...',
        modern: '现代都市背景，政治斗争、商业竞争和社会变革交织在一起...',
        historical: '古代历史背景，诸侯争霸、英雄辈出的乱世时代...'
    };
    
    document.getElementById('world-background').value = backgrounds[type];
}

function updateStepDisplay() {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.toggle('active', index + 1 <= gameState.currentStep);
    });
}

function showStep(stepNumber) {
    document.querySelectorAll('.setup-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

function nextStep() {
    if (gameState.currentStep < 4) {
        gameState.currentStep++;
        updateStepDisplay();
        showStep(gameState.currentStep);
        
        // 在进入第二步（地图）时，确保更新地区显示
        if (gameState.currentStep === 2) {
            console.log('进入地图步骤，更新地区显示');
            updateRegionsDisplay();
        }
    }
}

function prevStep() {
    if (gameState.currentStep > 1) {
        gameState.currentStep--;
        updateStepDisplay();
        showStep(gameState.currentStep);
    }
}

// 模版相关函数
async function loadTemplatesList() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        
        gameState.templates = templates;
        updateTemplatesSelector();
    } catch (error) {
        console.error('加载模版列表失败:', error);
    }
}

function updateTemplatesSelector() {
    const selector = document.getElementById('template-select');
    selector.innerHTML = '<option value="">从零开始创建</option>';
    
    gameState.templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = `${template.name} - ${template.description || '无描述'}`;
        selector.appendChild(option);
    });
}

async function loadTemplate() {
    const templateId = document.getElementById('template-select').value;
    
    if (!templateId) {
        // 清空表单
        resetGameSetup();
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/templates/${templateId}`);
        const templateData = await response.json();
        
        if (templateData.error) {
            alert('加载模版失败：' + templateData.error);
            return;
        }
        
        gameState.selectedTemplate = templateData;
        
        // 填充世界背景信息
        document.getElementById('world-background').value = templateData.world_background || '';
        document.getElementById('world-introduction').value = templateData.world_introduction || '';
        document.getElementById('cultivation-system').value = templateData.cultivation_system || '';
        
        // 加载势力数据
        gameState.factions = templateData.factions.map((faction, index) => ({
            id: index + 1,
            name: faction.name,
            ideal: faction.ideal,
            background: faction.background,
            description: faction.description,
            power_level: faction.power_level,
            headquarters_location: faction.headquarters_location,
            status: '活跃'
        }));
        
        // 加载人物数据
        gameState.characters = templateData.characters.map((character, index) => ({
            id: index + 1,
            name: character.name,
            faction: character.faction_name,
            personality: character.personality,
            age: character.age,
            birthday: character.birthday,
            position: character.position,
            realm: character.realm,
            location: character.location,
            goals: character.goals,
            relationships: character.relationships,
            experience: character.experience,
            status: '活跃'
        }));
        
        
        // 加载地区数据
        if (templateData.regions && Array.isArray(templateData.regions)) {
            gameState.regions = templateData.regions.map((region, index) => ({
                id: index + 1,
                name: region.name || '',
                type: region.type || '',
                parent_id: region.parent_id || null,
                faction_name: region.faction_name || '',
                description: region.description || ''
            }));
            console.log('从模版加载地区数据:', templateData.regions);
        } else {
            gameState.regions = [];
            console.log('模版中没有地区数据，初始化为空数组');
        }
        
        console.log('处理后的地区数据:', gameState.regions);
        
        // 更新显示
        updateFactionsDisplay();
        updateCharactersDisplay();
        updateRegionsDisplay();
        
        console.log('模版加载完成，地区数据已更新:', gameState.regions);
        alert(`成功加载模版"${templateData.name}"！\n- 地区：${gameState.regions.length}个\n- 势力：${gameState.factions.length}个\n- 人物：${gameState.characters.length}个`);
    } catch (error) {
        alert('加载模版失败：' + error.message);
    } finally {
        showLoading(false);
    }
}

function refreshTemplates() {
    loadTemplatesList();
}

function saveAsTemplate() {
    const worldBackground = document.getElementById('world-background').value;
    
    if (!worldBackground.trim()) {
        alert('请先设置世界背景！');
        return;
    }
    
    // 更新预览信息
    document.getElementById('preview-background').textContent = worldBackground.substring(0, 50) + (worldBackground.length > 50 ? '...' : '');
    document.getElementById('preview-factions').textContent = gameState.factions.length;
    document.getElementById('preview-characters').textContent = gameState.characters.length;
    document.getElementById('preview-regions').textContent = (gameState.regions || []).length;
    
    showModal('save-template-modal');
}

async function createTemplate(templateData) {
    showLoading(true);
    
    try {
        // 为人物添加势力索引信息
        const charactersWithFactionIndex = templateData.characters.map(character => {
            const factionIndex = gameState.factions.findIndex(f => f.name === character.faction);
            return {
                ...character,
                faction_index: factionIndex >= 0 ? factionIndex : null
            };
        });
        
        // 为地区添加势力索引信息
        const regionsWithFactionIndex = (gameState.regions || []).map(region => {
            const factionIndex = region.faction_name ? gameState.factions.findIndex(f => f.name === region.faction_name) : -1;
            return {
                ...region,
                faction_index: factionIndex >= 0 ? factionIndex : null
            };
        });
        
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...templateData,
                characters: charactersWithFactionIndex,
                regions: regionsWithFactionIndex
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert('保存模版失败：' + result.error);
        } else {
            alert('模版保存成功！');
            closeModal('save-template-modal');
            loadTemplatesList(); // 刷新模版列表
        }
    } catch (error) {
        alert('保存模版失败：' + error.message);
    } finally {
        showLoading(false);
    }
}

// AI生成相关函数 - 修改为生成完整世界
async function generateCompleteWorld() {
    const background = document.getElementById('world-background').value;
    if (!background.trim()) {
        alert('请先输入世界背景！');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/ai/generate-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ background })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('AI生成失败：' + data.error);
        } else {
            console.log('收到AI生成数据:', data);
            
            // 保存完整的世界数据
            gameState.worldData = data;
            
            // 更新基础世界信息
            if (data.enhanced_background) {
                document.getElementById('world-background').value = data.enhanced_background;
            }
            
            if (data.world_introduction) {
                document.getElementById('world-introduction').value = data.world_introduction;
            }
            
            if (data.cultivation_system) {
                document.getElementById('cultivation-system').value = data.cultivation_system;
            }
            
            // 更新地图区域
            if (data.regions && Array.isArray(data.regions)) {
                gameState.regions = data.regions.map((region, index) => ({
                    id: index + 1,
                    name: region.name,
                    type: region.type,
                    description: region.description,
                    parent_id: null,
                    faction_name: ''
                }));
                updateRegionsDisplay();
                console.log('已加载地图区域:', data.regions.length, '个');
            }
            
            // 更新势力数据
            if (data.factions && Array.isArray(data.factions)) {
                gameState.factions = data.factions.map((faction, index) => ({
                    id: index + 1,
                    name: faction.name,
                    ideal: faction.ideal,
                    background: faction.background,
                    description: faction.description,
                    power_level: faction.power_level || 50,
                    headquarters_location: faction.headquarters_location,
                    status: '活跃'
                }));
                updateFactionsDisplay();
                updateFactionSelector();
                console.log('已加载势力:', data.factions.length, '个');
            }
            
            // 更新人物数据
            if (data.characters && Array.isArray(data.characters)) {
                gameState.characters = data.characters.map((character, index) => ({
                    id: index + 1,
                    name: character.name,
                    faction: character.faction,
                    personality: character.personality,
                    age: character.age || 25,
                    birthday: character.birthday,
                    position: character.position,
                    realm: character.realm,
                    location: character.location,
                    goals: character.goals,
                    relationships: character.relationships,
                    experience: character.experience,
                    status: '活跃'
                }));
                updateCharactersDisplay();
                console.log('已加载人物:', data.characters.length, '个');
            }
            
            // 显示成功消息
            const totalItems = (data.factions?.length || 0) + (data.characters?.length || 0) + (data.regions?.length || 0);
            alert(`完整世界生成成功！\n- 地区：${data.regions?.length || 0}个\n- 势力：${data.factions?.length || 0}个\n- 人物：${data.characters?.length || 0}个`);
            
            // 自动跳转到下一步
            setTimeout(() => {
                nextStep();
            }, 1000);
        }
    } catch (error) {
        console.error('生成完整世界错误:', error);
        alert('网络错误，请重试！');
    } finally {
        showLoading(false);
    }
}



// 显示更新函数
function updateFactionsDisplay() {
    const container = document.getElementById('factions-list');
    container.innerHTML = '';
    
    gameState.factions.forEach((faction, index) => {
        const factionElement = document.createElement('div');
        factionElement.className = 'faction-item';
        factionElement.innerHTML = `
            <div class="faction-name">${faction.name}</div>
            <div class="faction-description">${faction.description}</div>
            <div class="power-bar">
                <div class="power-fill" style="width: ${faction.power_level}%"></div>
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 5px;">
                势力强度: ${faction.power_level}/100
            </div>
        `;
        container.appendChild(factionElement);
    });
    
    updateFactionSelector();
}

function updateCharactersDisplay() {
    const container = document.getElementById('characters-list');
    container.innerHTML = '';
    
    gameState.characters.forEach((character, index) => {
        const characterElement = document.createElement('div');
        characterElement.className = 'character-item';
        characterElement.innerHTML = `
            <div class="character-name">${character.name}</div>
            <div class="character-info">
                <div><strong>势力:</strong> ${character.faction || '无'}</div>
                <div><strong>性格:</strong> ${character.personality}</div>
                <div><strong>目标:</strong> ${character.goals}</div>
            </div>
        `;
        container.appendChild(characterElement);
    });
}

function updateRegionsDisplay() {
    // 尝试找到地区容器
    const container = document.getElementById('regions-list');
    if (!container) {
        console.log('找不到 regions-list 容器，尝试使用地图显示函数');
        updateMapDisplay();
        return;
    }
    
    console.log('updateRegionsDisplay 被调用，地区数量:', (gameState.regions || []).length);
    console.log('地区数据:', gameState.regions);
    
    container.innerHTML = '';
    
    if (!gameState.regions || gameState.regions.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">还没有地区数据</p>';
        return;
    }
    
    (gameState.regions || []).forEach(region => {
        console.log('正在添加地区:', region.name);
        const regionElement = document.createElement('div');
        regionElement.className = 'region-item';
        regionElement.innerHTML = `
            <div class="region-name">${region.name}</div>
            <div class="region-type">${region.type}</div>
            <div class="region-description">${region.description}</div>
            ${region.faction_name ? `<div class="region-faction">控制势力: ${region.faction_name}</div>` : ''}
        `;
        container.appendChild(regionElement);
    });
    
    console.log('地区显示更新完成，容器子元素数量:', container.children.length);
    
    // 同时更新地图显示
    updateMapDisplay();
}

function updateFactionSelector() {
    const selector = document.getElementById('character-faction');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">无势力</option>';
    
    gameState.factions.forEach((faction, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = faction.name;
        selector.appendChild(option);
    });
}

// 模态框相关函数
function showModal(modalId) {
    console.log('尝试显示模态框:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log('模态框已显示:', modalId);
    } else {
        console.error('找不到模态框:', modalId);
        console.log('当前DOM中的模态框元素:', 
            Array.from(document.querySelectorAll('.modal')).map(m => m.id));
    }
}

function closeModal(modalId) {
    console.log('关闭模态框:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    } else {
        console.error('找不到模态框:', modalId);
    }
}

function showAddFactionForm() {
    document.getElementById('faction-form').reset();
    showModal('add-faction-modal');
}

function showAddCharacterForm() {
    document.getElementById('character-form').reset();
    updateFactionSelector();
    showModal('add-character-modal');
}

// 加载提示
function showLoading(show) {
    document.getElementById('loading').classList.toggle('active', show);
}

// 存档相关函数
async function loadSavesList() {
    try {
        const response = await fetch('/api/saves');
        const saves = await response.json();
        
        const container = document.getElementById('saves-list');
        container.innerHTML = '';
        
        if (saves.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.6);">暂无存档</div>';
            return;
        }
        
        saves.forEach(save => {
            const saveElement = document.createElement('div');
            saveElement.className = 'save-item';
            saveElement.onclick = () => loadGame(save.id);
            saveElement.innerHTML = `
                <div class="save-name">${save.name}</div>
                <div class="save-meta">
                    第${save.current_day}天 | 最后保存: ${new Date(save.updated_at).toLocaleString()}
                </div>
            `;
            container.appendChild(saveElement);
        });
    } catch (error) {
        alert('加载存档列表失败：' + error.message);
    }
}

async function loadGame(saveId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/api/saves/${saveId}/load`);
        const data = await response.json();
        
        if (data.error) {
            alert('加载存档失败：' + data.error);
            return;
        }
        
        gameState.currentSave = data.save;
        gameState.factions = data.factions;
        gameState.characters = data.characters;
        gameState.regions = data.regions || [];
        
        // 设置全局变量，确保访问一致性
        window.gameState = gameState;
        
        // 打印调试信息
        console.log('游戏存档加载成功：', gameState.currentSave.name);
        console.log('当前存档状态：', gameState.currentSave);
        
        showGameScreen(data);
    } catch (error) {
        alert('加载存档失败：' + error.message);
    } finally {
        showLoading(false);
    }
}

async function startGame() {
    const saveName = document.getElementById('save-name').value;
    const worldBackground = document.getElementById('world-background').value;
    const worldIntroduction = document.getElementById('world-introduction').value;
    const cultivationSystem = document.getElementById('cultivation-system').value;
    
    if (!saveName.trim()) {
        alert('请输入存档名称！');
        return;
    }
    
    if (!worldBackground.trim()) {
        alert('请设置世界背景！');
        return;
    }
    
    showLoading(true);
    
    try {
        // 创建存档
        const response = await fetch('/api/saves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: saveName,
                world_background: worldBackground,
                world_introduction: worldIntroduction,
                cultivation_system: cultivationSystem
            })
        });
        
        const saveData = await response.json();
        
        if (!saveData.success) {
            alert('创建存档失败！');
            return;
        }
        
        const saveId = saveData.save_id;
        
        // 保存AI生成的地图区域
        if (gameState.regions && gameState.regions.length > 0) {
            for (const region of gameState.regions) {
                await fetch(`/api/saves/${saveId}/regions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: region.name,
                        type: region.type,
                        description: region.description,
                        parent_id: null // 暂时不处理父级关系
                    })
                });
            }
        }
        
        // 保存势力
        for (const faction of gameState.factions) {
            await fetch(`/api/saves/${saveId}/factions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: faction.name,
                    ideal: faction.ideal || '',
                    background: faction.background || '',
                    description: faction.description || '',
                    status: faction.status || '活跃',
                    power_level: faction.power_level || 50,
                    headquarters_location: faction.headquarters_location || ''
                })
            });
        }
        
        // 保存人物
        for (const character of gameState.characters) {
            // 找到对应的势力ID
            let factionId = null;
            if (character.faction) {
                const factionIndex = gameState.factions.findIndex(f => f.name === character.faction);
                if (factionIndex !== -1) {
                    factionId = factionIndex + 1; // 假设数据库ID从1开始
                }
            }
            
            await fetch(`/api/saves/${saveId}/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: character.name,
                    faction_id: factionId,
                    status: character.status || '活跃',
                    personality: character.personality || '',
                    birthday: character.birthday || '',
                    age: character.age || 25,
                    location: character.location || '',
                    position: character.position || '',
                    realm: character.realm || '',
                    lifespan: character.lifespan || 100,
                    equipment: character.equipment || [],
                    skills: character.skills || [],
                    experience: character.experience || '',
                    goals: character.goals || '',
                    relationships: character.relationships || ''
                })
            });
        }
        
        // 加载游戏
        await loadGame(saveId);
    } catch (error) {
        alert('开始游戏失败：' + error.message);
    } finally {
        showLoading(false);
    }
}

// 游戏界面相关函数
function initializeGameScreen(saveData) {
    console.log('初始化游戏界面，数据:', saveData);
    
    // 保存完整的游戏数据
    gameState.currentSave = saveData.save;
    gameState.factions = saveData.factions || [];
    gameState.characters = saveData.characters || [];
    gameState.regions = saveData.regions || [];
    gameState.generationLogs = saveData.generation_logs || [];
    gameState.factionRelationships = saveData.faction_relationships || [];
    gameState.characterRelationships = saveData.character_relationships || [];
    
    // 更新界面显示
    const worldNameEl = document.getElementById('world-name');
    const currentDayEl = document.getElementById('current-day');
    const currentTimeEl = document.getElementById('current-time');
    
    if (worldNameEl) {
        worldNameEl.textContent = saveData.save.name || '未命名世界';
    }
    if (currentDayEl) {
        currentDayEl.textContent = `第${saveData.save.current_day || 1}天`;
    }
    if (currentTimeEl) {
        currentTimeEl.textContent = saveData.save.current_time || '年初春日';
    }
    
    // 初始化右侧面板状态（仅当元素存在时）
    const rightPanel = document.getElementById('right-panel');
    const toggleIcon = document.getElementById('panel-toggle-icon');
    
    if (rightPanel && toggleIcon) {
        // 默认收起右侧面板
        gameState.rightPanelCollapsed = true;
        rightPanel.classList.add('collapsed');
        toggleIcon.className = 'fas fa-chevron-right';
    }
    
    // 设置各个子面板的初始状态（仅当元素存在时）
    // 地图面板默认展开
    const mapBody = document.getElementById('map-panel-body');
    const mapToggle = document.getElementById('map-toggle');
    if (mapBody && mapToggle) {
        mapBody.classList.remove('collapsed');
        mapToggle.style.transform = 'rotate(0deg)';
        gameState.panelSections.map = true;
    }
    
    // 势力面板默认收起
    const factionsBody = document.getElementById('factions-panel-body');
    const factionsToggle = document.getElementById('factions-toggle');
    if (factionsBody && factionsToggle) {
        factionsBody.classList.add('collapsed');
        factionsToggle.style.transform = 'rotate(-90deg)';
        gameState.panelSections.factions = false;
    }
    
    // 人物面板默认收起
    const charactersBody = document.getElementById('characters-panel-body');
    const charactersToggle = document.getElementById('characters-toggle');
    if (charactersBody && charactersToggle) {
        charactersBody.classList.add('collapsed');
        charactersToggle.style.transform = 'rotate(-90deg)';
        gameState.panelSections.characters = false;
    }
    
    // 更新游戏界面
    updateGameUI(saveData);
    
    // 加载小说记录和世界事件
    loadWorldEvents();
    
    // 创建并初始化小说面板
    createNovelPanel();
}

// 创建小说面板
function createNovelPanel() {
    // 确保小说内容面板存在
    const novelRecordsPanel = document.getElementById('novel-records-panel');
    if (!novelRecordsPanel) return;
    
    // 清空当前内容
    novelRecordsPanel.innerHTML = '';
    
    // 创建小说面板
    const novelPanel = document.createElement('div');
    novelPanel.className = 'novel-panel';
    novelPanel.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-book"></i> 小说生成记录</h3>
            <button class="btn secondary small" onclick="loadNovelRecords()">
                <i class="fas fa-sync"></i> 刷新
            </button>
        </div>
        <div class="novel-records-list" id="novel-records">
            <p style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                加载中...
            </p>
        </div>
    `;
    
    // 添加到小说记录面板中
    novelRecordsPanel.appendChild(novelPanel);
    
    // 加载小说记录
    loadNovelRecords();
}

// 从面板生成小说的函数
function generateNovelFromPanel() {
    // 确保存档已加载
    if (!gameState.currentSave) {
        alert('请先加载游戏存档！');
        return;
    }
    
    // 从输入框获取主题
    const userInput = document.getElementById('user-input');
    if (!userInput || !userInput.value.trim()) {
        alert('请输入小说主题！');
        return;
    }
    
    // 设置小说生成参数
    document.getElementById('novel-theme').value = userInput.value.trim();
    document.getElementById('novel-style').value = 'classic'; // 默认风格
    document.getElementById('novel-day').value = gameState.currentSave.current_day || 1;
    
    // 调用小说生成函数
    generateNovel();
    
    // 清空输入框
    userInput.value = '';
}

function updateGameUI(data) {
    console.log('更新游戏界面，数据:', data);
    
    // 更新存档基本信息
    if (data.save) {
        gameState.currentSave = data.save;
        const worldNameEl = document.getElementById('world-name');
        const currentDayEl = document.getElementById('current-day');
        const currentTimeEl = document.getElementById('current-time');
        
        if (worldNameEl) {
            worldNameEl.textContent = data.save.name || '未命名世界';
        }
        if (currentDayEl) {
            currentDayEl.textContent = `第${data.save.current_day || 1}天`;
        }
        if (currentTimeEl) {
            currentTimeEl.textContent = data.save.current_time || '年初春日';
        }
    }
    
    // 更新世界事件
    if (data.world_events) {
        updateWorldEvents(data.world_events);
    }
    
    // 更新势力事件
    if (data.faction_events) {
        updateFactionEvents(data.faction_events);
    }
    
    // 更新人物事件
    if (data.character_events) {
        updateCharacterEvents(data.character_events);
    }
    
    // 更新势力状态
    if (data.factions) {
        gameState.factions = data.factions;
        updateFactionsStatus(data.factions);
    }
    
    // 更新人物状态
    if (data.characters) {
        gameState.characters = data.characters;
        updateCharactersStatus(data.characters);
    }
    
    // 更新地图区域
    if (data.regions) {
        gameState.regions = data.regions;
        updateMapDisplay();
    }
    
    // 更新生成记录
    if (data.generation_logs) {
        gameState.generationLogs = data.generation_logs;
        updateGenerationLogs(data.generation_logs);
    }
    
    // 更新关系数据
    if (data.faction_relationships) {
        gameState.factionRelationships = data.faction_relationships;
    }
    
    if (data.character_relationships) {
        gameState.characterRelationships = data.character_relationships;
    }
}

function updateWorldEvents(worldEvents) {
    const eventsContainer = document.getElementById('world-events');
    if (!eventsContainer) {
        console.warn('世界事件容器不存在');
        return;
    }
    
    eventsContainer.innerHTML = '';
    
    worldEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.setAttribute('data-event-type', 'world');
        eventElement.innerHTML = `
            <div class="event-day">第${event.day}天 ${event.time_period || ''}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-description">${event.description}</div>
            ${event.theme ? `<div class="event-meta">主题：${event.theme}</div>` : ''}
            ${event.faction_name ? `<div class="event-meta">相关势力：${event.faction_name}</div>` : ''}
            ${event.region_name ? `<div class="event-meta">相关地区：${event.region_name}</div>` : ''}
        `;
        eventsContainer.appendChild(eventElement);
    });
}

function updateFactionEvents(factionEvents) {
    const eventsContainer = document.getElementById('world-events');
    if (!eventsContainer) {
        console.warn('事件容器不存在，跳过势力事件更新');
        return;
    }
    
    // 这里可以添加势力事件的显示逻辑
    // 目前合并到世界事件中显示
    factionEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.setAttribute('data-event-type', 'faction');
        eventElement.innerHTML = `
            <div class="event-day">第${event.day}天 ${event.time_period || ''}</div>
            <div class="event-title">[势力] ${event.title}</div>
            <div class="event-description">${event.description}</div>
            ${event.theme ? `<div class="event-meta">主题：${event.theme}</div>` : ''}
        `;
        eventsContainer.appendChild(eventElement);
    });
}

function updateCharacterEvents(characterEvents) {
    const eventsContainer = document.getElementById('world-events');
    if (!eventsContainer) {
        console.warn('事件容器不存在，跳过人物事件更新');
        return;
    }
    
    // 这里可以添加人物事件的显示逻辑
    // 目前合并到世界事件中显示
    characterEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.setAttribute('data-event-type', 'character');
        eventElement.innerHTML = `
            <div class="event-day">第${event.day}天 ${event.time_period || ''}</div>
            <div class="event-title">[人物] ${event.title}</div>
            <div class="event-description">${event.description}</div>
            ${event.theme ? `<div class="event-meta">主题：${event.theme}</div>` : ''}
        `;
        eventsContainer.appendChild(eventElement);
    });
}

function updateFactionsStatus(factions) {
    const factionsContainer = document.getElementById('factions-status');
    if (!factionsContainer) {
        console.warn('势力状态容器不存在');
        return;
    }
    
    factionsContainer.innerHTML = '';
    
    factions.forEach(faction => {
        const factionElement = document.createElement('div');
        factionElement.className = 'faction-status-item';
        factionElement.innerHTML = `
            <h5>${faction.name}</h5>
            <p><strong>理想：</strong>${faction.ideal || '未设定'}</p>
            <p><strong>状态：</strong>${faction.status} | <strong>势力：</strong>${faction.power_level}/100</p>
            <p><strong>总部：</strong>${faction.headquarters_location || '未设定'}</p>
            ${faction.background ? `<p><strong>背景：</strong>${faction.background.substring(0, 50)}...</p>` : ''}
        `;
        factionElement.onclick = () => showFactionDetails(faction);
        factionsContainer.appendChild(factionElement);
    });
}

function updateCharactersStatus(characters) {
    const charactersContainer = document.getElementById('characters-status');
    if (!charactersContainer) {
        console.warn('人物状态容器不存在');
        return;
    }
    
    charactersContainer.innerHTML = '';
    
    characters.forEach(character => {
        const characterElement = document.createElement('div');
        characterElement.className = 'character-status-item';
        characterElement.innerHTML = `
            <h5>${character.name}</h5>
            <p><strong>势力：</strong>${character.faction_name || '无'}</p>
            <p><strong>职位：</strong>${character.position || '无'} | <strong>境界：</strong>${character.realm || '无'}</p>
            <p><strong>状态：</strong>${character.status} | <strong>年龄：</strong>${character.age}岁</p>
            <p><strong>位置：</strong>${character.location || '未知'}</p>
            ${character.personality ? `<p><strong>性格：</strong>${character.personality.substring(0, 30)}...</p>` : ''}
        `;
        characterElement.onclick = () => showCharacterDetails(character);
        charactersContainer.appendChild(characterElement);
    });
}

function showFactionDetails(faction) {
    // 显示势力详情模态框
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'faction-detail-modal';
    
    // 获取相关关系
    const relatedRelationships = (gameState.factionRelationships || []).filter(
        rel => rel.faction1_id === faction.id || rel.faction2_id === faction.id
    );
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-flag"></i> ${faction.name}</h3>
                <button class="close-btn" onclick="closeModalAndRemove('faction-detail-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="input-group">
                    <label>理想</label>
                    <p>${faction.ideal || '暂无描述'}</p>
                </div>
                <div class="input-group">
                    <label>背景</label>
                    <p>${faction.background || '暂无描述'}</p>
                </div>
                <div class="input-group">
                    <label>描述</label>
                    <p>${faction.description || '暂无描述'}</p>
                </div>
                <div class="input-group">
                    <label>总部位置</label>
                    <p>${faction.headquarters_location || '未设定'}</p>
                </div>
                <div class="input-group">
                    <label>状态信息</label>
                    <p>当前状态：${faction.status}</p>
                    <p>势力强度：${faction.power_level}/100</p>
                </div>
                ${relatedRelationships.length > 0 ? `
                <div class="input-group">
                    <label>势力关系</label>
                    ${relatedRelationships.map(rel => {
                        const otherFaction = rel.faction1_id === faction.id ? rel.faction2_name : rel.faction1_name;
                        return `<p><strong>${otherFaction}：</strong>${rel.relationship_type} - ${rel.description || '无备注'}</p>`;
                    }).join('')}
                </div>
                ` : ''}
            </div>
            <div class="modal-buttons">
                <button class="btn primary" onclick="editFaction(${faction.id})">
                    <i class="fas fa-edit"></i>
                    编辑
                </button>
                <button class="btn secondary" onclick="showFactionRelationships(${faction.id})">
                    <i class="fas fa-users"></i>
                    管理关系
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCharacterDetails(character) {
    // 显示人物详情模态框
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'character-detail-modal';
    
    // 获取相关关系
    const relatedRelationships = (gameState.characterRelationships || []).filter(
        rel => rel.character1_id === character.id || rel.character2_id === character.id
    );
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-user"></i> ${character.name}</h3>
                <button class="close-btn" onclick="closeModalAndRemove('character-detail-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="input-group">
                        <label>所属势力</label>
                        <p>${character.faction_name || '无'}</p>
                    </div>
                    <div class="input-group">
                        <label>职位</label>
                        <p>${character.position || '无'}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="input-group">
                        <label>年龄</label>
                        <p>${character.age}岁</p>
                    </div>
                    <div class="input-group">
                        <label>生日</label>
                        <p>${character.birthday || '未知'}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="input-group">
                        <label>修炼境界</label>
                        <p>${character.realm || '无'}</p>
                    </div>
                    <div class="input-group">
                        <label>寿命</label>
                        <p>${character.lifespan}年</p>
                    </div>
                </div>
                <div class="input-group">
                    <label>当前位置</label>
                    <p>${character.location || '未知'}</p>
                </div>
                <div class="input-group">
                    <label>性格特点</label>
                    <p>${character.personality || '暂无描述'}</p>
                </div>
                <div class="input-group">
                    <label>个人目标</label>
                    <p>${character.goals || '暂无描述'}</p>
                </div>
                <div class="input-group">
                    <label>人物经历</label>
                    <p>${character.experience || '暂无描述'}</p>
                </div>
                ${character.equipment && character.equipment.length > 0 ? `
                    <div class="input-group">
                        <label>装备</label>
                        <p>${character.equipment.join(', ')}</p>
                    </div>
                ` : ''}
                ${character.skills && character.skills.length > 0 ? `
                    <div class="input-group">
                        <label>技能</label>
                        <p>${character.skills.join(', ')}</p>
                    </div>
                ` : ''}
                ${relatedRelationships.length > 0 ? `
                <div class="input-group">
                    <label>人际关系</label>
                    ${relatedRelationships.map(rel => {
                        const otherCharacter = rel.character1_id === character.id ? rel.character2_name : rel.character1_name;
                        return `<p><strong>${otherCharacter}：</strong>${rel.relationship_type} - ${rel.notes || '无备注'}</p>`;
                    }).join('')}
                </div>
                ` : ''}
                <div class="input-group">
                    <label>人际关系描述</label>
                    <p>${character.relationships || '暂无描述'}</p>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="btn primary" onclick="editCharacter(${character.id})">
                    <i class="fas fa-edit"></i>
                    编辑
                </button>
                <button class="btn secondary" onclick="showCharacterRelationships(${character.id})">
                    <i class="fas fa-users"></i>
                    管理关系
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function editFaction(factionId) {
    // 实现编辑势力功能
    closeModal('faction-detail-modal');
    alert('编辑势力功能正在开发中...');
}

function editCharacter(characterId) {
    // 实现编辑人物功能
    closeModalAndRemove('character-detail-modal');
    alert('编辑人物功能正在开发中...');
}

function showFactionRelationships(factionId) {
    // 势力关系管理功能
    closeModalAndRemove('faction-detail-modal');
    alert('势力关系管理功能正在开发中...');
}

function showCharacterRelationships(characterId) {
    // 人际关系管理功能
    closeModalAndRemove('character-detail-modal');
    alert('人际关系管理功能正在开发中...');
}

// 关闭动态创建的模态框
function closeModalAndRemove(modalId) {
    console.log('关闭并移除动态创建的模态框:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    } else {
        console.error('找不到要关闭的动态模态框:', modalId);
    }
}

async function simulateDays() {
    try {
        // 检查当前是否有加载的存档
        if (!gameState || !gameState.currentSave) {
            alert('请先加载游戏存档');
            return;
        }
        
        // 显示加载提示
        showLoading(true);
        
        // 获取参数
        const days = parseInt(document.getElementById('simulation-days').value) || 1;
        const storyGuide = document.getElementById('story-guide').value || '';
        const modelId = document.getElementById('story-model-id').value;
        
        // 构建请求数据
        const requestData = {
            days: days,
            story_guide: storyGuide
        };
        
        // 如果有指定模型ID，添加到请求数据中
        if (modelId) {
            requestData.model_config_id = parseInt(modelId);
        }
        
        // 发送API请求
        const response = await fetch(`/api/saves/${gameState.currentSave.id}/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('模拟天数失败: ' + data.error);
            showLoading(false);
            return;
        }
        
        // 更新游戏UI
        await loadGame(gameState.currentSave.id);
        
        // 显示摘要
        if (data.summary) {
            const msgElement = document.createElement('div');
            msgElement.className = 'simulation-summary';
            msgElement.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:rgba(15,52,96,0.95);color:white;padding:20px;border-radius:8px;z-index:1001;max-width:90%;max-height:80%;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
            
            let summaryTitle = `<h3 style="margin-top:0;color:#e94560;">世界进展摘要</h3>`;
            let summaryContent = `<p>${data.summary.replace(/\n/g, '<br>')}</p>`;
            let closeButton = `<button style="background:#e94560;color:white;border:none;padding:8px 15px;border-radius:4px;margin-top:15px;cursor:pointer;">关闭</button>`;
            
            msgElement.innerHTML = summaryTitle + summaryContent + closeButton;
            document.body.appendChild(msgElement);
            
            // 点击关闭按钮移除摘要
            msgElement.querySelector('button').addEventListener('click', () => {
                document.body.removeChild(msgElement);
            });
            
            // 点击其他区域也可以关闭
            msgElement.addEventListener('click', (e) => {
                if (e.target === msgElement) {
                    document.body.removeChild(msgElement);
                }
            });
        }
    } catch (error) {
        console.error('模拟天数时出错:', error);
        alert('模拟天数时发生错误: ' + error.message);
    } finally {
        // 隐藏加载提示
        showLoading(false);
    }
}

function showWorldInfo() {
    const modal = document.getElementById('world-info-modal');
    const content = document.getElementById('world-info-content');
    
    if (!gameState.currentSave) {
        alert('没有加载存档数据！');
        return;
    }
    
    // 构建完整的世界信息显示
    let html = '';
    
    // 世界背景
    if (gameState.currentSave.world_background || gameState.worldData?.world_background) {
        html += `
            <div class="world-info-section">
                <h4><i class="fas fa-globe"></i> 世界背景</h4>
                <p>${gameState.currentSave.world_background || gameState.worldData.world_background}</p>
            </div>
        `;
    }
    
    // 世界介绍
    if (gameState.currentSave.world_introduction || gameState.worldData?.world_introduction) {
        html += `
            <div class="world-info-section">
                <h4><i class="fas fa-book-open"></i> 世界介绍</h4>
                <p>${gameState.currentSave.world_introduction || gameState.worldData.world_introduction}</p>
            </div>
        `;
    }
    
    // 修炼体系
    if (gameState.currentSave.cultivation_system || gameState.worldData?.cultivation_system) {
        html += `
            <div class="world-info-section">
                <h4><i class="fas fa-magic"></i> 修炼体系</h4>
                <p>${gameState.currentSave.cultivation_system || gameState.worldData.cultivation_system}</p>
            </div>
        `;
    }
    
    // 当前状态
    html += `
        <div class="world-info-section">
            <h4><i class="fas fa-calendar-alt"></i> 当前状态</h4>
            <p><strong>存档名称：</strong>${gameState.currentSave.name}</p>
            <p><strong>当前时间：</strong>第${gameState.currentSave.current_day || 1}天 ${gameState.currentSave.current_time || '年初春日'}</p>
            <p><strong>创建时间：</strong>${new Date(gameState.currentSave.created_at).toLocaleString()}</p>
            <p><strong>最后更新：</strong>${new Date(gameState.currentSave.updated_at).toLocaleString()}</p>
        </div>
    `;
    
    // 统计信息
    html += `
        <div class="world-info-section">
            <h4><i class="fas fa-chart-bar"></i> 世界统计</h4>
            <p><strong>势力数量：</strong>${gameState.factions ? gameState.factions.length : 0}</p>
            <p><strong>人物数量：</strong>${gameState.characters ? gameState.characters.length : 0}</p>
            <p><strong>地区数量：</strong>${gameState.regions ? gameState.regions.length : 0}</p>
        </div>
    `;
    
    // 地理环境（如果有地图数据）
    if (gameState.regions && gameState.regions.length > 0) {
        html += `
            <div class="world-info-section">
                <h4><i class="fas fa-map"></i> 地理环境</h4>
                <div class="regions-overview">
        `;
        
        gameState.regions.forEach(region => {
            html += `
                <div class="region-brief">
                    <strong>${region.name}</strong> (${region.type || '区域'})
                    ${region.description ? `<br><span style="color: rgba(255,255,255,0.7);">${region.description}</span>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (!html) {
        html = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">暂无世界信息</p>';
    }
    
    content.innerHTML = html;
    showModal('world-info-modal');
}

async function saveGame() {
    if (!gameState.currentSave) {
        alert('没有当前存档！');
        return;
    }
    
    // 这里可以添加保存游戏状态的逻辑
    alert('游戏已自动保存！');
}

// 表单提交处理
document.getElementById('faction-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const faction = {
        name: document.getElementById('faction-name').value,
        description: document.getElementById('faction-description').value,
        power_level: parseInt(document.getElementById('faction-power').value),
        status: '活跃'
    };
    
    gameState.factions.push(faction);
    updateFactionsDisplay();
    closeModal('add-faction-modal');
});

document.getElementById('character-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const factionIndex = document.getElementById('character-faction').value;
    const character = {
        name: document.getElementById('character-name').value,
        faction: factionIndex ? gameState.factions[factionIndex].name : '',
        personality: document.getElementById('character-personality').value,
        goals: document.getElementById('character-goals').value,
        relationships: document.getElementById('character-relationships').value,
        status: '活跃'
    };
    
    gameState.characters.push(character);
    updateCharactersDisplay();
    closeModal('add-character-modal');
});

// 范围滑块更新
document.getElementById('faction-power').addEventListener('input', function() {
    document.getElementById('power-value').textContent = this.value;
});

// 点击模态框背景关闭
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// AI配置相关函数
async function loadAIConfigs() {
    try {
        const response = await fetch('/api/ai-configs');
        const configs = await response.json();
        gameState.aiConfigs = configs;
        updateAIConfigsList();
    } catch (error) {
        console.error('加载AI配置失败:', error);
    }
}

function updateAIConfigsList() {
    const configList = document.getElementById('config-list');
    if (!configList) return;
    
    configList.innerHTML = '';
    
    gameState.aiConfigs.forEach(config => {
        const configItem = document.createElement('div');
        configItem.className = `config-item ${config.is_active ? 'active' : ''}`;
        configItem.innerHTML = `
            <div class="config-info">
                <h4>${config.name} ${config.is_active ? '<span class="active-badge">当前使用</span>' : ''}</h4>
                <p>模型：${config.model}</p>
                <p>API：${config.base_url}</p>
                <p>密钥：${config.api_key}</p>
            </div>
            <div class="config-actions">
                <button class="btn small primary" onclick="editAIConfig(${config.id})">
                    <i class="fas fa-edit"></i>
                    编辑
                </button>
                <button class="btn small ${config.is_active ? 'secondary' : 'primary'}" 
                        onclick="toggleAIConfig(${config.id}, ${!config.is_active})"
                        ${config.is_active ? 'disabled' : ''}>
                    <i class="fas fa-power-off"></i>
                    ${config.is_active ? '已启用' : '启用'}
                </button>
            </div>
        `;
        configList.appendChild(configItem);
    });
}

// 创建AI配置模态框
function createAIConfigModal() {
    // 如果模态框已存在则不重复创建
    if (document.getElementById('ai-config-modal')) {
        return;
    }
    
    console.log('动态创建AI配置模态框');
    
    const modal = document.createElement('div');
    modal.id = 'ai-config-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-robot"></i> AI配置</h3>
                <button class="close-btn" onclick="closeModal('ai-config-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="ai-config-form">
                    <div class="input-group">
                        <label for="ai-name">配置名称</label>
                        <input type="text" id="ai-name" required placeholder="例如：DeepSeek">
                    </div>
                    <div class="input-group">
                        <label for="api-key">API密钥</label>
                        <input type="password" id="api-key" required placeholder="请输入API密钥">
                    </div>
                    <div class="input-group">
                        <label for="base-url">API地址</label>
                        <input type="url" id="base-url" required placeholder="https://api.deepseek.com">
                    </div>
                    <div class="input-group">
                        <label for="model-name">模型名称</label>
                        <input type="text" id="model-name" required placeholder="deepseek-chat">
                    </div>
                    <div class="input-group">
                        <label for="temperature">温度 (0-1)</label>
                        <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.7">
                        <span id="temp-value">0.7</span>
                    </div>
                    <div class="input-group">
                        <label for="max-tokens">最大令牌数</label>
                        <input type="number" id="max-tokens" value="2000" min="100" max="8000">
                    </div>
                    <div class="input-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="is-active">
                            设为当前使用的配置
                        </label>
                    </div>
                    <div class="modal-buttons">
                        <button type="button" class="btn secondary" onclick="closeModal('ai-config-modal')">取消</button>
                        <button type="submit" class="btn primary">保存配置</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定表单提交事件
    const form = document.getElementById('ai-config-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = {
                name: formData.get('ai-name') || document.getElementById('ai-name').value,
                api_key: formData.get('api-key') || document.getElementById('api-key').value,
                base_url: formData.get('base-url') || document.getElementById('base-url').value,
                model: formData.get('model-name') || document.getElementById('model-name').value,
                temperature: parseFloat(document.getElementById('temperature').value),
                max_tokens: parseInt(document.getElementById('max-tokens').value),
                is_active: document.getElementById('is-active').checked
            };
            
            const configId = this.dataset.configId;
            const url = configId ? `/api/ai-configs/${configId}` : '/api/ai-configs';
            const method = configId ? 'PUT' : 'POST';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    closeModal('ai-config-modal');
                    await loadAIConfigs();
                } else {
                    alert('保存配置失败');
                }
            } catch (error) {
                alert('保存失败：' + error.message);
            }
        });
    }
    
    // 绑定温度滑块事件
    const tempSlider = document.getElementById('temperature');
    if (tempSlider) {
        tempSlider.addEventListener('input', function() {
            const tempValue = document.getElementById('temp-value');
            if (tempValue) {
                tempValue.textContent = this.value;
            }
        });
        tempSlider.addEventListener('touchmove', function() {
            const tempValue = document.getElementById('temp-value');
            if (tempValue) {
                tempValue.textContent = this.value;
            }
        });
    }
    
    console.log('AI配置模态框创建完成');
}

function showAddConfigForm() {
    try {
        // 确保模态框存在
        createAIConfigModal();
        
        clearAIConfigForm();
        showModal('ai-config-modal');
    } catch (error) {
        console.error('显示AI配置表单时出错:', error);
        alert('打开配置表单失败，请刷新页面后重试');
    }
}

function clearAIConfigForm() {
    const form = document.getElementById('ai-config-form');
    const tempValue = document.getElementById('temp-value');
    
    if (form) {
        form.reset();
        form.dataset.configId = '';
    }
    
    if (tempValue) {
        tempValue.textContent = '0.7';
    }
}

function editAIConfig(configId) {
    // 从后端获取完整的配置信息
    fetch(`/api/ai-configs/${configId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取配置信息失败');
            }
            return response.json();
        })
        .then(config => {
            try {
                // 确保模态框存在
                createAIConfigModal();
                
                // 检查并设置表单字段
                const aiNameEl = document.getElementById('ai-name');
                const apiKeyEl = document.getElementById('api-key');
                const baseUrlEl = document.getElementById('base-url');
                const modelNameEl = document.getElementById('model-name');
                const temperatureEl = document.getElementById('temperature');
                const tempValueEl = document.getElementById('temp-value');
                const maxTokensEl = document.getElementById('max-tokens');
                const isActiveEl = document.getElementById('is-active');
                const formEl = document.getElementById('ai-config-form');
                
                if (aiNameEl) aiNameEl.value = config.name || '';
                if (apiKeyEl) apiKeyEl.value = config.api_key || ''; // 显示完整密钥
                if (baseUrlEl) baseUrlEl.value = config.base_url || '';
                if (modelNameEl) modelNameEl.value = config.model || '';
                if (temperatureEl) temperatureEl.value = config.temperature || 0.7;
                if (tempValueEl) tempValueEl.textContent = config.temperature || 0.7;
                if (maxTokensEl) maxTokensEl.value = config.max_tokens || 2000;
                if (isActiveEl) isActiveEl.checked = config.is_active || false;
                if (formEl) formEl.dataset.configId = configId;
                
                showModal('ai-config-modal');
            } catch (error) {
                console.error('设置表单字段时出错:', error);
                alert('打开编辑表单失败，请刷新页面后重试');
            }
        })
        .catch(error => {
            console.error('编辑AI配置时出错:', error);
            alert('获取配置信息失败：' + error.message);
        });
}

async function toggleAIConfig(configId, activate) {
    try {
        // 只发送激活状态，不包含其他敏感信息
        const response = await fetch(`/api/ai-configs/${configId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                is_active: activate 
            })
        });
        
        if (response.ok) {
            await loadAIConfigs();
        } else {
            alert('配置更新失败');
        }
    } catch (error) {
        alert('操作失败：' + error.message);
    }
}

function showAIConfigInGame() {
    // 确保模态框存在
    createAIConfigModal();
    
    showModal('ai-config-modal');
    loadAIConfigs();
}

// 地图区域相关函数
function showAddRegionForm() {
    document.getElementById('region-form').reset();
    updateRegionSelectors();
    showModal('add-region-modal');
}

function updateRegionSelectors() {
    const parentSelect = document.getElementById('region-parent');
    const factionSelect = document.getElementById('region-faction');
    
    if (parentSelect) {
        parentSelect.innerHTML = '<option value="">无</option>';
        (gameState.regions || []).forEach(region => {
            const option = document.createElement('option');
            option.value = region.id;
            option.textContent = region.name;
            parentSelect.appendChild(option);
        });
    }
    
    if (factionSelect) {
        factionSelect.innerHTML = '<option value="">无</option>';
        (gameState.factions || []).forEach(faction => {
            const option = document.createElement('option');
            option.value = faction.id;
            option.textContent = faction.name;
            factionSelect.appendChild(option);
        });
    }
}

async function addRegion(regionData) {
    if (!gameState.currentSave) return;
    
    try {
        const response = await fetch(`/api/saves/${gameState.currentSave.id}/regions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(regionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            const newRegion = { id: result.region_id, ...regionData };
            gameState.regions.push(newRegion);
            updateMapDisplay();
            closeModal('add-region-modal');
        } else {
            alert('添加地区失败');
        }
    } catch (error) {
        alert('添加失败：' + error.message);
    }
}

function updateMapDisplay() {
    // 尝试找到地图容器，支持不同界面
    let mapContainer = document.getElementById('map-regions') || 
                       document.querySelector('.map-container') ||
                       document.getElementById('regions-list');
    
    if (!mapContainer) {
        console.warn('找不到地图容器');
        return;
    }
    
    mapContainer.innerHTML = '';
    
    if (!gameState.regions || gameState.regions.length === 0) {
        mapContainer.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">还没有地区数据</p>';
        return;
    }
    
    (gameState.regions || []).forEach(region => {
        const regionElement = document.createElement('div');
        regionElement.className = 'region-card map-region';
        regionElement.innerHTML = `
            <div class="region-header">
                <h4>${region.name}</h4>
                <span class="region-type">${region.type}</span>
            </div>
            <div class="region-info">
                <p>${region.description || '暂无描述'}</p>
                ${region.faction_name ? `<p>控制势力：${region.faction_name}</p>` : ''}
            </div>
        `;
        mapContainer.appendChild(regionElement);
    });
    
    console.log('地图显示已更新，容器:', mapContainer.id, '地区数量:', gameState.regions.length);
}

// 编辑世界信息
function showEditWorldForm() {
    // 实现编辑世界信息的功能
    closeModal('world-info-modal');
    alert('编辑世界功能正在开发中...');
}

// 表单提交事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 温度滑块事件
    const tempSlider = document.getElementById('temperature');
    if (tempSlider) {
        // 支持移动端的触摸事件
        tempSlider.addEventListener('input', function() {
            document.getElementById('temp-value').textContent = this.value;
        });
        tempSlider.addEventListener('touchmove', function() {
            document.getElementById('temp-value').textContent = this.value;
        });
    }
    
    // 势力强度滑块事件
    const powerSlider = document.getElementById('faction-power');
    if (powerSlider) {
        powerSlider.addEventListener('input', function() {
            document.getElementById('power-value').textContent = this.value;
        });
        powerSlider.addEventListener('touchmove', function() {
            document.getElementById('power-value').textContent = this.value;
        });
    }
    
    // AI配置表单提交
    const aiConfigForm = document.getElementById('ai-config-form');
    if (aiConfigForm) {
        aiConfigForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = {
                name: formData.get('ai-name') || document.getElementById('ai-name').value,
                api_key: formData.get('api-key') || document.getElementById('api-key').value,
                base_url: formData.get('base-url') || document.getElementById('base-url').value,
                model: formData.get('model-name') || document.getElementById('model-name').value,
                temperature: parseFloat(document.getElementById('temperature').value),
                max_tokens: parseInt(document.getElementById('max-tokens').value),
                is_active: document.getElementById('is-active').checked
            };
            
            const configId = this.dataset.configId;
            const url = configId ? `/api/ai-configs/${configId}` : '/api/ai-configs';
            const method = configId ? 'PUT' : 'POST';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    closeModal('ai-config-modal');
                    await loadAIConfigs();
                } else {
                    alert('保存配置失败');
                }
            } catch (error) {
                alert('保存失败：' + error.message);
            }
        });
    }
    
    // 地区表单提交
    const regionForm = document.getElementById('region-form');
    if (regionForm) {
        regionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const data = {
                name: document.getElementById('region-name').value,
                type: document.getElementById('region-type').value,
                parent_id: document.getElementById('region-parent').value || null,
                faction_id: document.getElementById('region-faction').value || null,
                description: document.getElementById('region-description').value
            };
            
            addRegion(data);
        });
    }
    
    // 事件过滤器
    const eventsFilter = document.getElementById('events-filter');
    if (eventsFilter) {
        eventsFilter.addEventListener('change', filterEvents);
    }
    
    // 势力表单提交 - 使用事件委托
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'faction-form') {
            e.preventDefault();
            
            const faction = {
                name: document.getElementById('faction-name').value,
                ideal: document.getElementById('faction-ideal').value,
                background: document.getElementById('faction-background').value,
                description: document.getElementById('faction-description').value,
                headquarters_location: document.getElementById('faction-headquarters').value,
                power_level: parseInt(document.getElementById('faction-power').value),
                status: '活跃'
            };
            
            gameState.factions.push(faction);
            updateFactionsDisplay();
            closeModal('add-faction-modal');
        }
        
        if (e.target.id === 'character-form') {
            e.preventDefault();
            
            const factionIndex = document.getElementById('character-faction').value;
            const character = {
                name: document.getElementById('character-name').value,
                faction: factionIndex ? gameState.factions[factionIndex].name : '',
                personality: document.getElementById('character-personality').value,
                goals: document.getElementById('character-goals').value,
                relationships: document.getElementById('character-relationships').value,
                age: parseInt(document.getElementById('character-age').value) || 25,
                birthday: document.getElementById('character-birthday').value,
                position: document.getElementById('character-position').value,
                realm: document.getElementById('character-realm').value,
                location: document.getElementById('character-location').value,
                experience: document.getElementById('character-experience').value,
                status: '活跃'
            };
            
            gameState.characters.push(character);
            updateCharactersDisplay();
            closeModal('add-character-modal');
        }
    });
    
    // 模版表单提交
    const templateForm = document.getElementById('template-form');
    if (templateForm) {
        templateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const templateData = {
                name: document.getElementById('template-name').value,
                description: document.getElementById('template-description').value,
                world_background: document.getElementById('world-background').value,
                world_introduction: document.getElementById('world-introduction').value,
                cultivation_system: document.getElementById('cultivation-system').value,
                factions: gameState.factions,
                characters: gameState.characters
            };
            
            createTemplate(templateData);
        });
    }

    // 使用事件委托处理所有模态框关闭
    document.addEventListener('click', function(e) {
        // 点击模态框背景关闭
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
        
        // 点击关闭按钮
        if (e.target.classList.contains('close-btn') || e.target.closest('.close-btn')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                // 对于动态创建的模态框，延迟移除
                setTimeout(() => {
                    if (modal.parentNode && !modal.classList.contains('active')) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300);
            }
        }
    });
    
    // 移动端特殊处理：防止iOS Safari的bounce效果
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.addEventListener('touchmove', function(e) {
            // 只在特定元素上允许滚动
            const scrollableElements = [
                '.mobile-content', '.modal-body', '.events-list', 
                '.characters-list', '.factions-list', '.saves-list',
                'textarea', 'input'
            ];
            
            let isScrollable = false;
            for (let selector of scrollableElements) {
                if (e.target.closest(selector)) {
                    isScrollable = true;
                    break;
                }
            }
            
            if (!isScrollable) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    console.log('移动端兼容性初始化完成');
});

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    showMainMenu();
});

function updateGenerationLogs(logs) {
    const container = document.getElementById('generation-logs');
    if (!container || !logs || !Array.isArray(logs)) {
        if (container) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">暂无生成记录</p>';
        }
        return;
    }

    // 按时间倒序排列
    const sortedLogs = logs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    
    let html = '';
    sortedLogs.forEach(log => {
        const date = new Date(log.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        html += `
            <div class="generation-log-item" data-day="${log.day || 0}">
                <div class="log-date">${formattedDate}</div>
                <div class="log-guide">
                    <strong>引导：</strong>${log.guide_text || log.input_prompt || '无引导内容'}
                </div>
                <div class="log-summary">
                    <strong>结果：</strong>${log.result_summary || log.output_summary || '生成完成'}
                </div>
                ${log.world_refreshed || log.refreshed_content ? 
                    `<div class="log-refreshed">
                        ${log.refreshed_content ? '内容已刷新' : '世界已更新'}
                    </div>` : ''
                }
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">暂无生成记录</p>';
}

async function loadGenerationLogs() {
    if (!gameState.currentSave) return;
    
    try {
        const response = await fetch(`/api/saves/${gameState.currentSave.id}/load`);
        const data = await response.json();
        
        if (data.generation_logs) {
            updateGenerationLogs(data.generation_logs);
        }
    } catch (error) {
        console.error('加载生成记录失败:', error);
    }
}

// 移动端界面控制函数
function switchPanel(panelName) {
    // 移除所有导航按钮的激活状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 激活当前按钮
    const activeBtn = document.querySelector(`[data-panel="${panelName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 隐藏所有内容面板
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 显示对应的内容面板
    const targetPanel = document.getElementById(`${panelName}-panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // 根据面板类型加载对应数据
    switch(panelName) {
        case 'events':
            if (gameState.currentSave) {
                // 加载世界事件
                loadWorldEvents();
            }
            break;
        case 'ai-logs':
            loadGenerationLogs();
            break;
        case 'factions':
            if (gameState.factions) {
                updateFactionsDisplay();
            }
            break;
        case 'characters':
            if (gameState.characters) {
                updateCharactersDisplay();
            }
            break;
        case 'world-map':
            updateMapDisplay();
            break;
        case 'novel-records':
            loadNovelRecords();
            break;
    }
}

function switchBottomTab(tabName) {
    // 移除所有标签按钮的激活状态
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons) {
        tabButtons.forEach(btn => {
            if (btn && btn.classList) {
                btn.classList.remove('active');
            }
        });
    }
    
    // 激活当前按钮
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn && activeBtn.classList) {
        activeBtn.classList.add('active');
    }
    
    // 隐藏所有标签面板
    const tabPanels = document.querySelectorAll('.tab-panel');
    if (tabPanels) {
        tabPanels.forEach(panel => {
            if (panel && panel.classList) {
                panel.classList.remove('active');
            }
        });
    }
    
    // 显示对应的标签面板
    const targetPanel = document.getElementById(`${tabName}-tab`);
    if (targetPanel && targetPanel.classList) {
        targetPanel.classList.add('active');
    }
}

// 加载小说记录
async function loadNovelRecords() {
    if (!gameState.currentSave) {
        const container = document.getElementById('novel-records');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                    请先加载游戏存档
                </div>
            `;
        }
        return;
    }
    
    console.log('开始加载小说记录，存档ID:', gameState.currentSave.id);
    
    try {
        const url = `/api/saves/${gameState.currentSave.id}/novels`;
        console.log('请求URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API返回数据:', data);
        
        if (data.error) {
            console.error('加载小说记录失败:', data.error);
            return;
        }
        
        if (data.novels && Array.isArray(data.novels)) {
            console.log(`成功获取${data.novels.length}条小说记录`);
            updateNovelRecordsDisplay(data.novels);
        } else {
            console.error('API返回的novels不是数组:', data.novels);
            const container = document.getElementById('novel-records');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                        数据格式错误
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('加载小说记录错误:', error);
        const container = document.getElementById('novel-records');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                    加载失败，请重试: ${error.message}
                </div>
            `;
        }
    }
}

// 更新小说记录显示
function updateNovelRecordsDisplay(novels) {
    const container = document.getElementById('novel-records');
    if (!container) return;
    
    console.log('更新小说记录列表，数据:', novels);
    
    if (novels.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                还没有生成小说记录
            </div>
        `;
        return;
    }
    
    let htmlContent = '';
    
    novels.forEach(novel => {
        // 分析每个小说内容
        analyzeNovelContent(novel);
        
        // 确保内容为字符串
        const content = novel.content || '无内容';
        
        htmlContent += `
            <div class="novel-record-item" onclick="showNovelDetails(${novel.id})">
                <div class="novel-record-header">
                    <h4>${novel.title || '未命名小说'}</h4>
                    <span class="novel-day">第${novel.day}天</span>
                </div>
                <div class="novel-meta">
                    <span class="novel-style">${getStyleName(novel.style)}</span>
                    <span class="novel-date">${formatDate(novel.created_at)}</span>
                </div>
                <div class="novel-preview">
                    ${truncateText(content, 100)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = htmlContent;
}

// 获取样式名称
function getStyleName(style) {
    const styleNames = {
        'classic': '古典小说',
        'modern': '现代小说',
        'fantasy': '玄幻小说',
        'wuxia': '武侠小说',
        'romance': '言情小说'
    };
    return styleNames[style] || style;
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知时间';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return '今天';
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 截断文本
function truncateText(text, maxLength) {
    if (!text) return '无内容';
    
    // 确保处理的是字符串
    const content = String(text);
    
    // 移除HTML标签
    const plainText = content.replace(/<[^>]*>/g, '');
    
    if (plainText.length <= maxLength) {
        return plainText;
    }
    
    // 查找合适的断句位置（句号、问号、感叹号、分号、逗号）
    let cutPos = maxLength;
    const punctuations = ['.', '。', '!', '！', '?', '？', ';', '；', ',', '，'];
    
    for (let i = maxLength; i >= maxLength / 2; i--) {
        if (punctuations.includes(plainText[i])) {
            cutPos = i + 1;
            break;
        }
    }
    
    return plainText.substring(0, cutPos) + '...';
}

// 显示小说详情
async function showNovelDetails(novelId) {
    if (!gameState.currentSave) {
        alert('请先加载游戏存档！');
        return;
    }
    
    showLoading(true);
    console.log('显示小说详情，ID:', novelId);
    
    try {
        // 先尝试直接显示简单内容
        const response = await fetch(`/api/saves/${gameState.currentSave.id}/novels`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('获取小说列表返回数据:', data);
        
        if (data.error) {
            alert('加载小说失败：' + data.error);
            return;
        }
        
        // 查找指定ID的小说
        const novel = data.novels.find(n => n.id == novelId);
        if (!novel) {
            alert('找不到该小说记录！');
            return;
        }
        
        console.log('找到小说数据:', novel);
        analyzeNovelContent(novel);
        
        // 创建小说详情模态框
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'novel-detail-modal';
        
        // 默认内容显示
        let novelContent = '';
        let novelTitle = novel.title || '未命名小说';
        
        // 确保内容为字符串
        const content = novel.content || '无内容';
        
        // 处理段落
        const paragraphs = content.split('\n')
            .filter(p => p.trim())
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        
        novelContent = `<div class="novel-content-simple">${paragraphs}</div>`;
        
        // 尝试获取原始JSON内容来显示章节
        try {
            const originalUrl = `/api/saves/${gameState.currentSave.id}/novels/original/${novelId}`;
            console.log('获取原始JSON URL:', originalUrl);
            
            const originalResponse = await fetch(originalUrl);
            
            if (originalResponse.ok) {
                const originalData = await originalResponse.json();
                console.log('获取到原始JSON数据:', originalData);
                
                if (originalData.success && originalData.original_content) {
                    try {
                        // 尝试解析JSON
                        const contentData = JSON.parse(originalData.original_content);
                        console.log('解析JSON成功:', contentData);
                        
                        if (contentData.title) {
                            novelTitle = contentData.title;
                        }
                        
                        if (contentData.chapters && Array.isArray(contentData.chapters) && contentData.chapters.length > 0) {
                            // 创建章节选择器
                            const chapterOptions = contentData.chapters.map((chapter, index) => 
                                `<option value="${index}">${chapter.title || `第${index+1}章`}</option>`
                            ).join('');
                            
                            // 创建章节内容
                            const chaptersHtml = contentData.chapters.map((chapter, index) => {
                                const display = index === 0 ? 'block' : 'none';
                                const chapterTitle = chapter.title || `第${index+1}章`;
                                const chapterContent = chapter.content || '';
                                
                                // 处理段落
                                const paragraphs = chapterContent.split('\n')
                                    .filter(p => p.trim())
                                    .map(p => `<p>${p.trim()}</p>`)
                                    .join('');
                                
                                return `
                                    <div class="chapter-content" id="chapter-${index}" style="display: ${display}">
                                        <h5 class="chapter-title">${chapterTitle}</h5>
                                        ${paragraphs}
                                    </div>
                                `;
                            }).join('');
                            
                            novelContent = `
                                <div class="chapter-selector">
                                    <label>选择章节：</label>
                                    <select id="chapter-select" onchange="showSelectedChapter()">
                                        ${chapterOptions}
                                        <option value="all">查看全文</option>
                                    </select>
                                </div>
                                <div id="chapters-container">
                                    ${chaptersHtml}
                                </div>
                                <div class="novel-controls">
                                    <button class="btn secondary small" id="toggle-full-novel" onclick="toggleFullNovel()">
                                        <i class="fas fa-book-open"></i> 查看全文
                                    </button>
                                </div>
                            `;
                        }
                    } catch (parseError) {
                        console.error('解析JSON出错:', parseError);
                        // 使用默认内容显示
                    }
                }
            } else {
                console.log('原始JSON获取失败，使用简单内容显示');
            }
        } catch (e) {
            console.error('获取原始JSON出错:', e);
            // 继续使用默认内容显示
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-book"></i> ${novelTitle}</h3>
                    <button class="close-btn" onclick="closeModalAndRemove('novel-detail-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="novel-meta-info">
                        <p><strong>主题：</strong>${novel.theme || '未知'}</p>
                        <p><strong>风格：</strong>${getStyleName(novel.style)}</p>
                        <p><strong>时间：</strong>第${novel.day}天</p>
                        <p><strong>创建于：</strong>${formatDate(novel.created_at)}</p>
                    </div>
                    <div class="novel-content-container">
                        ${novelContent}
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="btn secondary" onclick="closeModalAndRemove('novel-detail-modal')">
                        关闭
                    </button>
                    <button class="btn primary" onclick="saveNovelToFile(${novelId}, '${novelTitle.replace(/'/g, "\\'")}')">
                        <i class="fas fa-download"></i>
                        保存文件
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 保存小说数据到window对象，以便章节切换功能使用
        window.currentNovelData = novel;
        
    } catch (error) {
        console.error('加载小说详情错误:', error);
        alert('网络错误，请重试！' + error.message);
    } finally {
        showLoading(false);
    }
}

// 保存小说到文件
function saveNovelToFile(novelId, title) {
    console.log('保存小说到文件，ID:', novelId, '标题:', title);
    
    const novel = window.currentNovelData;
    if (!novel) {
        alert('小说数据不可用！');
        return;
    }
    
    console.log('保存的小说数据:', novel);
    
    // 直接使用内容
    const content = novel.content || '';
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '小说'}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 加载世界事件
async function loadWorldEvents() {
    if (!gameState.currentSave) {
        return;
    }
    
    try {
        const response = await fetch(`/api/saves/${gameState.currentSave.id}/events`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.error) {
            console.error('加载世界事件失败:', data.error);
            return;
        }
        
        updateWorldEventsDisplay(data.events || []);
    } catch (error) {
        console.error('加载世界事件错误:', error);
    }
}

// 更新世界事件显示
function updateWorldEventsDisplay(events) {
    const container = document.getElementById('world-events');
    if (!container) return;
    
    if (events.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                还没有世界事件记录
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="event-item" data-event-type="${event.type || 'world'}">
            <div class="event-header">
                <span class="event-day">第${event.day}天</span>
                <span class="event-type">${getEventTypeName(event.type)}</span>
            </div>
            <div class="event-content">
                ${event.description || event.content}
            </div>
        </div>
    `).join('');
}

// 获取事件类型名称
function getEventTypeName(type) {
    const typeNames = {
        'world': '世界事件',
        'faction': '势力事件',
        'character': '人物事件'
    };
    return typeNames[type] || '世界事件';
}

// 初始化移动端界面
function initializeMobileInterface() {
    // 延迟执行，确保DOM完全加载
    setTimeout(() => {
        try {
            // 默认显示世界地图面板
            switchPanel('world-map');
            
            // 默认显示小说生成标签
            switchBottomTab('novel');
            
            // 监听滚动事件，实现导航栏的显示/隐藏
            let lastScrollTop = 0;
            const header = document.querySelector('.mobile-header');
            const functionNav = document.querySelector('.function-nav');
            const mobileContent = document.querySelector('.mobile-content');
            
            if (mobileContent && header && functionNav) {
                mobileContent.addEventListener('scroll', function() {
                    const scrollTop = this.scrollTop;
                    
                    if (scrollTop > lastScrollTop && scrollTop > 100) {
                        // 向下滚动，隐藏导航
                        if (header.style) header.style.transform = 'translateY(-100%)';
                        if (functionNav.style) functionNav.style.transform = 'translateY(-100%)';
                    } else {
                        // 向上滚动或在顶部，显示导航
                        if (header.style) header.style.transform = 'translateY(0)';
                        if (functionNav.style) functionNav.style.transform = 'translateY(0)';
                    }
                    
                    lastScrollTop = scrollTop;
                });
            }
        } catch (error) {
            console.error('初始化移动端界面失败:', error);
        }
    }, 100);
}

// 重写游戏界面初始化函数以支持移动端
const originalInitializeGameScreen = initializeGameScreen;
initializeGameScreen = function(saveData) {
    // 调用原始函数
    originalInitializeGameScreen(saveData);
    
    // 初始化移动端界面
    initializeMobileInterface();
};

// 页面初始化检查
function initializePageElements() {
    // 创建AI配置模态框
    createAIConfigModal();
    
    // 检查AI配置相关元素
    const requiredElements = [
        'ai-config-form',
        'temp-value',
        'template-select'
    ];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`缺少必要元素: ${elementId}`);
        }
    });
    
    console.log('页面元素初始化检查完成');
}

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待一小段时间确保所有元素都已渲染
    setTimeout(() => {
        // 确保动态模态框已创建
        createAIConfigModal();
        
        initializePageElements();
        
        // 确保全局变量一致性
        window.gameState = gameState;
        
        // 加载模版列表
        if (typeof loadTemplatesList === 'function') {
            loadTemplatesList();
        }
        
        // 加载AI配置
        if (typeof loadAIConfigs === 'function') {
            loadAIConfigs();
        }
        
        console.log('所有初始化任务完成');
        
        // 添加额外的检查，确认模态框是否存在
        const modalExists = document.getElementById('ai-config-modal');
        console.log('AI配置模态框存在状态:', !!modalExists);
        if (!modalExists) {
            console.warn('模态框仍然不存在，尝试再次创建');
            createAIConfigModal();
        }
    }, 200);  // 增加延迟时间，确保DOM完全加载
});

// 检查当前存档状态
function checkCurrentSave() {
    if (!gameState) {
        console.error('gameState未初始化');
        return false;
    }
    
    if (!gameState.currentSave) {
        console.error('未加载存档，currentSave为空');
        return false;
    }
    
    console.log('当前存档正常：', gameState.currentSave.name);
    return true;
}

// 调试辅助函数：分析小说内容结构
function analyzeNovelContent(novel) {
    if (!novel) {
        console.log('分析失败：novel对象为空');
        return;
    }
    
    console.log('------- 小说内容分析 -------');
    console.log('ID:', novel.id);
    console.log('标题:', novel.title);
    console.log('内容类型:', typeof novel.content);
    console.log('内容长度:', novel.content ? novel.content.length : 0);
    
    if (typeof novel.content === 'string') {
        console.log('内容前50个字符:', novel.content.substring(0, 50));
        console.log('内容包含换行符数量:', (novel.content.match(/\n/g) || []).length);
    }
    
    // 尝试解析JSON内容
    if (novel.content && typeof novel.content === 'string' && novel.content.trim().startsWith('{')) {
        try {
            const jsonContent = JSON.parse(novel.content);
            console.log('JSON内容结构:', Object.keys(jsonContent));
            if (jsonContent.chapters && Array.isArray(jsonContent.chapters)) {
                console.log('章节数量:', jsonContent.chapters.length);
            }
        } catch (e) {
            console.log('内容不是有效的JSON');
        }
    }
    
    console.log('----------------------------');
}

// -------------------- AI对话功能 --------------------

// 全局变量
let chatState = {
    currentChatId: null,
    chats: [],
    messages: {},
    isTyping: false,
    streamController: null
};

// 显示AI对话界面
function showAIChatScreen() {
    console.log('显示AI对话界面');
    
    // 保存当前对话ID和设置，防止页面切换时丢失
    const savedChatState = {
        currentChatId: chatState.currentChatId,
        chats: chatState.chats,
        messages: chatState.messages
    };
    
    // 确保模态框存在
    ensureChatModalsExist();
    
    // 确保所有必要的元素都存在
    const requiredElements = [
        { id: 'ai-chat', name: 'AI对话界面' },
        { id: 'chat-messages', name: '消息容器' },
        { id: 'current-chat-title', name: '当前对话标题' },
        { id: 'chat-input', name: '聊天输入框' }
    ];
    
    let missingElements = [];
    requiredElements.forEach(el => {
        if (!document.getElementById(el.id)) {
            missingElements.push(el.name);
            console.error(`缺少AI对话界面必要元素: ${el.id}`);
        }
    });
    
    if (missingElements.length > 0) {
        alert(`AI对话界面初始化失败，缺少必要元素: ${missingElements.join(', ')}`);
        return;
    }
    
    // 显示对话屏幕
    showScreen('aiChat');
    
    // 恢复保存的状态
    chatState.currentChatId = savedChatState.currentChatId;
    chatState.chats = savedChatState.chats;
    chatState.messages = savedChatState.messages;
    
    // 加载必要数据
    if (!chatState.chats || chatState.chats.length === 0) {
        // 只有在没有缓存的聊天记录时才重新加载
        loadChatHistory();
    } else {
        // 有缓存的聊天记录，直接更新UI
        updateChatHistoryList();
        
        // 如果有当前对话，刷新显示
        if (chatState.currentChatId) {
            // 显示当前对话的消息
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                if (chatState.messages[chatState.currentChatId]) {
                    displayChatMessages(chatState.messages[chatState.currentChatId]);
                }
            }
            
            // 显示当前对话标题
            const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
            if (currentChat && document.getElementById('current-chat-title')) {
                document.getElementById('current-chat-title').textContent = currentChat.title || '新对话';
            }
        } else if (chatState.chats.length > 0) {
            // 如果没有当前对话但有聊天记录，切换到第一个
            switchChat(chatState.chats[0].id);
        }
    }
    
    // 确保聊天设置已加载 - 延迟执行确保模态框已创建
    setTimeout(() => {
        // 1. 加载AI模型设置
        const aiModelSelector = document.getElementById('chat-ai-model');
        const savedModelId = localStorage.getItem('selectedAIModelId');
        
        if (aiModelSelector && savedModelId) {
            console.log('初始化时设置AI模型为上次选择的:', savedModelId);
            
            // 如果选择器为空，加载模型列表
            if (aiModelSelector.options.length <= 1) {
                loadAIModelsForChat();
            } else {
                // 设置为保存的值
                for (let i = 0; i < aiModelSelector.options.length; i++) {
                    if (aiModelSelector.options[i].value == savedModelId) {
                        aiModelSelector.selectedIndex = i;
                        break;
                    }
                }
            }
        } else {
            // 确保AI模型列表已加载
            loadAIModelsForChat();
        }
        
        // 2. 加载当前对话的系统提示词和上下文条数
        if (chatState.currentChatId) {
            const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
            if (currentChat) {
                console.log('初始化聊天设置:', currentChat);
                
                // 延迟执行，确保模态框元素已创建
                setTimeout(() => {
                    // 检查并设置系统提示词
                    const promptElement = document.getElementById('chat-system-prompt');
                    if (promptElement) {
                        promptElement.value = currentChat.system_prompt || '';
                        console.log('已设置系统提示词:', currentChat.system_prompt);
                    } else {
                        console.warn('找不到chat-system-prompt元素，将在稍后重试');
                        // 如果元素不存在，再次尝试
                        setTimeout(() => {
                            const retryPromptElement = document.getElementById('chat-system-prompt');
                            if (retryPromptElement) {
                                retryPromptElement.value = currentChat.system_prompt || '';
                                console.log('重试后已加载系统提示词:', currentChat.system_prompt);
                            }
                        }, 200);
                    }
                    
                    // 直接设置上下文条数的值
                    const contextInput = document.getElementById('chat-context-count');
                    if (contextInput) {
                        contextInput.value = currentChat.context_count !== undefined ? currentChat.context_count : 1;
                        console.log('已设置上下文条数:', currentChat.context_count);
                    } else {
                        console.warn('找不到chat-context-count元素，将在稍后重试');
                        // 如果元素不存在，再次尝试
                        setTimeout(() => {
                            const retryContextInput = document.getElementById('chat-context-count');
                            if (retryContextInput) {
                                retryContextInput.value = currentChat.context_count !== undefined ? currentChat.context_count : 1;
                                console.log('重试后已加载上下文条数:', currentChat.context_count);
                            }
                        }, 200);
                    }
                }, 100); // 减少延迟时间
            }
        }
    }, 500);
    
    // 如果没有当前聊天，自动创建一个新的（延迟执行确保数据加载完成）
    setTimeout(() => {
        if (!chatState.currentChatId && (!chatState.chats || chatState.chats.length === 0)) {
            console.log('没有现有对话，创建新对话');
            createNewChat();
        }
    }, 1500);
}

// 确保聊天相关的模态框存在
function ensureChatModalsExist() {
    // 创建聊天设置模态框（如果不存在）
    if (!document.getElementById('chat-settings-modal')) {
        console.log('创建聊天设置模态框');
        const modal = document.createElement('div');
        modal.id = 'chat-settings-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> 聊天设置</h3>
                    <button class="close-btn" onclick="closeModal('chat-settings-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="chat-setting-item">
                        <label for="chat-ai-model">选择AI模型</label>
                        <select id="chat-ai-model" class="chat-select">
                            <option value="">选择AI模型</option>
                            <!-- 动态加载AI模型选项 -->
                        </select>
                    </div>
                    <div class="chat-setting-item">
                        <label for="chat-system-prompt">系统提示词</label>
                        <textarea id="chat-system-prompt" placeholder="输入系统提示词..."></textarea>
                    </div>
                    <div class="chat-setting-item">
                        <label for="chat-context-count">上下文条数</label>
                        <input type="number" id="chat-context-count" class="chat-input" value="1" min="0" placeholder="输入数字，0表示不传递上下文，-1表示全部">
                        <span class="setting-hint">0表示不传递上下文，-1表示全部，其他数字表示传递的对话轮数</span>
                    </div>
                    <div class="modal-buttons">
                        <button class="btn primary" onclick="applySettings()">
                            应用设置
                        </button>
                        <button class="btn secondary" onclick="closeModal('chat-settings-modal')">
                            取消
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } else {
        console.log('聊天设置模态框已存在，跳过创建');
    }
    
    // 创建聊天历史模态框（如果不存在）
    if (!document.getElementById('chat-history-modal')) {
        console.log('创建聊天历史模态框');
        const modal = document.createElement('div');
        modal.id = 'chat-history-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> 历史会话</h3>
                    <button class="close-btn" onclick="closeModal('chat-history-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="chat-history-actions">
                        <button class="btn primary" onclick="createNewChat()">
                            <i class="fas fa-plus"></i>
                            新对话
                        </button>
                    </div>
                    <div class="chat-history-list" id="chat-history-list">
                        <!-- 动态加载历史会话列表 -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } else {
        console.log('聊天历史模态框已存在，跳过创建');
    }
}

// 显示聊天设置模态框
function showChatSettings() {
    console.log('显示聊天设置模态框');
    
    // 确保模态框存在
    ensureChatModalsExist();
    
    // 加载AI模型列表
    loadAIModelsForChat();
    
    // 确保加载当前对话的设置
    if (chatState.currentChatId) {
        const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
        if (currentChat) {
            // 记录当前设置到全局变量，用于恢复
            window.currentChatSystemPrompt = currentChat.system_prompt;
            window.currentChatContextCount = currentChat.context_count;
            
            console.log('记录当前设置:', {
                system_prompt: window.currentChatSystemPrompt, 
                context_count: window.currentChatContextCount
            });
            
            // 延迟执行，确保模态框已加载
            setTimeout(() => {
                // 加载系统提示词
                const promptElement = document.getElementById('chat-system-prompt');
                if (promptElement) {
                    promptElement.value = currentChat.system_prompt || '';
                    console.log('设置模态框已加载系统提示词:', currentChat.system_prompt);
                }
                
                // 加载上下文条数
                const contextInput = document.getElementById('chat-context-count');
                if (contextInput) {
                    contextInput.value = currentChat.context_count !== undefined ? currentChat.context_count : 1;
                    console.log('设置模态框已加载上下文条数:', currentChat.context_count);
                }
            }, 200);
        }
    }
    
    const modal = document.getElementById('chat-settings-modal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('找不到chat-settings-modal元素');
    }
}

// 显示聊天历史模态框
function showChatHistory() {
    console.log('显示聊天历史模态框');
    
    // 确保模态框存在
    ensureChatModalsExist();
    
    // 更新聊天历史列表
    updateChatHistoryList();
    
    const modal = document.getElementById('chat-history-modal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('找不到chat-history-modal元素');
    }
}

// 应用设置
function applySettings() {
    const systemPrompt = document.getElementById('chat-system-prompt').value;
    const contextCount = document.getElementById('chat-context-count').value;
    const aiModel = document.getElementById('chat-ai-model').value;
    
    // 保存选定的模型ID
    if (aiModel) {
        localStorage.setItem('selectedAIModelId', aiModel);
        console.log('保存选中的AI模型ID:', aiModel);
    }
    
    // 更新对话设置
    updateChatSettings(systemPrompt, contextCount);
    
    // 提示用户设置已应用
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        const notification = document.createElement('div');
        notification.className = 'chat-notification';
        notification.textContent = '已应用设置更改';
        messagesContainer.appendChild(notification);
        
        // 3秒后自动移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // 关闭模态框
    closeModal('chat-settings-modal');
}

// 创建新对话
function createNewChat() {
    const title = "新对话";
    const date = new Date();
    const chatId = `chat_${Date.now()}`;
    
    const newChat = {
        id: chatId,
        title: title,
        created_at: date.toISOString(),
        system_prompt: '',
        context_count: 1
    };
    
    // 将新对话保存到服务器
    fetch('/api/chats', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newChat)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新本地状态
            newChat.id = data.chat_id || chatId;
            chatState.chats.unshift(newChat);
            chatState.messages[newChat.id] = [];
            
            // 切换到新对话
            switchChat(newChat.id);
            
            // 更新界面
            updateChatHistoryList();
            
            // 关闭历史会话模态框
            closeModal('chat-history-modal');
        } else {
            console.error('创建新对话失败:', data.error);
            alert('创建新对话失败: ' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        console.error('创建新对话时出错:', error);
        alert('创建新对话时出错，请重试');
    });
}

// 加载聊天历史
function loadChatHistory() {
    console.log('开始加载聊天历史...');
    fetch('/api/chats')
        .then(response => {
            console.log('聊天历史请求状态:', response.status);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('获取到聊天历史数据:', data);
                // 确保chats是一个数组
                chatState.chats = Array.isArray(data.chats) ? data.chats : [];
                console.log(`加载了${chatState.chats.length}个聊天记录`);
                
                // 更新UI
                updateChatHistoryList();
                
                // 如果有对话，自动选择第一个
                if (chatState.chats.length > 0 && !chatState.currentChatId) {
                    try {
                        console.log('准备切换到第一个对话:', chatState.chats[0].id);
                        switchChat(chatState.chats[0].id);
                    } catch (error) {
                        console.error('切换对话时出错:', error);
                    }
                } else {
                    console.log('没有可用的对话或已有当前对话');
                }
            } else {
                console.error('加载聊天历史失败:', data.error);
            }
        })
        .catch(error => {
            console.error('加载聊天历史时出错:', error);
        });
}

// 更新聊天历史列表
function updateChatHistoryList() {
    console.log('更新聊天历史列表');
    const historyList = document.getElementById('chat-history-list');
    
    if (!historyList) {
        console.error('找不到chat-history-list元素');
        return;
    }
    
    historyList.innerHTML = '';
    
    if (!chatState.chats || chatState.chats.length === 0) {
        historyList.innerHTML = `
            <div class="empty-chat-history">
                <p>暂无聊天记录</p>
            </div>
        `;
        return;
    }
    
    chatState.chats.forEach(chat => {
        try {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-history-item';
            if (chat.id === chatState.currentChatId) {
                chatItem.classList.add('active');
            }
            
            const date = new Date(chat.created_at);
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            chatItem.innerHTML = `
                <div class="chat-history-title">${chat.title || '新对话'}</div>
                <div class="chat-history-date">${formattedDate}</div>
            `;
            
            chatItem.addEventListener('click', () => {
                switchChat(chat.id);
            });
            
            historyList.appendChild(chatItem);
        } catch (error) {
            console.error('处理聊天项时出错:', error);
        }
    });
}

// 切换到指定对话
function switchChat(chatId) {
    console.log('切换到对话:', chatId);
    try {
        // 如果正在输出中，取消之前的请求
        if (chatState.isTyping && chatState.streamController) {
            chatState.streamController.abort();
            chatState.isTyping = false;
        }
        
        chatState.currentChatId = chatId;
        
        // 检查消息容器是否存在
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) {
            console.error('找不到chat-messages元素');
            return;
        }
        messagesContainer.innerHTML = '';
        
        // 更新UI显示当前选中的对话
        try {
            updateChatHistoryList();
        } catch (error) {
            console.error('更新聊天历史列表时出错:', error);
        }
        
        // 获取当前对话的设置
        const currentChat = chatState.chats.find(c => c.id === chatId);
        if (currentChat) {
            // 检查并设置标题
            const titleElement = document.getElementById('current-chat-title');
            if (titleElement) {
                titleElement.textContent = currentChat.title;
            } else {
                console.error('找不到current-chat-title元素');
            }
            
            // 确保聊天设置模态框存在，其中包含系统提示词和上下文数量元素
            ensureChatModalsExist();
            
            // 延迟执行，确保元素已经创建
            setTimeout(() => {
                // 检查并设置系统提示词
                const promptElement = document.getElementById('chat-system-prompt');
                if (promptElement) {
                    promptElement.value = currentChat.system_prompt || '';
                    console.log('已加载系统提示词:', currentChat.system_prompt);
                } else {
                    console.warn('找不到chat-system-prompt元素，将在稍后重试');
                    // 如果元素不存在，再次尝试
                    setTimeout(() => {
                        const retryPromptElement = document.getElementById('chat-system-prompt');
                        if (retryPromptElement) {
                            retryPromptElement.value = currentChat.system_prompt || '';
                            console.log('重试后已加载系统提示词:', currentChat.system_prompt);
                        }
                    }, 200);
                }
                
                // 直接设置上下文条数的值
                const contextInput = document.getElementById('chat-context-count');
                if (contextInput) {
                    contextInput.value = currentChat.context_count !== undefined ? currentChat.context_count : 1;
                    console.log('已加载上下文条数:', currentChat.context_count);
                } else {
                    console.warn('找不到chat-context-count元素，将在稍后重试');
                    // 如果元素不存在，再次尝试
                    setTimeout(() => {
                        const retryContextInput = document.getElementById('chat-context-count');
                        if (retryContextInput) {
                            retryContextInput.value = currentChat.context_count !== undefined ? currentChat.context_count : 1;
                            console.log('重试后已加载上下文条数:', currentChat.context_count);
                        }
                    }, 200);
                }
            }, 100); // 减少延迟时间
            
            // 加载对话消息
            try {
                loadChatMessages(chatId);
            } catch (error) {
                console.error('加载对话消息时出错:', error);
            }
            
            // 加载AI模型列表
            loadAIModelsForChat();
        } else {
            console.error('找不到ID为', chatId, '的对话');
        }
        
        // 关闭历史会话模态框
        try {
            closeModal('chat-history-modal');
        } catch (error) {
            console.error('关闭模态框时出错:', error);
        }
    } catch (error) {
        console.error('切换对话时出现错误:', error);
    }
}

// 删除对话
function deleteChat(chatId) {
    if (!confirm('确定要删除这个对话吗？此操作不可恢复。')) {
        return;
    }
    
    fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新本地状态
            chatState.chats = chatState.chats.filter(c => c.id !== chatId);
            delete chatState.messages[chatId];
            
            // 如果删除的是当前对话，切换到其他对话
            if (chatState.currentChatId === chatId) {
                chatState.currentChatId = null;
                if (chatState.chats.length > 0) {
                    switchChat(chatState.chats[0].id);
                } else {
                    document.getElementById('chat-messages').innerHTML = '';
                    document.getElementById('current-chat-title').textContent = '新对话';
                    document.getElementById('chat-system-prompt').value = '';
                    document.getElementById('chat-context-count').value = '1';
                }
            }
            
            // 更新UI
            updateChatHistoryList();
        } else {
            console.error('删除对话失败:', data.error);
            alert('删除对话失败: ' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        console.error('删除对话时出错:', error);
        alert('删除对话时出错，请重试');
    });
}

// 在页面加载时添加事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 监听系统提示词和上下文条数的变化
    const systemPromptElem = document.getElementById('chat-system-prompt');
    const contextCountElem = document.getElementById('chat-context-count');
    
    systemPromptElem.addEventListener('blur', function() {
        updateChatSettings(this.value, contextCountElem.value);
    });
    
    contextCountElem.addEventListener('change', function() {
        updateChatSettings(systemPromptElem.value, this.value);
    });
    
    // 监听Enter键发送消息
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
});

// 加载对话消息
function loadChatMessages(chatId) {
    console.log('加载对话消息:', chatId);
    // 如果已经有缓存的消息，直接使用
    if (chatState.messages[chatId]) {
        console.log('使用缓存的消息');
        displayChatMessages(chatState.messages[chatId]);
        return;
    }
    
    console.log('从服务器加载消息');
    // 否则从服务器加载
    fetch(`/api/chats/${chatId}/messages`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('消息加载成功:', data.messages ? data.messages.length : 0, '条消息');
                chatState.messages[chatId] = data.messages || [];
                displayChatMessages(chatState.messages[chatId]);
            } else {
                console.error('加载对话消息失败:', data.error);
            }
        })
        .catch(error => {
            console.error('加载对话消息时出错:', error);
        });
}

// 显示对话消息
function displayChatMessages(messages) {
    console.log('显示消息:', messages.length, '条');
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('找不到chat-messages元素');
        return;
    }
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        return;
    }
    
    messages.forEach(message => {
        addMessageToUI(message);
    });
    
    // 滚动到底部
    scrollToBottom();
}

// 发送消息
function sendChatMessage() {
    if (!chatState.currentChatId) {
        alert('请先创建或选择一个对话');
        return;
    }
    
    const input = document.getElementById('chat-input');
    if (!input) {
        console.error('找不到chat-input元素');
        return;
    }
    
    const message = input.value.trim();
    
    if (!message) {
        return;
    }
    
    // 清空输入框
    input.value = '';
    
    // 确保聊天设置模态框存在，其中包含必要的表单元素
    ensureChatModalsExist();
    
    // 获取当前设置
    const aiModelElement = document.getElementById('chat-ai-model');
    const systemPromptElement = document.getElementById('chat-system-prompt');
    const contextCountElement = document.getElementById('chat-context-count');
    
    if (!aiModelElement || !systemPromptElement || !contextCountElement) {
        console.error('找不到必要的表单元素');
        alert('系统错误：找不到必要的表单元素。请刷新页面后重试。');
        
        // 尝试重新加载AI模型列表
        loadAIModelsForChat();
        return;
    }
    
    // 获取AI模型，如果为空，尝试从localStorage恢复
    let aiModel = aiModelElement.value;
    if (!aiModel) {
        const savedModelId = localStorage.getItem('selectedAIModelId');
        if (savedModelId) {
            console.log('从localStorage恢复AI模型ID:', savedModelId);
            aiModel = savedModelId;
            
            // 更新选择器显示
            if (aiModelElement.options.length <= 1) {
                // 如果选择器是空的，重新加载模型列表
                loadAIModelsForChat();
                // 延迟执行，确保模型列表加载完成
                setTimeout(() => {
                    // 设置选择器值
                    aiModelElement.value = savedModelId;
                }, 500);
            } else {
                // 如果选择器已有选项，直接设置值
                aiModelElement.value = savedModelId;
            }
        }
    }
    
    // 检查是否选择了AI模型
    if (!aiModel) {
        alert('请选择一个AI模型');
        showChatSettings(); // 直接打开设置让用户选择
        return;
    }
    
    // 获取系统提示词和上下文条数，优先从表单元素获取，如果为空则从当前对话状态获取
    let systemPrompt = systemPromptElement.value;
    let contextCount = contextCountElement.value;
    
    // 如果表单元素的值为空或默认值，尝试从当前对话状态获取
    const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
    if (currentChat) {
        // 如果系统提示词为空，使用当前对话的设置
        if (!systemPrompt && currentChat.system_prompt) {
            systemPrompt = currentChat.system_prompt;
            systemPromptElement.value = systemPrompt;
            console.log('从当前对话恢复系统提示词:', systemPrompt);
        }
        
        // 如果上下文条数为默认值1，且当前对话有不同的设置，使用当前对话的设置
        if (contextCount === '1' && currentChat.context_count !== undefined && currentChat.context_count !== 1) {
            contextCount = currentChat.context_count.toString();
            contextCountElement.value = contextCount;
            console.log('从当前对话恢复上下文条数:', contextCount);
        }
    }
    
    // 记录当前设置到全局变量，用于后续恢复
    window.currentChatSystemPrompt = systemPrompt;
    window.currentChatContextCount = contextCount;
    console.log('发送消息前记录当前设置:', {
        system_prompt: systemPrompt,
        context_count: contextCount
    });
    
    // 更新对话设置
    updateChatSettings(systemPrompt, contextCount);
    
    // 创建用户消息对象
    const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    };
    
    // 添加到UI
    addMessageToUI(userMessage);
    
    // 添加到状态
    if (!chatState.messages[chatState.currentChatId]) {
        chatState.messages[chatState.currentChatId] = [];
    }
    chatState.messages[chatState.currentChatId].push(userMessage);
    
    // 保存用户消息到服务器
    saveMessageToServer(chatState.currentChatId, userMessage);
    
    // 滚动到底部
    scrollToBottom();
    
    // 显示"AI正在输入"指示器
    showTypingIndicator();
    
    // 准备上下文消息
    const contextMessages = prepareContextMessages(contextCount);
    
    // 创建用于取消请求的控制器
    chatState.streamController = new AbortController();
    const signal = chatState.streamController.signal;
    
    // 发送请求到服务器
    fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: chatState.currentChatId,
            message: message,
            model_id: aiModel,
            system_prompt: systemPrompt,
            context_messages: contextMessages
        }),
        signal: signal
    })
    .then(response => {
        // 检查响应是否成功
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Stream request failed');
            });
        }
        
        // 返回读取流
        return response.body;
    })
    .then(stream => {
        // 创建流读取器
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let responseText = '';
        
        // 创建AI消息对象
        const aiMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString()
        };
        
        // 移除"AI正在输入"指示器，添加AI消息到UI
        removeTypingIndicator();
        const messageElement = addMessageToUI(aiMessage);
        
        // 处理流
        function processStream() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    chatState.isTyping = false;
                    
                    // 确保响应文本有效
                    if (!responseText || responseText.trim() === '') {
                        console.warn('流响应为空或无效');
                        responseText = '(无响应内容)';
                    }
                    
                    // 更新状态
                    aiMessage.content = responseText;
                    console.log('处理完成，AI消息:', aiMessage);
                    
                    // 添加到聊天历史
                    if (!chatState.messages[chatState.currentChatId]) {
                        chatState.messages[chatState.currentChatId] = [];
                    }
                    chatState.messages[chatState.currentChatId].push(aiMessage);
                    
                    // 保存消息到服务器
                    saveMessageToServer(chatState.currentChatId, aiMessage);
                    
                    // 保存当前设置，以便在updateChatTitle后恢复
                    let systemPrompt = null;
                    let contextCount = null;
                    
                    // 如果存在全局设置变量，使用它们
                    if (window.currentChatSystemPrompt !== undefined) {
                        systemPrompt = window.currentChatSystemPrompt;
                    }
                    
                    if (window.currentChatContextCount !== undefined) {
                        contextCount = window.currentChatContextCount;
                    }
                    
                    // 如果全局变量不存在，尝试从当前对话获取
                    if (systemPrompt === null || contextCount === null) {
                        const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
                        if (currentChat) {
                            if (systemPrompt === null) systemPrompt = currentChat.system_prompt;
                            if (contextCount === null) contextCount = currentChat.context_count;
                        }
                    }
                    
                    console.log('保存的设置：', { system_prompt: systemPrompt, context_count: contextCount });
                    
                    // 更新对话标题（如果是第一条消息）
                    if (chatState.messages[chatState.currentChatId].length === 2) {
                        updateChatTitle();
                        
                        // 恢复原始设置
                        if (systemPrompt !== null || contextCount !== null) {
                            setTimeout(() => {
                                const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
                                if (currentChat) {
                                    if (systemPrompt !== null) currentChat.system_prompt = systemPrompt;
                                    if (contextCount !== null) currentChat.context_count = contextCount;
                                    
                                    console.log('恢复原始设置：', { 
                                        system_prompt: currentChat.system_prompt, 
                                        context_count: currentChat.context_count 
                                    });
                                    
                                    // 将恢复的设置保存到服务器
                                    updateChatSettings(currentChat.system_prompt, currentChat.context_count);
                                }
                            }, 300);
                        }
                    }
                    
                    return;
                }
                
                // 解码并添加新的内容
                const chunk = decoder.decode(value, { stream: true });
                console.log('收到流数据块:', chunk);
                
                if (chunk) {
                    // 将特殊标记\n转换回真正的换行符
                    const processedChunk = chunk.replace(/\\n/g, '\n');
                    responseText += processedChunk;
                    
                    // 更新UI
                    const contentElement = messageElement.querySelector('.message-content');
                    if (contentElement) {
                        // 将换行符转换为<br>以正确显示
                        const formattedText = responseText.replace(/\n/g, '<br>');
                        contentElement.innerHTML = formattedText;
                        // 触发重绘
                        contentElement.style.display = 'none';
                        contentElement.offsetHeight; // 强制重排
                        contentElement.style.display = '';
                    }
                    
                    // 滚动到底部
                    scrollToBottom();
                }
                
                // 继续处理流
                return processStream();
            });
        }
        
        // 开始处理流
        chatState.isTyping = true;
        return processStream();
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            console.log('Stream request was cancelled');
        } else {
            console.error('Stream error:', error);
            removeTypingIndicator();
            
            // 显示错误消息
            const errorMessage = {
                role: 'system',
                content: `错误: ${error.message || '发送消息时出错，请重试'}`,
                timestamp: new Date().toISOString()
            };
            addMessageToUI(errorMessage);
            scrollToBottom();
        }
        
        chatState.isTyping = false;
    });
}

// 准备上下文消息
function prepareContextMessages(contextCount) {
    if (!chatState.currentChatId || !chatState.messages[chatState.currentChatId]) {
        return [];
    }
    
    const messages = chatState.messages[chatState.currentChatId];
    
    // 不包括当前用户消息
    const previousMessages = messages.slice(0, -1);
    
    // 根据上下文条数选择要发送的消息
    if (contextCount === '0') {
        return [];
    } else if (contextCount === '-1') {
        return previousMessages;
    } else {
        const count = parseInt(contextCount);
        // 按对话轮次计算，一轮是用户+AI的一组消息
        const rounds = Math.floor(count);
        const messageCount = rounds * 2;
        return previousMessages.slice(-messageCount);
    }
}

// 向UI添加消息
function addMessageToUI(message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('找不到chat-messages元素');
        return null;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.role}`;
    
    // 格式化时间
    const timestamp = new Date(message.timestamp);
    const formattedTime = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
    
    // 处理消息内容，将换行符转换为<br>标签
    const formattedContent = message.content.replace(/\n/g, '<br>');
    
    messageElement.innerHTML = `
        <div class="message-content">${formattedContent}</div>
        <div class="message-time">${formattedTime}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    return messageElement;
}

// 显示"AI正在输入"指示器
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('找不到chat-messages元素');
        return;
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'chat-message assistant typing-indicator-container';
    indicator.id = 'typing-indicator';
    
    indicator.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    messagesContainer.appendChild(indicator);
    scrollToBottom();
}

// 移除"AI正在输入"指示器
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 滚动到底部
function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 加载AI模型列表
function loadAIModelsForChat() {
    console.log('加载AI模型列表');
    
    // 确保chat-ai-model元素存在
    const checkAndLoadModels = () => {
        const selector = document.getElementById('chat-ai-model');
        if (!selector) {
            console.warn('找不到chat-ai-model元素，将在50ms后重试');
            setTimeout(checkAndLoadModels, 50); // 延迟50ms后重试
            return;
        }
        
        // 获取保存的模型ID
        const savedModelId = localStorage.getItem('selectedAIModelId');
        
        // 只有当选择器为空或者只有默认选项时才重新加载
        if (selector.options.length <= 1) {
            // 清空现有选项，只保留默认选项
            while (selector.options.length > 1) {
                selector.remove(1);
            }
            
            // 发起API请求获取模型列表
            fetch('/api/ai-configs')
                .then(response => response.json())
                .then(data => {
                    // 添加AI模型选项
                    if (Array.isArray(data)) {
                        data.forEach(config => {
                            const option = document.createElement('option');
                            option.value = config.id;
                            option.textContent = config.name;
                            
                            // 如果是保存的模型ID或当前使用的配置，设为选中
                            if ((savedModelId && savedModelId == config.id) || 
                                (!savedModelId && config.is_active)) {
                                option.selected = true;
                            }
                            
                            selector.appendChild(option);
                        });
                        console.log(`已加载${data.length}个AI模型`);
                    } else {
                        console.error('AI模型数据格式不正确:', data);
                    }
                })
                .catch(error => {
                    console.error('加载AI模型失败:', error);
                });
        } else {
            // 如果选择器已有选项，只需确保正确的选项被选中
            if (savedModelId) {
                for (let i = 0; i < selector.options.length; i++) {
                    if (selector.options[i].value == savedModelId) {
                        selector.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    };
    
    // 开始检查并加载
    checkAndLoadModels();
}

// 更新对话设置
function updateChatSettings(systemPrompt, contextCount) {
    if (!chatState.currentChatId) return;
    
    // 找到当前对话
    const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
    if (!currentChat) return;
    
    // 更新本地状态
    currentChat.system_prompt = systemPrompt;
    currentChat.context_count = parseInt(contextCount);
    
    // 更新服务器
    fetch(`/api/chats/${chatState.currentChatId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            system_prompt: systemPrompt,
            context_count: parseInt(contextCount)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('更新对话设置失败:', data.error);
        }
    })
    .catch(error => {
        console.error('更新对话设置时出错:', error);
    });
}

// 保存消息到服务器
function saveMessageToServer(chatId, message) {
    console.log('保存消息到服务器:', chatId, message);
    
    // 检查必要参数
    if (!message || !message.role || message.content === undefined) {
        console.error('保存消息时缺少必要参数:', message);
        return;
    }
    
    // 确保content不为null，API可能不接受null值
    const content = message.content || '';
    
    fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            role: message.role,
            content: content,
            timestamp: message.timestamp || new Date().toISOString()
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error('保存消息失败，状态码:', response.status);
            return response.json().then(data => {
                throw new Error(data.error || '未知错误');
            });
        }
        return response.json();
    })
    .then(data => {
        if (!data.success) {
            console.error('保存消息失败:', data.error);
        } else {
            console.log('消息保存成功');
        }
    })
    .catch(error => {
        console.error('保存消息时出错:', error);
    });
}

// 更新对话标题
function updateChatTitle() {
    if (!chatState.currentChatId) return;
    
    // 获取第一条用户消息作为标题
    const messages = chatState.messages[chatState.currentChatId];
    if (!messages || messages.length < 1) return;
    
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return;
    
    // 截取前20个字符作为标题
    let title = firstUserMessage.content.trim();
    if (title.length > 20) {
        title = title.substring(0, 20) + '...';
    }
    
    // 更新UI
    const titleElement = document.getElementById('current-chat-title');
    if (titleElement) {
        titleElement.textContent = title;
    }
    
    // 更新本地状态
    const currentChat = chatState.chats.find(c => c.id === chatState.currentChatId);
    if (currentChat) {
        // 在更新标题前保存原始设置值
        const originalSystemPrompt = currentChat.system_prompt;
        const originalContextCount = currentChat.context_count;
        
        console.log('更新标题前保存原始设置:', {
            system_prompt: originalSystemPrompt,
            context_count: originalContextCount
        });
        
        // 只更新标题
        currentChat.title = title;
        
        // 显式保留原始设置，即使值为undefined也要保留
        currentChat.system_prompt = originalSystemPrompt;
        currentChat.context_count = originalContextCount;
        
        console.log('更新标题后的设置:', {
            title: currentChat.title,
            system_prompt: currentChat.system_prompt, 
            context_count: currentChat.context_count
        });
    }
    
    // 更新历史列表
    updateChatHistoryList();
    
    // 更新服务器，只发送标题
    fetch(`/api/chats/${chatState.currentChatId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('更新对话标题失败:', data.error);
        }
    })
    .catch(error => {
        console.error('更新对话标题时出错:', error);
    });
}

