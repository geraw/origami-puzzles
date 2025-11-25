/**
 * app.js
 * Main application entry point
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Origami Puzzle Solver initializing...');

    // Initialize components
    const puzzleManager = new PuzzleManager();
    const foldingEngine = new FoldingEngine();

    // Link them
    foldingEngine.setPuzzleManager(puzzleManager);

    // Load sample puzzle
    try {
        const response = await fetch('puzzles/sample-easy.json');
        const puzzleData = await response.json();
        puzzleManager.loadPuzzle(puzzleData);
        foldingEngine.initialize(puzzleManager.getInitialState());

        updateUI();
    } catch (error) {
        console.error('Failed to load puzzle:', error);
        document.getElementById('status-message').textContent = 'Error loading puzzle data.';
    }

    // UI Elements
    const btnValley = document.getElementById('btn-valley');
    const btnMountain = document.getElementById('btn-mountain');
    const btnExecute = document.getElementById('btn-execute');
    const btnUndo = document.getElementById('btn-undo');
    const btnReset = document.getElementById('btn-reset');
    const btnValidate = document.getElementById('btn-validate');
    const statusMsg = document.getElementById('status-message');

    let currentFoldType = 'valley'; // 'valley' or 'mountain'
    let proposedFold = null; // { p1: [x, y], p2: [x, y] }

    // Event Listeners

    btnValley.addEventListener('click', () => {
        currentFoldType = 'valley';
        btnValley.classList.add('active');
        btnMountain.classList.remove('active');
        statusMsg.textContent = 'Selected: Valley Fold. Click two points to define fold line.';
    });

    btnMountain.addEventListener('click', () => {
        currentFoldType = 'mountain';
        btnMountain.classList.add('active');
        btnValley.classList.remove('active');
        statusMsg.textContent = 'Selected: Mountain Fold. Click two points to define fold line.';
    });

    btnExecute.addEventListener('click', () => {
        if (proposedFold) {
            foldingEngine.executeFold(proposedFold, currentFoldType);
            proposedFold = null;
            btnExecute.disabled = true;
            updateUI();
            statusMsg.textContent = 'Fold executed.';
        }
    });

    btnUndo.addEventListener('click', () => {
        foldingEngine.undo();
        updateUI();
        statusMsg.textContent = 'Last fold undone.';
    });

    btnReset.addEventListener('click', () => {
        foldingEngine.reset();
        updateUI();
        statusMsg.textContent = 'Puzzle reset.';
    });

    btnValidate.addEventListener('click', () => {
        const isValid = puzzleManager.validateState(foldingEngine.getCurrentState());
        const resultEl = document.getElementById('validation-result');
        resultEl.classList.remove('hidden', 'success', 'error');

        if (isValid) {
            resultEl.textContent = 'Success! Puzzle Solved!';
            resultEl.classList.add('success');
        } else {
            resultEl.textContent = 'Not quite right yet. Keep trying!';
            resultEl.classList.add('error');
        }
    });

    // Interaction handling for the SVG
    // Note: Rabbit Ear handles the SVG rendering, we need to attach listeners to it
    // This is a simplified placeholder for the interaction logic
    function setupInteraction() {
        const svg = document.querySelector('.puzzle-container svg');
        if (!svg) return;

        let firstPoint = null;

        svg.addEventListener('click', (e) => {
            // Convert screen coords to SVG coords
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

            // Snap to grid (assuming 0-1 coordinate space for 8x8 grid)
            // This logic will need refinement based on exact Rabbit Ear coordinate system
            const x = Math.round(svgP.x * 8) / 8;
            const y = Math.round(svgP.y * 8) / 8;

            if (!firstPoint) {
                firstPoint = { x, y };
                statusMsg.textContent = `Point 1 selected at (${x}, ${y}). Select second point.`;

                // Visual feedback for first point would go here
            } else {
                const secondPoint = { x, y };

                if (firstPoint.x === secondPoint.x && firstPoint.y === secondPoint.y) {
                    statusMsg.textContent = 'Points must be different. Select second point.';
                    return;
                }

                proposedFold = {
                    p1: [firstPoint.x, firstPoint.y],
                    p2: [secondPoint.x, secondPoint.y]
                };

                statusMsg.textContent = `Fold line defined. Click Execute to perform ${currentFoldType} fold.`;
                btnExecute.disabled = false;

                // Visual feedback for fold line would go here
                foldingEngine.previewFold(proposedFold);

                firstPoint = null;
            }
        });
    }

    function updateUI() {
        btnUndo.disabled = !foldingEngine.canUndo();
        // Re-attach listeners if SVG was re-rendered
        setTimeout(setupInteraction, 100);
    }
});
