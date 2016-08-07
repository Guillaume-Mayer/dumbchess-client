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
        negaMaxDepth: 3,
        coefT : 2,
        coefM : 3
    }
};

// Capturable piece
var _capture;

// Move object
/** @constructor */
function Move(piece, row2, col2, row1, col1) {
    this.piece = piece;
    this.row1 = row1;
    this.col1 = col1;
    this.row2 = row2;
    this.col2 = col2;
}

// Move to string (not used yet)
Move.prototype.toStr = function() {
    if (this.castling === KING) return "O-O";
    if (this.castling === QUEEN) return "O-O-O";
    return PIECE_ALG[this.piece] +
        LETTERS.charAt(this.col1) + String(this.row1 + 1) +
        (this.capture ? "x" : "-") +
        LETTERS.charAt(this.col2) + String(this.row2 + 1) +
        (this.enPassant ? "ep" : (this.promote ? PIECE_ALG[this.promote] : ""));
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
    var moves = [];
    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {
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
            moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(_capture));
        } else if (ep_row && game.twoPushCol[1 - color] === col - 1) {
            moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(PAWN).EnPassant());
        }
    }
    // Capture on right
    if (col < 7) {
        if (isCapturableTile(row + sens, col + 1, color)) {
            moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(_capture));
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
            moves.push(new Move(piece, row, c, row, col).Capture(_capture));
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
            moves.push(new Move(piece, row, c, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, col, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, col, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, c, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, c, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, c, row, col).Capture(_capture));
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
            moves.push(new Move(piece, r, c, row, col).Capture(_capture));
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
            moves.push(new Move(KNIGHT, row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], row, col).Capture(_capture));
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
            moves.push(new Move(KING, row + KING_MOVES[m][0], col + KING_MOVES[m][1], row, col).Capture(_capture));
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
    _capture = game.board[row][col].piece;
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
            if (_capture === BISHOP) {
                return true;
            } else if (_capture === PAWN) {
                if (r === row + 1 && color === WHITE) return true;
            } else if (_capture === KING) {
                if (r === row + 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === BISHOP) {
                return true;
            } else if (_capture === PAWN) {
                if (r === row + 1 && color === WHITE) return true;
            } else if (_capture === KING) {
                if (r === row + 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === BISHOP) {
                return true;
            } else if (_capture === PAWN) {
                if (r === row - 1 && color === BLACK) return true;
            } else if (_capture === KING) {
                if (r === row - 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === BISHOP) {
                return true;
            } else if (_capture === PAWN) {
                if (r === row - 1 && color === BLACK) return true;
            } else if (_capture === KING) {
                if (r === row - 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === ROOK) {
                return true;
            } else if (_capture === KING) {
                if (c === col - 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === ROOK) {
                return true;
            } else if (_capture === KING) {
                if (c === col + 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === ROOK) {
                return true;
            } else if (_capture === KING) {
                if (r === row + 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === ROOK) {
                return true;
            } else if (_capture === KING) {
                if (r === row - 1) return true;
            } else if (_capture === QUEEN) {
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
            if (_capture === KNIGHT) return true;
        }
    }
    return false;
}

// Check if a tile is attacked
function isAttackableTile(row, col, color) {
    if (game.board[row][col].color === color) return false;
    _capture = game.board[row][col].piece;
    return true;
}

// Check if th king is attacked
function isCheck(color) {
    return isAttackedTile(game.kingRow[color], game.kingCol[color], color);
}

// Called by dumb-client
function getLegalMove(row1, col1, row2, col2, promote) {
    var legal = removeIllegalMoves(getMovesForTile(game.colorToPlay, row1, col1), game.colorToPlay);
    for (var m = 0; m < legal.length; m ++) {
        if (legal[m].row2 === row2 && legal[m].col2 === col2 && legal[m].promote == promote) return legal[m];
    }
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

// Restart the game by unplaying all history moves
function restart() {
   while(game.history.length > 0) {
        unplay(game.history[game.history.length - 1]);
    }
}

// Log board for debugging
function logBoard() {
    console.log("Board (" + COLOR_NAMES[game.colorToPlay] + " to play)");
    var s = "";
    for (var row = 7; row >= 0; row--) {
        for (var col = 0; col < 8; col ++) {
            var p = game.board[row][col];
            if (p === 0) {
                s += "-";
            } else if (game.board[row][col].piece === PAWN) {
                s += game.board[row][col].color === WHITE ? "P" : "p";
            } else if (game.board[row][col].color === BLACK) {
                s += PIECE_ALG[game.board[row][col].piece].toLowerCase();
            } else {
                s += PIECE_ALG[game.board[row][col].piece];
            }
        }
        s += "\n";
    }
    console.log(s);
}

// Log moves history
function logHistory() {
    console.log("Moves history (" + game.history.length + ")");
    for (var i = 0, turn = 1; i < game.history.length; i += 2, turn ++) {
        console.log(turn + ": " + game.history[i].toStr() + (i + 1 < game.history.length ? "\t" + game.history[i+1].toStr() : ""));
    }
}

// Log moves history
function logLegalMoves() {
    var moves = getLegalMoves(game.colorToPlay);
    console.log("Legal moves for " + COLOR_NAMES[game.colorToPlay] + " (" + moves.length + ")");
    moves.forEach(function(move) {
        console.log(move.toStr());
    });
}

// Log evaluation
function logEval() {
    console.log("Evaluation for " + COLOR_NAMES[game.colorToPlay] + ": " + evaluate());
}

// Evaluate the color position
function evaluate() {
    // Evaluate from color to play point of view
    var color = game.colorToPlay;
    // Get mobility score (count legal moves)
    var mobility = getLegalMoves(color).length;
    // Mate situations
    if (mobility === 0) {
        if (isCheck(color)) return -MATE
        return DRAW;
    }
    // Substract adversary mobility
    mobility -= getLegalMoves(1 - color).length;
    //  Get material score
    var material = evalMaterial(color);
    // Ponderate using const coefs
    return (game.options.coefT * mobility) + (game.options.coefM * material);
}

// Material evalutation
function evalMaterial(color) {
    var score = 0;
    for (var row = 0; row < 8; row ++) {
        for (var col = 0; col < 8; col ++) {
            var piece = game.board[row][col];
            if (piece) score += MATERIAL[piece.piece] * (piece.color === color ? 1 : -1);
        }
    }
    return score;
}

function negaMax(depth, alpha, beta) {
    /*  See Negamax with alpha beta pruning
        on https://en.wikipedia.org/wiki/Negamax
    */
    // Stop conditions
    if (depth === 0) return { score: evaluate(), moves: [] };
    var moves = getLegalMoves(game.colorToPlay);
    if (moves.length === 0) return { score: evaluate(), moves: [] }; // WARN this could be improved (score is MATE or DRAW, no need to evaluate)
    // Set the worst for best score
    var bestScore = -INFINITY,
        bestMoves = [];
    // Loop moves
    for (var m = 0; m < moves.length; m++) {
        // Play the move
        play(moves[m]);
        // Negative recursive evaluation
        var negaMaxObj = negaMax(depth - 1, -beta, -alpha);
        var score = -negaMaxObj.score;
        // Unplay the move
        unplay(moves[m]);
        // Keep best move and score
        if (score > bestScore) {
            bestScore = score;
            bestMoves = negaMaxObj.moves.slice();
            bestMoves.unshift(moves[m]);
        }
        // Alpha-beta pruning
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
    }
    return { score: bestScore, moves: bestMoves };
}

// Get and log the best move for the current position
function logBestMove() {
    var start = new Date();
    var negaMaxObj = negaMax(game.options.negaMaxDepth, -INFINITY, +INFINITY);
    var end = new Date();
    var strMoves = [];
    negaMaxObj.moves.forEach(function(move) {
        strMoves.push(move.toStr());
    });
    console.log("NegaMax(" + game.options.negaMaxDepth + "): " + negaMaxObj.score + " [" + strMoves.join(", ") + "]");
    console.log("I thought for " + (end - start) + "ms");
}

// Get the best move for the current position
function getBestMove() {
    var negaMaxObj = negaMax(game.options.negaMaxDepth, -INFINITY, +INFINITY);
    if (negaMaxObj.moves.length) return negaMaxObj.moves[0];
}
