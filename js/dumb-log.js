"use strict";

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
        console.log(turn + ": " + moveToStr(game.history[i]) + (i + 1 < game.history.length ? "\t" + moveToStr(game.history[i+1]) : ""));
    }
}

// Log moves history
function logLegalMoves() {
    var moves = getLegalMoves(game.colorToPlay);
    console.log("Legal moves for " + COLOR_NAMES[game.colorToPlay] + " (" + moves.length + ")");
    moves.forEach(function(move) {
        console.log(moveToStr(move));
    });
}

// Log evaluation
function logEval() {
    console.log("Evaluation for " + COLOR_NAMES[game.colorToPlay] + ": " + evaluate());
}

// Get and log the best move for the current position
function logBestMove() {
    var start = new Date();
    var negaMaxObj = negaMax(game.options.negaMaxDepth, -Infinity, +Infinity);
    var end = new Date();
    var strMoves = [];
    negaMaxObj.moves.forEach(function(move) {
        strMoves.push(moveToStr(move));
    });
    console.log("NegaMax(" + game.options.negaMaxDepth + "): " + negaMaxObj.score + " [" + strMoves.join(", ") + "]");
    console.log("I thought for " + (end - start) + "ms");
}
