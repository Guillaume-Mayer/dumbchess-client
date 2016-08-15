"use strict";

// Piece object
/** @constructor */
function Piece(color, piece) {
    this.color = color;
    this.piece = piece;
}

// Gane singleton two items arrays refers to colors (BLACK = 0 and WHITE = 1)
var game = {
    colorToPlay : WHITE,
    // Castling flags
    canCastleKingSide  : [true, true],
    canCastleQueenSide : [true, true],
    // Board map
    board : [
        [new Piece(WHITE, ROOK), new Piece(WHITE, KNIGHT), new Piece(WHITE, BISHOP), new Piece(WHITE, QUEEN), new Piece(WHITE, KING), new Piece(WHITE, BISHOP), new Piece(WHITE, KNIGHT), new Piece(WHITE, ROOK)],
        [new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN), new Piece(WHITE, PAWN)],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN), new Piece(BLACK, PAWN)],
        [new Piece(BLACK, ROOK), new Piece(BLACK, KNIGHT), new Piece(BLACK, BISHOP), new Piece(BLACK, QUEEN), new Piece(BLACK, KING), new Piece(BLACK, BISHOP), new Piece(BLACK, KNIGHT), new Piece(BLACK, ROOK)]
    ],
    // Kings positions
    kingRow : [7, 0],
    kingCol : [4, 4],
    // Two push columns for en passant
    twoPushCol : [-1, -1],
    // Move history
    history : [],
    // Player types
    players : [COMPUTER, HUMAN],
    // Options
    options : {
        sound : true,
        showLegalMoves : true,
        whiteOnTop : false,
        negaMaxDepth: 5,
        coefT : 2,
        coefM : 3
    }
};

// Capturable piece
var __capture;

// Moves working array
var __moves;

// Move object
/** @constructor */
function Move(piece, row2, col2, row1, col1) {
    this.piece = piece;
    this.row1 = row1;
    this.col1 = col1;
    this.row2 = row2;
    this.col2 = col2;
}

// Move to string
function moveToStr(move) {
    if (move.castling === KING) return "O-O";
    if (move.castling === QUEEN) return "O-O-O";
    return PIECE_ALG[move.piece] +
        LETTERS.charAt(move.col1) + String(move.row1 + 1) +
        (move.capture ? "x" : "-") +
        LETTERS.charAt(move.col2) + String(move.row2 + 1) +
        (move.enPassant ? "ep" : (move.promote ? PIECE_ALG[move.promote] : ""));
};

// Assign captured piece and returns instance for chaining purpose
Move.prototype.Capture = function(piece) {
    this.capture = piece;
    return this;
};

// Assign castling side and returns instance for chaining purpose
Move.prototype.Castling = function(side) {
    this.castling = side;
    return this;
};

// Assign en passant flag and returns instance for chaining purpose
Move.prototype.EnPassant = function() {
    this.enPassant = true;
    return this;
};

// Assign promotion type and returns instance for chaining purpose
Move.prototype.Promote = function(piece) {
    this.promote = piece;
    return this;
};

// Get legal moves
function getLegalMoves(color) {
    return removeIllegalMoves(getPseudoLegalMoves(color), color);
}

// Get pseudo-legal moves (without considering check situation)
function getPseudoLegalMoves(color) {
    var moves = [], row, col;
    for (row = 8; row --;) {
        for (col = 8; col--;) {
            moves = moves.concat(getMovesForTile(color, row, col));
        }
    }
    return moves;
}

// Remove illegal moves from a move list
function removeIllegalMoves(moves, color) {
    var legal = [];
    for (var m = 0; m < moves.length; m++) {
        play(moves[m]);
         if (!isCheck(color)) legal.push(moves[m]);
        unplay(moves[m]);
    }
    return legal;
}

// Get moves for a start tile
function getMovesForTile(color, row, col) {
    if (!game.board[row][col]) return [];
    if (game.board[row][col].color != color) return [];
    switch (game.board[row][col].piece) {
        case PAWN:
            return getMovesForPawn(color, row, col);
        case ROOK:
            return getMovesForRook(color, row, col, ROOK);
        case BISHOP:
            return getMovesForBishop(color, row, col, BISHOP);
        case KNIGHT:
            return getMovesForKnight(color, row, col);
        case KING:
            return getMovesForKing(color, row, col);
        case QUEEN:
            return getMovesForQueen(color, row, col);
    }
}

