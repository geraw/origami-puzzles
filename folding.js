/**
 * folding.js
 * Handles folding mechanics using Rabbit Ear
 */

class FoldingEngine {
    constructor() {
        this.graph = null;
        this.history = [];
        this.container = document.getElementById('puzzle-container');
        this.puzzleManager = null;
        this.initialState = null;
    }

    setPuzzleManager(puzzleManager) {
        this.puzzleManager = puzzleManager;
    }

    initialize(initialState) {
        if (initialState) {
            this.initialState = initialState;
        }
        // Deep copy initial state to graph
        this.graph = JSON.parse(JSON.stringify(this.initialState || {}));
        console.log('FoldingEngine initialized');

        // Render the puzzle
        this.history.push(JSON.parse(JSON.stringify(this.graph)));
        this.render();
    }

    undo() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current state
            this.graph = JSON.parse(JSON.stringify(this.history[this.history.length - 1]));
            console.log('Undo performed');
            this.render();
        }
    }

    canUndo() {
        return this.history.length > 1;
    }

    previewFold(foldLine) {
        console.log('Previewing fold', foldLine);
        // Could implement a ghost fold here
    }

    executeFold(foldLine, foldType) {
        if (!this.puzzleManager) return;

        // Use PuzzleManager's static helper to fold the graph
        // We pass the current graph and get a modified one back (or modified in place)
        // Since foldGraph modifies in place, we should probably clone first if we want to be safe,
        // but we are pushing to history *after* modification anyway.
        // Wait, undo pops the *previous* state.
        // So we modify 'this.graph' in place, then push a copy.

        PuzzleManager.foldGraph(this.graph, foldLine, foldType);

        this.history.push(JSON.parse(JSON.stringify(this.graph)));
        this.render();
    }

    reset() {
        if (this.history.length > 0) {
            this.history = [];
            if (this.puzzleManager) {
                this.puzzleManager.resetGrid();
                this.initialize(this.puzzleManager.getInitialState());
            } else {
                this.initialize();
            }
        }
    }

    getCurrentState() {
        return this.graph;
    }

    buildGraphFromManager() {
        // Construct a FOLD object from the PuzzleManager's cells
        // This is a simplified representation where each cell is a face

        const vertices_coords = [];
        const faces_vertices = [];
        const faces_classes = [];

        if (!this.puzzleManager) return {};

        const cells = this.puzzleManager.cells;

        // We need to map 0-8 coordinates to SVG viewbox
        // Let's assume 0-1 range for Rabbit Ear
        const scale = 1 / 8;

        cells.forEach(cell => {
            // Calculate corners based on currentPos (center) and orientation
            // This is tricky if we support rotation.
            // For simple valley/mountain folds on grid lines, we might just have translation/flipping.

            // Let's assume simple grid cells for now.
            // If we want to show them "folded", we need their actual 3D coordinates projected to 2D.
            // PuzzleManager gives us x,y,z.

            const cx = cell.currentPos.x * scale;
            const cy = cell.currentPos.y * scale;
            const r = 0.5 * scale; // Half width

            // 4 corners
            const vStart = vertices_coords.length;
            vertices_coords.push([cx - r, cy - r]);
            vertices_coords.push([cx + r, cy - r]);
            vertices_coords.push([cx + r, cy + r]);
            vertices_coords.push([cx - r, cy + r]);

            faces_vertices.push([vStart, vStart + 1, vStart + 2, vStart + 3]);
            faces_classes.push(cell.type);
        });

        return {
            vertices_coords,
            faces_vertices,
            faces_classes
        };
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // Use Rabbit Ear to render
        if (window.ear && window.ear.svg) {
            const svg = window.ear.svg(this.container, this.graph);

            // Apply styles to faces
            const faceGroup = svg.querySelector('#faces');
            if (faceGroup) {
                Array.from(faceGroup.children).forEach((path, i) => {
                    if (this.graph.faces_classes && this.graph.faces_classes[i]) {
                        path.classList.add(this.graph.faces_classes[i]);
                    }
                    // Check if flipped
                    if (this.graph.faces_flipped && this.graph.faces_flipped[i]) {
                        path.classList.add('flipped');
                    }
                });
            }

            // Add a viewBox to ensure it fits?
            if (!svg.getAttribute('viewBox')) {
                // Calculate bounds
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                this.graph.vertices_coords.forEach(v => {
                    minX = Math.min(minX, v[0]);
                    maxX = Math.max(maxX, v[0]);
                    minY = Math.min(minY, v[1]);
                    maxY = Math.max(maxY, v[1]);
                });
                const padding = 0.1;
                const w = maxX - minX + padding * 2;
                const h = maxY - minY + padding * 2;
                svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${w} ${h}`);
            }
        }
    }
}
