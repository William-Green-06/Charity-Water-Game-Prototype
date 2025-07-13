const LEVELS = {
    easy: [
        'assets/levels/easy/lvl_1.json',
        'assets/levels/easy/lvl_2.json',
        'assets/levels/easy/lvl_3.json',
    ],
    medium: [
        'assets/levels/medium/lvl_1.json',
        'assets/levels/medium/lvl_2.json',
        'assets/levels/medium/lvl_3.json',
    ],
    hard: [
        'assets/levels/hard/lvl_1.json',
        'assets/levels/hard/lvl_2.json',
        'assets/levels/hard/lvl_3.json',
    ]
};

const WATER_FACTS = {
    0: "703 million people in the world live without clean water.",
    1: "Diseases from dirty water kill more people every year than all forms of violence, including war.",
    2: "Every day, women and girls around the world spend an estimated 200 million hours collecting water."
};

let currentDifficulty = null;
let currentLevelIndex = 0;

let currentLevel = null; // Store the loaded level for updates
let originalLevel = null; // Store the original level for resets

// SFX
const popSound = new Audio('assets/sfx/pop.wav');
const removeSound = new Audio('assets/sfx/trash.wav');

// document.querySelector('.start-btn').addEventListener('click', async () => {
//     document.querySelector('.start-btn').style.display = 'none';
//     document.getElementById('game-area').style.display = 'flex';

//     // Example: Load grid config from JSON
//     const response = await fetch('assets/levels/lvl_1.json');
//     const level = await response.json();
//     currentLevel = level;
//     originalLevel = JSON.parse(JSON.stringify(level)); // Deep copy for reset
//     renderGrid(level);
// });

// Reset does the same thing as start until there's logic for multiple levels.
document.getElementById('reset-btn').addEventListener('click', function() {
    // Remove this line:
    // document.getElementById('reset-btn').style.display = 'none';

    // Spin animation (optional)
    this.classList.remove('spin');
    void this.offsetWidth;
    this.classList.add('spin');

    // Reset logic
    if (originalLevel) {
        currentLevel = JSON.parse(JSON.stringify(originalLevel));
        renderGrid(currentLevel);
    }

    removeSound.currentTime = 0;
    removeSound.play();
});

// Make pieces draggable
document.querySelectorAll('.draggable').forEach(piece => {
    piece.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', this.dataset.type);
    });
});

// Add event listener for submit button after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', evaluateLevel);
    }
});

