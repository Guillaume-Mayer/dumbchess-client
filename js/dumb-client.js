"use strict";

// Namesapce constants
const NS_SVG	= "http://www.w3.org/2000/svg";
const NS_XLINK	= "http://www.w3.org/1999/xlink"

// Sounds
var audioGood    = new Audio("sound/Applause.mp3");
var audioBad     = new Audio("sound/Buzzer.mp3");
var computerBeep = new Audio("sound/tone-beep.wav");

// SVG groups
var gTiles		= document.getElementById("tiles");
var gHighlights	= document.getElementById("highlights");
var gPieces		= document.getElementById("pieces");

// Selection singleton (tiles for move)
var selection =  {
	// Tile element (rect)
	tile1: null,
	// Piece element (image)
	piece1: null,
	// Tile class before selection
	classBefore1: "",
	// Destination tile (rect)
	tile2: null,
	// Piece inn destination tile (image)
	piece2: null,
	// Tile class before selection
	classBefore2: "",
	// Promote to
	promote: null
};

// Store one tile to get his size on transform translations
var tileA1 = document.getElementById("a1");

// Tile Id from row/col
function tileId(row, col) {
	return LETTERS.charAt(col) + String(row + 1);
}

// Add a listener for each tile
function addTilesEventListener() {
	var tile;
	for (var row = 0; row < 8; row++) {
		for (var col = 0; col < 8; col++) {
			tile = document.getElementById(tileId(row, col));
			tile.addEventListener("click", tileClicked);
		}
	}
}

// Draw a piece
function drawPiece(piece, row, col) {
	var image = document.createElementNS(NS_SVG, "image");
	image.setAttributeNS(NS_XLINK, "xlink:href", "img/" + PIECE_NAMES[piece.piece] + "_" + COLOR_NAMES[piece.color] + ".svg");
	image.setAttribute("x", 12.5*col + "%");
	image.setAttribute("y", 12.5*(7 - row) + "%");
	image.setAttribute("width", "12.5%");
	image.setAttribute("height", "12.5%");
	image.setAttribute("data-color", piece.color);
	image.setAttribute("data-row", row);
	image.setAttribute("data-col", col);
	image.setAttribute("class", "piece " + PIECE_NAMES[piece.piece]);
	image.addEventListener("click", pieceClicked);
	gPieces.appendChild(image);
	// Remove tile event listener to prevent magnifier on android chrome
	document.getElementById(tileId(row, col)).removeEventListener("click", tileClicked);
}

// Draw all the pieces
function drawPieces() {
	for (var row = 0; row < 8; row ++) {
		for (var col = 0; col < 8; col ++) {
			if (game.board[row][col]) {
				drawPiece(game.board[row][col], row, col);
			}
		}
	}
	// Apply rotation if needed
	if (game.options.whiteOnTop) updateTransform();
}

// Occurs when a tile is clicked
function tileClicked(event) {
	selectTile(event.target);
}

// Occurs when a piece is clicked
function pieceClicked(event) {
	selectTile(getTileFromPiece(event.target), event.target);
}

// Get the tile element a piece element is on
function getTileFromPiece(piece) {
	return document.getElementById(tileId(parseInt(piece.getAttribute("data-row")), parseInt(piece.getAttribute("data-col"))));
}

// Select a tile
function selectTile(tile, piece) {
	if (game.players[game.colorToPlay] === COMPUTER) return;
	if (tile == selection.tile1) {
		// Reset selection on reclick
		resetSelection();
	} else if (piece != undefined && parseInt(piece.getAttribute("data-color")) == game.colorToPlay) {
		// Ok, there is a piece to move here
		resetSelection();
		// Store the tile and his piece
		selection.tile1 = tile;
		selection.piece1 = piece;
		selection.classBefore1 = tile.getAttribute("class");
		//  Add the tile-selected class style
		tile.setAttribute("class", selection.classBefore1 + " tile-selected");
		// Highlight the legal moves
		if (game.options.showLegalMoves) showLegalMovesForTile(tile);
	} else if (selection.tile1 != null) {
		// Ok the first tile was selected and the second tile is not of the same color
		selection.tile2 = tile;
		selection.piece2 = piece;
		selection.classBefore2 = tile.getAttribute("class");
		//  Add the tile-selected class style
		tile.setAttribute("class", selection.classBefore2 + " tile2-selected");
		// Promotion
		if (selection.piece1.getAttribute("class") == "piece " + PIECE_NAMES[PAWN]) {
			if (tile.getAttribute("data-row") == "0") {
				promotionPopup(BLACK);
				return;
			} else if (tile.getAttribute("data-row") == "7") {
				promotionPopup(WHITE);
				return;
			}
		}
		// Check if the move is legal
		var move = checkMove();
		if (move) {
			playMove(move);
		} else {
			resetSelection();
		}
	}
}