// Pseudomoves for pawn
function getMovesForPawn(color, row, col) {
    var sens, init_row, prom_row, ep_row;
    if (color === WHITE) {
        sens = +1;
        init_row = (row === 1);
        ep_row   = (row === 4);
        prom_row = (row === 6);
    } else {
        sens = -1;
        init_row = (row === 6);
        ep_row   = (row === 3);
        prom_row = (row === 1);
    }
    var moves = [];
    // Move one tile
    if (isEmptyTile(row + sens, col)) {
        moves.push(new Move(PAWN, row + sens, col, row, col));
        // Move two tiles
        if (init_row && !game.board[row + 2*sens][col]) {
            moves.push(new Move(PAWN, row + 2*sens, col, row, col));
        }
    }
    // Capture on left
    if (col > 0) {
        if (isCapturableTile(row + sens, col - 1, color)) {
            moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(__capture));
        } else if (ep_row && game.twoPushCol[1 - color] === col - 1) {
            moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(PAWN).EnPassant());
        }
    }
    // Capture on right
    if (col < 7) {
        if (isCapturableTile(row + sens, col + 1, color)) {
            moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(__capture));
        } else if (ep_row && game.twoPushCol[1 - color] === col + 1) {
            moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(PAWN).EnPassant());
        }
    }
    // Promotion
    if (prom_row && moves.length > 0) {
        var p_moves = [];
        moves.forEach(function(move) {
            for (var p = QUEEN; p <= KNIGHT; p++) {
                p_moves.push(new Move(PAWN, move.row2, move.col2, row, col).Capture(move.capture).Promote(p));
            }
        });
        return p_moves;
    }
    return moves;
}

