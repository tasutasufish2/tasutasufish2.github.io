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

// --- Game State ---
let state = {
    activeTab: 'game-tab',
    virusTotal: 0,
    antibodyPoints: 0,
    money: 0,
    fragments: 0,
    medicine: 0,
    medicinePlus: 0,

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
    lastClearedStage: null,

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
    killCountInSession: 0
};

// --- Input ---
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let spaceKeyPrev = false;

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

window.toggleMapDetails = function (id) {
    const el = document.getElementById(id);
    el.classList.toggle('active');
};

window.startMap = function (id, quota) {
    state.isMapMode = true;
    state.currentStageId = id;
    state.currentStageName = id.replace('map1', 'マップ①').replace('-', 'ー');
    state.mapQuota = quota;
    state.mapKills = 0;
    state.hp = state.maxHp;
    state.mapFadeTimer = 180;
    state.viruses = [];
    state.bullets = [];
    state.comboCount = 0;
    state.activeDebuffs = [];
    switchTab('game-tab');
};

function checkStageUnlocks() {
    const stages = ['map1-1', 'map1-2', 'map1-3'];
    const currentIdx = stages.indexOf(state.lastClearedStage);
    if (currentIdx !== -1 && currentIdx < stages.length - 1) {
        const nextStage = stages[currentIdx + 1];
        if (!state.unlockedStages.includes(nextStage)) {
            state.unlockedStages.push(nextStage);
            saveGame();
        }
    }
}

document.getElementById('open-map-btn').onclick = () => switchTab('map-selection-tab');

function updateUI() {
    // Map Stage Buttons
    document.querySelectorAll('.stage-btn').forEach(btn => {
        const stageId = btn.getAttribute('data-stage');
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
}

// リセット機能
document.getElementById('reset-button').addEventListener('click', () => {
    if (confirm('リセットしますか？ すべてのセーブデータが消去されます。')) {
        state.virusTotal = 0; state.antibodyPoints = 0; state.money = 0; state.fragments = 0;
        state.medicine = 0; state.medicinePlus = 0;
        state.atkLv = 1; state.sizeLv = 1; state.hpLv = 1; state.resLv = 1; state.alphaLv = 0;
        state.maxHp = 50; state.hp = 50;
        state.isResearching = false; state.isMapMode = false;
        state.viruses = []; state.bullets = []; state.comboCount = 0;
        state.unlockedStages = ['map1-1'];
        state.lastClearedStage = null;

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
};
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

// --- Game Logic ---

function createSparks(x, y, color = null) {
    for (let i = 0; i < 15; i++) {
        state.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 30, color: color || `hsl(${Math.random() * 60 + 20}, 100%, 50%)` });
    }
}

function addFloatingText(x, y, text, color = '#fff', size = 20) {
    state.comboEffects.push({ x, y, text, color, size, alpha: 1.0, life: 60 });
}

function spawnVirus(timestamp) {
    if (timestamp - state.lastVirusSpawn > state.spawnInterval) {
        // Bug Fix: 以前は state.killCountInSession を使っていたが、通常モードでリセットされないことがあった
        // 確率制 (15%) に変更
        let isStrong = Math.random() < 0.15;

        if (state.isMapMode && state.currentStageName.indexOf("マップ①") !== -1) {
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
            hp: isStrong ? 100 : 10,
            maxHp: isStrong ? 100 : 10,
            speed: 2.5 * speedBoost,
            lastAITime: timestamp,
            targetSlide: 0
        });
        state.lastVirusSpawn = timestamp;
    }
}

function updateGame(timestamp) {
    if (state.activeTab !== 'game-tab') return;

    let currentAtkMultiplier = 1.0;
    state.activeDebuffs = state.activeDebuffs.filter(d => d.endTime > timestamp);
    for (const d of state.activeDebuffs) currentAtkMultiplier *= d.multiplier;

    const baseAtk = 10 + (state.atkLv - 1) * 5;
    const finalAtk = Math.max(1, Math.floor(baseAtk * currentAtkMultiplier));

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
                state.activeDebuffs.push({ multiplier: v.isStrong ? 0.5 : 0.8, endTime: timestamp + 3000 });
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
                    state.virusTotal += state.comboCount;
                    if (state.isMapMode) state.mapKills++;
                    state.killCountInSession++;
                    createSparks(v.x + v.width / 2, v.y + v.height / 2, '#f1c40f');
                    if (state.comboCount > 1) addFloatingText(v.x + v.width / 2, v.y - 30, `${state.comboCount}連鎖！`, '#f1c40f', 24);
                    state.viruses.splice(i, 1);
                    checkGameState();
                }
                state.bullets.splice(j, 1);
                updateUI();
                break;
            }
        }
    }

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
}

function checkGameState() {
    if (!state.isMapMode) return;
    if (state.hp <= 0) {
        alert("敗北しました...\n通常モードに戻ります。");
        state.isMapMode = false;
        state.hp = state.maxHp;
        updateUI();
    } else if (state.mapKills >= state.mapQuota) {
        showRewardScreen();
    }
}

function showRewardScreen() {
    state.isMapMode = false;
    state.lastClearedStage = state.currentStageId;
    checkStageUnlocks();

    const rewards = {
        virus: 20 + Math.floor(Math.random() * 10),
        fragments: 1 + Math.floor(Math.random() * 2),
        money: 100 + Math.floor(Math.random() * 50)
    };

    // UI Reset
    document.querySelectorAll('.reward-item').forEach(item => item.classList.remove('show'));
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

            // 10個研究するごとに治療薬を1つ生成
            if (state.researchProgress % 10 === 0) {
                state.medicine++;
                addFloatingText(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "治療薬 +1", "#e67e22", 24);
            }
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
        if (v.isStrong) ctx.filter = 'hue-rotate(150deg) saturate(2)';
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
        state.hp = state.maxHp;
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