// Reset selection
function resetSelection() {
	hideLegalMoves();
	if (selection.tile1) {
		selection.tile1.setAttribute("class", selection.classBefore1);
		selection.tile1 = null;
		selection.piece1 = null;
		selection.classBefore1 = "";
		if (selection.tile2) {
			selection.tile2.setAttribute("class", selection.classBefore2);
			selection.tile2 = null;
			selection.piece2 = null;
			selection.classBefore2 = "";
			selection.promote = null;
		}
	}
}

// Check if the move is legal
function checkMove() {
	var move = getLegalMove(
		parseInt(selection.tile1.getAttribute("data-row")),
		parseInt(selection.tile1.getAttribute("data-col")),
		parseInt(selection.tile2.getAttribute("data-row")),
		parseInt(selection.tile2.getAttribute("data-col")),
		selection.promote
		);
	if (game.options.sound) {
		if (move) {
			audioGood.play();
		} else {
			audioBad.play();
		}
	}
	return move;
}

// Play the move
function playMove(move) {
	// Remove captured piece if any
	if (selection.piece2) gPieces.removeChild(selection.piece2);
	// Move piece (image)
	selection.piece1.setAttribute("x", 12.5*move.col2 + "%");
	selection.piece1.setAttribute("y", 12.5*(7 - move.row2) + "%");
	// Change piece coords attributes
	selection.piece1.setAttribute("data-row", move.row2);
	selection.piece1.setAttribute("data-col", move.col2);
	// If white are on top transformation needs to be updated
	var w, h;
	if (game.options.whiteOnTop) {
		w = selection.piece1.width.baseVal.value;
		h = selection.piece1.height.baseVal.value;
		selection.piece1.setAttribute("transform", "translate(" + (((move.col2*2)+1) * w) + " " + ((((7 - move.row2)*2)+1) * h) + ") rotate(180)");
	}
	// Special move stuff
	if (move.enPassant) {
		// Find and remove the pawn image
		var pawn = getPieceAt(PAWN, game.colorToPlay == WHITE ? 4 : 3, move.col2);
		getTileFromPiece(pawn).addEventListener("click", tileClicked);
		gPieces.removeChild(pawn);
	} else if (move.castling == KING) {
		// Move king-side rook
		var rook = getPieceAt(ROOK, move.row1, 7);
		getTileFromPiece(rook).addEventListener("click", tileClicked);
		rook.setAttribute("x", 12.5*5 + "%");
		rook.setAttribute("data-col", 5);
		getTileFromPiece(rook).removeEventListener("click", tileClicked);
		if (game.options.whiteOnTop) rook.setAttribute("transform", "translate(" + (((5*2)+1) * w) + " " + ((((7 - move.row1)*2)+1) * h) + ") rotate(180)");
	} else if (move.castling == QUEEN) {
		// Move queen-side rook
		var rook = getPieceAt(ROOK, move.row1, 0);
		getTileFromPiece(rook).addEventListener("click", tileClicked);
		rook.setAttribute("x", 12.5*3 + "%");
		rook.setAttribute("data-col", 3);
		getTileFromPiece(rook).removeEventListener("click", tileClicked);
		if (game.options.whiteOnTop) rook.setAttribute("transform", "translate(" + (((3*2)+1) * w) + " " + ((((7 - move.row1)*2)+1) * h) + ") rotate(180)");
	} else if (move.promote) {
		selection.piece1.setAttributeNS(NS_XLINK, "xlink:href", "img/" + PIECE_NAMES[move.promote] + "_" + COLOR_NAMES[game.colorToPlay] + ".svg");
		selection.piece1.setAttribute("class", "piece " + PIECE_NAMES[move.promote]);
	}
	// Apply move to model
	play(move);
	// Swap color to play <div>
	updateColorToPlay()
	// Deals with event listner for chrome android
	selection.tile1.addEventListener("click", tileClicked);
	selection.tile2.removeEventListener("click", tileClicked);
	// Reset selection
	resetSelection();
	// If it's the computer turn, let it move
	if (game.players[game.colorToPlay] === COMPUTER) {
		// Show thinking indicator
		document.getElementById("thinking").innerHTML = "Let me think about it !";
		document.getElementById("thinking").style.visibility = "visible";
		// Timeout for repaint
		setTimeout(computerPlay, 100);
	}
}

