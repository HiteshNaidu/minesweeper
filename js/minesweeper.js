// Global variables
var time = 0;
var timerId = undefined;

var firstClickOccurred = false;

let rows = 9;
let columns = 9;
let numOfMines = 10;

let field = [];
let cellsFlagged = 0;
let flagCount = numOfMines;
let cellsRevealed = 0;
let cellsToReveal = (rows * columns) - numOfMines;

let won = false;
let lost = false;

function buildGrid(rows, columns) {
    time = 0;
    field = [];
    cellsFlagged = 0;
    flagCount = numOfMines;
    cellsRevealed = 0;
    cellsToReveal = (rows * columns) - numOfMines;
    won = false;
    lost = false;
    // Fetch grid and clear out old elements.
    var grid = document.getElementById("minefield");
    grid.innerHTML = "";

    // Build DOM Grid
    var tile;
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < columns; x++) {
            tile = createTile(x, y);
            grid.appendChild(tile);
        }
    }

    var style = window.getComputedStyle(tile);

    var width = parseInt(style.width.slice(0, -2));
    var height = parseInt(style.height.slice(0, -2));

    grid.style.width = (columns * width) + "px";
    grid.style.height = (rows * height) + "px";

    // populating remaining mines
    var span = document.getElementById('remainingMine');
    span.innerText = flagCount;

    // remove display message
    var message = document.getElementById('message');
    message.innerText = "";

    // set the smiley back to face_up
    var smiley = document.getElementById('smiley');
    smiley.classList.remove('face_lose');
}

/**
 * gameEnded determines whether the game has ended.
 * @returns true if the user wins or loses
 */
function gameEnded() {
    return won || lost;
};

/**
 * initField initializes a 2D array with the given rows and cols as dimensions
 * Each cell is an object with two properties: val and flagged.
 * @param {Number} rows number of rows wanted in the array
 * @param {Number} cols number of columns wanted in the array
 */
function initField(rows, cols) {
    field = [];
    for (var i = 0; i < rows; i++) {
        var row = new Array(cols);
        for (var j = 0; j < cols; j++) {
            row[j] = { val: 0, flagged: false };
        }
        field.push(row);
    }
}

/**
 * setMines adds the number of mines requested to the 2D array initialized by initField.
 * @param {Number} mines number of mines requested
 * @param {Number} firstClickRow row number of first clicked cell
 * @param {Number} firstClickCol col number of first clicked cell
 */
function setMines(mines, firstClickRow, firstClickCol) {
    var rows = field.length;
    var cols = field[0].length;

    // Must count mines actually planted so that mines are not placed in previously selected locations.
    var minesPlanted = 0;
    while (minesPlanted != mines) {
        var row = Math.floor(Math.random() * rows);
        var col = Math.floor(Math.random() * cols);

        // Cannot use cell if the user just clicked it or if it was already a mine
        if ((row == firstClickRow && col == firstClickCol)
            || (field[row][col] && field[row][col].val == numOfMines)) continue;

        field[row][col] = {
            val: numOfMines,
            flagged: false
        };

        minesPlanted++;
    }

    // Fill field with mine counts
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            field[i][j].val = countAdjacentMines(i, j);
        }
    }
};

/**
 * countAdjacentMines for a given coordinate, returns the number of mines it is next to.
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @returns number of mines a given coordinate is next to
 */
function countAdjacentMines(row, col) {
    if (field[row][col] && field[row][col].val == numOfMines) return numOfMines;
    var count = 0;
    var neighbors = getNeighbors(row, col);
    for (var i = 0; i < neighbors.length; i++) {
        var r = neighbors[i].row;
        var c = neighbors[i].col;
        if (field[r][c] && field[r][c].val == numOfMines) count++;
    }
    return count;
};

/**
 * revealCell reveals a cell at (row, col), then recursively expands its neighbors if it
 * doesn't have any neighboring mines (i.e., its field value is 0).
 *
 * It is possible to lose if the user manually tries to expand all neighbors on
 * a cell by incorrectly flagging neighboring cells (see mainClickHandler);
 * otherwise, it shouldn't be possible for this to result in a loss.
 * @param {Node} target target node
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @returns if the cell is revealed or if the game has ended
 */
