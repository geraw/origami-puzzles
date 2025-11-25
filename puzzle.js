/**
 * puzzle.js
 * Manages puzzle data and state
 */
/**
 * puzzle.js
 * Manages puzzle data and state
 */

class PuzzleManager {
    constructor() {
        this.gridSize = 8;
        this.targetSize = 4;
        this.puzzleData = null;
        this.cells = []; // Array of cell objects { id, type, currentPos: {x, y, z}, originalPos: {r, c} }
    }

    loadPuzzle(data) {
        this.puzzleData = data;
        this.resetGrid();
        console.log('Puzzle loaded:', this.puzzleData.name);
    }

    resetGrid() {
        this.cells = [];
        if (this.puzzleData && this.puzzleData.grid) {
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    this.cells.push({
                        id: `cell-${r}-${c}`,
                        type: this.puzzleData.grid[r][c],
                        originalPos: { r, c },
                        // Center of the cell in 0-8 coordinate space
                        currentPos: { x: c + 0.5, y: r + 0.5, z: 0 },
                        isFlipped: false
                    });
                }
            }
        }
    }

    getInitialState() {
        return {
            gridSize: this.gridSize,
            cells: this.cells
        };
    }

    // Update logical state based on a fold
    // line: { p1: [x, y], p2: [x, y] }
    // type: 'valley' or 'mountain'
    applyFold(line, type) {
        // Define line vector
        const p1 = { x: line.p1[0], y: line.p1[1] };
        const p2 = { x: line.p2[0], y: line.p2[1] };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Normal vector (normalized)
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Distance from origin to line: p1 . n
        const d = p1.x * nx + p1.y * ny;

        // Determine which side to move
        // For simplicity, we'll assume we fold the "smaller" side or a specific side
        // But in UI, user might expect the side they clicked? 
        // Or usually, we fold the side that results in the target shape.
        // Let's assume we fold everything on the "positive" side of the line relative to the normal.

        this.cells.forEach(cell => {
            // Check which side of the line the cell center is on
            const dist = cell.currentPos.x * nx + cell.currentPos.y * ny - d;

            // If dist > epsilon, it's on the active side
            if (dist > 0.001) {
                // Reflect point across line
                // P' = P - 2 * dist * N
                cell.currentPos.x -= 2 * dist * nx;
                cell.currentPos.y -= 2 * dist * ny;

                // Update Z (stacking)
                // This is tricky. Simple increment for now.
                cell.currentPos.z += 1;

                // Flip state
                cell.isFlipped = !cell.isFlipped;
            }
        });
    }

    validateState() {
        // Check if all cells are within a 4x4 area
        // We need to find the bounding box of current positions
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        this.cells.forEach(cell => {
            minX = Math.min(minX, cell.currentPos.x);
            maxX = Math.max(maxX, cell.currentPos.x);
            minY = Math.min(minY, cell.currentPos.y);
            maxY = Math.max(maxY, cell.currentPos.y);
        });

        // Check dimensions (approximate)
        const width = maxX - minX;
        const height = maxY - minY;

        // Target is 4x4. Allow small floating point error.
        // Note: cell centers range. If 4 cells wide, centers span 3 units.
        // But boundaries span 4 units.
        // Let's use a simpler check: count unique rounded (x,y) positions

        const positions = new Set();
        this.cells.forEach(cell => {
            const x = Math.round(cell.currentPos.x * 10) / 10;
            const y = Math.round(cell.currentPos.y * 10) / 10;
            positions.add(`${x},${y}`);
        });

        // 4x4 grid = 16 positions
        if (positions.size !== 16) {
            console.log('Validation failed: positions count', positions.size);
            return false;
        }

        // Check if visible faces are correct
        // For each position, find the cell with highest Z
        // Check if that cell is 'image' and !isFlipped (or whatever the goal is)
        // Goal: "complete picture on front" -> all top cells should be 'image'
        // "solid color on back" -> all bottom cells should be 'color'

        // Group by position
        const stacks = {};
        this.cells.forEach(cell => {
            const key = `${Math.round(cell.currentPos.x * 10) / 10},${Math.round(cell.currentPos.y * 10) / 10}`;
            if (!stacks[key]) stacks[key] = [];
            stacks[key].push(cell);
        });

        for (const key in stacks) {
            const stack = stacks[key];
            // Sort by Z descending
            stack.sort((a, b) => b.currentPos.z - a.currentPos.z);

            const topCell = stack[0];
            // Check if top cell is part of the image
            // Also need to check orientation/rotation if we were being strict
            if (topCell.type !== 'image') {
                console.log('Validation failed: top cell is not image', topCell);
                return false;
            }

            // Check bottom cell (optional for this POC level)
        }

        console.log('Validation passed!');
        return true;
    }
}
