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

        if (this.puzzleManager) {
            this.puzzleManager.applyFold(foldLine, foldType);
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.graph = this.history.pop();
            console.log('Undo performed');
            // Note: syncing with PuzzleManager might be needed here
        }
    }

    canUndo() {
        return this.history.length > 0;
    }

    previewFold(foldLine) {
        console.log('Previewing fold', foldLine);
    }

    reset() {
        if (this.history.length > 0) {
            this.history = [];
            this.initialize();
            if (this.puzzleManager) this.puzzleManager.resetGrid();
        }
    }

    getCurrentState() {
        return this.graph;
    }
}
