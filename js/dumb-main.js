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
document.getElementById("pan-side1").addEventListener("click", resetSelection);
document.getElementById("pan-side2").addEventListener("click", resetSelection);

// Set some elements according to options
document.getElementById("toggleShowLegalMoves").setAttribute("class", "token " + (game.options.showLegalMoves ? "ON" : "OFF"));
document.getElementById("toggleSound"         ).setAttribute("class", "token " + (game.options.sound          ? "ON" : "OFF"));
document.getElementById("rotateBoard"         ).setAttribute("class", "token " + (game.options.whiteOnTop     ? "ON" : "OFF"));

// Action button listeners
document.getElementById("toggleShowLegalMoves").addEventListener("click", toggleShowLegalMoves);
document.getElementById("toggleSound"         ).addEventListener("click", toggleSound);
document.getElementById("rotateBoard"         ).addEventListener("click", rotateBoard);
document.getElementById("logBoard"            ).addEventListener("click", logBoard);
document.getElementById("logHistory"          ).addEventListener("click", logHistory);
document.getElementById("logLegalMoves"       ).addEventListener("click", logLegalMoves);
document.getElementById("logEval"             ).addEventListener("click", logEval);
document.getElementById("logBestMove"         ).addEventListener("click", logBestMove);
document.getElementById("redrawBoard"         ).addEventListener("click", redrawBoard);
document.getElementById("unplayLastMove"      ).addEventListener("click", unplayLastMove);
document.getElementById("restartGame"         ).addEventListener("click", restartGame);

// Init promotion popup
initPromotionPopup(BLACK);
initPromotionPopup(WHITE);
