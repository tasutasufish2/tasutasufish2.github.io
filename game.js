const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const virusCountDisplay = document.getElementById('virus-count-display');
const antibodyDisplay = document.getElementById('antibody-display');
const virusTotalCounts = document.querySelectorAll('.virus-total-count');
const antibodyCounts = document.querySelectorAll('.antibody-count');
const atkLvDisplay = document.getElementById('atk-lv');
const sizeLvDisplay = document.getElementById('size-lv');
const hpLvDisplay = document.getElementById('hp-lv');
const resLvDisplay = document.getElementById('res-lv');
const alphaLvDisplay = document.getElementById('alpha-lv');

const atkCostDisplay = document.getElementById('atk-cost');
const sizeCostDisplay = document.getElementById('size-cost');
const hpCostDisplay = document.getElementById('hp-cost');
const resCostDisplay = document.getElementById('res-cost');

const researchTargetDisplay = document.getElementById('research-target-count');
const progressBar = document.getElementById('research-progress-bar');
const labBtn = document.getElementById('research-lab');

const purifyProgressBar = document.getElementById('purify-progress-bar');
const purifyLabBtn = document.getElementById('purify-lab');
const btnPurifyStart = document.getElementById('btn-purify-start');
const purifyTargetDisplay = document.getElementById('purify-target-count');
const purifyTotalPointsDisplay = document.getElementById('purify-total-points');
const purifyTotalTimeDisplay = document.getElementById('purify-total-time-display');

const statAtkDisplay = document.getElementById('stat-atk');
const statHpDisplay = document.getElementById('stat-hp');
const statMoneyDisplay = document.getElementById('stat-money');
const statFragmentsDisplay = document.getElementById('stat-fragments');

const statMoneyHudDisplay = document.getElementById('stat-money-hud');
const statFragmentsHudDisplay = document.getElementById('stat-fragments-hud');

const medicineCountDisplay = document.getElementById('medicine-count');
const treatmentMoneyDisplay = document.getElementById('treatment-money');
const btnTreat = document.getElementById('btn-treat');
const hospitalImg = document.getElementById('hospital-img');
const treatmentEffectContainer = document.getElementById('treatment-effect-container');

// Game Settings
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 600;

const assets = { player: new Image(), virus: new Image(), bullet: new Image(), bg: new Image() };
assets.player.src = 'player.png';
assets.virus.src = 'virus.png';
assets.bullet.src = 'bullet.png';
assets.bg.src = 'background.png';

let assetsLoaded = 0;
let gameStarted = false;

function onAssetLoad() {
    assetsLoaded++;
    if (assetsLoaded === 4 && !gameStarted) startGame();
}
function startGame() { gameStarted = true; requestAnimationFrame(gameLoop); }
setTimeout(() => { if (!gameStarted) startGame(); }, 3000);
Object.values(assets).forEach(img => { img.onload = onAssetLoad; img.onerror = onAssetLoad; });

// Skill Data Definition
const SKILL_DATA = {
    start: { name: "起点", desc: "全ての始まり。", cost: 0 },
    attackBloom: { name: "攻撃開花", desc: "攻撃系スキルツリーを解放します。\n更なる火力を求める者へ。", cost: 50 },
    hpBloom: { name: "体力開花", desc: "体力系スキルツリーを解放します。\n生存能力を高めたい者へ。", cost: 50 },
    specialBloom: { name: "特殊開花", desc: "特殊系スキルツリーを解放します。\n異能の力を求める者へ。", cost: 50 }
};


// --- Game State ---
let state = {
    activeTab: 'game-tab',
    virusTotal: 0,
    antibodyPoints: 0,
    money: 0,
    fragments: 0,
    medicine: 0,

    atkLv: 1,
    sizeLv: 1,
    hpLv: 1,
    resLv: 1,
    alphaLv: 0,

    researchTarget: 0,
    isResearching: false,
    researchProgress: 0,

    isPurifying: false,
    purifyProgress: 0,
    purifyTargetPoints: 30, // プレイヤーが設定した投入量
    purifyTotalTimeSteps: 30 * 60, // 実際の精製時間 (ステップ数)
    purifyCostPerMedicine: 30, // 薬1つあたりのコスト
    purifyTimePerMedicine: 30, // 薬1つあたりの時間 (秒)

    comboCount: 0,
    comboEffects: [],
    particles: [],
    activeDebuffs: [],

    // Boosts
    immuneAtkDownTimer: 0,
    doubleAtkTimer: 0,

    // Map Specific
    isMapMode: false,
    currentStageId: "",
    currentStageName: "",
    mapQuota: 0,
    mapKills: 0,
    hp: 50,
    maxHp: 50,
    mapFadeTimer: 0,

    unlockedStages: ['map1-1'],
    unlockedStages: ['map1-1'],
    unlockedStages: ['map1-1'],
    lastClearedStage: null,
    clearedStages: [], // クリア済みステージのリスト
    stageClearCounts: {}, // { stageId: count } - ステージごとのクリア回数

    // Boss State
    boss: null, // { x, y, width, height, hp, maxHp, phase, invulnerable, actionTimer, bullets: [] }


    player: {
        x: SCREEN_WIDTH / 2 - 32,
        y: SCREEN_HEIGHT - 80,
        width: 64,
        height: 64,
        speed: 6
    },
    bullets: [],
    viruses: [],
    lastVirusSpawn: 0,
    spawnInterval: 1000,
    killCountInSession: 0,

    // Skill Tree
    skills: {
        attackBloom: false,
        hpBloom: false,
        specialBloom: false
    },

    // System
    paused: false,

    // Skill Tree UI State
    skillTree: {
        offsetX: 0,
        offsetY: 0,
        scale: 1.0,
        isDragging: false,
        lastX: 0,
        lastY: 0
    }
};

// --- Input ---
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let spaceKeyPrev = false;

// ダブルタップズームをJavaScriptで徹底的に防止
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// --- UI Logic ---
function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));
    updateUI();
}
window.switchTab = switchTab;

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchTab(target);
    });
});

// --- Mobile Controls ---
const btnMoveLeft = document.getElementById('btn-move-left');
const btnMoveRight = document.getElementById('btn-move-right');
const btnFireLeft = document.getElementById('btn-fire-left');
const btnFireRight = document.getElementById('btn-fire-right');

if (btnMoveLeft) {
    const startLeft = (e) => { e.preventDefault(); keys.ArrowLeft = true; };
    const endLeft = (e) => { e.preventDefault(); keys.ArrowLeft = false; };
    btnMoveLeft.addEventListener('pointerdown', startLeft);
    btnMoveLeft.addEventListener('pointerup', endLeft);
    btnMoveLeft.addEventListener('pointerleave', endLeft);
}

if (btnMoveRight) {
    const startRight = (e) => { e.preventDefault(); keys.ArrowRight = true; };
    const endRight = (e) => { e.preventDefault(); keys.ArrowRight = false; };
    btnMoveRight.addEventListener('pointerdown', startRight);
    btnMoveRight.addEventListener('pointerup', endRight);
    btnMoveRight.addEventListener('pointerleave', endRight);
}

const startFire = (e) => { e.preventDefault(); keys.Space = true; };
const endFire = (e) => { e.preventDefault(); keys.Space = false; };

if (btnFireLeft) {
    btnFireLeft.addEventListener('pointerdown', startFire);
    btnFireLeft.addEventListener('pointerup', endFire);
    btnFireLeft.addEventListener('pointerleave', endFire);
}

if (btnFireRight) {
    btnFireRight.addEventListener('pointerdown', startFire);
    btnFireRight.addEventListener('pointerup', endFire);
    btnFireRight.addEventListener('pointerleave', endFire);
}