function getMovesForRook(color, row, col, piece) {
    var moves = [];
    var r, c;
    // To the left
    for (c = col - 1; c >= 0; c--) {
        if (!game.board[row][c]) {
            moves.push(new Move(piece, row, c, row, col));
        } else if (isCapturableTile(row, c, color)) {
            moves.push(new Move(piece, row, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
    }
    // To the right
    for (c = col + 1; c < 8; c++) {
        if (!game.board[row][c]) {
            moves.push(new Move(piece, row, c, row, col));
        } else if (isCapturableTile(row, c, color)) {
            moves.push(new Move(piece, row, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
    }
    // To the top
    for (r = row + 1; r < 8; r++) {
        if (!game.board[r][col]) {
            moves.push(new Move(piece, r, col, row, col));
        } else if (isCapturableTile(r, col, color)) {
            moves.push(new Move(piece, r, col, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
    }
    // To the bottom
    for (r = row - 1; r >= 0; r--) {
        if (!game.board[r][col]) {
            moves.push(new Move(piece, r, col, row, col));
        } else if (isCapturableTile(r, col, color)) {
            moves.push(new Move(piece, r, col, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
    }
    return moves;
}

function getMovesForBishop(color, row, col, piece) {
    var moves = [];
    var r, c;
    // To Top-Right
    r = row + 1;
    c = col + 1;
    while (r < 8 && c < 8) {
        if (!game.board[r][c]) {
            moves.push(new Move(piece, r, c, row, col));
        } else if (isCapturableTile(r, c, color)) {
            moves.push(new Move(piece, r, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
        r ++;
        c ++;
    }
    // To Top-Left
    r = row + 1;
    c = col - 1;
    while (r < 8 && c >= 0) {
        if (!game.board[r][c]) {
            moves.push(new Move(piece, r, c, row, col));
        } else if (isCapturableTile(r, c, color)) {
            moves.push(new Move(piece, r, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
        r ++;
        c --;
    }
    // To Bottom-Left
    r = row - 1;
    c = col - 1;
    while (r >= 0 && c >= 0) {
        if (!game.board[r][c]) {
            moves.push(new Move(piece, r, c, row, col));
        } else if (isCapturableTile(r, c, color)) {
            moves.push(new Move(piece, r, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
        r --;
        c --;
    }
    // To Bottom-Right
    r = row - 1;
    c = col + 1;
    while (r >= 0 && c < 8) {
        if (!game.board[r][c]) {
            moves.push(new Move(piece, r, c, row, col));
        } else if (isCapturableTile(r, c, color)) {
            moves.push(new Move(piece, r, c, row, col).Capture(__capture));
            break;
        } else {
            break;
        }
        r --;
        c ++;
    }
    return moves;
}

function getMovesForKnight(color, row, col) {
    var moves = [];
    for (var m = 0; m < KNIGHT_MOVES.length; m ++) {
        if (isEmptyTile(row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1])) {
            moves.push(new Move(KNIGHT, row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], row, col));
        } else if (isCapturableTile(row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], color)) {
            moves.push(new Move(KNIGHT, row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], row, col).Capture(__capture));
        }
    }
    return moves;
}

function getMovesForKing(color, row, col) {
    var moves = [];
    for (var m = 0; m < KING_MOVES.length; m++) {
        if (isEmptyTile(row + KING_MOVES[m][0], col + KING_MOVES[m][1])) {
            moves.push(new Move(KING, row + KING_MOVES[m][0], col + KING_MOVES[m][1], row, col));
        } else if (isCapturableTile(row + KING_MOVES[m][0], col + KING_MOVES[m][1], color)) {
            moves.push(new Move(KING, row + KING_MOVES[m][0], col + KING_MOVES[m][1], row, col).Capture(__capture));
        }
    }
    // Castling
    if (game.canCastleKingSide[color]) {
        // King-side castling
        if (!game.board[row][5] && !game.board[row][6]) {
            if (game.board[row][7] && game.board[row][7].piece === ROOK && game.board[row][7].color === color) {
                if (!isAttackedTile(row, 4, color) && !isAttackedTile(row, 5, color) && !isAttackedTile(row, 6, color)) {
                    moves.push(new Move(KING, row, 6, row, 4).Castling(KING));
                }
            }
        }
    }
    if (game.canCastleQueenSide[color]) {
        // Queen-side castling
        if (!game.board[row][3] && !game.board[row][2] && !game.board[row][1]) {
            if (game.board[row][0] && game.board[row][0].piece === ROOK && game.board[row][0].color === color) {
                if (!isAttackedTile(row, 4, color) && !isAttackedTile(row, 3, color) && !isAttackedTile(row, 2, color)) {
                    moves.push(new Move(KING, row, 2, row, 4).Castling(QUEEN));
                }
            }
        }
    }
    return moves;
}

function getMovesForQueen(color, row, col) {
    return getMovesForRook(color, row, col, QUEEN).concat(getMovesForBishop(color, row, col, QUEEN));
}

function isEmptyTile(row, col) {
    if (row < 0) return false;
    if (col < 0) return false;
    if (row > 7) return false;
    if (col > 7) return false;
    return !game.board[row][col];
}

function isCapturableTile(row, col, color) {
    if (row < 0) return false;
    if (col < 0) return false;
    if (row > 7) return false;
    if (col > 7) return false;
    if (!game.board[row][col]) return false;
    if (game.board[row][col].color === color) return false;
    if (game.board[row][col].piece === KING) return false;
    __capture = game.board[row][col].piece;
    return true;
}

function isAttackedTile(row, col, color) {
    // Check bishop style attacks (including bishop, pawn, king and queen)
    var r, c;
    // - On top-right
    r = row + 1;
    c = col + 1;
    while (r < 8 && c < 8) {
        if (!game.board[r][c]) {
            // Nothing happens
        } else if (isAttackableTile(r, c, color)) {
            if (__capture === BISHOP) {
                return true;
            } else if (__capture === PAWN) {
                if (r === row + 1 && color === WHITE) return true;
            } else if (__capture === KING) {
                if (r === row + 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
        r++;c++;
    }
    // - On top-left
    r = row + 1;
    c = col - 1;
    while (r < 8 && c >= 0) {
        if (!game.board[r][c]) {
            // Nothing happens
        } else if (isAttackableTile(r, c, color)) {
            if (__capture === BISHOP) {
                return true;
            } else if (__capture === PAWN) {
                if (r === row + 1 && color === WHITE) return true;
            } else if (__capture === KING) {
                if (r === row + 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
        r++;c--;
    }
    // - On bottom-left
    r = row - 1;
    c = col - 1;
    while (r >= 0 && c >= 0) {
        if (!game.board[r][c]) {
            // Nothing happens
        } else if (isAttackableTile(r, c, color)) {
            if (__capture === BISHOP) {
                return true;
            } else if (__capture === PAWN) {
                if (r === row - 1 && color === BLACK) return true;
            } else if (__capture === KING) {
                if (r === row - 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
        r--;c--;
    }
    // - On bottom-right
    r = row - 1;
    c = col + 1;
    while (r >= 0 && c < 8) {
        if (!game.board[r][c]) {
            // Nothing happens
        } else if (isAttackableTile(r, c, color)) {
            if (__capture === BISHOP) {
                return true;
            } else if (__capture === PAWN) {
                if (r === row - 1 && color === BLACK) return true;
            } else if (__capture === KING) {
                if (r === row - 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
        r--;c++;
    }
    // Check rook style attacks (including rook, king and queen)
    // - On left
    for (c = col - 1; c >= 0; c--) {
        if (!game.board[row][c]) {
            // Nothing happens
        } else if (isAttackableTile(row, c, color)) {
            if (__capture === ROOK) {
                return true;
            } else if (__capture === KING) {
                if (c === col - 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
    }
    // - On right
    for (c = col + 1; c < 8; c++) {
        if (!game.board[row][c]) {
            // Nothing happens
        } else if (isAttackableTile(row, c, color)) {
            if (__capture === ROOK) {
                return true;
            } else if (__capture === KING) {
                if (c === col + 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
    }
    // - On top
    for (r = row + 1; r < 8; r++) {
        if (!game.board[r][col]) {
            // Nothing happens
        } else if (isAttackableTile(r, col, color)) {
            if (__capture === ROOK) {
                return true;
            } else if (__capture === KING) {
                if (r === row + 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
    }
    // - On bottom
    for (r = row - 1; r >= 0; r--) {
        if (!game.board[r][col]) {
            // Nothing happens
        } else if (isAttackableTile(r, col, color)) {
            if (__capture === ROOK) {
                return true;
            } else if (__capture === KING) {
                if (r === row - 1) return true;
            } else if (__capture === QUEEN) {
                return true;
            }
            break;
        } else {
            break;
        }
    }
    // Check knight attack
    for (var m = 0; m < KNIGHT_MOVES.length; m++) {
        if (isCapturableTile(row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], color)) {
            if (__capture === KNIGHT) return true;
        }
    }
    return false;
}

// Check if a tile is attacked
function isAttackableTile(row, col, color) {
    if (game.board[row][col].color === color) return false;
    __capture = game.board[row][col].piece;
    return true;
}

// Check if th king is attacked
function isCheck(color) {
    return isAttackedTile(game.kingRow[color], game.kingCol[color], color);
}

// Play a move
function play(move) {
    // Get color playing
    var color = game.board[move.row1][move.col1].color;
    // Apply the move to the current position
    game.board[move.row2][move.col2] = game.board[move.row1][move.col1];
    game.board[move.row1][move.col1] = 0;
    // Special moves stuff
    if (move.enPassant) {
        // Remove captured pawn
        game.board[color === WHITE ? 4 : 3][move.col2] = 0;
    } else if (move.castling === KING) {
        // Move king-side rook
        game.board[move.row1][5] = game.board[move.row1][7];
        game.board[move.row1][7] = 0;
    } else if (move.castling === QUEEN) {
        // Move queen-side rook
        game.board[move.row1][3] = game.board[move.row1][0];
        game.board[move.row1][0] = 0;
    } else if (move.promote) {
        // Promotion
        game.board[move.row2][move.col2].piece = move.promote;
    }
    // Store two-push state so it can be restored on unplay
    move.twoPushColWas = game.twoPushCol[color];
    if (move.piece === PAWN && ((move.row1 === 1 && move.row2 === 3) || (move.row1 === 6 && move.row2 === 4))) {
        // Store the column
        game.twoPushCol[color] = move.col1;
    } else {
        // Reset
        game.twoPushCol[color] = -1;
    }
    // Always reset bad side two-push
    game.twoPushCol[1 - color] = -1;
    // Keep track of king (to find it faster on check test)
    if (move.piece === KING) {
        game.kingRow[color] = move.row2;
        game.kingCol[color] = move.col2;
    }
    // Castling flags
    if (game.canCastleKingSide[color]  && (move.piece === KING || (move.piece === ROOK && move.col1 === 7))) {
        game.canCastleKingSide[color] = false;
        move.preventsCastleKingSide  = true;
    }
    if (game.canCastleQueenSide[color] && (move.piece === KING || (move.piece === ROOK && move.col1 === 0))) {
        game.canCastleQueenSide[color] = false;
        move.preventsCastleQueenSide = true;
    }
    // Swap color to play
    game.colorToPlay = (1 - game.colorToPlay);
    // Add move to history
    game.history.push(move);
}

// Unplay a move
function unplay(move) {
    // Get color unplaying
    var color = game.board[move.row2][move.col2].color;
    // Un-apply the move to the current position
    game.board[move.row1][move.col1] = game.board[move.row2][move.col2];
    if (move.capture === undefined) {
        game.board[move.row2][move.col2] = 0;
    } else if (move.enPassant) {
        game.board[move.row2][move.col2] = 0;
        game.board[color === WHITE ? 4 : 3][move.col2] = new Piece(1 - color, PAWN);
    } else {
        game.board[move.row2][move.col2] = new Piece(1 - color, move.capture);
    }
    if (move.promote) {
        game.board[move.row1][move.col1].piece = PAWN;
    }
    if (move.piece === KING) {
        if (move.castling === KING) {
            // Replace king-side rook
            game.board[move.row1][7] = game.board[move.row1][5];
            game.board[move.row1][5] = 0;
        } else if (move.castling === QUEEN) {
            // Replace queen-side rook
            game.board[move.row1][0] = game.board[move.row1][3];
            game.board[move.row1][3] = 0;
        }
        // Keep king tracked
        game.kingRow[color] = move.row1;
        game.kingCol[color] = move.col1;
    }
    // Restore two-push
    game.twoPushCol[color] = move.twoPushColWas;
    // Restore castling flags
    if (move.preventsCastleKingSide)  game.canCastleKingSide[color]  = true;
    if (move.preventsCastleQueenSide) game.canCastleQueenSide[color] = true;
    // Swap color to play
    game.colorToPlay = (1 - game.colorToPlay);
    // Remove move from history
    game.history.pop();
}