function revealCell(target, row, col) {
    // base case: don't reveal flagged or already revealed cells
    if (field[row][col].flagged
        || target.classList.contains('revealed')) return;

    revealSingleCell(target, row, col);

    // base case: stop expanding if cell is non-zero or its reveal lead to a loss 
    if (gameEnded() || field[row][col].val != 0) return;

    // recursive step: reveal neighbors
    var neighbors = getNeighbors(row, col);
    if (neighbors.length) {
        for (var i = 0; i < neighbors.length; i++) {
            var div = document.querySelector(`[x="${neighbors[i].row}"][y="${neighbors[i].col}"]`);
            revealCell(div, neighbors[i].row, neighbors[i].col);
            if (gameEnded()) return;
        }
    }
};

/**
 * revealSingleCell updates styling for a cell so that it shows its number/mine on the screen.
 * Checks whether this reveal resulted in a win or loss.
 * @param {Node} target target node
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @param {Number} gameOver default set to 0, reveals all mines when turns to value 1
 * @returns if the cell is revealed or if the cell is flagged
 */
function revealSingleCell(target, row, col, gameOver = 0) {
    var displayCell = target;
    var cell = field[row][col];

    if (displayCell.classList.contains('revealed') || cell.flagged) return;

    if (!gameOver) displayCell.classList.add(generateClassName(cell.val), 'revealed');
    else displayCell.classList.add('revealed', 'mine');
    displayCell.classList.remove('hidden');

    cellsRevealed++;
    if (cell.val === numOfMines) {
        displayLoss();
    } else if (cellsRevealed === cellsToReveal) {
        displayWin();
    }
};

/**
 * generateClassName generates a className based on val.
 * @param {Number} val holds the cell value
 * @returns classname
 */
function generateClassName(val) {
    switch (val) {
        case numOfMines:
            return 'mine_hit';
        case 0:
            return 'clear';
        default:
            return 'tile_' + val;
    }
}

/**
 * displayWin stops timer and shows win message.
 */
function displayWin() {
    won = true;
    var smiley = document.getElementById('smiley');
    smiley.classList.add('face_win');
    window.clearInterval(timerId);
    var message = document.getElementById('message');
    message.innerText = "You have won! Your score is " + time + " seconds.";
};

/**
 * displayLoss reveals all unflagged mines, shows loss message, and sets global var lost to true.
 * @returns if lost is true
 */
function displayLoss() {
    if (lost) return;
    lost = true;
    var smiley = document.getElementById('smiley');
    smiley.classList.add('face_lose');
    window.clearInterval(timerId);
    var loseAlertCounter = 0;
    for (var r = 0; r < field.length; r++) {
        for (var c = 0; c < field[0].length; c++) {
            var cell = field[r][c];
            if (cell.val === numOfMines && !cell.flagged) {
                var div = document.querySelector(`[x="${r}"][y="${c}"]`);
                revealSingleCell(div, r, c, 1);
                loseAlertCounter++;
            }
        }
    }
    if (loseAlertCounter === numOfMines) {
        var message = document.getElementById('message');
        message.innerText = "You have lost the game!";
    }
};

/**
 * expandRequested returns a valid expansion request is where the cell clicked has already been
 * revealed and has exactly as many flagged neighbors as its own value.
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @returns true if the number of flags marked on the adjacent cells are equal to the number on the revealed cell clicked
 */
function expandRequested(row, col) {
    var target = document.querySelector(`[x="${row}"][y="${col}"]`);
    if (!target.classList.contains('revealed')) return false;

    var flagCount = 0;
    var neighbors = getNeighbors(row, col);
    for (var i = 0; i < neighbors.length; i++) {
        var r = neighbors[i].row;
        var c = neighbors[i].col;
        var neighbor = document.querySelector(`[x="${r}"][y="${c}"]`);
        if (!neighbor.classList.contains('revealed') && field[r][c].flagged) {
            flagCount++;
        }
    }

    return flagCount === field[row][col].val;
};

/**
 * toggleFlag switches styling to display a flagged or unflagged cell.
 * @param {Node} target target node
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @param {Boolean} forceFlag allows an already-flagged cell to stay flagged
 * @returns if the game has ended or the cell clicked is revealed
 */