window.startMap = function (id, quota) {
    state.isMapMode = true;
    state.currentStageId = id;
    state.currentStageName = id.replace('map1', 'マップ①').replace('map2', 'マップ②').replace('-', 'ー').replace('boss', 'BOSS');
    state.mapQuota = quota;
    state.mapKills = 0;
    state.hp = state.maxHp;
    state.mapFadeTimer = 180;
    state.viruses = [];
    state.bullets = [];
    state.comboCount = 0;
    state.activeDebuffs = [];

    // Boss Setup
    if (id === 'map1-boss') {
        state.boss = {
            x: SCREEN_WIDTH / 2 - 75, // 150px width
            y: 50,
            width: 150,
            height: 150,
            width: 150,
            height: 150,
            hp: 1500, // 強化: 300 -> 1500 (5倍)
            maxHp: 1500,
            phase: 1,
            phase: 1,
            invulnerable: false,
            invulnerableTimer: 0,
            actionTimer: 0,
            bullets: [],
            targetY: 50 // 目標Y座標（フェーズ移行などで使用）
        };
        state.mapQuota = 1; // ダミー
        state.mapQuota = 1; // ダミー
    } else if (id === 'map2-boss') {
        state.boss = {
            x: SCREEN_WIDTH / 2 - 75,
            y: 50,
            width: 150,
            height: 150,
            hp: 1950, // 1500 * 1.3
            maxHp: 1950,
            phase: 1,
            phase: 1,
            invulnerable: false,
            invulnerableTimer: 0,
            actionTimer: 0,
            bullets: [],
            targetY: 50,
            // 特殊攻撃ステート
            attackState: 'idle', // idle, warning, firing, cooldown
            attackTimer: 0,
            attackTargetX: 0,
            attackWidth: 0,
            hasHitPlayer: false
        };
        state.mapQuota = 1;
    } else {
        state.boss = null;
    }

    switchTab('game-tab');
};

// Map UI Logic
function toggleMapDetails(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
        const arrow = el.parentElement.querySelector('.arrow');
        if (arrow) arrow.innerText = el.style.display === 'none' ? '▼' : '▲';
    }
}
window.toggleMapDetails = toggleMapDetails;

function checkStageUnlocks() {
    // 順番リスト: マップ1系 -> マップ2系
    const stages = [
        'map1-1', 'map1-2', 'map1-3', 'map1-boss',
        'map2-1', 'map2-2', 'map2-3', 'map2-boss'
    ];

    // 順番にチェックして、クリア済みなら次のステージを解放
    for (let i = 0; i < stages.length - 1; i++) {
        const currentStage = stages[i];
        const nextStage = stages[i + 1];

        if (state.clearedStages.includes(currentStage)) {
            if (!state.unlockedStages.includes(nextStage)) {
                state.unlockedStages.push(nextStage);
                saveGame();
            }
        }
    }
}

document.getElementById('open-map-btn').onclick = () => switchTab('map-selection-tab');

function updateUI() {
    // Map Stage Buttons
    document.querySelectorAll('.stage-btn').forEach(btn => {
        const stageId = btn.getAttribute('data-stage');

        // クリアバッジ処理
        const existingBadge = btn.querySelector('.clear-badge');
        if (state.clearedStages.includes(stageId)) {
            if (!existingBadge) {
                const badge = document.createElement('span');
                badge.className = 'clear-badge';
                badge.innerText = 'CLEAR!';
                btn.appendChild(badge);
            }
            btn.classList.add('cleared');
        } else {
            if (existingBadge) existingBadge.remove();
            btn.classList.remove('cleared');
        }

        if (state.unlockedStages.includes(stageId)) {
            btn.disabled = false;
            btn.style.opacity = "1";
        } else {
            btn.disabled = true;
            btn.style.opacity = "0.4";
        }
    });

    const displayTotal = Math.floor(state.virusTotal);
    virusCountDisplay.innerText = `撃退数: ${displayTotal}`;
    antibodyDisplay.innerText = `抗体ポイント: ${Math.floor(state.antibodyPoints)}`;

    virusTotalCounts.forEach(el => el.innerText = displayTotal);
    antibodyCounts.forEach(el => el.innerText = Math.floor(state.antibodyPoints));

    atkLvDisplay.innerText = state.atkLv;
    sizeLvDisplay.innerText = state.sizeLv;
    hpLvDisplay.innerText = state.hpLv;
    resLvDisplay.innerText = state.resLv;
    alphaLvDisplay.innerText = state.alphaLv;

    const atkCost = state.atkLv * 10;
    const sizeCost = state.sizeLv * 10;
    const hpCost = state.hpLv * 20;
    const resCost = state.resLv * 30;
    const alphaCost = 50 + state.alphaLv * 100;

    atkCostDisplay.innerText = atkCost;
    sizeCostDisplay.innerText = sizeCost;
    hpCostDisplay.innerText = hpCost;

    document.getElementById('upgrade-atk').disabled = state.antibodyPoints < atkCost;
    document.getElementById('upgrade-size').disabled = state.antibodyPoints < sizeCost;
    document.getElementById('upgrade-hp').disabled = state.antibodyPoints < hpCost;

    const resBtn = document.getElementById('upgrade-res');
    if (state.resLv >= 5) { resBtn.innerText = 'MAX'; resBtn.disabled = true; }
    else { resBtn.innerText = `強化 (コスト: ${resCost})`; resBtn.disabled = state.antibodyPoints < resCost; }

    const alphaBtn = document.getElementById('upgrade-alpha');
    if (state.alphaLv >= 3) { alphaBtn.innerText = 'MAX'; alphaBtn.disabled = true; }
    else { alphaBtn.innerText = `強化 (コスト: ${alphaCost})`; alphaBtn.disabled = state.antibodyPoints < alphaCost; }

    statAtkDisplay.innerText = 10 + (state.atkLv - 1) * 5;
    statHpDisplay.innerText = state.maxHp;
    statMoneyDisplay.innerText = state.money;
    statFragmentsDisplay.innerText = state.fragments;

    if (statMoneyHudDisplay) statMoneyHudDisplay.innerText = state.money;
    if (statFragmentsHudDisplay) statFragmentsHudDisplay.innerText = state.fragments;

    if (state.isResearching) {
        const percent = state.researchTarget > 0 ? (state.researchProgress / state.researchTarget) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        labBtn.classList.add('researching');
    } else {
        progressBar.style.width = '0%';
        labBtn.classList.remove('researching');
    }
    researchTargetDisplay.innerText = state.researchTarget;

    // 精製UI更新
    if (state.isPurifying) {
        const percent = (state.purifyProgress / state.purifyTotalTimeSteps) * 100;
        purifyProgressBar.style.width = `${percent}%`;
        purifyLabBtn.classList.add('researching');
        btnPurifyStart.disabled = true;
        btnPurifyStart.innerText = '精製中...';
    } else {
        purifyProgressBar.style.width = '0%';
        purifyLabBtn.classList.remove('researching');
        btnPurifyStart.disabled = state.antibodyPoints < state.purifyTargetPoints || state.purifyTargetPoints <= 0;
        btnPurifyStart.innerText = '精製開始';
    }
    if (purifyTargetDisplay) purifyTargetDisplay.innerText = state.purifyTargetPoints;
    if (purifyTotalPointsDisplay) purifyTotalPointsDisplay.innerText = state.purifyTargetPoints;
    if (purifyTotalTimeDisplay) purifyTotalTimeDisplay.innerText = Math.ceil(state.purifyTargetPoints / state.purifyCostPerMedicine * state.purifyTimePerMedicine);

    document.getElementById('open-map-btn').style.display = state.isMapMode ? 'none' : 'block';

    // 治療タブ更新
    if (medicineCountDisplay) medicineCountDisplay.innerText = state.medicine;
    if (treatmentMoneyDisplay) treatmentMoneyDisplay.innerText = state.money;
    if (btnTreat) btnTreat.disabled = state.medicine <= 0;

    // ショップUI更新
    const shopMoneyDisplay = document.getElementById('shop-money-display');
    if (shopMoneyDisplay) shopMoneyDisplay.innerText = state.money;

    const btnBuyImmune = document.getElementById('btn-buy-immune');
    if (btnBuyImmune) btnBuyImmune.disabled = state.money < 500;

    const btnBuyDouble = document.getElementById('btn-buy-double');
    if (btnBuyDouble) btnBuyDouble.disabled = state.money < 500;

    const btnExchange = document.getElementById('btn-exchange-fragment');
    if (btnExchange) btnExchange.disabled = state.money < 100;

    // ブーストインジケーター（ゲーム画面用）
    updateBoostIndicators();
}

function updateBoostIndicators() {
    let boostContainer = document.getElementById('active-boosts');
    if (!boostContainer && state.activeTab === 'game-tab') {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            boostContainer = document.createElement('div');
            boostContainer.id = 'active-boosts';
            gameContainer.appendChild(boostContainer);
        }
    }
    if (boostContainer) {
        boostContainer.innerHTML = '';
        if (state.immuneAtkDownTimer > 0) {
            const tag = document.createElement('div');
            tag.className = 'active-boost-tag';
            tag.innerText = `🛡️ デバフ無効: ${Math.ceil(state.immuneAtkDownTimer)}s`;
            boostContainer.appendChild(tag);
        }
        if (state.doubleAtkTimer > 0) {
            const tag = document.createElement('div');
            tag.className = 'active-boost-tag';
            tag.innerText = `🔥 攻撃力3倍: ${Math.ceil(state.doubleAtkTimer)}s`;
            boostContainer.appendChild(tag);
        }
    }
}

