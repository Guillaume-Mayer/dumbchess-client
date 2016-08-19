(function(){

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

    // Letters to name columns
    const LETTERS   = "abcdefgh";

    // Algebraic notation
    const PIECE_ALG   = ["K", "Q", "R", "B", "N", ""];

    // Material values
    const MATERIAL    = [0, 900, 500, 300, 300, 100];

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
    const MATE      = 999999999;
    const DRAW      = 0;

    // Game constants
    const HUMAN    = 0;
    const COMPUTER = 1;

    "use strict";

    // Piece object
    /** @constructor */
    function Piece(color, piece) {
        this.color = color;
        this.piece = piece;
    }

    // Gane singleton two items arrays refers to colors (BLACK = 0 and WHITE = 1)
    var pos = {
        colorToPlay : WHITE,
        // Castling flags
        canCastleKingSide  : [1, 1],
        canCastleQueenSide : [1, 1],
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
        // Two push column for en passant
        twoPushCol : -1,
        // Half-move counter TODO
        halfMoveCount : 0
    };

    // Kings positions
    var kingRow = [7, 0];
    var kingCol = [4, 4];

    // Move history
    var history = [];

    // Options
    var options = {
        // UI options
        sound : false,
        showLegalMoves : true,
        whiteOnTop : false,
        // Game options
        players : [COMPUTER, HUMAN]
    };

    // AI options
    var negaMaxDepth = 4;
    var quiescence = false; // TODO
    var coefM = 7;          // Mobility
    var coefP = 1;          // Positional (bonuses)

    // Temp variables
    var _capture;   // Store the capture piece (isCapturableTile & isAttackableTile)
    var _thinking;  // Used to exclude promote to bishop or rook when computer thinks (getMovesForPawn & getBestMove)
    var _castling;  // Castling in think line

    // Move object
    /** @constructor */
    function Move(piece, row2, col2, row1, col1) {
        this.piece = piece;
        this.row1 = row1;
        this.col1 = col1;
        this.row2 = row2;
        this.col2 = col2;
        this.capture = 0;
        this.castling = -1;
        this.enPassant = 0;
        this.promote = 0;
        this.twoPushColWas = -1;
        this.preventsCastleKingSide = 0;
        this.preventsCastleQueenSide = 0;
    }

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
        this.enPassant = 1;
        return this;
    };

    // Assign promotion type and returns instance for chaining purpose
    Move.prototype.Promote = function(piece) {
        this.promote = piece;
        return this;
    };

    // Tile to string
    function tileId(row, col) {
        return LETTERS.charAt(col) + (row + 1).toString();
    }

    // Move to string
    function moveToStr(move) {
        if (move.castling === KING) return "O-O";
        if (move.castling === QUEEN) return "O-O-O";
        return PIECE_ALG[move.piece] +
        tileId(move.row1, move.col1) +
        (move.capture ? "x" : "-") +
        tileId(move.row2, move.col2) +
        (move.enPassant ? "ep" : (move.promote ? PIECE_ALG[move.promote] : ""));
    };

    // Get legal moves
    function getLegalMoves(color) {
        var moves = [];
        getPseudoLegalMoves(color, moves);
        for (var m = moves.length; m--;) {
            play(moves[m]);
            var check = isCheck(color);
            unplay(moves[m]);
            if (check) moves.splice(m, 1);
        }
        return moves;
    }

    // Count legal moves
    function countLegalMoves(color) {
        var moves = [];
        getPseudoLegalMoves(color, moves);
        var count = moves.length;
        for (var m = moves.length; m--;) {
            play(moves[m]);
            if (isCheck(color)) count--;
            unplay(moves[m]);
        }
        return count;
    }

    // Get pseudo-legal moves (without considering check situation)
    function getPseudoLegalMoves(color, moves) {
        var row, col;
        for (row = 8; row--;) {
            for (col = 8; col--;) {
                getMovesForTile(color, moves, row, col);
            }
        }
    }

    // Get moves for a start tile
    function getMovesForTile(color, moves, row, col) {
        if (!pos.board[row][col]) return;
        if (pos.board[row][col].color != color) return;
        switch (pos.board[row][col].piece) {
            case PAWN:
                getMovesForPawn(color, moves, row, col);
                break;
            case ROOK:
                getMovesForRook(color, moves, row, col, ROOK);
                break;
            case BISHOP:
                getMovesForBishop(color, moves, row, col, BISHOP);
                break;
            case KNIGHT:
                getMovesForKnight(color, moves, row, col);
                break;
            case KING:
                getMovesForKing(color, moves, row, col);
                break;
            case QUEEN:
                getMovesForQueen(color, moves, row, col);
                break;
        }
    }

    // Pseudomoves for pawn
    function getMovesForPawn(color, moves, row, col) {
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
        // Move one tile
        if (isEmptyTile(row + sens, col)) {
            moves.push(new Move(PAWN, row + sens, col, row, col));
            if (init_row && !pos.board[row + 2*sens][col]) {
                // Move two tiles
                moves.push(new Move(PAWN, row + 2*sens, col, row, col));
            } else if (prom_row) {
                // Promotion
                moves[moves.length - 1].Promote(QUEEN);
                moves.push(new Move(PAWN, row + sens, col, row, col).Promote(KNIGHT));
                if (!_thinking) {
                    moves.push(new Move(PAWN, row + sens, col, row, col).Promote(BISHOP));
                    moves.push(new Move(PAWN, row + sens, col, row, col).Promote(ROOK));
                }
            }
        }
        // Capture on left
        if (col > 0) {
            if (isCapturableTile(row + sens, col - 1, color)) {
                moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(_capture));
                if (prom_row) {
                     // Promotion
                    moves[moves.length - 1].Promote(QUEEN);
                    moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(_capture).Promote(KNIGHT));
                    if (!_thinking) {
                        moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(_capture).Promote(BISHOP));
                        moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(_capture).Promote(ROOK));
                    }
                }
            } else if (ep_row && pos.twoPushCol === col - 1 && color === pos.colorToPlay) {
                moves.push(new Move(PAWN, row + sens, col - 1, row, col).Capture(PAWN).EnPassant());
            }
        }
        // Capture on right
        if (col < 7) {
            if (isCapturableTile(row + sens, col + 1, color)) {
                moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(_capture));
                if (prom_row) {
                     // Promotion
                    moves[moves.length - 1].Promote(QUEEN);
                    moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(_capture).Promote(KNIGHT));
                    if (!_thinking) {
                        moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(_capture).Promote(BISHOP));
                        moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(_capture).Promote(ROOK));
                    }
                }
            } else if (ep_row && pos.twoPushCol === col + 1 && color === pos.colorToPlay) {
                moves.push(new Move(PAWN, row + sens, col + 1, row, col).Capture(PAWN).EnPassant());
            }
        }
    }

    function getMovesForRook(color, moves, row, col, piece) {
        var r, c;
        // To the left
        for (c = col - 1; c >= 0; c--) {
            if (!pos.board[row][c]) {
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
            if (!pos.board[row][c]) {
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
            if (!pos.board[r][col]) {
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
            if (!pos.board[r][col]) {
                moves.push(new Move(piece, r, col, row, col));
            } else if (isCapturableTile(r, col, color)) {
                moves.push(new Move(piece, r, col, row, col).Capture(_capture));
                break;
            } else {
                break;
            }
        }
    }

    function getMovesForBishop(color, moves, row, col, piece) {
        var r, c;
        // To Top-Right
        r = row + 1;
        c = col + 1;
        while (r < 8 && c < 8) {
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
    }

    function getMovesForKnight(color, moves, row, col) {
        for (var m = 0; m < KNIGHT_MOVES.length; m ++) {
            if (isEmptyTile(row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1])) {
                moves.push(new Move(KNIGHT, row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], row, col));
            } else if (isCapturableTile(row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], color)) {
                moves.push(new Move(KNIGHT, row + KNIGHT_MOVES[m][0], col + KNIGHT_MOVES[m][1], row, col).Capture(_capture));
            }
        }
    }

    function getMovesForKing(color, moves, row, col) {
        for (var m = 0; m < KING_MOVES.length; m++) {
            if (isEmptyTile(row + KING_MOVES[m][0], col + KING_MOVES[m][1])) {
                moves.push(new Move(KING, row + KING_MOVES[m][0], col + KING_MOVES[m][1], row, col));
            } else if (isCapturableTile(row + KING_MOVES[m][0], col + KING_MOVES[m][1], color)) {
                moves.push(new Move(KING, row + KING_MOVES[m][0], col + KING_MOVES[m][1], row, col).Capture(_capture));
            }
        }
        // Castling
        if (pos.canCastleKingSide[color]) {
            // King-side castling
            if (!pos.board[row][5] && !pos.board[row][6]) {
                if (pos.board[row][7] && pos.board[row][7].piece === ROOK && pos.board[row][7].color === color) {
                    if (!isAttackedTile(row, 4, color) && !isAttackedTile(row, 5, color) && !isAttackedTile(row, 6, color)) {
                        moves.push(new Move(KING, row, 6, row, 4).Castling(KING));
                    }
                }
            }
        }
        if (pos.canCastleQueenSide[color]) {
            // Queen-side castling
            if (!pos.board[row][3] && !pos.board[row][2] && !pos.board[row][1]) {
                if (pos.board[row][0] && pos.board[row][0].piece === ROOK && pos.board[row][0].color === color) {
                    if (!isAttackedTile(row, 4, color) && !isAttackedTile(row, 3, color) && !isAttackedTile(row, 2, color)) {
                        moves.push(new Move(KING, row, 2, row, 4).Castling(QUEEN));
                    }
                }
            }
        }
    }

    function getMovesForQueen(color, moves, row, col) {
        getMovesForRook(color, moves, row, col, QUEEN);
        getMovesForBishop(color, moves, row, col, QUEEN);
    }

    function isEmptyTile(row, col) {
        if (row < 0) return false;
        if (col < 0) return false;
        if (row > 7) return false;
        if (col > 7) return false;
        return !pos.board[row][col];
    }

    function isCapturableTile(row, col, color) {
        if (row < 0) return false;
        if (col < 0) return false;
        if (row > 7) return false;
        if (col > 7) return false;
        if (!pos.board[row][col]) return false;
        if (pos.board[row][col].color === color) return false;
        if (pos.board[row][col].piece === KING) return false;
        _capture = pos.board[row][col].piece;
        return true;
    }

    // Check if a tile can attack
    function isAttackableTile(row, col, color) {
        if (pos.board[row][col].color === color) return false;
        _capture = pos.board[row][col].piece;
        return true;
    }

    // Check if a tile is attacked
    function isAttackedTile(row, col, color) {
        // Check bishop style attacks (including bishop, pawn, king and queen)
        var r, c;
        // - On top-right
        r = row + 1;
        c = col + 1;
        while (r < 8 && c < 8) {
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
            if (!pos.board[r][c]) {
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
            if (!pos.board[row][c]) {
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
            if (!pos.board[row][c]) {
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
            if (!pos.board[r][col]) {
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
            if (!pos.board[r][col]) {
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

    // Check if the king is attacked
    function isCheck(color) {
        return isAttackedTile(kingRow[color], kingCol[color], color);
    }

    // Play a move
    function play(move) {
        // Get color playing
        var color = pos.board[move.row1][move.col1].color;
        // Apply the move to the current position
        pos.board[move.row2][move.col2] = pos.board[move.row1][move.col1];
        pos.board[move.row1][move.col1] = 0;
        // Special moves stuff
        if (move.enPassant) {
            // Remove captured pawn
            pos.board[color === WHITE ? 4 : 3][move.col2] = 0;
        } else if (move.castling === KING) {
            // Move king-side rook
            pos.board[move.row1][5] = pos.board[move.row1][7];
            pos.board[move.row1][7] = 0;
            if (_thinking) _castling[color] = KING;
        } else if (move.castling === QUEEN) {
            // Move queen-side rook
            pos.board[move.row1][3] = pos.board[move.row1][0];
            pos.board[move.row1][0] = 0;
            if (_thinking) _castling[color] = QUEEN;
        } else if (move.promote) {
            // Promotion
            pos.board[move.row2][move.col2].piece = move.promote;
        }
        if (color === pos.colorToPlay) {
            // Store two-push state so it can be restored on unplay
            move.twoPushColWas = pos.twoPushCol;
            if (move.piece === PAWN && ((move.row1 === 1 && move.row2 === 3) || (move.row1 === 6 && move.row2 === 4))) {
                // Store the column
                pos.twoPushCol = move.col1;
            } else {
                // Reset
                pos.twoPushCol = -1;
            }
            // Half-move counter
            if (move.piece === PAWN || move.capture) {
                pos.halfMoveCount = 0;
            } else {
                pos.halfMoveCount ++;
            }
        }
        // Keep track of king (to find it faster on check test)
        if (move.piece === KING) {
            kingRow[color] = move.row2;
            kingCol[color] = move.col2;
        }
        // Castling flags
        if (pos.canCastleKingSide[color]  && (move.piece === KING || (move.piece === ROOK && move.col1 === 7))) {
            pos.canCastleKingSide[color] = 0;
            move.preventsCastleKingSide  = 1;
        }
        if (pos.canCastleQueenSide[color] && (move.piece === KING || (move.piece === ROOK && move.col1 === 0))) {
            pos.canCastleQueenSide[color] = 0;
            move.preventsCastleQueenSide = 1;
        }
        // Swap color to play
        pos.colorToPlay = (1 - pos.colorToPlay);
    }

    // Unplay a move
    function unplay(move) {
        // Get color unplaying
        var color = pos.board[move.row2][move.col2].color;
        // Un-apply the move to the current position
        pos.board[move.row1][move.col1] = pos.board[move.row2][move.col2];
        if (move.capture === 0) {
            pos.board[move.row2][move.col2] = 0;
        } else if (move.enPassant) {
            pos.board[move.row2][move.col2] = 0;
            pos.board[color === WHITE ? 4 : 3][move.col2] = new Piece(1 - color, PAWN);
        } else {
            pos.board[move.row2][move.col2] = new Piece(1 - color, move.capture);
        }
        if (move.promote) {
            pos.board[move.row1][move.col1].piece = PAWN;
        }
        if (move.piece === KING) {
            if (move.castling === KING) {
                // Replace king-side rook
                pos.board[move.row1][7] = pos.board[move.row1][5];
                pos.board[move.row1][5] = 0;
                if (_thinking) _castling[color] = -1;
            } else if (move.castling === QUEEN) {
                // Replace queen-side rook
                pos.board[move.row1][0] = pos.board[move.row1][3];
                pos.board[move.row1][3] = 0;
                if (_thinking) _castling[color] = -1;
            }
            // Keep king tracked
            kingRow[color] = move.row1;
            kingCol[color] = move.col1;
        }
        // Restore castling flags
        if (move.preventsCastleKingSide)  pos.canCastleKingSide[color]  = 1;
        if (move.preventsCastleQueenSide) pos.canCastleQueenSide[color] = 1;
        // Swap color to play
        pos.colorToPlay = (1 - pos.colorToPlay);
        // Restore two-push
        if (color === pos.colorToPlay) pos.twoPushCol = move.twoPushColWas;
    }

    // **************************************************
    // ****************** AI Functions ******************
    // **************************************************

    // Evaluate the color position
    function evaluate() {
        // Evaluate from color to play point of view
        var color = pos.colorToPlay;
        // Get mobility score (count legal moves)
        var mobility = countLegalMoves(color);
        // Mate situations
        if (mobility === 0) {
            if (isCheck(color)) return MATE
            return DRAW;
        }
        // Substract adversary mobility
        mobility -= countLegalMoves(1 - color);
        //  Get material score
        var material = evalMaterial(color);
        // Get positional score (bonus)
        var positional = evalPositional(color);
        // Ponderate using coefs
        return material + (coefM * mobility) + (coefP * positional);
    }

    // Material evalutation
    function evalMaterial(color) {
        var score = 0, row, col, piece;
        for (row = 8; row--;) {
            for (col = 8; col--;) {
                piece = pos.board[row][col];
                if (piece) score += MATERIAL[piece.piece] * (piece.color === color ? 1 : -1);
            }
        }
        return score;
    }

    // Positional bonuses
    function evalPositional(color) {
        var score = 0;
        // Pawns advancement bonus
        var advancement = [
            [0, 200, 50, 40, 30, 20, 0, 0], // For black
            [0, 0, 20, 30, 40, 50, 200, 0]  // For white
        ];
        // Dubbled pawns malus
        var dubbled = -75;
        // Pawn loop        
        for (var col = 8; col--;) {
            var colCount = [0, 0];
            for (var row = 1; row < 7; row ++) {
                var piece = pos.board[row][col];
                if (piece && piece.piece === PAWN) {
                    // Advancement
                    score += advancement[piece.color][row] * (piece.color === color ? 1 : -1);
                    // Count pawns
                    colCount[piece.color] ++;
                }
            }
            // Dubbled pawns malus
            if (colCount[color] > 1) score += dubbled*(colCount[color] - 1);
            if (colCount[1 - color] > 1) score -= dubbled*(colCount[1 - color] - 1)
        }
        // Beginning phase
        if (history.length + negaMaxDepth <= 32) {
            // Malus for unmoved minor pieces
            var unmovedMinor = -70;
            // - White
            if (pos.board[0][1] && pos.board[0][1].piece === KNIGHT && pos.board[0][1].color === WHITE) score += unmovedMinor * (color === WHITE ? 1 : -1);
            if (pos.board[0][2] && pos.board[0][2].piece === BISHOP && pos.board[0][2].color === WHITE) score += unmovedMinor * (color === WHITE ? 1 : -1);
            if (pos.board[0][5] && pos.board[0][5].piece === BISHOP && pos.board[0][5].color === WHITE) score += unmovedMinor * (color === WHITE ? 1 : -1);
            if (pos.board[0][6] && pos.board[0][6].piece === KNIGHT && pos.board[0][6].color === WHITE) score += unmovedMinor * (color === WHITE ? 1 : -1);
            // - Black
            if (pos.board[7][1] && pos.board[7][1].piece === KNIGHT && pos.board[7][1].color === BLACK) score += unmovedMinor * (color === BLACK ? 1 : -1);
            if (pos.board[7][2] && pos.board[7][2].piece === BISHOP && pos.board[7][2].color === BLACK) score += unmovedMinor * (color === BLACK ? 1 : -1);
            if (pos.board[7][5] && pos.board[7][5].piece === BISHOP && pos.board[7][5].color === BLACK) score += unmovedMinor * (color === BLACK ? 1 : -1);
            if (pos.board[7][6] && pos.board[7][6].piece === KNIGHT && pos.board[7][6].color === BLACK) score += unmovedMinor * (color === BLACK ? 1 : -1);
            // Early queen move
            if (history.length + negaMaxDepth <= 16) {
                // Bonus for unmoved queen
                var unmovedQueen = 200;
                if (pos.board[0][3] && pos.board[0][3].piece === QUEEN && pos.board[0][3].color === WHITE) score += unmovedQueen * (color === WHITE ? 1 : -1);
                if (pos.board[7][3] && pos.board[7][3].piece === QUEEN && pos.board[7][3].color === BLACK) score += unmovedQueen * (color === BLACK ? 1 : -1);
            }
        }
        // Castling bonuses
        var castleKing  = 250,
            castleQueen = 200;
        var canCastleKingSide  = 100,
            canCastleQueenSide =  80;
        // - Color to play       
        if (pos.canCastleKingSide[color] || pos.canCastleQueenSide[color]) {
            // - Give a bonus if castling is still possible
            if (pos.canCastleKingSide[color])  score += canCastleKingSide;
            if (pos.canCastleQueenSide[color]) score += canCastleQueenSide;
        } else {
            // - Give a better bonus if castling was done
            // Check the thinking line
            if (_castling[color] === KING) {
                score += castleKing;
            } else if (_castling[color] === QUEEN) {
                score += castleQueen;
            }
        }
        // - Other color      
        if (pos.canCastleKingSide[1 - color] || pos.canCastleQueenSide[1 - color]) {
            // - Give a bonus if castling is still possible
            if (pos.canCastleKingSide[1 - color])  score -= canCastleKingSide;
            if (pos.canCastleQueenSide[1 - color]) score -= canCastleQueenSide;
        } else {
            // - Give a better bonus if castling was done
            // Check the thinking line
            if (_castling[1 - color] === KING) {
                score -= castleKing;
            } else if (_castling[1 - color] === QUEEN) {
                score -= castleQueen;
            }
        }
        return score;
    }

    function logEval() {
        var color = pos.colorToPlay;
        console.log("Evaluation for " + (color === WHITE ? "White" : "Black"));
        console.log("Material: " + evalMaterial(color));
        console.log("Positional: " + evalPositional(color));
        console.log("Total: " + evaluate());
    }

    /*  
    See Negamax with alpha beta pruning
    on https://en.wikipedia.org/wiki/Negamax
    */
    function negaMax(depth, alpha, beta, moves) {
        // Stop conditions
        if (depth === 0) return { score: evaluate(), moves: []};
        if (!moves) moves = getLegalMoves(pos.colorToPlay);
        if (moves.length === 0) return {score: isCheck(pos.colorToPlay) ? MATE : DRAW, moves: []};
        // Set the worst for best score
        var bestScore = -Infinity,
            bestMoves = [],
            scores    = [];
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
            // Store the score for each move
            scores.push({ move: moves[m], score: score});
            // Alpha-beta pruning
            if (score > alpha) {
                alpha = score;
                if (alpha >= beta) break;
            }
        }
        return { score: bestScore, moves: bestMoves, stats: scores };
    }

    // Get the best move for the current position using classic NegaMax
    function getBestMove() {
        _thinking = true;
        _castling = [-1, -1];
        console.time("negamax")
        var negaMaxObj = negaMax(negaMaxDepth, -Infinity, +Infinity);
        console.timeEnd("negamax")
        _thinking = false;
        _castling = [-1, -1];
        if (negaMaxObj.moves.length) {
            console.log("NegaMax(" + negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
            return negaMaxObj.moves[0];
        }
    }

    /*
    // Get the best move using iterative deepening
    function iterativeDeepening() {
        var start = new Date();
        var negaMaxObj, stats, moves = undefined;
        for (var depth = 1; depth < negaMaxDepth; depth ++) {
            // Get the negaMax for each depth
            negaMaxObj = negaMax(depth, -Infinity, +Infinity, moves);
            // Order the move by score descending
            stats = negaMaxObj.stats.sort(function(a,b) {
                return b.score - a.score;
            });
            // Get the resulting moves array
            moves = stats.map(function(e){
                return e.move;
            });
        }
        // Final depth
        var negaMaxObj = negaMax(negaMaxDepth, -Infinity, +Infinity, moves);
        var end = new Date();
        console.log("Iterative deepening thought for " + (end - start) + "ms");
        if (negaMaxObj.moves.length) {
            console.log("NegaMax(" + negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
            return negaMaxObj.moves[0];
        }
    }

    // Parrallel thread intents
    var _start, _moves, _workers, _scores, _results;
    function parallelNegaMax() {
        _start = new Date();
        _moves = getLegalMoves(pos.colorToPlay);
        _workers = _moves.length;
        _scores = new Array(_moves.length);
        _results = new Array(_moves.length);
        _moves.forEach(function(m, i) {
            // Launch a worker for each move
            var w = new Worker("js/dumb-thinker.js");
            w.addEventListener("message", thinkerDone);
            w.postMessage(JSON.stringify(game));
            w.postMessage(JSON.stringify({index: i}));
            w.postMessage(JSON.stringify(m));
        });
    }

    function thinkerDone(e) {
        var obj = JSON.parse(e.data);
        _results[obj.index] = obj.negamax;
        _scores[obj.index] = - obj.negamax.score;
        _workers --;
        if (_workers === 0) allThinkersDone();
    }

    function allThinkersDone() {
        // Get the best move in array
        var bestScore = Math.max(..._scores);
        var bestMoves;
        for (var i = 0; i < _moves.length; i ++) {
            if (_scores[i] === bestScore) {
                bestMoves = _results[i].moves;
                bestMoves.unshift(_moves[i]);
                break;
            }
        }
        var end = new Date();
        console.log("parallelNegaMax thought for " + (end - _start) + "ms");
        console.log("Best move: " + bestScore + " [" + bestMoves.map(moveToStr).join(", ") + "]");
    }

    function workerNegaMax() {
        // Launch one worker to find the best move
        _start = new Date();
        var w = new Worker("js/dumb-thinker2.js");
        w.addEventListener("message", workerDone);
        w.postMessage(JSON.stringify(game));
    }

    function workerDone(e) {
        // Get worker message
        var negaMaxObj = JSON.parse(e.data);
        var end = new Date();
        console.log("Worker Negamax thought for " + (end - _start) + "ms");
        console.log("NegaMax(" + negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
    }
    */

    // Exports
    window.chess = {
        board : pos.board,
        options : options,
        history : history,
        colorToPlay : function() {
            return pos.colorToPlay;
        },
        getLegalMoves : function() {
            return getLegalMoves(pos.colorToPlay);
        },
        play : function(move) {
            play(move);
            history.push(move);
        },
        unplay : function(move) {
            unplay(move);
            history.pop();
        },
        setLevel : function(level) {
            if (level == "EASY") {
                negaMaxDepth = 3;
            } else if (level == "HARD") {
                negaMaxDepth = 5;
            } else {
                negaMaxDepth = 4;
            }
        },
        getLevel : function() {
            return (negaMaxDepth === 3 ? "EASY" : (negaMaxDepth === 5 ? "HARD" : "MEDIUM"));
        },
        getBestMove : getBestMove,
        moveToStr : moveToStr,
        tileId : tileId,
        BLACK : BLACK,
        WHITE : WHITE,
        QUEEN : QUEEN,
        PAWN : PAWN,
        KING : KING,
        ROOK : ROOK,
        COMPUTER : COMPUTER,
        logEval : logEval
    };

})()