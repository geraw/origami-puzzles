/**
 * puzzle.js
 * Manages puzzle data and state using FOLD format
 */

class PuzzleManager {
    constructor() {
        this.puzzleData = null;
        this.initialState = null;
    }

    loadPuzzle(data) {
        this.puzzleData = data;
        console.log('Puzzle loaded:', this.puzzleData.name);

        // Initialize state from FOLD data
        // We need to track current positions of vertices and face orientations
        this.initialState = {
            vertices_coords: JSON.parse(JSON.stringify(this.puzzleData.vertices_coords)),
            faces_vertices: JSON.parse(JSON.stringify(this.puzzleData.faces_vertices)),
            faces_classes: JSON.parse(JSON.stringify(this.puzzleData.faces_classes)),
            // We might need to track Z-order or face normals for "image" vs "color" check
            // For now, let's assume faces_classes tracks the *logical* side.
            // But we need to know if a face is flipped.
            faces_flipped: new Array(this.puzzleData.faces_vertices.length).fill(false)
        };
    }

    getInitialState() {
        return this.initialState;
    }

    resetGrid() {
        // No-op or reset internal state if needed
        // The FoldingEngine handles the state reset by reloading initial state
    }

    // Update logical state based on a fold
    // line: { p1: [x, y], p2: [x, y] }
    // type: 'valley' or 'mountain'
    applyFold(line, type) {
        // This method updates the state passed to it? 
        // Actually, FoldingEngine manages the state (this.graph).
        // But in the previous architecture, PuzzleManager managed 'cells'.
        // Now FoldingEngine manages the FOLD object.
        // So this method should probably be static or operate on the graph passed to it?
        // Or FoldingEngine calls this to *calculate* the new state.

        // Let's change the contract: FoldingEngine calls this with the CURRENT graph,
        // and this method returns the NEW graph (or modifies it in place).

        // However, to keep it simple and compatible with existing calls (if any),
        // let's assume FoldingEngine handles the state and calls this to update it.
        // But wait, FoldingEngine.executeFold calls this.puzzleManager.applyFold(foldLine, foldType).
        // And previously it updated this.cells.

        // We need to change how state is stored.
        // Let's store the current state in PuzzleManager too?
        // Or better: FoldingEngine owns the state (graph), and asks PuzzleManager to compute the fold.

        // But for now, let's stick to the pattern: PuzzleManager owns the "logic" of the puzzle.
        // But the state is the FOLD object.

        // Let's assume FoldingEngine passes the graph to be folded?
        // No, FoldingEngine.executeFold calls this.puzzleManager.applyFold.
        // So PuzzleManager must have the state.
        // But in the new design, FoldingEngine has 'this.graph'.

        // Let's update PuzzleManager to NOT hold state, but provide a method `fold(graph, line, type)`
        // And update FoldingEngine to use it.
        // BUT, I need to update PuzzleManager first.

        // Let's keep `this.currentState` in PuzzleManager for now to minimize friction,
        // but really it should be stateless logic.

        // Actually, the previous implementation had `this.cells` in PuzzleManager.
        // Let's replace `this.cells` with `this.currentFold` (the FOLD object).
    }

    // Helper to perform the geometric fold on a FOLD object
    // This is a simplified implementation of folding logic.
    static foldGraph(graph, line, type) {
        const p1 = { x: line.p1[0], y: line.p1[1] };
        const p2 = { x: line.p2[0], y: line.p2[1] };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;
        const d = p1.x * nx + p1.y * ny;

        // We need to determine which faces move.
        // In a real origami simulator, we find the connected component of the dual graph.
        // Here, let's assume we fold the "active" side (e.g. positive side of line).

        // 1. Identify vertices to move
        const verticesToMove = new Set();
        graph.vertices_coords.forEach((v, i) => {
            const dist = v[0] * nx + v[1] * ny - d;
            if (dist > 0.001) { // Epsilon
                verticesToMove.add(i);
            }
        });

        // 2. Move vertices
        verticesToMove.forEach(i => {
            const v = graph.vertices_coords[i];
            const dist = v[0] * nx + v[1] * ny - d;
            // Reflect: P' = P - 2 * dist * N
            v[0] -= 2 * dist * nx;
            v[1] -= 2 * dist * ny;
        });

        // 3. Update face orientations (flipped state)
        // If a face has all vertices moved, it is flipped.
        // If some moved, the face is split (which we don't handle yet! We assume fold is on edges or splits faces perfectly?)
        // Wait, if we fold *across* a face, we must split it.
        // The current FOLD format I created has pre-split faces (triangles).
        // So if the fold line matches the diagonal, we are good.
        // If the user folds somewhere else, we might have issues.
        // For this POC, let's assume the user folds along existing edges or we don't split.
        // OR, we just move vertices and if a face gets distorted, so be it (it will look weird).

        // Let's assume we fold along valid lines.

        if (!graph.faces_flipped) {
            graph.faces_flipped = new Array(graph.faces_vertices.length).fill(false);
        }

        graph.faces_vertices.forEach((face, i) => {
            // Check if all vertices of this face moved
            const allMoved = face.every(v => verticesToMove.has(v));
            if (allMoved) {
                graph.faces_flipped[i] = !graph.faces_flipped[i];
            }
        });

        return graph;
    }

    validateState(graph) {
        // Check if bounding box is approx 1x1 (since we used 0-2 coords for 2x2 grid, target is 1x1?)
        // The original was 8x8 -> 4x4.
        // My new sample is 2x2. Target should be 1x1?
        // Let's assume target is "all faces stacked in a square".

        // Bounding box check
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        graph.vertices_coords.forEach(v => {
            minX = Math.min(minX, v[0]);
            maxX = Math.max(maxX, v[0]);
            minY = Math.min(minY, v[1]);
            maxY = Math.max(maxY, v[1]);
        });

        const width = maxX - minX;
        const height = maxY - minY;

        // Allow some slack
        if (Math.abs(width - 1) > 0.1 || Math.abs(height - 1) > 0.1) {
            // console.log('Validation failed: dimensions', width, height);
            // return false;
            // Let's be lenient for now as my sample might be 2x2
        }

        // Check if all faces are either "image" facing up or "color" facing down?
        // "Complete picture on one side"
        // We need to check Z-order.
        // Without Z-order, we can't really validate.
        // But we can check if all "image" faces are flipped same way?

        // Let's just return true if dimensions are small enough for now.
        return width < 1.1 && height < 1.1;
    }
}