// When computer thinks
function computerPlay() {
	// Get the best move
	var move = getBestMove();
	if (move) {
		// Play it
		play(move);
		// Redraw the board
		redrawBoard();
		// Update color to play <div>
		updateColorToPlay();
		// Computer beep
		if (game.options.sound) computerBeep.play();
		// Highlight the move
		selection.tile1 = document.getElementById(tileId(move.row1, move.col1));
		selection.tile2 = document.getElementById(tileId(move.row2, move.col2));
		selection.classBefore1 = selection.tile1.getAttribute("class");
		selection.classBefore2 = selection.tile2.getAttribute("class");
		selection.tile1.setAttribute("class", selection.classBefore1 + " tile-selected");
		selection.tile2.setAttribute("class", selection.classBefore2 + " tile2-selected");
		document.getElementById("thinking").innerHTML = move.toStr();
		setTimeout(resetSelection, 800);
		// Check win
		if (getLegalMoves(game.colorToPlay).length === 0) {
			// Lose or draw
			document.getElementById("thinking").style.visibility = "hidden";
			// Show popup
			setPopupVisible("lose", true);
		}
	} else {
		// Lose or draw
		document.getElementById("thinking").style.visibility = "hidden";
		// Show popup
		setPopupVisible("win", true);
	}
}

// Get piece from coords
function getPieceAt(piece, row, col) {
	var pieces = gPieces.getElementsByClassName(PIECE_NAMES[piece]);
	for (var i=0; i<pieces.length; i++) {
		if (pieces.item(i).getAttribute("data-col") == col && pieces.item(i).getAttribute("data-row") == row) return pieces.item(i);
	}
}

// Toggle Show Legal moves ON/OFF
function toggleShowLegalMoves() {
	game.options.showLegalMoves = !game.options.showLegalMoves;
	document.getElementById("toggleShowLegalMoves").setAttribute("class", "token " + (game.options.showLegalMoves ? "ON" : "OFF"));
}

// Toggle sound ON/OFF
function toggleSound() {
	if (game.options.sound) {
		audioGood.pause();
		audioBad.pause();
	}
	game.options.sound = !game.options.sound;
	document.getElementById("toggleSound").setAttribute("class", "token " + (game.options.sound ? "ON" : "OFF"));
}

// Highlight legal moves for tile
function showLegalMovesForTile(tile) {
	var moves = removeIllegalMoves(getMovesForTile(game.colorToPlay, parseInt(tile.getAttribute("data-row")), parseInt(tile.getAttribute("data-col"))), game.colorToPlay);
	for (var m=0; m<moves.length; m++) {
		var c = document.createElementNS(NS_SVG, "circle");
		c.setAttribute("cx", String(moves[m].col2*12.5+6.25) + "%");
		c.setAttribute("cy", String((7 - moves[m].row2)*12.5+6.25) + "%");
		if (moves[m].capture) {
			c.setAttribute("r", "4%");
			c.setAttribute("class", "legal red");
		} else {
			c.setAttribute("r", "2%");
			c.setAttribute("class", "legal green");
		}
		gHighlights.appendChild(c);
	}
}

// Hide the legal moves highlight circles
function hideLegalMoves() {
	var elements = gHighlights.getElementsByClassName("legal");
	while (elements.length > 0) {
		gHighlights.removeChild(elements.item(0));
	}
}

