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
$("toggleShowLegalMoves").setAttribute("class", "token " + (chess.options.showLegalMoves ? "ON" : "OFF"));
$("toggleSound"         ).setAttribute("class", "token " + (chess.options.sound          ? "ON" : "OFF"));
$("rotateBoard"         ).setAttribute("class", "token " + (chess.options.whiteOnTop     ? "ON" : "OFF"));
$("toggleLevel"         ).setAttribute("class", "token " + chess.getLevel());

// Action button listeners
$("toggleShowLegalMoves").addEventListener("click", toggleShowLegalMoves);
$("toggleSound"         ).addEventListener("click", toggleSound);
$("rotateBoard"         ).addEventListener("click", rotateBoard);
$("unplayLastMove"      ).addEventListener("click", unplayLastMove);
$("restartGame"         ).addEventListener("click", restartGame);
$("toggleLevel"         ).addEventListener("click", toggleLevel);
$("toggleQuiescence"    ).addEventListener("click", toggleQuiescence);

// Init promotion popup
initPromotionPopup(chess.BLACK);
initPromotionPopup(chess.WHITE);

// Link like actions
$("cancelPromote").addEventListener("click", cancelPromote);
$("playAgain").addEventListener("click", playAgain);
$("retry").addEventListener("click", playAgain);
$("unplayAfterLose").addEventListener("click", unplayAfterLose);