// リセット機能
document.getElementById('reset-button').addEventListener('click', () => {
    if (confirm('リセットしますか？ すべてのセーブデータが消去されます。')) {
        state.virusTotal = 0; state.antibodyPoints = 0; state.money = 0; state.fragments = 0;
        state.medicine = 0;
        state.atkLv = 1; state.sizeLv = 1; state.hpLv = 1; state.resLv = 1; state.alphaLv = 0;
        state.maxHp = 50; state.hp = 50;
        state.isResearching = false; state.isMapMode = false;
        state.viruses = []; state.bullets = []; state.comboCount = 0;
        state.unlockedStages = ['map1-1'];
        state.lastClearedStage = null;
        state.clearedStages = [];
        state.clearedStages = [];
        state.stageClearCounts = {};
        state.skills = { attackBloom: false, hpBloom: false, specialBloom: false };
        state.paused = false;

        localStorage.removeItem("virusShooterSave");
        updateUI();
    }
});
// Upgrades
document.getElementById('upgrade-atk').onclick = () => {
    const cost = state.atkLv * 10;
    if (state.antibodyPoints >= cost) { state.antibodyPoints -= cost; state.atkLv++; updateUI(); saveGame(); }
};
document.getElementById('upgrade-size').onclick = () => {
    const cost = state.sizeLv * 10;
    if (state.antibodyPoints >= cost) { state.antibodyPoints -= cost; state.sizeLv++; updateUI(); saveGame(); }
};
document.getElementById('upgrade-hp').onclick = () => {
    const cost = state.hpLv * 20;
    if (state.antibodyPoints >= cost) {
        state.antibodyPoints -= cost;
        state.hpLv++;
        state.maxHp += 10;
        if (!state.isMapMode) state.hp = state.maxHp;
        updateUI();
        saveGame();
    }
}

// --- Skill Tree Logic ---
// --- Skill Tree Logic ---
function updateSkillTreeUI() {
    // Fragment Display
    const fragDisplay = document.getElementById('skill-fragment-display');
    if (fragDisplay) fragDisplay.innerText = state.fragments;

    // Nodes
    const nodes = {
        start: document.querySelector('.skill-node[data-skill="start"]'), // Add start
        attackBloom: document.querySelector('.skill-node[data-skill="attackBloom"]'),
        hpBloom: document.querySelector('.skill-node[data-skill="hpBloom"]'),
        specialBloom: document.querySelector('.skill-node[data-skill="specialBloom"]'),
    };

    // Check if start node is logically acquired (always yes)
    const canUnlock = state.fragments >= 50;

    for (const [key, el] of Object.entries(nodes)) {
        if (!el) continue;

        // Remove old listeners (clone node trick is rough but simple, or just re-assign)
        // For simplicity in this structure, we'll just set properties mostly, but event listeners stack.
        // Let's replace the element to clear listeners if needed, or just be careful.
        // Given the constraints, we will just overwrite onclick and add mouse events carefully.

        const data = SKILL_DATA[key];

        // Tooltip Events
        el.onmouseenter = (e) => showTooltip(e, data);
        el.onmousemove = (e) => moveTooltip(e);
        el.onmouseleave = (e) => hideTooltip();
        // Mobile touch support for tooltip (tap to show, second tap to act?)
        // For now, simple touchstart to show tooltip
        el.ontouchstart = (e) => {
            showTooltip(e.touches[0], data);
            // e.preventDefault(); // Might block click
        };

        // Reset classes
        el.classList.remove('locked', 'available', 'acquired');

        if (key === 'start' || state.skills[key]) {
            el.classList.add('acquired');
            el.onclick = null;
        } else {
            if (canUnlock) {
                el.classList.add('available');
                el.onclick = () => unlockSkill(key, data);
            } else {
                el.classList.add('locked');
                el.onclick = () => { /* No action or shake effect */ };
            }
        }
    }
}

// Tooltip Functions
function showTooltip(e, data) {
    const tooltip = document.getElementById('skill-tooltip');
    if (!tooltip) return;

    document.getElementById('tooltip-title').innerText = data.name;
    document.getElementById('tooltip-desc').innerText = data.desc;
    const costElem = document.getElementById('tooltip-cost');

    if (data.cost > 0) {
        costElem.style.display = 'block';
        costElem.innerText = `必要欠片: ${data.cost}`;
    } else {
        costElem.style.display = 'none';
    }

    tooltip.classList.remove('hidden');
    moveTooltip(e);
}

function moveTooltip(e) {
    const tooltip = document.getElementById('skill-tooltip');
    if (!tooltip) return;
    // Position above cursor
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = (e.clientY - 20) + 'px';
}

// --- Skill Tree Interaction (Pan & Zoom) ---
function initSkillTreeInteraction() {
    const viewport = document.getElementById('skill-tree-viewport');
    const content = document.getElementById('skill-tree-content');

    if (!viewport || !content) return;

    // Pan (Drag)
    viewport.addEventListener('mousedown', startDrag);
    viewport.addEventListener('touchstart', startDrag, { passive: false });

    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag, { passive: false });

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    // Zoom (Wheel)
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        if (e.deltaY < 0) {
            state.skillTree.scale = Math.min(state.skillTree.scale + zoomSpeed, 2.0);
        } else {
            state.skillTree.scale = Math.max(state.skillTree.scale - zoomSpeed, 0.5);
        }
        updateSkillTreeTransform();
    }, { passive: false });
}

function startDrag(e) {
    if (state.activeTab !== 'skill-tree-tab') return;

    state.skillTree.isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    state.skillTree.lastX = clientX;
    state.skillTree.lastY = clientY;
}

function drag(e) {
    if (!state.skillTree.isDragging) return;
    e.preventDefault(); // Stop scroll

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - state.skillTree.lastX;
    const dy = clientY - state.skillTree.lastY;

    state.skillTree.offsetX += dx;
    state.skillTree.offsetY += dy;

    state.skillTree.lastX = clientX;
    state.skillTree.lastY = clientY;

    updateSkillTreeTransform();
}

function endDrag() {
    state.skillTree.isDragging = false;
}

function updateSkillTreeTransform() {
    const content = document.getElementById('skill-tree-content');
    if (content) {
        content.style.transform = `translate(${state.skillTree.offsetX}px, ${state.skillTree.offsetY}px) scale(${state.skillTree.scale})`;
    }
}

// Ensure init is called
setTimeout(initSkillTreeInteraction, 1000);

// --- Skill Tree UI Logic ---
function updateSkillTreeUI() {
    // Fragment Display
    const fragDisplay = document.getElementById('skill-fragment-display');
    if (fragDisplay) fragDisplay.innerText = state.fragments;

    // Nodes
    const nodes = {
        start: document.querySelector('.skill-node[data-skill="start"]'),
        attackBloom: document.querySelector('.skill-node[data-skill="attackBloom"]'),
        hpBloom: document.querySelector('.skill-node[data-skill="hpBloom"]'),
        specialBloom: document.querySelector('.skill-node[data-skill="specialBloom"]'),
    };

    const canUnlock = state.fragments >= 50;

    for (const [key, el] of Object.entries(nodes)) {
        if (!el) continue;

        const data = SKILL_DATA[key];

        // Tooltip Events
        el.onmouseenter = (e) => showTooltip(e, data);
        el.onmousemove = (e) => moveTooltip(e);
        el.onmouseleave = (e) => hideTooltip();
        el.ontouchstart = (e) => {
            showTooltip(e.touches[0], data);
        };

        // Reset classes
        el.classList.remove('locked', 'available', 'acquired');

        if (key === 'start' || state.skills[key]) {
            el.classList.add('acquired');
            el.onclick = null;
        } else {
            if (canUnlock) {
                el.classList.add('available');
                el.onclick = () => unlockSkill(key, data);
            } else {
                el.classList.add('locked');
                el.onclick = () => { alert("欠片が足りません (必要: 50)"); };
            }
        }
    }
}

