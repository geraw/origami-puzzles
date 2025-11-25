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

        // If we don't have a graph yet (initial load), build it
        if (!this.graph || !this.graph.vertices_coords) {
            this.graph = this.buildGraphFromManager();
        }

        // Use Rabbit Ear to render
        if (window.ear && window.ear.svg) {
            const svg = window.ear.svg(this.container, this.graph);

            // Add a viewBox to ensure it fits
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

            // Apply styles and textures to faces
            const faceGroup = svg.querySelector('#faces');
            if (faceGroup && this.puzzleManager && this.puzzleManager.puzzleData.image_url) {
                const imageUrl = this.puzzleManager.puzzleData.image_url;

                // We need to add definitions for clip paths
                let defs = svg.querySelector('defs');
                if (!defs) {
                    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                    svg.insertBefore(defs, svg.firstChild);
                }

                Array.from(faceGroup.children).forEach((path, i) => {
                    // Apply classes first
                    if (this.graph.faces_classes && this.graph.faces_classes[i]) {
                        path.classList.add(this.graph.faces_classes[i]);
                    }
                    if (this.graph.faces_flipped && this.graph.faces_flipped[i]) {
                        path.classList.add('flipped');
                    }

                    // Apply texture if it's an "image" face and NOT flipped (or flipped if back is image?)
                    // Let's assume "image" class means it shows the image.
                    if (this.graph.faces_classes && this.graph.faces_classes[i] === 'image') {
                        // We need to calculate the transform from the INITIAL face to the CURRENT face.
                        // 1. Get initial vertices of this face
                        const initialVertices = this.initialState.faces_vertices[i].map(vIdx => this.initialState.vertices_coords[vIdx]);
                        // 2. Get current vertices of this face
                        const currentVertices = this.graph.faces_vertices[i].map(vIdx => this.graph.vertices_coords[vIdx]);

                        // Calculate affine transform matrix
                        // We need to map initial triangle to current triangle.
                        // We can use the first 3 vertices.
                        if (initialVertices.length >= 3 && currentVertices.length >= 3) {
                            const matrix = this.calculateAffineTransform(initialVertices, currentVertices);

                            // Create a clip path for this face
                            const clipId = `clip-face-${i}`;
                            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                            clipPath.setAttribute('id', clipId);
                            // Clone the path geometry for clipping
                            const clipPathGeometry = path.cloneNode(true);
                            clipPathGeometry.removeAttribute('class');
                            clipPathGeometry.removeAttribute('id');
                            clipPath.appendChild(clipPathGeometry);
                            defs.appendChild(clipPath);

                            // Create the image element
                            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                            image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl);
                            // Image size should match the puzzle bounds (0,0 to 2,2 for sample)
                            // Let's assume image covers 0,0 to 2,2
                            image.setAttribute('x', '0');
                            image.setAttribute('y', '0');
                            image.setAttribute('width', '2'); // Hardcoded for sample 2x2
                            image.setAttribute('height', '2');
                            image.setAttribute('preserveAspectRatio', 'none');

                            // Apply clip path
                            image.setAttribute('clip-path', `url(#${clipId})`);

                            // Apply transform
                            // The transform maps the initial coordinate system to the current one.
                            // Since the image is defined in the initial coordinate system, applying this matrix
                            // should move the image pixels to the correct place.
                            image.setAttribute('transform', `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`);

                            // Insert image after the path (so it draws on top)
                            // Or replace the path fill?
                            // Better: make the path transparent and draw image on top?
                            // Or put image inside a group with the path?
                            // Let's append to faceGroup for now, but we need to ensure order.
                            // Actually, Rabbit Ear renders paths. We can just append the image after the path.
                            path.parentNode.insertBefore(image, path.nextSibling);

                            // Make the path transparent so we see the image, but keep stroke
                            path.style.fill = 'none';
                        }
                    }
                });
            } else if (faceGroup) {
                // Fallback for no texture
                Array.from(faceGroup.children).forEach((path, i) => {
                    if (this.graph.faces_classes && this.graph.faces_classes[i]) {
                        path.classList.add(this.graph.faces_classes[i]);
                    }
                    if (this.graph.faces_flipped && this.graph.faces_flipped[i]) {
                        path.classList.add('flipped');
                    }
                });
            }
        }
    }

    // Helper to calculate affine transform matrix from 3 points to 3 points
    calculateAffineTransform(src, dst) {
        // src: [[x0, y0], [x1, y1], [x2, y2]]
        // dst: [[u0, v0], [u1, v1], [u2, v2]]
        // We want matrix M such that M * src_i = dst_i
        // [a c e] [x]   [u]
        // [b d f] [y] = [v]
        // [0 0 1] [1]   [1]

        // This is a system of linear equations.
        // We can solve it by computing M = D * S^-1 where D is destination matrix and S is source matrix.
        // But simpler to just solve explicitly or use a library.
        // Let's implement a simple solver for 3 points.

        const x0 = src[0][0], y0 = src[0][1];
        const x1 = src[1][0], y1 = src[1][1];
        const x2 = src[2][0], y2 = src[2][1];

        const u0 = dst[0][0], v0 = dst[0][1];
        const u1 = dst[1][0], v1 = dst[1][1];
        const u2 = dst[2][0], v2 = dst[2][1];

        // Denominator
        const den = x0 * (y1 - y2) - y0 * (x1 - x2) + (x1 * y2 - x2 * y1);

        if (Math.abs(den) < 1e-6) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; // Degenerate

        const a = (u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1)) / den;
        const b = (v0 * (y1 - y2) - y0 * (v1 - v2) + (v1 * y2 - v2 * y1)) / den;
        const c = (x0 * (u1 - u2) - u0 * (x1 - x2) + (x1 * u2 - x2 * u1)) / den;
        const d = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / den;
        const e = (x0 * (y1 * u2 - y2 * u1) - y0 * (x1 * u2 - x2 * u1) + (x1 * y2 * u0 - x2 * y1 * u0)) / den;
        const f = (x0 * (y1 * v2 - y2 * v1) - y0 * (x1 * v2 - x2 * v1) + (x1 * y2 * v0 - x2 * y1 * v0)) / den;

        return { a, b, c, d, e, f };
    }
}
