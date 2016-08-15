"use strict";

// Load audio
audioGood.load();
audioBad.load();
computerBeep.load();

// Add tiles listeners
addTilesEventListener();

// Draw pieces
drawPieces();

// Reset selection on side clicks
$("pan-side1").addEventListener("click", resetSelection);
$("pan-side2").addEventListener("click", resetSelection);

// Set some elements according to options
$("toggleShowLegalMoves").setAttribute("class", "token " + (game.options.showLegalMoves ? "ON" : "OFF"));
$("toggleSound"         ).setAttribute("class", "token " + (game.options.sound          ? "ON" : "OFF"));
$("rotateBoard"         ).setAttribute("class", "token " + (game.options.whiteOnTop     ? "ON" : "OFF"));

// Action button listeners
$("toggleShowLegalMoves").addEventListener("click", toggleShowLegalMoves);
$("toggleSound"         ).addEventListener("click", toggleSound);
$("rotateBoard"         ).addEventListener("click", rotateBoard);
$("unplayLastMove"      ).addEventListener("click", unplayLastMove);
$("restartGame"         ).addEventListener("click", restartGame);

// Init promotion popup
initPromotionPopup(BLACK);
initPromotionPopup(WHITE);

// Link like actions
$("cancelPromote").addEventListener("click", cancelPromote);
$("playAgain").addEventListener("click", playAgain);
$("retry").addEventListener("click", playAgain);
$("unplayAfterLose").addEventListener("click", unplayAfterLose);

// Get the best move for the current position using classic NegaMax
function getBestMove() {
	console.time("getBestMove");
	console.profile("negamax");
    var negaMaxObj = negaMax(game.options.negaMaxDepth, -Infinity, +Infinity);
    console.profileEnd("negamax");
    console.timeEnd("getBestMove");
    if (negaMaxObj.moves.length) {
    	console.log("NegaMax(" + game.options.negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
    	return negaMaxObj.moves[0];
    }
}

// Get the best move using iterative deepening
function iterativeDeepening() {
	var start = new Date();
	var negaMaxObj, stats, moves = undefined;
	for (var depth = 1; depth < game.options.negaMaxDepth; depth ++) {
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
	var negaMaxObj = negaMax(game.options.negaMaxDepth, -Infinity, +Infinity, moves);
	var end = new Date();
	console.log("Iterative deepening thought for " + (end - start) + "ms");
    if (negaMaxObj.moves.length) {
    	console.log("NegaMax(" + game.options.negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
    	return negaMaxObj.moves[0];
    }
}

var _start, _moves, _workers, _scores, _results;
function parallelNegaMax() {
	_start = new Date();
	_moves = getLegalMoves(game.colorToPlay);
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
    console.log("NegaMax(" + game.options.negaMaxDepth + "): " + negaMaxObj.score + " [" + negaMaxObj.moves.map(moveToStr).join(", ") + "]");
}