function toggleFlag(target, row, col, forceFlag) {
    var displayCell = target;

    if (gameEnded() || displayCell.classList.contains('revealed')) return;

    var cell = field[row][col];
    if (!field[row][col].flagged) {
        displayCell.classList.remove('hidden');
        displayCell.classList.add('flag');
        cellsFlagged++;
        cell.flagged = true;
    } else if (!forceFlag) {
        displayCell.classList.remove('flag');
        displayCell.classList.add('hidden');
        cellsFlagged--;
        cell.flagged = false;
    } else {
        displayCell.classList.remove('flag');
        displayCell.classList.add('hidden');
        cellsFlagged--;
        cell.flagged = false;
    }
    flagCount = (numOfMines - cellsFlagged);
    var span = document.getElementById('remainingMine');
    span.innerText = flagCount;
};

/**
 * getNeighbors returns a list of coordinates for cells adjacent to this row and column.
 * @param {Number} row row number of the given cell
 * @param {Number} col col number of the given cell
 * @returns array of neighbors
 */
function getNeighbors(row, col) {
    var neighbors = [];
    for (var r = row - 1; r <= row + 1; r++) {
        for (var c = col - 1; c <= col + 1; c++) {
            if (0 <= r && r < field.length
                && 0 <= c && c < field[0].length
                && !(r == row && c == col)) {
                neighbors.push({ row: r, col: c });
            }
        }
    }
    return neighbors;
};

function createTile(x, y) {
    var tile = document.createElement("div");
    tile.onclick = handleTileClick;

    tile.classList.add("tile");
    tile.classList.add("hidden");
    tile.setAttribute('x', x);
    tile.setAttribute('y', y);

    tile.addEventListener("auxclick", function (e) { e.preventDefault(); }); // Middle Click
    tile.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // Right Click
    tile.addEventListener("mouseup", handleTileClick); // All Clicks

    return tile;
}

function startGame() {
    buildGrid(rows, columns);
    initField(rows, columns);
    setMines(numOfMines, rows, columns);
    startTimer();
}

function smileyDown() {
    var smiley = document.getElementById("smiley");
    smiley.classList.add("face_limbo");
}

function smileyUp() {
    var smiley = document.getElementById("smiley");
    smiley.classList.remove("face_down");
}

function handleTileClick(event) {
    let x = Number(event.target.getAttribute('x'));
    let y = Number(event.target.getAttribute('y'));

    // do nothing if already lost
    if (gameEnded()) return;

    // Left Click
    if (event.which === 1) {
        //TODO reveal the tile
        if (!event.target.classList.contains('revealed')) revealCell(event.target, x, y);
    }
    // Middle Click
    else if (event.which === 2) {
        //TODO try to reveal adjacent tiles
        if (expandRequested(x, y)) {
            var neighbors = getNeighbors(x, y);
            for (var i = 0; i < neighbors.length; i++) {
                var target = document.querySelector(`[x="${neighbors[i].row}"][y="${neighbors[i].col}"]`);
                revealCell(target, neighbors[i].row, neighbors[i].col);
                if (gameEnded()) return;
            }
        }
    }
    // Right Click
    else if (event.which === 3) {
        //TODO toggle a tile flag
        toggleFlag(event.target, x, y);
    }
}

function setDifficulty() {
    var difficultySelector = document.getElementById("difficulty");
    var difficulty = difficultySelector.selectedIndex;

    //TODO implement me    
    let easyGrid = { rows: 9, columns: 9, mines: 10 }; // Easy
    let mediumGrid = { rows: 16, columns: 16, mines: 40 }; // Medium
    let hardGrid = { rows: 30, columns: 30, mines: 99 }; // Hard

    switch (difficulty) {
        case 0:
        default:
            rows = easyGrid.rows;
            columns = easyGrid.columns;
            numOfMines = easyGrid.mines;
            break;
        case 1:
            rows = mediumGrid.rows;
            columns = mediumGrid.columns;
            numOfMines = mediumGrid.mines;
            break;
        case 2:
            rows = hardGrid.rows;
            columns = hardGrid.columns;
            numOfMines = hardGrid.mines;
            break;
    }
}

function startTimer() {
    time = 0;
    timerId = window.setInterval(onTimerTick, 1000);
}

function onTimerTick() {
    time++;
    updateTimer();
}

function updateTimer() {
    document.getElementById("timer").innerHTML = time;
}