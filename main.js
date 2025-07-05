document.querySelector('.start-btn').addEventListener('click', async () => {
    document.querySelector('.start-btn').style.display = 'none';
    document.getElementById('game-area').style.display = 'flex';

    // Example: Load grid config from JSON
    const response = await fetch('assets/levels/lvl_1.json');
    const level = await response.json();
    renderGrid(level);
});

function renderGrid(level) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${level.width}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${level.height}, 40px)`;

    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            const cellType = level.cells[y][x];
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (cellType) cell.classList.add(cellType);
            cell.textContent = cellType === 'start' ? 'S' :
                               cellType === 'end' ? 'E' :
                               cellType === 'obstacle' ? 'X' : '';
            grid.appendChild(cell);
        }
    }
}