// Tooltip Functions
function showTooltip(e, data) {
    const tooltip = document.getElementById('skill-tooltip');
    if (!tooltip) return;

    document.getElementById('tooltip-title').innerText = data.name;
    document.getElementById('tooltip-desc').innerText = data.desc;
    const costElem = document.getElementById('tooltip-cost');

    if (data.cost > 0) {
        costElem.style.display = 'block';
        costElem.innerText = `必要欠片: ${data.cost}`;
    } else {
        costElem.style.display = 'none';
    }

    tooltip.classList.remove('hidden');
    moveTooltip(e);
}

function moveTooltip(e) {
    const tooltip = document.getElementById('skill-tooltip');
    if (!tooltip) return;
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = (e.clientY - 20) + 'px';
}


function hideTooltip() {
    const tooltip = document.getElementById('skill-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
}

// Hook updateSkillTreeUI into updateUI
const originalUpdateUI = updateUI;
updateUI = function () {
    originalUpdateUI();
    if (document.getElementById('skill-tree-tab').style.display !== 'none') {
        updateSkillTreeUI();
    }
}

function unlockSkill(skillId, data) {
    if (state.fragments >= data.cost && !state.skills[skillId]) {
        if (confirm(`${data.name} を開花させますか？\n(欠片 -${data.cost})`)) {
            state.fragments -= data.cost;
            state.skills[skillId] = true;
            createSparks(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "#ffd700");
            updateUI();
            saveGame();
            addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "開花！", "#fff", 40);
        }
    }
}

// --- Pause Logic ---
function togglePause() {
    state.paused = !state.paused;
    const overlay = document.getElementById('pause-overlay');
    if (state.paused) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        togglePause();
    }
});

const btnResume = document.getElementById('btn-resume');
if (btnResume) btnResume.onclick = togglePause;

const btnQuit = document.getElementById('btn-quit');
if (btnQuit) btnQuit.onclick = () => {
    saveGame();
    window.close(); // ブラウザの設定によっては閉じない場合があるが、仕様通り実装
    // 万が一閉じない場合のフォールバック（画面遷移など）は今回はしない
    alert("セーブしました。ウィンドウを閉じて終了してください。");
};
;
document.getElementById('upgrade-res').onclick = () => {
    if (state.resLv >= 5) return;
    const cost = state.resLv * 30;
    if (state.antibodyPoints >= cost) { state.antibodyPoints -= cost; state.resLv++; updateUI(); saveGame(); }
};
document.getElementById('upgrade-alpha').onclick = () => {
    if (state.alphaLv >= 3) return;
    const cost = 50 + state.alphaLv * 100;
    if (state.antibodyPoints >= cost) { state.antibodyPoints -= cost; state.alphaLv++; updateUI(); saveGame(); }
};

// Research
function adjustResearchTarget(amount) {
    if (state.isResearching) return;
    state.researchTarget = Math.max(0, Math.min(Math.floor(state.virusTotal), state.researchTarget + amount));
    updateUI();
}
document.getElementById('btn-plus').onclick = () => adjustResearchTarget(1);
document.getElementById('btn-minus').onclick = () => adjustResearchTarget(-1);
document.getElementById('btn-plus-10').onclick = () => adjustResearchTarget(10);
document.getElementById('btn-minus-10').onclick = () => adjustResearchTarget(-10);
document.getElementById('btn-plus-100').onclick = () => adjustResearchTarget(100);
document.getElementById('btn-minus-100').onclick = () => adjustResearchTarget(-100);
labBtn.onclick = () => {
    if (!state.isResearching && state.researchTarget > 0) {
        state.isResearching = true;
        state.researchProgress = 0;
        updateUI();
    }
};

window.startPurification = function () {
    if (!state.isPurifying && state.purifyTargetPoints >= state.purifyCostPerMedicine && state.antibodyPoints >= state.purifyTargetPoints) {
        state.antibodyPoints -= state.purifyTargetPoints;
        state.isPurifying = true;
        state.purifyProgress = 0;
        // 時間を計算 (30ptごとに30秒)
        const totalSeconds = (state.purifyTargetPoints / state.purifyCostPerMedicine) * state.purifyTimePerMedicine;
        state.purifyTotalTimeSteps = totalSeconds * 60;
        updateUI();
    }
};

function adjustPurifyTarget(amount) {
    if (state.isPurifying) return;
    // 30の倍数で調整
    let change = amount;
    if (Math.abs(amount) === 1) change = amount * 30;
    else if (Math.abs(amount) === 10) change = amount / 10 * 300;
    else if (Math.abs(amount) === 100) change = amount / 100 * 3000;

    state.purifyTargetPoints = Math.max(30, state.purifyTargetPoints + change);
    // 30の倍数に丸める
    state.purifyTargetPoints = Math.floor(state.purifyTargetPoints / 30) * 30;
    if (state.purifyTargetPoints < 30) state.purifyTargetPoints = 30;
    updateUI();
}

if (btnPurifyStart) btnPurifyStart.onclick = window.startPurification;
if (purifyLabBtn) purifyLabBtn.onclick = window.startPurification;

document.getElementById('btn-purify-plus').onclick = () => adjustPurifyTarget(1);
document.getElementById('btn-purify-minus').onclick = () => adjustPurifyTarget(-1);
document.getElementById('btn-purify-plus-10').onclick = () => adjustPurifyTarget(10);
document.getElementById('btn-purify-minus-10').onclick = () => adjustPurifyTarget(-10);
document.getElementById('btn-purify-plus-100').onclick = () => adjustPurifyTarget(100);
document.getElementById('btn-purify-minus-100').onclick = () => adjustPurifyTarget(-100);

// --- Shop Logic ---
function buyBoost(type) {
    if (state.money < 500) return;
    state.money -= 500;
    if (type === 'immune') {
        state.immuneAtkDownTimer = 60;
        addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "攻撃低下無効 発動！", "#ffd700", 30);
    } else if (type === 'double') {
        state.doubleAtkTimer = 60;
        addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "攻撃力3倍 発動！", "#ff4500", 30);
    }
    updateUI();
    saveGame();
}

const btnBuyImmune = document.getElementById('btn-buy-immune');
if (btnBuyImmune) btnBuyImmune.onclick = () => buyBoost('immune');
const btnBuyDouble = document.getElementById('btn-buy-double');
if (btnBuyDouble) btnBuyDouble.onclick = () => buyBoost('double');

document.getElementById('btn-exchange-fragment').onclick = () => {
    if (state.money < 100) return;
    state.money -= 100;
    state.fragments += 1;
    createSparks(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "#ffd700");
    addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 30, "欠片 +1", "#ffd700", 24);
    updateUI();
    saveGame();
};

// --- Game Logic ---

function createSparks(x, y, color = null) {
    for (let i = 0; i < 15; i++) {
        state.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 30, color: color || `hsl(${Math.random() * 60 + 20}, 100%, 50%)` });
    }
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function addFloatingText(x, y, text, color = '#fff', size = 20) {
    state.comboEffects.push({ x, y, text, color, size, alpha: 1.0, life: 60 });
}

function spawnVirus(timestamp) {
    if (state.activeTab !== 'game-tab') return;

    // ボス戦中は雑魚敵を出さない (二重チェック)
    if (state.isMapMode && (state.currentStageId === 'map1-boss' || state.currentStageId === 'map2-boss')) return;

    // マップ2の同時出現数制限 (2体まで)
    if (state.currentStageId && state.currentStageId.startsWith('map2') && state.viruses.length >= 2) return;

    if (timestamp - state.lastVirusSpawn > state.spawnInterval) {
        // Bug Fix: 以前は state.killCountInSession を使っていたが、通常モードでリセットされないことがあった
        // 確率制
        let isStrong = Math.random() < 0.15;
        if (state.currentStageId && state.currentStageId.startsWith('map2')) {
            isStrong = Math.random() < 0.3; // マップ2は30%
        } else if (state.isMapMode && state.currentStageName.indexOf("マップ①") !== -1) {
            isStrong = false;
        }

        // ノルマに応じて落下スピードアップ (100% -> 200%)
        let speedBoost = 1.0;
        if (state.isMapMode) {
            const progress = state.mapKills / state.mapQuota;
            speedBoost = 1.0 + progress; // 0%なら1.0, 100%なら2.0
        }

        state.viruses.push({
            x: Math.random() * (SCREEN_WIDTH - 50),
            y: -60,
            width: isStrong ? 60 : 50,
            height: isStrong ? 60 : 50,
            isStrong: isStrong,
            hp: (isStrong ? 100 : 10) * (state.currentStageId && state.currentStageId.startsWith('map2') ? 1.3 : 1.0),
            maxHp: (isStrong ? 100 : 10) * (state.currentStageId && state.currentStageId.startsWith('map2') ? 1.3 : 1.0),
            speed: 2.5 * speedBoost,
            lastAITime: timestamp,
            targetSlide: 0
        });
        state.lastVirusSpawn = timestamp;
    }
}

