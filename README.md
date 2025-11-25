# Origami Puzzle Solver

A web-based proof of concept for solving Foldology-style origami puzzles using the Rabbit Ear JavaScript library.

## Overview

This application presents an 8x8 grid puzzle that users must fold into a 4x4 square. The goal is to have a complete picture on one side and a solid color on the other.

## Features

- **Interactive Grid**: 8x8 puzzle grid rendered using SVG.
- **Fold Controls**: Support for Valley and Mountain folds.
- **Undo/Reset**: Ability to undo folds or reset the puzzle.
- **Validation**: Check if the current state solves the puzzle.
- **Modern UI**: Dark mode design with glassmorphism effects.

## How to Run

1. Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge).
2. No build step is required for this POC version.

## How to Use

1. **Select Fold Type**: Choose between "Valley Fold" (fold towards you) or "Mountain Fold" (fold away).
2. **Define Fold Line**: Click two points on the grid to define the line you want to fold along.
3. **Execute Fold**: Click the "Execute Fold" button to perform the fold.
4. **Check Solution**: When you think you've solved it, click "Check Solution".

## Technologies

- **Rabbit Ear**: JavaScript library for origami and graph theory.
- **Vanilla JS/CSS**: Core application logic and styling.

## Future Improvements

- Implement full geometric folding simulation (currently simplified).
- Add more complex puzzle definitions.
- Enhance validation logic.