function renderGrid(level) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${level.width}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${level.height}, 40px)`;

    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            let cellType = level.cells[y][x];
            const cell = document.createElement('div');
            cell.className = 'grid-cell';

            // Special handling for filter-on-pollution
            if (cellType === 'filter-on-pollution') {
                cell.classList.add('filter');
                cell.textContent = 'F';
            } else if (cellType && cellType.endsWith('-on-pollution')) {
                cell.classList.add(cellType.replace('-on-pollution', ''));
                cell.textContent = cellType.startsWith('down') ? (
                    cellType.startsWith('down-left') ? '↙' :
                    cellType.startsWith('down-right') ? '↘' : '↓'
                ) : '';
            } else {
                if (cellType) cell.classList.add(cellType);
                cell.textContent = cellType === 'start' ? 'S' :
                                   cellType === 'end' ? 'E' :
                                   cellType === 'obstacle' ? 'X' :
                                   cellType === 'pollution' ? 'P' :
                                   cellType === 'filter' ? 'F' :
                                   cellType === 'down' ? '↓' :
                                   cellType === 'down-left' ? '↙' :
                                   cellType === 'down-right' ? '↘' : '';
            }
            cell.dataset.x = x;
            cell.dataset.y = y;

            // Make cell droppable
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', handleDropOnCell);

            grid.appendChild(cell);
        }
    }
}

function handleDropOnCell(e) {
    e.preventDefault();
    const pieceType = e.dataTransfer.getData('text/plain');
    const x = parseInt(this.dataset.x, 10);
    const y = parseInt(this.dataset.y, 10);
    let cellType = currentLevel.cells[y][x];

    // Never overwrite start or end or obstacle
    if (cellType === 'start' || cellType === 'end' || cellType === 'obstacle') return;

    // Remove logic
    if (pieceType === 'remove') {
        if (
            cellType === 'down' ||
            cellType === 'down-left' ||
            cellType === 'down-right' ||
            cellType === 'filter'
        ) {
            currentLevel.cells[y][x] = null;
            removeSound.currentTime = 0;
            removeSound.play();
            renderGrid(currentLevel);
        } else if (
            cellType === 'filter-on-pollution' ||
            cellType === 'down-on-pollution' ||
            cellType === 'down-left-on-pollution' ||
            cellType === 'down-right-on-pollution'
        ) {
            // Restore pollution if a piece-on-pollution is removed
            currentLevel.cells[y][x] = 'pollution';
            removeSound.currentTime = 0;
            removeSound.play();
            renderGrid(currentLevel);
        }
        return;
    }

    // Only allow filter to overwrite pollution and mark it
    if (cellType === 'pollution' && pieceType === 'filter') {
        currentLevel.cells[y][x] = 'filter-on-pollution';
        popSound.currentTime = 0; // rewind to start
        popSound.play();
        renderGrid(currentLevel);
        return;
    }
    // Allow other pieces to overwrite pollution and mark them
    if (cellType === 'pollution' && pieceType !== 'filter') {
        currentLevel.cells[y][x] = pieceType + '-on-pollution';
        popSound.currentTime = 0;
        popSound.play();
        renderGrid(currentLevel);
        return;
    }

    // Allow any piece to overwrite pipes or filter or empty
    if (
        cellType === 'down' ||
        cellType === 'down-left' ||
        cellType === 'down-right' ||
        cellType === 'filter' ||
        cellType === null
    ) {
        currentLevel.cells[y][x] = pieceType;
        if (pieceType !== 'remove') {
            popSound.currentTime = 0;
            popSound.play();
        }
        renderGrid(currentLevel);
    }
}

// Water simulation
function evaluateLevel() {
    const level = currentLevel;
    let resultDiv = document.getElementById('result');
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'result';
        document.getElementById('game-area').appendChild(resultDiv);
    }

    // Find start
    let startX = -1, startY = -1;
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (level.cells[y][x] === 'start') {
                startX = x;
                startY = y;
            }
        }
    }
    if (startX === -1) {
        resultDiv.textContent = 'Fail (No start)';
        return;
    }

    // Simulate water flow
    let visited = Array.from({ length: level.height }, () => Array(level.width).fill(false));
    let reachedEnd = false;
    let wasCleanAtEnd = false;
    let failed = false;

    function traverse(x, y, clean) {
        if (failed) return;
        if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
            failed = true; // Water went offscreen
            return;
        }
        if (visited[y][x]) return;
        visited[y][x] = true;

        let cell = level.cells[y][x];
        if (cell === 'obstacle') {
            failed = true;
            return;
        }
        if (cell === 'end') {
            reachedEnd = true;
            wasCleanAtEnd = clean;
            return;
        }
        // Pollution logic
        if (cell === 'pollution') {
            clean = false;
        }
        if (cell && cell.endsWith('-on-pollution')) {
            if (cell.startsWith('filter')) {
                clean = true; // Filter cleans water
            } else {
                clean = false;
            }
        }
        if (cell === 'filter-on-pollution') {
            clean = true;
        }

        // Pipe logic
        if (cell === 'down' || cell === 'filter' || cell === 'filter-on-pollution') {
            traverse(x, y + 1, clean);
        } else if (cell === 'down-left' || cell === 'down-left-on-pollution') {
            traverse(x - 1, y + 1, clean);
        } else if (cell === 'down-right' || cell === 'down-right-on-pollution') {
            traverse(x + 1, y + 1, clean);
        } else if (cell === 'down-on-pollution') {
            traverse(x, y + 1, clean);
        } else if (cell === 'start') {
            traverse(x, y + 1, clean);
        }
    }

    traverse(startX, startY, true);

    if (reachedEnd && wasCleanAtEnd) {
        resultDiv.textContent = 'Pass';
        showVictoryModal();
    } else if (reachedEnd && !wasCleanAtEnd) {
        resultDiv.textContent = 'Polluted';
    } else {
        resultDiv.textContent = 'Fail';
    }
}

// Show the victory modal
function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    // Confetti (using canvas-confetti)
    if (window.confetti) {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas._confettiInitialized) {
            canvas.width = modal.offsetWidth;
            canvas.height = modal.offsetHeight;
            window.myConfetti = window.confetti.create(canvas, { resize: true, useWorker: true });
            canvas._confettiInitialized = true;
        }
        window.myConfetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 }
        });
    }

    // Show "One more!" after level 2 of any difficulty
    const extraMsg = document.getElementById('victory-extra-message');
    if (currentLevelIndex === 1) { // Level 2 (zero-based)
        extraMsg.textContent = "One more!";
        extraMsg.style.display = "block";
    } else {
        extraMsg.style.display = "none";
    }

    // Show water fact for levels 1, 2, 3 (indexes 0, 1, 2)
    const factDiv = document.getElementById('victory-water-fact');
    if (WATER_FACTS.hasOwnProperty(currentLevelIndex)) {
        factDiv.textContent = WATER_FACTS[currentLevelIndex];
        factDiv.style.display = "block";
    } else {
        factDiv.style.display = "none";
    }
}

// Hide the victory modal
function hideVictoryModal() {
    const modal = document.getElementById('victory-modal');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 400);
    document.getElementById('victory-extra-message').style.display = "none";
    document.getElementById('victory-water-fact').style.display = "none";
}

// Next Level button closes modal for now
document.getElementById('next-level-btn').addEventListener('click', async function() {
    currentLevelIndex++;
    if (currentLevelIndex < LEVELS[currentDifficulty].length) {
        hideVictoryModal();
        await loadLevel(currentDifficulty, currentLevelIndex);
    } else {
        // Show final victory modal
        hideVictoryModal();
        showFinalVictoryModal();
    }
});

document.getElementById('submit-btn').addEventListener('click', function() {
    const btn = this;
    btn.classList.remove('spin'); // Reset if already spinning
    void btn.offsetWidth; // Force reflow for restart
    btn.classList.add('spin');
});

document.getElementById('reset-btn').addEventListener('click', function() {
    // Remove this line:
    // document.getElementById('reset-btn').style.display = 'none';

    // Spin animation (optional)
    this.classList.remove('spin');
    void this.offsetWidth;
    this.classList.add('spin');

    // Reset logic
    if (originalLevel) {
        currentLevel = JSON.parse(JSON.stringify(originalLevel));
        renderGrid(currentLevel);
    }
});

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        currentDifficulty = this.dataset.difficulty;
        currentLevelIndex = 0;
        document.querySelector('.start-screen').style.display = 'none';
        document.getElementById('game-area').style.display = 'flex';
        await loadLevel(currentDifficulty, currentLevelIndex);
    });
});

async function loadLevel(difficulty, index) {
    const url = LEVELS[difficulty][index];
    const response = await fetch(url);
    const level = await response.json();
    currentLevel = level;
    originalLevel = JSON.parse(JSON.stringify(level));
    renderGrid(level);
    document.getElementById('level-title').textContent = `Level ${index + 1}`;
}

function showFinalVictoryModal() {
    const modal = document.getElementById('final-victory-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

document.getElementById('back-to-menu-btn').addEventListener('click', function() {
    document.getElementById('final-victory-modal').classList.remove('active');
    setTimeout(() => { document.getElementById('final-victory-modal').style.display = 'none'; }, 400);
    document.getElementById('game-area').style.display = 'none';
    document.querySelector('.start-screen').style.display = 'flex';
});