"use strict";

// Evaluate the color position
function evaluate() {
    // Evaluate from color to play point of view
    var color = game.colorToPlay;
    // Get mobility score (count legal moves)
    var mobility = getLegalMoves(color).length;
    // Mate situations
    if (mobility === 0) {
        if (isCheck(color)) return MATE
        return DRAW;
    }
    // Substract adversary mobility
    mobility -= getLegalMoves(1 - color).length;
    //  Get material score
    var material = evalMaterial(color);
    // Ponderate using coefs
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

/*  See Negamax with alpha beta pruning
    on https://en.wikipedia.org/wiki/Negamax
*/
function negaMax(depth, alpha, beta, moves) {
    // Stop conditions
    if (depth === 0) return { score: evaluate(), moves: []};
    if (!moves) moves = getLegalMoves(game.colorToPlay);
    if (moves.length === 0) return { score: isCheck(game.colorToPlay) ? MATE : DRAW, moves: []};
    // Set the worst for best score
    var bestScore = -Infinity,
        bestMoves,
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