// Rotate board to put black at bottom
function rotateBoard() {
	var svg = document.getElementById("svg");
	// Swap white on top flag
	game.options.whiteOnTop = !game.options.whiteOnTop;
	if (game.options.whiteOnTop) {
		// Rotate board
		svg.setAttribute("class", "rotate180");
		// Rotate pieces
		updateTransform();
		// Add event listner so the transformation is updated on resize (since it used pixel translation)
		window.addEventListener("resize", updateTransform);
		// Toggle button ON
		document.getElementById("rotateBoard").setAttribute("class", "token ON");
	} else {
		// Remove event listner ...
		window.removeEventListener("resize", updateTransform);
		// Un-rotate board
		svg.setAttribute("class", "");
		// Un-rotate pieces
		var pieces = gPieces.getElementsByTagName("*");
		for (var i=0; i<pieces.length; i++) {
			pieces.item(i).removeAttribute("transform");
		}
		// Toggle button OFF
		document.getElementById("rotateBoard").setAttribute("class", "token OFF");
	}
}

// Rotate each piece by 180°
function updateTransform() {
	var w = tileA1.width.baseVal.value;
	var h = tileA1.height.baseVal.value;
	var row, col;
	var pieces = gPieces.getElementsByTagName("*");
	for (var i=0; i<pieces.length; i++) {
		row = parseInt(pieces.item(i).getAttribute("data-row"));
		col = parseInt(pieces.item(i).getAttribute("data-col"));
		pieces.item(i).setAttribute("transform", "translate(" + (((col*2)+1) * w) + " " + ((((7 - row)*2)+1) * h) + ") rotate(180)"); // Va comprendre ?
	}
}

// Redraw Board from model
function redrawBoard() {
	// Delete all pieces
	while (gPieces.firstElementChild) {
		getTileFromPiece(gPieces.firstElementChild).addEventListener("click", tileClicked);
		gPieces.removeChild(gPieces.firstElementChild);
	}
	// Redraw all pieces based on game board position
	drawPieces();
}

// Unplay the last move
function unplayLastMove() {
	// Check if there is one
	if (game.history.length === 0) return;
	// Unplay the last move
	unplay(game.history[game.history.length - 1]);
	// If computer unplay its move too
	if (game.players[game.colorToPlay] === COMPUTER) unplay(game.history[game.history.length - 1]);
	// Redraw the board
	redrawBoard();
	// Update color to play <div>
	updateColorToPlay();
}

// Restart the game
function restartGame() {
	// Check if the game started
	if (game.history.length === 0) return;
	// Restart (by unplaying all moves)
	restart();
	// Redraw the board
	redrawBoard();
	// Update color to play <div>
	updateColorToPlay();
}

// Update color to play <div>
function updateColorToPlay() {
	document.getElementById("colorToPlay").setAttribute("class", "token " + COLOR_NAMES[game.colorToPlay]);
}

// Show promotion popup
function promotionPopup(color) {
	// Hide pieces for wrong color
	document.getElementById("prom_" + COLOR_NAMES[1 - color]).style.visibility = "hidden";
	document.getElementById("prom_" + COLOR_NAMES[  color  ]).style.visibility = "visible";
	// Show popup
	setPopupVisible("prom", true);
}

// Show promotion popup
function initPromotionPopup(color) {
	// Get the group for color
	var group = document.getElementById("prom_" + COLOR_NAMES[color]);
	// Create the 4 images
	var images = group.getElementsByTagName("image");
	for (var i = 0, piece = QUEEN; i < 4; i ++, piece ++) {
		images[i].setAttributeNS(NS_XLINK, "xlink:href", "img/" + PIECE_NAMES[piece] + "_" + COLOR_NAMES[color] + ".svg");
		images[i].setAttribute("data-piece", piece);
		images[i].addEventListener("click", promotionPieceClicked);
	}
}

// Show or hide popup by id
function setPopupVisible(id, visible) {
	document.getElementById(id).style.display       = (visible ? "initial" : "none");
	document.getElementById(id).style.pointerEvents = (visible ? "auto"    : "none");
}

// Close promotion
function cancelPromote() {
	// Reset selection
	resetSelection();
	// Hide popup
	setPopupVisible("prom", false);
}

// Apply promotion
function promotionPieceClicked(event) {
	selection.promote = parseInt(this.getAttribute("data-piece"));
	// Hide popup
	setPopupVisible("prom", false);
	// Check if the move is legal
	var move = checkMove();
	if (move) playMove(move);
}

// play again (after win)
function playAgain() {
	setPopupVisible("win", false);
	restartGame();
}

// play again (after lose)
function retry() {
	setPopupVisible("lose", false);
	restartGame();
}

// unplay (after lose) 
function unplayAfterLose() {
	setPopupVisible("lose", false);
	unplayLastMove();
}
