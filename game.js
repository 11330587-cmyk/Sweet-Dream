// =======================================================
// 🎮 遊戲核心狀態與文字資料庫
// =======================================================

let gameState = {
    currentPlace: 'start-room',
    lastRoom: null,    // 🪞 新增：用來紀錄特寫前的房間位置
    hallwayStage: 1, 
    inventory: { key: false, box: false, photo: false, doll: false, diary: false },
    obtainedItems: [], // 🎒 紀錄玩家獲得道具的「先後順序」
    room4Count: 0,
    hasPlayedStartDialog: false, 
    unlockedEndings: [false, false, false, false],
    monsterTimer: null,
    hasMonster: false,
    diaryCurrentPage: 0, // 用冒號定義，並用逗號與下一筆資料隔開
    boxOpened: false     // 最後一筆資料後面不需要符號（或加逗號也可以）
};

// 📖 宣告日記每一頁的圖片路徑
const diaryPages = [
    'images/diary_page1.png',
    'images/diary_page2.png',
    'images/diary_page3.png'
];

// 🎨 🚀 新增：全物品特寫圖片資料庫（當收集齊全 5 樣時，可自動切換成 truePic 呈現真相）
const itemImages = {
    doll: {
        normalPic: 'images/item_doll.png',
        truePic: 'images/item_doll_true.png'    // 收集完五件看娃娃時的變化（若無可與上面填相同）
    },
    key: {
        normalPic: 'images/item_key.png',
        truePic: 'images/item_key.png'
    },
    photo: {
        normalPic: 'images/item_photo.png',
        truePic: 'images/item_photo_true.png'  // 清晰容貌的版本
    }
};

// 🖼️ 走廊 1~3 段各相框的調查文字敘述
const frameDescriptions = {
    "1-left": "媽媽教我讀書。",
    "1-right": "一個人的生日派對。",
    "2-left": "與娃娃辦家家酒。",
    "2-right": "鄰居的小孩都是惡魔。",
    "3-left": "我的天堂，角落有點破損。",
    "3-left-empty": "我的天堂...?",
    "3-right": "鄰居從外太空送來蛋糕。"
};

// 🧸 道具資料庫（新增文字版說明，將與視窗同時並存）
const itemDetails = {
    doll: {
        name: "【 娃娃 】",
        desc: "小時候，媽媽送我的兔娃娃，有閃爍的可愛紅眼睛。",
        trueDesc: "深入那雙紅眼睛，總覺得被緊緊地凝視。"
    },
    diary: {
        name: "【 日記本 】",
        desc: "特別乾淨的食譜，看起來被收藏著⋯⋯",
        trueDesc: "是我搞丟的日記本"
    },
    box: {
        name: "【 盒子 】",
        desc: "沉被鎖住了，打不開。",
        trueDesc: "一疊偷拍的照片。"
    },
    key: {
        name: "【 鑰匙 】",
        desc: "兩把鑰匙，令你疑惑的是，一把鑰匙比另一把精緻許多。",
        trueDesc: "應該是打開出口的鑰匙。"
    },
    photo: {
        name: "【 殘頁 】",
        desc: "一張紙寫滿了字，撕痕莫名的眼熟。",
        trueDesc: "是日記的殘頁。"
    }
};

// 🏠 各個房間環境介紹對白
const roomDescriptions = {
    startRoom: [
        { speaker: "【 系統 】", text: "頭痛欲裂……你揉了揉眼睛，發現自己躺在一間完全陌生的冰冷房間裡。" },
        { speaker: "【 主角 】", text: "我……為什麼會在這裡？" }
    ],
    room1: { speaker: "【 系統 】", text: "一間房間，裝潢可愛，看起來是給小孩的。" },
    room2: { speaker: "【 系統 】", text: "還是不要進去比較好。" },
    room3: { speaker: "【 系統 】", text: "一間廁所，有一股淡淡的芳香。" },
    room4: { speaker: "【 系統 】", text: "出去。" },
    room5: { speaker: "【 系統 】", text: "恭喜" },
    room6: { speaker: "【 系統 】", text: "一間廚房，不知為何，你在這裡感到溫馨。" },
    room7: { speaker: "【 系統 】", text: "一間臥室。" },
    room8: { speaker: "【 系統 】", text: "一間儲物間，箱子密密麻麻的擺放，根本看不到窗外。" },
    box_locked: ["盒子牢牢鎖著，上面有一個奇怪的鑰匙孔。"]
};

// =======================================================
// ⌨️ 打字機動畫與對白佇列（Queue）核心控制
// =======================================================
let typewriterTimer = null; 
let currentFullText = "";   
let isTypewriting = false;  
let currentDialogQueue = []; 
let dialogCallback = null; 

