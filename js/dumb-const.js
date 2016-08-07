"use strict";

// Color constants
const BLACK = 0;
const WHITE = 1;

// Piece constants
const KING      = 0;
const QUEEN     = 1;
const ROOK      = 2;
const BISHOP    = 3;
const KNIGHT    = 4;
const PAWN      = 5;

// Names
const COLOR_NAMES = ["Black", "White"];
const PIECE_NAMES = ["King", "Queen", "Rook", "Bishop", "Knight", "Pawn"];

// Algebraic notation
const PIECE_ALG   = ["K", "Q", "R", "B", "N", ""];

// Material values
const MATERIAL    = [0, 100, 50, 30, 30, 10];

// Letters to name columns
const LETTERS   = "abcdefgh";

// Move constants
const KING_MOVES = [
    [-1, -1],
    [-1,  0],
    [-1, +1],
    [ 0, -1],
    [ 0, +1],
    [+1, -1],
    [+1,  0],
    [+1, +1]
];
const KNIGHT_MOVES = [
    [-2, -1],
    [-2, +1],
    [-1, -2],
    [-1, +2],
    [+1, -2],
    [+1, +2],
    [+2, -1],
    [+2, +1]
];

// Evaluation constants
const MATE     = 999999999;
const INFINITY = (MATE + 1);
const DRAW     = 0;

// Game constants
const HUMAN    = 0;
const COMPUTER = 1;
