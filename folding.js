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

        // Generate edges from faces
        // This is a naive implementation that creates edges for every face side.
        // Rabbit Ear can handle duplicate edges or we can deduplicate.
        // For rendering, simple edges are fine.
        const edges_vertices = [];
        const edges_assignment = [];

        faces_vertices.forEach(face => {
            for (let i = 0; i < face.length; i++) {
                const u = face[i];
                const v = face[(i + 1) % face.length];
                // Check if edge exists (undirected)
                // For now, just add all, Rabbit Ear might clean it up or we just render them.
                edges_vertices.push([u, v]);
                edges_assignment.push('B'); // Boundary or Unassigned
            }
        });

        return {
            vertices_coords,
            faces_vertices,
            faces_classes,
            edges_vertices,
            edges_assignment
        };
    }

    render() {
        if (!this.container) {
            console.error('FoldingEngine: Container not found');
            return;
        }
        this.container.innerHTML = '';

        console.log('FoldingEngine: render called', this.graph);

        // If we don't have a graph yet (initial load), build it
        if (!this.graph || !this.graph.vertices_coords) {
            console.log('FoldingEngine: Building graph from manager');
            this.graph = this.buildGraphFromManager();
        }

        if (!this.graph || !this.graph.vertices_coords) {
            console.error('FoldingEngine: Graph is invalid', this.graph);
            return;
        }

        // Custom SVG Rendering
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        this.container.appendChild(svg);

        // Calculate bounds for viewBox
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

        // Create defs for clip paths
        const defs = document.createElementNS(svgNS, 'defs');
        svg.appendChild(defs);

        // Create group for faces
        const facesGroup = document.createElementNS(svgNS, 'g');
        facesGroup.setAttribute('id', 'faces');
        svg.appendChild(facesGroup);

        // Render Faces
        if (this.graph.faces_vertices) {
            this.graph.faces_vertices.forEach((faceIndices, i) => {
                const path = document.createElementNS(svgNS, 'path');

                // Build path data
                const points = faceIndices.map(idx => this.graph.vertices_coords[idx]);
                const d = `M ${points[0][0]} ${points[0][1]} ` +
                    points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') +
                    ' Z';
                path.setAttribute('d', d);

                // Apply classes
                if (this.graph.faces_classes && this.graph.faces_classes[i]) {
                    path.classList.add(this.graph.faces_classes[i]);
                }
                if (this.graph.faces_flipped && this.graph.faces_flipped[i]) {
                    path.classList.add('flipped');
                }

                facesGroup.appendChild(path);

                // Texture Mapping
                if (this.puzzleManager && this.puzzleManager.puzzleData.image_url &&
                    this.graph.faces_classes && this.graph.faces_classes[i] === 'image') {

                    const imageUrl = this.puzzleManager.puzzleData.image_url;

                    // Calculate transform
                    const initialVertices = this.initialState.faces_vertices[i].map(vIdx => this.initialState.vertices_coords[vIdx]);
                    const currentVertices = points;

                    if (initialVertices.length >= 3 && currentVertices.length >= 3) {
                        const matrix = this.calculateAffineTransform(initialVertices, currentVertices);

                        // Create clip path
                        const clipId = `clip-face-${i}`;
                        const clipPath = document.createElementNS(svgNS, 'clipPath');
                        clipPath.setAttribute('id', clipId);
                        const clipPathGeometry = path.cloneNode(true);
                        clipPathGeometry.removeAttribute('class');
                        clipPathGeometry.removeAttribute('id');
                        clipPath.appendChild(clipPathGeometry);
                        defs.appendChild(clipPath);

                        // Create image
                        const image = document.createElementNS(svgNS, 'image');
                        image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl);
                        image.setAttribute('x', '0');
                        image.setAttribute('y', '0');
                        image.setAttribute('width', '2'); // Hardcoded for sample 2x2
                        image.setAttribute('height', '2');
                        image.setAttribute('preserveAspectRatio', 'none');
                        image.setAttribute('clip-path', `url(#${clipId})`);
                        image.setAttribute('transform', `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`);

                        // Append image after path
                        facesGroup.appendChild(image);

                        // Make path transparent
                        path.style.fill = 'none';
                    }
                }
            });
        }

        // Render Edges (Creases)
        const edgesGroup = document.createElementNS(svgNS, 'g');
        edgesGroup.setAttribute('id', 'edges');
        svg.appendChild(edgesGroup);

        if (this.graph.edges_vertices) {
            this.graph.edges_vertices.forEach((edgeIndices, i) => {
                const u = this.graph.vertices_coords[edgeIndices[0]];
                const v = this.graph.vertices_coords[edgeIndices[1]];

                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', u[0]);
                line.setAttribute('y1', u[1]);
                line.setAttribute('x2', v[0]);
                line.setAttribute('y2', v[1]);
                line.classList.add('crease');

                // Add specific classes if we have edge assignments (M/V)
                if (this.graph.edges_assignment && this.graph.edges_assignment[i]) {
                    line.classList.add(this.graph.edges_assignment[i]);
                }

                edgesGroup.appendChild(line);
            });
        }
    }

    // Helper to calculate affine transform matrix from 3 points to 3 points
    calculateAffineTransform(src, dst) {
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