function updateBoss(timestamp) {
    const boss = state.boss;

    // 勝利判定
    if (boss.hp <= 0) {
        state.mapKills = 1;
        state.boss = null;
        showRewardScreen();
        return;
    }

    // 敗北条件：下端到達
    if (boss.y + boss.height >= SCREEN_HEIGHT - 100) {
        state.hp = 0;
        checkGameState();
        return;
    }

    // 無敵状態管理（フェーズ移行）
    if (boss.invulnerable) {
        boss.invulnerableTimer--;
        if (boss.y > 50) boss.y -= 5;
        if (boss.invulnerableTimer <= 0 && boss.y <= 50) {
            boss.invulnerable = false;
            if (state.currentStageId === 'map2-boss') {
                boss.attackState = 'idle';
                boss.attackTimer = 0;
            }
        }
        return;
    }

    // --- Map 1 Boss AI ---
    if (state.currentStageId === 'map1-boss') {
        if (timestamp - boss.actionTimer > 500) {
            const action = Math.random();
            if (action < 0.4) {
                const moveX = (Math.random() - 0.5) * 60;
                boss.x = Math.max(0, Math.min(SCREEN_WIDTH - boss.width, boss.x + moveX));
                boss.y += 3;
            } else if (action < 0.8) {
                const dx = (state.player.x + state.player.width / 2) - (boss.x + boss.width / 2);
                const dy = (state.player.y + state.player.height / 2) - (boss.y + boss.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = 4;
                boss.bullets.push({
                    x: boss.x + boss.width / 2 - 10,
                    y: boss.y + boss.height,
                    vx: (dx / dist) * speed,
                    vy: (dy / dist) * speed,
                    width: 20,
                    height: 20
                });
            }
            boss.actionTimer = timestamp;
        }
    }
    // --- Map 2 Boss AI ---
    else if (state.currentStageId === 'map2-boss') {
        switch (boss.attackState) {
            case 'idle':
                if (Math.random() < 0.1) {
                    const moveX = (Math.random() - 0.5) * 40;
                    boss.x = Math.max(0, Math.min(SCREEN_WIDTH - boss.width, boss.x + moveX));
                }

                if (timestamp - boss.actionTimer > 2000) {
                    boss.actionTimer = timestamp;

                    if (Math.random() < 0.5) {
                        boss.attackState = 'warning';
                        boss.attackTimer = 90;
                        boss.attackTargetX = state.player.x + state.player.width / 2;
                        const multiplier = boss.phase + 1;
                        boss.attackWidth = state.player.width * multiplier;
                        addFloatingText(boss.x + boss.width / 2, boss.y, "LOCK ON!", "#ff0000", 20);
                    } else {
                        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
                        const speed = 5;
                        const cx = boss.x + boss.width / 2;
                        const cy = boss.y + boss.height / 2;

                        for (const angle of angles) {
                            const rad = angle * Math.PI / 180;
                            boss.bullets.push({
                                x: cx - 10,
                                y: cy - 10,
                                vx: Math.cos(rad) * speed,
                                vy: Math.sin(rad) * speed,
                                width: 20,
                                height: 20
                            });
                        }
                        addFloatingText(boss.x + boss.width / 2, boss.y, "BURST!", "#ff4500", 20);
                    }
                }
                break;

            case 'warning':
                boss.attackTimer--;
                if (boss.attackTimer <= 0) {
                    boss.attackState = 'firing';
                    boss.attackTimer = 30;
                }
                break;

            case 'firing':
                boss.attackTimer--;
                const px = state.player.x + state.player.width / 2;
                const bx = boss.attackTargetX - boss.attackWidth / 2;
                if (px >= bx && px <= bx + boss.attackWidth) {
                    if (boss.attackTimer === 29) {
                        state.hp -= 10;
                        addFloatingText(state.player.x + state.player.width / 2, state.player.y, "-10 HP", "red", 30);
                        checkGameState();
                    }
                }

                if (boss.attackTimer <= 0) {
                    boss.attackState = 'cooldown';
                    boss.attackTimer = 60;
                }
                break;

            case 'cooldown':
                boss.attackTimer--;
                if (boss.attackTimer <= 0) {
                    boss.attackState = 'idle';
                    boss.actionTimer = timestamp;
                }
                break;
        }
    }

    // ボス弾の更新
    for (let i = boss.bullets.length - 1; i >= 0; i--) {
        const b = boss.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (checkCollision({ x: b.x, y: b.y, width: b.width, height: b.height }, state.player)) {
            state.hp -= 10;
            addFloatingText(state.player.x + state.player.width / 2, state.player.y, "-10 HP", "red", 24);
            boss.bullets.splice(i, 1);
            checkGameState();
            continue;
        }

        if (b.y > SCREEN_HEIGHT || b.x < 0 || b.x > SCREEN_WIDTH) {
            boss.bullets.splice(i, 1);
        }
    }

    // プレイヤー弾との当たり判定
    for (let j = state.bullets.length - 1; j >= 0; j--) {
        const b = state.bullets[j];
        if (checkCollision({ x: boss.x, y: boss.y, width: boss.width, height: boss.height }, b)) {
            boss.hp -= b.damage;
            createSparks(b.x, b.y);
            addFloatingText(boss.x + boss.width / 2, boss.y + boss.height / 2, `-${b.damage}`, "#ff4757", 20);
            state.bullets.splice(j, 1);

            const phaseThreshold = boss.maxHp * (1 - boss.phase / 3);
            if (boss.hp <= phaseThreshold && boss.phase < 3) {
                boss.phase++;
                boss.invulnerable = true;
                boss.invulnerableTimer = 180;
                addFloatingText(boss.x + boss.width / 2, boss.y, "PHASE CHANGE!", "#f1c40f", 30);
                boss.y = 50;
            }
        }
    }
}

function updateGame(timestamp) {
    if (state.activeTab !== 'game-tab') return;
    if (state.paused) return; // PAUSED

    // ボス Logic

    // ボス Logic
    if (state.isMapMode && (state.currentStageId === 'map1-boss' || state.currentStageId === 'map2-boss') && state.boss) {
        updateBoss(timestamp);
    }

    let currentAtkMultiplier = 1.0;
    state.activeDebuffs = state.activeDebuffs.filter(d => d.endTime > timestamp);
    for (const d of state.activeDebuffs) currentAtkMultiplier *= d.multiplier;

    const baseAtk = 10 + (state.atkLv - 1) * 5;
    let finalAtk = Math.max(1, Math.floor(baseAtk * currentAtkMultiplier));

    // 攻撃力3倍ブースト
    if (state.doubleAtkTimer > 0) {
        finalAtk *= 3;
    }

    if (keys.ArrowLeft && state.player.x > 0) state.player.x -= state.player.speed;
    if (keys.ArrowRight && state.player.x < SCREEN_WIDTH - state.player.width) state.player.x += state.player.speed;

    if (keys.Space && !spaceKeyPrev) {
        const bulletWidth = 24 + (state.sizeLv - 1) * 8;
        state.bullets.push({ x: state.player.x + state.player.width / 2 - bulletWidth / 2, y: state.player.y, width: bulletWidth, height: 24, damage: finalAtk });
    }
    spaceKeyPrev = keys.Space;

    for (let i = state.bullets.length - 1; i >= 0; i--) {
        state.bullets[i].y -= 10;
        if (state.bullets[i].y < -30) { state.bullets.splice(i, 1); state.comboCount = 0; }
    }




    function updateBoss(timestamp) {
        const boss = state.boss;

        // 勝利判定
        if (boss.hp <= 0) {
            state.mapKills = 1; // ノルマ達成扱い
            state.boss = null; // ボス消去
            showRewardScreen();
            return;
        }

        // 敗北条件：下端到達
        if (boss.y + boss.height >= SCREEN_HEIGHT - 100) {
            state.hp = 0;
            checkGameState();
            return;
        }

        // 無敵状態管理（フェーズ移行）
        if (boss.invulnerable) {
            boss.invulnerableTimer--;
            // 上に戻る動き (Map2ボスは攻撃中動かないので無視、あるいはリセット)
            if (boss.y > 50) boss.y -= 5;
            if (boss.invulnerableTimer <= 0 && boss.y <= 50) {
                boss.invulnerable = false;
                // フェーズ移行時に攻撃ステートもリセット
                if (state.currentStageId === 'map2-boss') {
                    boss.attackState = 'idle';
                    boss.attackTimer = 0;
                }
            }
            return; // 無敵中は攻撃しない
        }

        // --- Map 1 Boss AI ---
        if (state.currentStageId === 'map1-boss') {
            if (timestamp - boss.actionTimer > 500) {
                const action = Math.random();
                if (action < 0.4) {
                    // 移動 (左右 + 少し下へ)
                    const moveX = (Math.random() - 0.5) * 60;
                    boss.x = Math.max(0, Math.min(SCREEN_WIDTH - boss.width, boss.x + moveX));
                    boss.y += 3; // 強化: 2 -> 3 (1.5倍)
                } else if (action < 0.8) {
                    // 弾発射 (プレイヤー狙い直線弾)
                    const dx = (state.player.x + state.player.width / 2) - (boss.x + boss.width / 2);
                    const dy = (state.player.y + state.player.height / 2) - (boss.y + boss.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const speed = 4;
                    boss.bullets.push({
                        x: boss.x + boss.width / 2 - 10,
                        y: boss.y + boss.height,
                        vx: (dx / dist) * speed,
                        vy: (dy / dist) * speed,
                        width: 20,
                        height: 20
                    });
                }
                // 残り0.2は待機
                boss.actionTimer = timestamp;
            }
        }
        // --- Map 2 Boss AI (Special Attack) ---
        else if (state.currentStageId === 'map2-boss') {
            switch (boss.attackState) {
                case 'idle':
                    // 通常移動 (Map1より少し大人しめ)
                    if (Math.random() < 0.1) {
                        const moveX = (Math.random() - 0.5) * 40;
                        boss.x = Math.max(0, Math.min(SCREEN_WIDTH - boss.width, boss.x + moveX));
                    }

                    // 攻撃開始判定 (一定間隔)
                    if (timestamp - boss.actionTimer > 2000) { // 2秒ごとに攻撃チャンス
                        boss.actionTimer = timestamp;

                        if (Math.random() < 0.5) {
                            // A: ロックオンビーム
                            boss.attackState = 'warning';
                            boss.attackTimer = 90; // 1.5秒警告

                            // ターゲット設定
                            boss.attackTargetX = state.player.x + state.player.width / 2;

                            // フェーズごとの幅: 2倍, 3倍, 4倍
                            const multiplier = boss.phase + 1;
                            boss.attackWidth = state.player.width * multiplier;

                            addFloatingText(boss.x + boss.width / 2, boss.y, "LOCK ON!", "#ff0000", 20);
                        } else {
                            // B: 8方向弾発射 (New)
                            const angles = [0, 45, 90, 135, 180, 225, 270, 315];
                            const speed = 5;
                            const cx = boss.x + boss.width / 2;
                            const cy = boss.y + boss.height / 2;

                            for (const angle of angles) {
                                const rad = angle * Math.PI / 180;
                                boss.bullets.push({
                                    x: cx - 10,
                                    y: cy - 10,
                                    vx: Math.cos(rad) * speed,
                                    vy: Math.sin(rad) * speed,
                                    width: 20,
                                    height: 20
                                });
                            }

                            // 発射後すぐにクールダウンへ
                            boss.attackState = 'cooldown';
                            boss.attackTimer = 45; // 0.75秒クールダウン
                            addFloatingText(boss.x + boss.width / 2, boss.y, "BURST!", "#ff4500", 20);
                        }
                    }
                    break;

                case 'warning':
                    // 警告中は動かない
                    boss.attackTimer--;
                    if (boss.attackTimer <= 0) {
                        boss.attackState = 'firing';
                        boss.attackTimer = 30; // 0.5秒照射
                        boss.hasHitPlayer = false; // ヒット判定リセット
                        // 発射エフェクト（画面揺れなど入れたいが今回はシンプルに）
                        createSparks(boss.attackTargetX, boss.y + boss.height, "#ff0000");
                    }
                    break;

                case 'firing':
                    boss.attackTimer--;

                    // 当たり判定 (Rect vs Rect)
                    // ビーム領域: x = targetX - width/2, y = 0 (or boss.y), w = width, h = SCREEN_HEIGHT
                    const beamRect = {
                        x: boss.attackTargetX - boss.attackWidth / 2,
                        y: 0,
                        width: boss.attackWidth,
                        height: SCREEN_HEIGHT
                    };

                    if (!boss.hasHitPlayer && checkCollision(beamRect, state.player)) {
                        state.hp -= 10;
                        addFloatingText(state.player.x + state.player.width / 2, state.player.y, "-10 HP", "red", 30);
                        boss.hasHitPlayer = true; // 1回の攻撃で1回だけヒット
                        checkGameState();
                    }

                    if (boss.attackTimer <= 0) {
                        boss.attackState = 'cooldown';
                        boss.attackTimer = 60; // 1秒クールダウン
                    }
                    break;

                case 'cooldown':
                    boss.attackTimer--;
                    if (boss.attackTimer <= 0) {
                        boss.attackState = 'idle';
                        boss.actionTimer = timestamp; // 次の攻撃までのタイマーリセット
                    }
                    break;
            }
        }

        // ボス弾の更新
        for (let i = boss.bullets.length - 1; i >= 0; i--) {
            const b = boss.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // 当たり判定
            if (checkCollision({ x: b.x, y: b.y, width: b.width, height: b.height }, state.player)) {
                state.hp -= 10;
                addFloatingText(state.player.x + state.player.width / 2, state.player.y, "-10 HP", "red", 24);
                boss.bullets.splice(i, 1);
                checkGameState();
                continue;
            }

            if (b.y > SCREEN_HEIGHT || b.x < 0 || b.x > SCREEN_WIDTH) {
                boss.bullets.splice(i, 1);
            }
        }

        // プレイヤー弾との当たり判定
        for (let j = state.bullets.length - 1; j >= 0; j--) {
            const b = state.bullets[j];
            if (checkCollision({ x: boss.x, y: boss.y, width: boss.width, height: boss.height }, b)) {
                boss.hp -= b.damage;
                createSparks(b.x, b.y);
                addFloatingText(boss.x + boss.width / 2, boss.y + boss.height / 2, `-${b.damage}`, "#ff4757", 20);
                state.bullets.splice(j, 1);

                // フェーズ移行判定
                const phaseThreshold = boss.maxHp * (1 - boss.phase / 3); // 200, 100
                if (boss.hp <= phaseThreshold && boss.phase < 3) {
                    boss.phase++;
                    boss.invulnerable = true;
                    boss.invulnerableTimer = 180; // 3秒
                    addFloatingText(boss.x + boss.width / 2, boss.y, "PHASE CHANGE!", "#f1c40f", 30);

                    // 強制的に上へ戻す目標設定
                    boss.y = 50;
                }
            }
        }
    }


    // --- Virus Logic ---

    for (let i = state.viruses.length - 1; i >= 0; i--) {
        const v = state.viruses[i];
        if (timestamp - v.lastAITime > 500) {
            v.targetSlide = Math.random() < 0.5 ? (Math.random() < 0.5 ? -20 : 20) : 0;
            v.lastAITime = timestamp;
        }
        if (v.targetSlide !== 0) {
            const step = v.targetSlide > 0 ? 2 : -2;
            v.x += step; v.targetSlide -= step;
            if (v.x < 0) { v.x = 0; v.targetSlide = 0; }
            if (v.x > SCREEN_WIDTH - v.width) { v.x = SCREEN_WIDTH - v.width; v.targetSlide = 0; }
        }
        v.y += v.speed;

        if (checkCollision(v, state.player)) {
            if (state.isMapMode) {
                state.hp -= 10;
                addFloatingText(state.player.x + state.player.width / 2, state.player.y, "-10 HP", "red", 30);
            } else {
                // 攻撃低下無効ブーストチェック
                if (state.immuneAtkDownTimer > 0) {
                    addFloatingText(state.player.x + state.player.width / 2, state.player.y, "BLOCK!", "#ffd700", 20);
                } else {
                    state.activeDebuffs.push({ multiplier: v.isStrong ? 0.5 : 0.8, endTime: timestamp + 3000 });
                }
            }
            state.viruses.splice(i, 1);
            state.comboCount = 0;
            checkGameState();
            continue;
        }

        if (v.y > SCREEN_HEIGHT) {
            if (state.isMapMode) {
                state.hp -= 5;
                addFloatingText(v.x + v.width / 2, SCREEN_HEIGHT - 30, "-5 HP", "orange", 24);
            }
            state.viruses.splice(i, 1);
            state.comboCount = 0;
            checkGameState();
            continue;
        }

        for (let j = state.bullets.length - 1; j >= 0; j--) {
            const b = state.bullets[j];
            if (checkCollision(v, b)) {
                if (v.isStrong) {
                    const chances = [0.2, 0.4, 0.75, 1.0];
                    if (Math.random() > (chances[state.alphaLv] || 0.2)) {
                        addFloatingText(v.x + v.width / 2, v.y, "MISS", "#ccc", 16);
                        state.bullets.splice(j, 1);
                        break;
                    }
                }
                v.hp -= b.damage;
                createSparks(v.x + v.width / 2, v.y + v.height / 2);
                addFloatingText(v.x + v.width / 2, v.y, `-${b.damage}`, '#ff4757', 18);
                if (v.hp <= 0) {
                    state.comboCount++;
                    // α種なら固定5個、通常種ならコンボ数加算
                    const virusGain = v.isStrong ? 5 : state.comboCount;
                    state.virusTotal += virusGain;
                    if (state.isMapMode) state.mapKills++;
                    state.killCountInSession++;
                    createSparks(v.x + v.width / 2, v.y + v.height / 2, '#f1c40f');
                    if (state.comboCount > 1) addFloatingText(v.x + v.width / 2, v.y - 30, `${state.comboCount}連鎖！`, '#f1c40f', 24);
                    state.viruses.splice(i, 1);
                    checkGameState();
                }
                state.bullets.splice(j, 1);
                break;
            }
        }
    } // This '}' was the problematic one. It closed the for loop, but the code after it was still intended for updateGame.

    if (state.mapFadeTimer > 0) state.mapFadeTimer--;

    for (let i = state.comboEffects.length - 1; i >= 0; i--) {
        state.comboEffects[i].y -= 0.8;
        state.comboEffects[i].life--;
        state.comboEffects[i].alpha = state.comboEffects[i].life / 60;
        if (state.comboEffects[i].life <= 0) state.comboEffects.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    spawnVirus(timestamp);

    // ブーストタイマー更新 (60fps想定で1/60ずつ減算)
    if (state.immuneAtkDownTimer > 0) state.immuneAtkDownTimer = Math.max(0, state.immuneAtkDownTimer - 1 / 60);
    if (state.doubleAtkTimer > 0) state.doubleAtkTimer = Math.max(0, state.doubleAtkTimer - 1 / 60);

    if (state.activeTab === 'game-tab') updateBoostIndicators();
} // This '}' now correctly closes the updateGame function.

function checkGameState() {
    if (!state.isMapMode) return;

    // 敗北判定
    if (state.hp <= 0) {
        alert("敗北しました...\n通常モードに戻ります。");
        state.isMapMode = false;
        state.hp = state.maxHp;
        updateUI();
        return;
    }

    // 勝利判定
    // ボス戦の場合は、ここでのノルマ判定を行わない (updateBoss関数でのみ勝利判定)
    if (!state.currentStageId.endsWith('boss')) {
        if (state.mapKills >= state.mapQuota) {
            showRewardScreen();
        }
    }
}

function showRewardScreen() {
    state.isMapMode = false;
    state.lastClearedStage = state.currentStageId;
    if (!state.clearedStages.includes(state.currentStageId)) {
        state.clearedStages.push(state.currentStageId);
    }
    checkStageUnlocks();

    // クリア回数の更新
    if (!state.stageClearCounts[state.currentStageId]) {
        state.stageClearCounts[state.currentStageId] = 0;
    }
    state.stageClearCounts[state.currentStageId]++;

    const clearCount = state.stageClearCounts[state.currentStageId];
    // 減衰率: (クリア回数 - 1) * 5%. 初回(1回目)は0%減、2回目は5%減...
    let decayRate = (clearCount - 1) * 0.05;
    decayRate = Math.min(0.9, decayRate); // 最大90%減まで（一応の下限）
    const multiplier = Math.max(0.1, 1.0 - decayRate);

    // 基本報酬
    let baseVirus = 20 + Math.floor(Math.random() * 10);
    let baseFragments = 1 + Math.floor(Math.random() * 2);
    let baseMoney = 100 + Math.floor(Math.random() * 50);

    // マップ2の報酬補正 (1.1倍)
    if (state.currentStageId.startsWith('map2')) {
        const map2Multiplier = 1.1;
        baseVirus *= map2Multiplier;
        baseFragments *= map2Multiplier;
        baseMoney *= map2Multiplier;
    }

    const rewards = {
        virus: Math.floor(baseVirus * multiplier),
        fragments: Math.floor(baseFragments * multiplier),
        money: Math.floor(baseMoney * multiplier)
    };

    // UI Reset
    document.querySelectorAll('.reward-item').forEach(item => item.classList.remove('show'));
    const unlockMsg = document.getElementById('reward-unlock-msg');
    if (unlockMsg) unlockMsg.classList.remove('show');
    document.getElementById('reward-close-btn').classList.add('hidden');

    switchTab('reward-tab');

    // Sequence Animations
    setTimeout(() => {
        const vItem = document.getElementById('reward-virus');
        vItem.querySelector('.reward-value').innerText = `+${rewards.virus}`;
        vItem.classList.add('show');
        state.virusTotal += rewards.virus;
    }, 500);

    setTimeout(() => {
        const fItem = document.getElementById('reward-fragments');
        fItem.querySelector('.reward-value').innerText = `+${rewards.fragments}`;
        fItem.classList.add('show');
        state.fragments += rewards.fragments;
    }, 1200);

    setTimeout(() => {
        const mItem = document.getElementById('reward-money');
        mItem.querySelector('.reward-value').innerText = `+${rewards.money}`;
        mItem.classList.add('show');
        state.money += rewards.money;

        // 1-3クリア時演出
        if (state.currentStageId === 'map1-3') {
            const msg = document.getElementById('reward-unlock-msg');
            if (msg) {
                msg.innerText = "⚠️ BOSS STAGE UNLOCKED! ⚠️";
                setTimeout(() => msg.classList.add('show'), 500);
            }
        }
        // マップ2解放演出 (1-BOSSクリア時)
        if (state.currentStageId === 'map1-boss') {
            const msg = document.getElementById('reward-unlock-msg');
            if (msg) {
                msg.innerText = "⚠️ MAP 2 UNLOCKED! ⚠️";
                setTimeout(() => msg.classList.add('show'), 500);
            }
        }
    }, 1900);

    setTimeout(() => {
        document.getElementById('reward-close-btn').classList.remove('hidden');
        updateUI();
    }, 2600);
}

document.getElementById('reward-close-btn').onclick = () => {
    switchTab('map-selection-tab');
    saveGame();
};

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

// Research
let lastResearchTime = 0;
function processResearch(timestamp) {
    if (!state.isResearching) return;
    const interval = 500 / Math.pow(2, state.resLv - 1);
    if (timestamp - lastResearchTime > interval) {
        if (state.researchProgress < state.researchTarget && state.virusTotal >= 1) {
            state.researchProgress++;
            state.virusTotal--;
            state.antibodyPoints++;
            updateUI();
        } else {
            state.isResearching = false; state.researchTarget = 0; state.researchProgress = 0; updateUI();
        }
        lastResearchTime = timestamp;
    }
}

function processPurification() {
    if (!state.isPurifying) return;

    state.purifyProgress++;
    if (state.purifyProgress >= state.purifyTotalTimeSteps) {
        state.isPurifying = false;
        const medicineGained = Math.floor(state.purifyTargetPoints / state.purifyCostPerMedicine);
        state.purifyProgress = 0;
        state.medicine += medicineGained;
        addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, `精製完了！ 治療薬 +${medicineGained}`, "#f1c40f", 28);
        updateUI();
    }
    // 進捗バーは毎フレーム更新されるため updateUI を頻繁に呼ぶ必要はないが
    // 1秒ごと程度に更新するか、描画ループでバーを描画する方式が効率的。
    // ここでは簡略化のため描画のタイミングで進捗を反映させる。
}

function treatPatient() {
    if (state.medicine <= 0) return;

    state.medicine--;
    const reward = 100 + Math.floor(Math.random() * 101); // 100〜200円
    state.money += reward;

    // 演出
    if (hospitalImg) {
        hospitalImg.classList.remove('shake');
        void hospitalImg.offsetWidth; // reflow
        hospitalImg.classList.add('shake');
    }

    // お金ポップアップ
    const popup = document.createElement('div');
    popup.className = 'money-popup';
    popup.innerText = `+${reward}円`;
    treatmentEffectContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);

    // スパーク演出 (既存の関数を利用)
    const rect = hospitalImg.getBoundingClientRect();
    createSparks(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "#f1c40f");

    updateUI();
}

if (btnTreat) btnTreat.onclick = treatPatient;

function draw() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.drawImage(assets.bg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    for (const b of state.bullets) ctx.drawImage(assets.bullet, b.x, b.y, b.width, b.height);
    for (const v of state.viruses) {
        ctx.save();
        if (v.isStrong) {
            // α種強調：オーラ描画
            ctx.beginPath();
            ctx.arc(v.x + v.width / 2, v.y + v.height / 2, v.width / 2 + 5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 50, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.fill();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // フィルタも維持
            ctx.filter = 'hue-rotate(150deg) saturate(2)';
        }
        ctx.drawImage(assets.virus, v.x, v.y, v.width, v.height);
        ctx.restore();
        const barW = v.width * 0.8;
        ctx.fillStyle = '#333'; ctx.fillRect(v.x + (v.width - barW) / 2, v.y - 12, barW, 5);
        ctx.fillStyle = v.isStrong ? '#a55eea' : '#26de81';
        ctx.fillRect(v.x + (v.width - barW) / 2, v.y - 12, barW * (v.hp / v.maxHp), 5);
    }

    const p = state.player;
    if (state.activeDebuffs.length > 0) {
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.save(); ctx.filter = 'brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)';
            ctx.drawImage(assets.player, p.x, p.y, p.width, p.height); ctx.restore();
        } else ctx.drawImage(assets.player, p.x, p.y, p.width, p.height);
        ctx.strokeStyle = 'purple'; ctx.lineWidth = 2; ctx.strokeRect(p.x - 5, p.y - 5, p.width + 10, p.height + 10);
    } else ctx.drawImage(assets.player, p.x, p.y, p.width, p.height);

    // Boss 2 Special Attack Drawing (Draw OVER player)
    if (state.isMapMode && state.currentStageId === 'map2-boss' && state.boss) {
        const boss = state.boss;
        if (boss.attackState === 'warning') {
            // 警告ライン (赤点滅)
            const alpha = (Math.floor(Date.now() / 50) % 2 === 0) ? 0.3 : 0.1;
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            const bx = boss.attackTargetX - boss.attackWidth / 2;
            ctx.fillRect(bx, 0, boss.attackWidth, SCREEN_HEIGHT);

            // ガイド線
            ctx.strokeStyle = `rgba(255, 0, 0, 0.8)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, 0, boss.attackWidth, SCREEN_HEIGHT);

        } else if (boss.attackState === 'firing') {
            // ビーム (明滅)
            const intensity = (Math.floor(Date.now() / 20) % 2 === 0) ? 0.9 : 0.6;
            ctx.fillStyle = `rgba(255, 50, 50, ${intensity})`;
            const bx = boss.attackTargetX - boss.attackWidth / 2;
            ctx.fillRect(bx, 0, boss.attackWidth, SCREEN_HEIGHT);

            // コア
            ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
            ctx.fillRect(bx + boss.attackWidth / 4, 0, boss.attackWidth / 2, SCREEN_HEIGHT);
        }
    }

    for (const p of state.particles) { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 30; ctx.fillRect(p.x, p.y, 3, 3); }
    ctx.globalAlpha = 1;

    ctx.save(); ctx.textAlign = 'center';
    for (const ef of state.comboEffects) {
        ctx.globalAlpha = ef.alpha; ctx.font = `900 ${ef.size}px "Inter", sans-serif`; ctx.fillStyle = ef.color;
        ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(ef.text, ef.x, ef.y); ctx.fillText(ef.text, ef.x, ef.y);
    }
    ctx.restore();

    if (state.isMapMode) {
        ctx.save();
        ctx.font = '900 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 4;
        const quotaText = `${state.mapKills} / ${state.mapQuota}`;
        ctx.strokeText(quotaText, SCREEN_WIDTH / 2, 50);
        ctx.fillText(quotaText, SCREEN_WIDTH / 2, 50);

        const hpBarW = 300;
        const hpBarH = 20;
        const hpX = (SCREEN_WIDTH - hpBarW) / 2;
        const hpY = SCREEN_HEIGHT - 25; // さらに下げる (以前は -40)
        const hpRatio = state.hp / state.maxHp;
        ctx.fillStyle = '#222'; ctx.fillRect(hpX, hpY, hpBarW, hpBarH);

        let barColor = '#2ecc71';
        if (hpRatio <= 0.3) {
            barColor = (Math.floor(Date.now() / 200) % 2 === 0) ? '#e74c3c' : '#c0392b';
        } else if (hpRatio <= 0.5) {
            barColor = '#f1c40f';
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = 'white'; ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);
        ctx.restore();

        if (state.mapFadeTimer > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, state.mapFadeTimer / 60);
            ctx.font = '900 40px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
            ctx.strokeText(state.currentStageName, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
            ctx.fillText(state.currentStageName, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
            ctx.restore();
        }

        // ボス描画
        if ((state.currentStageId === 'map1-boss' || state.currentStageId === 'map2-boss') && state.boss) {
            const boss = state.boss;
            ctx.save();
            // 無敵中は点滅
            if (boss.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
            // 3倍サイズで描画 (assets.virusを使用)
            ctx.filter = 'hue-rotate(280deg) saturate(3)'; // 紫色のボス
            ctx.drawImage(assets.virus, boss.x, boss.y, boss.width, boss.height);
            ctx.filter = 'none'; // フィルタ解除 (念のため)
            ctx.restore();

            // ボス弾描画
            ctx.fillStyle = '#e74c3c';
            for (const b of boss.bullets) {
                ctx.beginPath();
                ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // ボスHPバー (画面上部)
            const bossBarW = SCREEN_WIDTH - 40;
            const bossBarH = 25;
            const bx = 20;
            const by = 80; // マップ名表示の下あたり

            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, bossBarW, bossBarH);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(bx, by, bossBarW * (boss.hp / boss.maxHp), bossBarH);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bossBarW, bossBarH);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`BOSS 1 (PHASE ${boss.phase})`, SCREEN_WIDTH / 2, by - 5);
        }
    }
}

function gameLoop(timestamp) {
    updateGame(timestamp);
    processResearch(timestamp);
    processPurification();
    if (state.activeTab === 'game-tab') draw();
    requestAnimationFrame(gameLoop);
}

// --- Save/Load System ---
function saveGame() {
    const saveData = {
        virusTotal: state.virusTotal,
        antibodyPoints: state.antibodyPoints,
        money: state.money,
        fragments: state.fragments,
        medicine: state.medicine,
        atkLv: state.atkLv,
        sizeLv: state.sizeLv,
        hpLv: state.hpLv,
        resLv: state.resLv,
        alphaLv: state.alphaLv,
        maxHp: state.maxHp,
        unlockedStages: state.unlockedStages,
        lastClearedStage: state.lastClearedStage,
        clearedStages: state.clearedStages,
        stageClearCounts: state.stageClearCounts,
        skills: state.skills,
        purifyTargetPoints: state.purifyTargetPoints
    };
    localStorage.setItem("virusShooterSave", JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem("virusShooterSave");
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
            if (key in state) state[key] = data[key];
        });

        // 移行用: 古いlastClearedStageがあればclearedStagesに追加
        if (state.lastClearedStage && !state.clearedStages.includes(state.lastClearedStage)) {
            state.clearedStages.push(state.lastClearedStage);

            // 下位のステージもクリア済みとみなす簡易補正（必要に応じて）
            const stages = ['map1-1', 'map1-2', 'map1-3', 'map1-boss'];
            const idx = stages.indexOf(state.lastClearedStage);
            for (let i = 0; i < idx; i++) {
                if (!state.clearedStages.includes(stages[i])) state.clearedStages.push(stages[i]);
            }
        }

        state.hp = state.maxHp;
        checkStageUnlocks(); // Fix: ロード時にステージ解放判定を行う
        updateUI();
    } catch (e) {
        console.error("Failed to load save data", e);
    }
}

// 起動時にロード
loadGame();

// 1分おきに定期オートセーブ
setInterval(saveGame, 60000);

updateUI();
gameLoop();