function showTextWithTypewriter(htmlText) {
    const dialogText = document.getElementById('dialog-text');
    if (typewriterTimer) clearInterval(typewriterTimer);
    
    currentFullText = htmlText;
    isTypewriting = true;
    dialogText.innerHTML = "";
    
    let currentStr = "";
    let i = 0;
    
    typewriterTimer = setInterval(() => {
        if (i < htmlText.length) {
            if (htmlText[i] === '<') {
                let tag = "";
                while (htmlText[i] !== '>' && i < htmlText.length) {
                    tag += htmlText[i];
                    i++;
                }
                tag += '>'; 
                i++;
                currentStr += tag;
            } else {
                currentStr += htmlText[i];
                i++;
            }
            dialogText.innerHTML = currentStr;
        } else {
            completeTypewriter();
        }
    }, 30); 
}

function completeTypewriter() {
    if (typewriterTimer) clearInterval(typewriterTimer);
    document.getElementById('dialog-text').innerHTML = currentFullText; 
    isTypewriting = false; 
}

function startMultiDialog(textArray, callback) {
    if (!textArray || textArray.length === 0) return;
    currentDialogQueue = [...textArray];
    
    dialogCallback = callback ? callback : null;

    document.getElementById('dialog-click-hint').classList.remove('hidden');
    document.getElementById('game-dialog').classList.remove('hidden');
    
    const backBtn = document.getElementById('room-controls');
    if (backBtn) backBtn.classList.add('hidden');

    const firstData = currentDialogQueue.shift();
    
    if (typeof firstData === 'object' && firstData.speaker) {
        document.querySelector('.dialog-speaker').innerText = firstData.speaker;
        showTextWithTypewriter(firstData.text);
    } else {
        document.querySelector('.dialog-speaker').innerText = "【 系統 】"; 
        showTextWithTypewriter(firstData);
    }
}

function closeDialog() {
    if (isTypewriting) {
        completeTypewriter();
        return; 
    } 

    if (currentDialogQueue.length > 0) {
        const nextData = currentDialogQueue.shift(); 
        document.getElementById('dialog-text').innerHTML = ""; 
        
        if (typeof nextData === 'object' && nextData.speaker) {
            document.querySelector('.dialog-speaker').innerText = nextData.speaker;
            showTextWithTypewriter(nextData.text);
        } else {
            document.querySelector('.dialog-speaker').innerText = "【 系統 】";
            showTextWithTypewriter(nextData);
        }
    } else {
        document.getElementById('game-dialog').classList.add('hidden');
        document.querySelector('.dialog-speaker').innerText = "【 系統 】"; 
        
        const sceneDisplay = document.getElementById('scene-display');
        const backBtn = document.getElementById('room-controls');
        
        if (sceneDisplay.className === 'bg-mirror-view') {
            sceneDisplay.className = 'bg-room3'; 
            gameState.currentPlace = 'room3';
            if (backBtn) backBtn.classList.remove('hidden');
            
        } else if (sceneDisplay.className === 'bg-frame-view') {
            sceneDisplay.className = `bg-hallway-${gameState.hallwayStage}`;
            gameState.currentPlace = 'hallway';
            document.getElementById('hallway-scene').classList.remove('hidden');
            
        } else {
            if (gameState.currentPlace !== 'hallway' && !gameState.currentPlace.startsWith('frame-view-') && gameState.currentPlace !== 'exit-zoom-view') {
                if (backBtn) backBtn.classList.remove('hidden');
            }
        }

        if (dialogCallback) {
            const nextTask = dialogCallback;
            dialogCallback = null; 
            nextTask();
        }
    }
}

function triggerDialog(dialogArray) {
    startMultiDialog(dialogArray);
}

// =======================================================
// 🎮 遊戲場景切換與導航
// =======================================================

