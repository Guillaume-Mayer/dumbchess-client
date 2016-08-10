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
$("logBoard"            ).addEventListener("click", logBoard);
$("logHistory"          ).addEventListener("click", logHistory);
$("logLegalMoves"       ).addEventListener("click", logLegalMoves);
$("logEval"             ).addEventListener("click", logEval);
$("logBestMove"         ).addEventListener("click", logBestMove);
$("redrawBoard"         ).addEventListener("click", redrawBoard);
$("unplayLastMove"      ).addEventListener("click", unplayLastMove);
$("restartGame"         ).addEventListener("click", restartGame);

// Init promotion popup
initPromotionPopup(BLACK);
initPromotionPopup(WHITE);

// link like actions
$("cancelPromote").addEventListener("click", cancelPromote);
$("playAgain").addEventListener("click", playAgain);
$("retry").addEventListener("click", playAgain);
$("unplayAfterLose").addEventListener("click", unplayAfterLose);