function togglePopup(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function startGame() {
    if (typewriterTimer) clearInterval(typewriterTimer);
    clearMonster();
    
    gameState.hallwayStage = 1; 
    gameState.obtainedItems = []; 
    gameState.room4Count = 0;
    gameState.hasPlayedStartDialog = false;
    gameState.boxOpened = false;
    gameState.diaryCurrentPage = 0;
    
    const items = ['doll', 'diary', 'box', 'key'];
    items.forEach(item => {
        const itemEl = document.getElementById(`room-${item}`);
        if (itemEl) itemEl.classList.remove('picked');
    });

    const bigPhotoEl = document.getElementById('scene-photo-item');
    if (bigPhotoEl) bigPhotoEl.classList.remove('picked');

    for (let key in gameState.inventory) {
        gameState.inventory[key] = false;
    }
    
    updateInventoryUI();
    
    document.getElementById('start-screen').classList.replace('active', 'hidden');
    const intro = document.getElementById('intro-animation');
    intro.classList.replace('hidden', 'active');

    setTimeout(() => {
        intro.classList.replace('active', 'hidden');
        document.getElementById('game-main').classList.replace('hidden', 'active');
        enterStartRoom();
    }, 3000);
}

function enterStartRoom() {
    gameState.currentPlace = 'start-room';
    const display = document.getElementById('scene-display');
    display.className = ''; 
    display.classList.add('bg-start-room');
    document.getElementById('hallway-scene').classList.add('hidden');
    
    document.getElementById('room-controls').classList.remove('hidden'); 

    if (!gameState.hasPlayedStartDialog) {
        const descData = roomDescriptions['startRoom'];
        if (Array.isArray(descData)) {
            startMultiDialog(descData); 
        }
        gameState.hasPlayedStartDialog = true;
    } else {
        const dialogBox = document.getElementById('game-dialog');
        if (dialogBox) {
            dialogBox.classList.add('hidden');
        }
    }

    triggerMonsterChance(0); 
}

function leaveRoom() {
    clearMonster();
    
    const frameZoomScene = document.getElementById('frame-zoom-scene');
    if (frameZoomScene) {
        frameZoomScene.classList.add('hidden'); 
    }
    
    const exitZoomScene = document.getElementById('exit-zoom-scene');
    if (exitZoomScene) exitZoomScene.classList.add('hidden');

    gameState.currentPlace = 'hallway';
    updateHallwayUI(); 
    document.getElementById('hallway-scene').classList.remove('hidden');
    document.getElementById('room-controls').classList.add('hidden'); 
    triggerMonsterChance(0.1); 
}

function changeStage(direction) {
    clearMonster();
    let newStage = gameState.hallwayStage + direction;
    if (newStage < 1 || newStage > 4) return; 
    gameState.hallwayStage = newStage;
    updateHallwayUI();
    triggerMonsterChance(0.05); 
}

function updateHallwayUI() {
    let stage = gameState.hallwayStage;
    const display = document.getElementById('scene-display');
    display.className = ''; 
    display.classList.add(`bg-hallway-${stage}`);

    for (let i = 1; i <= 4; i++) {
        let doorGroup = document.getElementById(`doors-stage-${i}`);
        if (i === stage) {
            doorGroup.classList.remove('hidden');
        } else {
            doorGroup.classList.add('hidden');
        }
    }

    const arrowBack = document.getElementById('arrow-backward');
    const arrowFor = document.getElementById('arrow-forward');
    const btnBackToStart = document.getElementById('btn-back-to-start');

    if (stage === 1) {
        arrowBack.classList.add('hidden');
        arrowFor.classList.remove('hidden');
        btnBackToStart.classList.remove('hidden');
    } else if (stage === 4) {
        arrowBack.classList.remove('hidden');
        arrowFor.classList.add('hidden'); 
        btnBackToStart.classList.add('hidden');
    } else {
        arrowBack.classList.remove('hidden');
        arrowFor.classList.remove('hidden');
        btnBackToStart.classList.add('hidden');
    }
}

function enterRoom(roomNum) {
    clearMonster();
    
    if (roomNum === 4) {
        gameState.room4Count++; 

        const display = document.getElementById('scene-display');
        display.className = ''; 
        document.getElementById('hallway-scene').classList.add('hidden');

        if (gameState.room4Count === 1) {
            const mirrorVideo = document.getElementById('mirror-video');
            if (mirrorVideo) {
                mirrorVideo.src = 'videos/lostroom.mp4'; 
                mirrorVideo.classList.remove('hidden');
                mirrorVideo.play();

                mirrorVideo.onended = function() {
                    mirrorVideo.classList.add('hidden');
                    enterStartRoom(); 
                };
            } else {
                setTimeout(enterStartRoom, 3000);
            }
        } 
        else {
            display.classList.add('bg-room4-scare'); 
            setTimeout(() => {
                enterStartRoom(); 
            }, 3000);
        }
        return; 
    }

    const roomKey = `room${roomNum}`;
    gameState.currentPlace = roomKey;
    
    const display = document.getElementById('scene-display');
    display.className = ''; 
    display.classList.add(`bg-room${roomNum}`); 
    
    document.getElementById('hallway-scene').classList.add('hidden');
    document.getElementById('room-controls').classList.remove('hidden'); 

    const descData = roomDescriptions[roomKey];
    if (descData) {
        if (Array.isArray(descData)) {
            startMultiDialog(descData);
        } else {
            startMultiDialog([descData]);
        }
    }

    triggerMonsterChance(0.2); 
}

// =======================================================
// 🎒 物品與互動道具系統
// =======================================================

function pickRoomItem(itemName) {
    if (gameState.inventory[itemName] === false) {
        gameState.inventory[itemName] = true;
        gameState.obtainedItems.push(itemName);
        
        updateInventoryUI(); 
        
        const itemEl = document.getElementById(`room-${itemName}`);
        if (itemEl) itemEl.classList.add('picked');
        
        const info = itemDetails[itemName];
        document.querySelector('.dialog-speaker').innerText = "【 系統 】";
        
        const backBtn = document.getElementById('room-controls');
        if (backBtn) backBtn.classList.add('hidden');
        
        document.getElementById('game-dialog').classList.remove('hidden'); 
        showTextWithTypewriter(`你在房間的角落細心搜查……發現了 ${info.name}！已放入物品欄。`);
    }
}

function updateInventoryUI() {
    const container = document.getElementById('inventory-slots');
    container.innerHTML = ""; 

    const maxSlots = 5; 

    gameState.obtainedItems.forEach(itemName => {
        const slot = document.createElement('div');
        slot.className = `slot acquired item-${itemName}`;
        slot.onclick = () => investigateItem(itemName); // 全面連動視窗化
        container.appendChild(slot);
    });

    const emptyCount = maxSlots - gameState.obtainedItems.length;
    for (let i = 0; i < emptyCount; i++) {
        const slot = document.createElement('div');
        slot.className = "slot empty";
        container.appendChild(slot);
    }
}

// =======================================================
// 🔍 全新優化：全物品獨立視窗與對話連動調查系統
// =======================================================

function investigateItem(itemName) {
    if (!gameState.inventory[itemName]) return;

    const overlay = document.getElementById('item-investigate-overlay');
    const img = document.getElementById('investigate-img');
    const info = itemDetails[itemName];
    
    // 預先隱藏所有子組件碰撞箱
    document.getElementById('box-keyhole-hitbox').classList.add('hidden');
    document.getElementById('diary-prev-hitbox').classList.add('hidden');
    document.getElementById('diary-next-hitbox').classList.add('hidden');

    overlay.setAttribute('data-current-item', itemName);

    // ─── 情況 A：如果是八音盒 ───
    if (itemName === 'box') {
        overlay.classList.remove('hidden');
        img.src = gameState.boxOpened ? 'images/box_opened.png' : 'images/box_closed.png';
        if (!gameState.boxOpened) {
            document.getElementById('box-keyhole-hitbox').classList.remove('hidden');
        }
    } 
    // ─── 情況 B：如果是日記本 ───
    else if (itemName === 'diary') {
        overlay.classList.remove('hidden');
        gameState.diaryCurrentPage = 0; 
        img.src = diaryPages[gameState.diaryCurrentPage];
        document.getElementById('diary-prev-hitbox').classList.remove('hidden');
        document.getElementById('diary-next-hitbox').classList.remove('hidden');
    } 
    // ─── 🚀 情況 C：新加入視窗化的普通物品（娃娃、照片、鑰匙） ───
    else {
        overlay.classList.remove('hidden');
        
        // 判斷是否收集齊全
        const totalItemsCount = 5;
        const isAllCollected = (gameState.obtainedItems.length === totalItemsCount);
        const imgSet = itemImages[itemName];

        // 根據全收集旗標載入普通圖或真相圖
        if (imgSet) {
            img.src = (isAllCollected && imgSet.truePic) ? imgSet.truePic : imgSet.normalPic;
        } else {
            img.src = `images/item_${itemName}.png`; // 防呆預設路徑
        }
    }

    // 💬 視窗打開的同時，同步在下方彈出你原創的精美字體對白
    if (info) {
        document.querySelector('.dialog-speaker').innerText = "【 系統 】"; 
        const backBtn = document.getElementById('room-controls');
        if (backBtn) backBtn.classList.add('hidden');

        document.getElementById('game-dialog').classList.remove('hidden'); 
        
        const totalItemsCount = 5; 
        const isAllCollected = (gameState.obtainedItems.length === totalItemsCount);

        let displayDescription = "";
        if (isAllCollected && info.trueDesc) {
            displayDescription = `你注視著手中的 ${info.name}，腦海中湧現出真正的記憶：<br><span style="color: #ffcd1a;">${info.trueDesc}</span>`;
        } else {
            displayDescription = `你仔細端尋手中的 ${info.name}：<br>${info.desc}`;
        }
        showTextWithTypewriter(displayDescription);
    }
}

// ❌ 關閉調查視窗（同時關閉對白框，保持同步）
function closeItemInvestigate() {
    document.getElementById('item-investigate-overlay').classList.add('hidden');
    document.getElementById('game-dialog').classList.add('hidden'); // 關閉視窗時也順便收起對白
}

function clickBoxKeyhole() {
    if (gameState.inventory.key) {
        gameState.boxOpened = true;
        document.getElementById('investigate-img').src = 'images/box_opened.png';
        document.getElementById('box-keyhole-hitbox').classList.add('hidden'); 
        
        startMultiDialog(["我用鑰匙打開了盒子...", "裡面赫然躺著一張碎紙片..."]);
    } else {
        const descData = roomDescriptions['box_locked'] || ["盒子牢牢鎖著，上面有一個奇怪的鑰匙孔。"];
        startMultiDialog(descData);
    }
}

function changeDiaryPage(direction) {
    gameState.diaryCurrentPage += direction;

    if (gameState.diaryCurrentPage < 0) {
        gameState.diaryCurrentPage = 0; 
        return;
    }
    if (gameState.diaryCurrentPage >= diaryPages.length) {
        gameState.diaryCurrentPage = diaryPages.length - 1; 
        return;
    }

    document.getElementById('investigate-img').src = diaryPages[gameState.diaryCurrentPage];
}

function checkAllItemsCollected() {
    const allItems = Object.keys(gameState.inventory);
    const isAllCollected = allItems.every(item => gameState.inventory[item] === true);

    if (isAllCollected) {
        startMultiDialog(["（你觸發了隱藏成就：全物品收集！）", "牆角似乎傳來了某種沉重的摩擦聲..."]);
    } else {
        startMultiDialog(["感覺好像還遺漏了什麼東西沒有找到..."]);
    }
}

// =======================================================
// 🖼 "相框獨立特寫與拿取系統"
// =======================================================

// =======================================================
// 🖼 "相框獨立特寫與拿取系統"
// =======================================================

function approachFrame(stageNum, side) {
    clearMonster(); 
    
    const frameKey = `${stageNum}-${side}`;
    gameState.currentPlace = `frame-view-${frameKey}`; 

    const display = document.getElementById('scene-display');
    display.className = ''; 

    document.getElementById('hallway-scene').classList.add('hidden');
    document.getElementById('frame-zoom-scene').classList.remove('hidden');
    
    // 🚀 【核心修正】顯示返回按鈕，讓玩家可以點擊退出特寫！
    const backBtn = document.getElementById('room-controls');
    if (backBtn) backBtn.classList.remove('hidden'); 

    const dialog = document.getElementById('game-dialog');
    document.querySelector('.dialog-speaker').innerText = "【 系統 】";
    dialog.classList.remove('hidden');

    if (frameKey === "3-left") {
        const photoHitbox = document.getElementById('scene-photo-item');
        
        if (gameState.inventory.photo) {
            display.classList.add('bg-frame-3-left-empty');
            if (photoHitbox) photoHitbox.classList.add('picked'); 
            showTextWithTypewriter(frameDescriptions["3-left-empty"]);
        } else {
            display.classList.add('bg-frame-3-left');
            if (photoHitbox) photoHitbox.classList.remove('picked'); 
            showTextWithTypewriter(frameDescriptions["3-left"]);
        }
    } else {
        display.classList.add(`bg-frame-${frameKey}`);
        const photoHitbox = document.getElementById('scene-photo-item');
        if (photoHitbox) photoHitbox.classList.add('picked');

        const desc = frameDescriptions[frameKey] || "牆上掛著一個神祕的相框。";
        showTextWithTypewriter(desc);
    }
}

// =======================================================
// 🖼️ 1. 長廊 3-left 相框拿取邏輯（獲得的是「殘頁」）
// =======================================================
function takePhotoFromFrame() {
    if (gameState.inventory.photo === false) {
        gameState.inventory.photo = true; // 獲得相框道具（殘頁）
        gameState.obtainedItems.push('photo'); 
        
        updateInventoryUI(); 

        const photoHitbox = document.getElementById('scene-photo-item');
        if (photoHitbox) photoHitbox.classList.add('picked');

        const display = document.getElementById('scene-display');
        display.className = 'bg-frame-3-left-empty';

        document.querySelector('.dialog-speaker').innerText = "【 系統 】";
        
        // 🚀 【核心修正】拿完照片後，讓返回按鈕保持顯示（remove hidden），不要藏起來！
        const backBtn = document.getElementById('room-controls');
        if (backBtn) backBtn.classList.remove('hidden'); 

        document.getElementById('game-dialog').classList.remove('hidden');
        
        // 明確告知拿到的是殘頁
        showTextWithTypewriter(`你打破相框發現裡面有一張殘頁。`);
    }
}

// =======================================================
// 🔍 2. 調查主核心系統（全物品視窗化）
// =======================================================

function investigateItem(itemName) {
    if (!gameState.inventory[itemName]) return;

    const overlay = document.getElementById('item-investigate-overlay');
    const imgEl = document.getElementById('investigate-img');
    const backBtn = document.getElementById('room-controls'); // 💡 移到最上方統一宣告
    const info = itemDetails[itemName];
    
    imgEl.className = ""; // 清除上一次留下的所有圖片 Class
    
    // 預先隱藏所有子組件點擊熱區
    document.getElementById('box-keyhole-hitbox').classList.add('hidden');
    document.getElementById('box-photo-hitbox').classList.add('hidden');
    document.getElementById('diary-prev-hitbox').classList.add('hidden');
    document.getElementById('diary-next-hitbox').classList.add('hidden');

    overlay.setAttribute('data-current-item', itemName);

    // ─── 📦 情況 A：點擊八音盒（盒子） ───
    if (itemName === 'box') {
        overlay.classList.remove('hidden');
        
        if (!gameState.boxOpened) {
            imgEl.classList.add('item-box-closed'); // 顯示：閉合的盒子
            document.getElementById('box-keyhole-hitbox').classList.remove('hidden'); // 露出鎖孔
        } else if (gameState.boxOpened && !gameState.boxPhotoTaken) {
            imgEl.classList.add('item-box-opened'); // 顯示：打開的盒子，裡面有完整照片
            document.getElementById('box-photo-hitbox').classList.remove('hidden'); // 露出照片讓玩家點擊拿走
        } else {
            imgEl.classList.add('item-box-empty'); // 顯示：照片被拿走後的空盒子
        }
    } 
    // ─── 📖 情況 B：點擊日記本 ───
    else if (itemName === 'diary') {
        overlay.classList.remove('hidden');
        gameState.diaryCurrentPage = 0; 
        imgEl.classList.add('item-diary-page0'); // 預設打開永遠是第一頁
        
        document.getElementById('diary-prev-hitbox').classList.remove('hidden');
        document.getElementById('diary-next-hitbox').classList.remove('hidden');
    } 
    // ─── 🖼️ 情況 C：點擊物品欄裡的「老照片殘頁」 ───
    else if (itemName === 'photo') {
        overlay.classList.remove('hidden');
        imgEl.classList.add('item-photo-normal'); // 顯示殘頁或預設相片樣式
    }
    // ─── 🧸 其他普通物品（娃娃、鑰匙） ───
    else {
        overlay.classList.remove('hidden');
        imgEl.classList.add(`item-${itemName}-normal`);
    }

    // 💡 確保不論看什麼物品，返回長廊的按鈕都一定要維持顯示狀態
    if (backBtn) {
        backBtn.classList.remove('hidden');
    }

    // 💬 下方同步彈出正確的對白文字
    if (info) {
        document.querySelector('.dialog-speaker').innerText = "【 系統 】"; 
        document.getElementById('game-dialog').classList.remove('hidden'); 

        let currentDesc = info.desc;
        
        // 🎯 根據動態狀態，精準修正對白：
        if (itemName === 'photo') {
            currentDesc = "從長廊相框取下的【殘頁】。斷裂的邊緣參差不齊，寬度剛好和日記本被撕掉的那一頁吻合。";
        } else if (itemName === 'box' && gameState.boxOpened && !gameState.boxPhotoTaken) {
            currentDesc = "盒子被成功打開了！裡面是厚厚一疊照片。";
        } else if (itemName === 'box' && gameState.boxPhotoTaken) {
            currentDesc = "盒子裡空空如也。";
        }
        
        showTextWithTypewriter(`你仔細端尋手中的 ${info.name}：<br>${currentDesc}`);
    }
}

// 🔑 3. 八音盒點擊鎖孔：使用鑰匙開盒
function clickBoxKeyhole() {
    if (gameState.inventory.key) {
        gameState.boxOpened = true;
        
        const imgEl = document.getElementById('investigate-img');
        imgEl.className = "item-box-opened"; // 外觀切換：開盒，露出完整照片
        
        document.getElementById('box-keyhole-hitbox').classList.add('hidden'); // 隱藏鎖孔
        document.getElementById('box-photo-hitbox').classList.remove('hidden'); // 開放完整照片點擊
        
        startMultiDialog(["我用鑰匙打開了盒子...", "喀噠一聲，蓋子彈開了！裡面躺著一疊照片。"]);
    } else {
        const descData = roomDescriptions['box_locked'] || ["盒子牢牢鎖著，上面有一個奇怪的鑰匙孔。"];
        startMultiDialog(descData);
    }
}

// 🖼️ 4. 八音盒內部：點擊並拿走「完整老照片」放入物品欄
function takePhotoFromBox() {
    gameState.boxPhotoTaken = true; // 標記盒子照片已被拿走
    
    const imgEl = document.getElementById('investigate-img');
    imgEl.className = "item-box-empty"; // 外觀切換：空盒子
    document.getElementById('box-photo-hitbox').classList.add('hidden'); // 關閉照片點擊熱區

    if (!gameState.obtainedItems.includes('boxphoto')) {
        gameState.inventory.boxphoto = true; // 啟用新道具欄位
        gameState.obtainedItems.push('boxphoto'); // 塞入背包序列
    }
    
    updateInventoryUI(); // 刷新背包 UI

    startMultiDialog([
        "盒子裡面是厚厚一疊偷拍的照片。",
        "有你睡覺的照片，和娃娃玩耍的樣子，和在廁所..."
    ]);
}

// =======================================================
// 📖 5. 切換日記本頁數
// =======================================================
function changeDiaryPage(direction) {
    let newPage = gameState.diaryCurrentPage + direction;
    if (newPage < 0 || newPage > 1) return; 

    gameState.diaryCurrentPage = newPage;
    
    const imgEl = document.getElementById('investigate-img');
    imgEl.className = ""; // 清除舊頁面樣式

    if (gameState.diaryCurrentPage === 0) {
        imgEl.classList.add('item-diary-page0'); 
    } else if (gameState.diaryCurrentPage === 1) {
        if (gameState.inventory.photo) {
            imgEl.classList.add('item-diary-combined'); 
        } else {
            imgEl.classList.add('item-diary-page1'); 
        }
    }
}
// =======================================================
// 🪞 互動事件：點擊廁所鏡子
// =======================================================
function clickMirror() {
    clearMonster();
    
    const video = document.getElementById('mirror-video');
    const backBtn = document.getElementById('room-controls');
    
    if (!video) return;

    if (backBtn) backBtn.classList.add('hidden');
    
    video.classList.remove('hidden');
    video.currentTime = 0;
    video.play();
    
    video.onended = function() {
        video.classList.add('hidden');
        
        const sceneDisplay = document.getElementById('scene-display');
        sceneDisplay.className = 'bg-room3'; 
        gameState.currentPlace = 'room3';
        
        triggerDialog([
            { speaker: "【 主角 】", text: "......" },
        ]);
        
        video.onended = null;
    };
}

// =======================================================
// 🚪 大門特寫與獨立場景互動系統
// =======================================================

function approachExit() {
    clearMonster(); 
    
    gameState.lastRoom = gameState.currentPlace; 
    gameState.currentPlace = 'exit-zoom-view';

    const display = document.getElementById('scene-display');
    display.className = ''; 
    display.classList.add('bg-exit-zoom-view'); 

    document.getElementById('hallway-scene').classList.add('hidden');
    document.getElementById('exit-zoom-scene').classList.remove('hidden');
    document.getElementById('room-controls').classList.remove('hidden');
}

function clickLockHitbox() {
    const dialog = document.getElementById('game-dialog');
    const customPopup = document.getElementById('custom-decision-popup');
    const backBtn = document.getElementById('room-controls');

    if (!gameState.inventory.key) {
        if (backBtn) backBtn.classList.add('hidden'); 
        
        document.querySelector('.dialog-speaker').innerText = "【 系統 】";
        dialog.classList.remove('hidden'); 
        showTextWithTypewriter("上面掛著一個出口標示，看起來這就是出口。");
        backBtn.classList.remove('hidden')
    } else {
        customPopup.classList.remove('hidden'); 
    }
}

function confirmExit(isLeaving) {
    document.getElementById('custom-decision-popup').classList.add('hidden');
    
    if (!isLeaving) {
        triggerEnding(2); 
    } else {
        let inv = gameState.inventory;
        if (inv.key && inv.box && inv.photo && inv.doll && inv.diary) {
            triggerEnding(4); 
        } else {
            triggerEnding(3); 
        }
    }
}

// =======================================================
// 👹 遇怪與結局觸發系統
// =======================================================

function triggerMonsterChance(probability) {
    if (Math.random() < probability) {
        gameState.hasMonster = true;
        const monsterEl = document.getElementById('monster');
        monsterEl.classList.remove('hidden');
        monsterEl.classList.add('monster-approaching');
        gameState.monsterTimer = setTimeout(() => {
            triggerEnding(1);
        }, 10000);
    }
}

function clearMonster() {
    if (gameState.monsterTimer) {
        clearTimeout(gameState.monsterTimer);
        gameState.monsterTimer = null;
    }
    gameState.hasMonster = false;
    const monsterEl = document.getElementById('monster');
    monsterEl.classList.add('hidden');
    monsterEl.classList.remove('monster-approaching');
}

function triggerEnding(endingNum) {
    clearMonster();
    
    const display = document.getElementById('scene-display');
    const dialogBox = document.getElementById('game-dialog');
    const mirrorVideo = document.getElementById('mirror-video');
    
    document.getElementById('hallway-scene').classList.add('hidden');
    document.getElementById('exit-zoom-scene').classList.add('hidden');
    document.getElementById('room-controls').classList.add('hidden');

    if (endingNum === 1 || endingNum === 2) {
        document.getElementById('game-main').classList.replace('active', 'hidden');
        
        const endingScreen = document.getElementById('ending-screen');
        endingScreen.classList.replace('hidden', 'active');
        
        const animEl = document.getElementById('ending-animation');
        const overBox = document.getElementById('game-over-box');
        
        overBox.classList.add('hidden');
        animEl.classList.remove('hidden');
        
        let endingTitle = "";
        let endingDesc = "";
        
        if (endingNum === 1) {
            animEl.innerText = "你眼前一黑，再也沒有光線...";
            endingScreen.style.backgroundColor = "#200";
            endingTitle = "結局 1：永遠一起";
            endingDesc = "永遠，在一起。";
        } else {
            animEl.innerText = "你放下了鑰匙...決定留在這裡...";
            endingScreen.style.backgroundColor = "#111";
            endingTitle = "結局 2：留下";
            endingDesc = "或許這裡，也挺不錯的。";
        }
        
        gameState.unlockedEndings[endingNum - 1] = true;
        const photoDisplay = document.getElementById('ending-photo-display');
        if (photoDisplay) photoDisplay.className = "";

        setTimeout(() => {
            animEl.classList.add('hidden');    
            overBox.classList.remove('hidden'); 
            if (photoDisplay) {
                photoDisplay.classList.add(`show-end-${endingNum}`);
                setTimeout(() => { photoDisplay.classList.add('show-pic'); }, 50);
            }
            const menuCircle = document.getElementById(`end-circle-${endingNum}`);
            if (menuCircle) menuCircle.classList.add('unlocked');
        }, 3000);
        return;
    }

    if (endingNum === 3 || endingNum === 4) {
        if (display) {
            display.className = '';
            display.classList.add('bg-black-screen');
        }
        if (dialogBox) dialogBox.classList.add('hidden');

        setTimeout(() => {
            display.className = '';
            display.classList.add(endingNum === 3 ? 'bg-end3-scene1' : 'bg-end4-scene1');

            const linesScene1 = endingNum === 3 
                ? ["（驚醒）", "原來是夢..."] 
                : ["......", "原來是這樣啊..."];
            
            startMultiDialog(linesScene1, () => {
                
                display.className = '';
                display.classList.add(endingNum === 3 ? 'bg-end3-scene2' : 'bg-end4-scene2');

                const linesScene2 = endingNum === 3
                    ? ["媽媽？", "為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼為什麼啊"]
                    : ["我會想念你的。"];

                startMultiDialog(linesScene2, () => {
                    
                    if (mirrorVideo) {
                        mirrorVideo.src = endingNum === 3 ? 'videos/ending3.mp4' : 'videos/ending4.mp4';
                        mirrorVideo.classList.remove('hidden');
                        mirrorVideo.play();

                        mirrorVideo.onended = function() {
                            mirrorVideo.classList.add('hidden');
                            
                            document.getElementById('game-main').classList.replace('active', 'hidden');
                            const endingScreen = document.getElementById('ending-screen');
                            endingScreen.classList.replace('hidden', 'active');
                            endingScreen.style.backgroundColor = (endingNum === 3) ? "#113" : "#030";

                            const animEl = document.getElementById('ending-animation');
                            const overBox = document.getElementById('game-over-box');
                            const photoDisplay = document.getElementById('ending-photo-display');
                            
                            animEl.classList.add('hidden'); 
                            overBox.classList.remove('hidden');
                            
                            if (photoDisplay) {
                                photoDisplay.className = "";
                                photoDisplay.classList.add(`show-end-${endingNum}`);
                                setTimeout(() => { photoDisplay.classList.add('show-pic'); }, 50);
                            }
                            
                            gameState.unlockedEndings[endingNum - 1] = true;
                            const menuCircle = document.getElementById(`end-circle-${endingNum}`);
                            if (menuCircle) menuCircle.classList.add('unlocked');
                            
                            mirrorVideo.onended = null;
                        };
                    } else {
                        document.getElementById('game-main').classList.replace('active', 'hidden');
                        const endingScreen = document.getElementById('ending-screen');
                        endingScreen.classList.replace('hidden', 'active');
                        document.getElementById('game-over-box').classList.remove('hidden');
                    }
                });
            });

        }, 3000);
    }
}

function restartGame() {
    if (typewriterTimer) clearInterval(typewriterTimer);
    clearMonster();
    document.getElementById('ending-screen').classList.replace('active', 'hidden');
    document.getElementById('start-screen').classList.replace('hidden', 'active');
}