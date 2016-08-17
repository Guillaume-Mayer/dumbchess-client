// Namesapce constants
const NS_SVG    = "http://www.w3.org/2000/svg";
const NS_XLINK  = "http://www.w3.org/1999/xlink"

// Names
const COLOR_NAMES = ["Black", "White"];
const PIECE_NAMES = ["King", "Queen", "Rook", "Bishop", "Knight", "Pawn"];

"use strict";

// Sounds
var audioGood    = new Audio("sound/Applause.mp3");
var audioBad     = new Audio("sound/Buzzer.mp3");
var computerBeep = new Audio("sound/tone-beep.wav");

// Short for getElementById
var $ = document.getElementById.bind(document);

// SVG groups
var gTiles		= $("tiles");
var gHighlights	= $("highlights");
var gPieces		= $("pieces");

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
	promote: 0
};

// Store one tile to get his size on transform translations
var tileA1 = $("a1");

// Add a listener for each tile
function addTilesEventListener() {
	var tile;
	for (var row = 0; row < 8; row++) {
		for (var col = 0; col < 8; col++) {
			tile = $(chess.tileId(row, col));
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
	$(chess.tileId(row, col)).removeEventListener("click", tileClicked);
}

// Draw all the pieces
function drawPieces() {
	for (var row = 0; row < 8; row ++) {
		for (var col = 0; col < 8; col ++) {
			if (chess.board[row][col]) {
				drawPiece(chess.board[row][col], row, col);
			}
		}
	}
	// Apply rotation if needed
	if (chess.options.whiteOnTop) updateTransform();
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
	return $(chess.tileId(parseInt(piece.getAttribute("data-row")), parseInt(piece.getAttribute("data-col"))));
}

// Select a tile
function selectTile(tile, piece) {
	if (chess.options.players[chess.colorToPlay()] === chess.COMPUTER) return;
	if (tile == selection.tile1) {
		// Reset selection on reclick
		resetSelection();
	} else if (piece != undefined && parseInt(piece.getAttribute("data-color")) == chess.colorToPlay()) {
		// Ok, there is a piece to move here
		resetSelection();
		// Store the tile and his piece
		selection.tile1 = tile;
		selection.piece1 = piece;
		selection.classBefore1 = tile.getAttribute("class");
		//  Add the tile-selected class style
		tile.setAttribute("class", selection.classBefore1 + " tile-selected");
		// Highlight the legal moves
		if (chess.options.showLegalMoves) showLegalMovesForTile(tile);
	} else if (selection.tile1 != null) {
		// Ok the first tile was selected and the second tile is not of the same color
		selection.tile2 = tile;
		selection.piece2 = piece;
		selection.classBefore2 = tile.getAttribute("class");
		//  Add the tile-selected class style
		tile.setAttribute("class", selection.classBefore2 + " tile2-selected");
		// Promotion
		if (selection.piece1.getAttribute("class") == "piece " + PIECE_NAMES[chess.PAWN]) {
			if (tile.getAttribute("data-row") == "0") {
				promotionPopup(chess.BLACK);
				return;
			} else if (tile.getAttribute("data-row") == "7") {
				promotionPopup(chess.WHITE);
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
			selection.promote = 0;
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
	if (chess.options.sound) {
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
	if (chess.options.whiteOnTop) {
		w = selection.piece1.width.baseVal.value;
		h = selection.piece1.height.baseVal.value;
		selection.piece1.setAttribute("transform", "translate(" + (((move.col2*2)+1) * w) + " " + ((((7 - move.row2)*2)+1) * h) + ") rotate(180)");
	}
	// Special move stuff
	if (move.enPassant) {
		// Find and remove the pawn image
		var pawn = getPieceAt(PAWN, chess.colorToPlay() == chess.WHITE ? 4 : 3, move.col2);
		getTileFromPiece(pawn).addEventListener("click", tileClicked);
		gPieces.removeChild(pawn);
	} else if (move.castling == chess.KING) {
		// Move king-side rook
		var rook = getPieceAt(chess.ROOK, move.row1, 7);
		getTileFromPiece(rook).addEventListener("click", tileClicked);
		rook.setAttribute("x", 12.5*5 + "%");
		rook.setAttribute("data-col", 5);
		getTileFromPiece(rook).removeEventListener("click", tileClicked);
		if (chess.options.whiteOnTop) rook.setAttribute("transform", "translate(" + (((5*2)+1) * w) + " " + ((((7 - move.row1)*2)+1) * h) + ") rotate(180)");
	} else if (move.castling == chess.QUEEN) {
		// Move queen-side rook
		var rook = getPieceAt(chess.ROOK, move.row1, 0);
		getTileFromPiece(rook).addEventListener("click", tileClicked);
		rook.setAttribute("x", 12.5*3 + "%");
		rook.setAttribute("data-col", 3);
		getTileFromPiece(rook).removeEventListener("click", tileClicked);
		if (chess.options.whiteOnTop) rook.setAttribute("transform", "translate(" + (((3*2)+1) * w) + " " + ((((7 - move.row1)*2)+1) * h) + ") rotate(180)");
	} else if (move.promote) {
		selection.piece1.setAttributeNS(NS_XLINK, "xlink:href", "img/" + PIECE_NAMES[move.promote] + "_" + COLOR_NAMES[chess.colorToPlay()] + ".svg");
		selection.piece1.setAttribute("class", "piece " + PIECE_NAMES[move.promote]);
	}
	// Apply move to model
	chess.play(move);
	// Swap color to play <div>
	updateColorToPlay()
	// Deals with event listner for chrome android
	selection.tile1.addEventListener("click", tileClicked);
	selection.tile2.removeEventListener("click", tileClicked);
	// Reset selection
	resetSelection();
	// If it's the computer turn, let it move
	if (chess.options.players[chess.colorToPlay()] === chess.COMPUTER) {
		// Show thinking indicator
		$("thinking").innerHTML = "Let me think about it !";
		$("thinking").style.visibility = "visible";
		// Timeout for repaint
		setTimeout(computerPlay, 100);
	}
}

// When computer thinks
function computerPlay() {
	// Get the best move
	var move;
	move = chess.getBestMove();
	//move = iterativeDeepening();
	if (move) {
		// Play it
		chess.play(move);
		// Redraw the board
		redrawBoard();
		// Update color to play <div>
		updateColorToPlay();
		// Computer beep
		if (chess.options.sound) computerBeep.play();
		// Highlight the move
		selection.tile1 = $(chess.tileId(move.row1, move.col1));
		selection.tile2 = $(chess.tileId(move.row2, move.col2));
		selection.classBefore1 = selection.tile1.getAttribute("class");
		selection.classBefore2 = selection.tile2.getAttribute("class");
		selection.tile1.setAttribute("class", selection.classBefore1 + " tile-selected");
		selection.tile2.setAttribute("class", selection.classBefore2 + " tile2-selected");
		$("thinking").innerHTML = chess.moveToStr(move);
		setTimeout(resetSelection, 800);
		// Check win
		if (chess.getLegalMoves(chess.colorToPlay()).length === 0) {
			// Lose or draw
			$("thinking").style.visibility = "hidden";
			// Show popup
			setPopupVisible("lose", true);
		}
	} else {
		// Lose or draw
		$("thinking").style.visibility = "hidden";
		// Show popup
		setPopupVisible("win", true);
	}
}

// Get piece from coords
function getPieceAt(piece, row, col) {
	var pieces = getElemByClass(gPieces, PIECE_NAMES[piece]);
	for (var i=0; i<pieces.length; i++) {
		if (pieces.item(i).getAttribute("data-col") == col && pieces.item(i).getAttribute("data-row") == row) return pieces.item(i);
	}
}

// Since getElementsByClassName is not working on Edge
function getElemByClass(svgContainer, className) {
	if (svgContainer.getElementsByClassName) return svgContainer.getElementsByClassName(className);
	return document.getElementsByClassName(className);
}

// Toggle Show Legal moves ON/OFF
function toggleShowLegalMoves() {
	chess.options.showLegalMoves = !chess.options.showLegalMoves;
	$("toggleShowLegalMoves").setAttribute("class", "token " + (chess.options.showLegalMoves ? "ON" : "OFF"));
}

// Toggle sound ON/OFF
function toggleSound() {
	if (chess.options.sound) {
		audioGood.pause();
		audioBad.pause();
	}
	chess.options.sound = !chess.options.sound;
	$("toggleSound").setAttribute("class", "token " + (chess.options.sound ? "ON" : "OFF"));
}

// Highlight legal moves for tile
function showLegalMovesForTile(tile) {
	var moves = chess.getLegalMoves().filter(function(move) {
		return move.row1 === parseInt(tile.getAttribute("data-row")) && move.col1 === parseInt(tile.getAttribute("data-col"));
	});
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
	var elements = getElemByClass(gHighlights, "legal");
	while (elements.length > 0) {
		gHighlights.removeChild(elements.item(0));
	}
}

// Rotate board to put black at bottom
function rotateBoard() {
	var svg = $("svg");
	// Swap white on top flag
	chess.options.whiteOnTop = !chess.options.whiteOnTop;
	if (chess.options.whiteOnTop) {
		// Rotate board
		svg.setAttribute("class", "rotate180");
		// Rotate pieces
		updateTransform();
		// Add event listner so the transformation is updated on resize (since it used pixel translation)
		window.addEventListener("resize", updateTransform);
		// Toggle button ON
		$("rotateBoard").setAttribute("class", "token ON");
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
		$("rotateBoard").setAttribute("class", "token OFF");
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
	if (chess.history.length === 0) return;
	// Unplay the last move
	chess.unplay(chess.history[chess.history.length - 1]);
	// If computer unplay its move too
	if (chess.options.players[chess.colorToPlay()] === chess.COMPUTER) chess.unplay(chess.history[chess.history.length - 1]);
	// Redraw the board
	redrawBoard();
	// Update color to play <div>
	updateColorToPlay();
}

// Restart the game
function restartGame() {
	// Check if the game started
	if (chess.history.length === 0) return;
	// Restart (by unplaying all moves)
	restart();
	// Redraw the board
	redrawBoard();
	// Update color to play <div>
	updateColorToPlay();
}

// Update color to play <div>
function updateColorToPlay() {
	$("colorToPlay").setAttribute("class", "token " + COLOR_NAMES[chess.colorToPlay()]);
}

// Show promotion popup
function promotionPopup(color) {
	// Hide pieces for wrong color
	$("prom_" + COLOR_NAMES[1 - color]).style.visibility = "hidden";
	$("prom_" + COLOR_NAMES[  color  ]).style.visibility = "visible";
	// Show popup
	setPopupVisible("prom", true);
}

// Show promotion popup
function initPromotionPopup(color) {
	// Get the group for color
	var group = $("prom_" + COLOR_NAMES[color]);
	// Create the 4 images
	var images = group.getElementsByTagName("image");
	for (var i = 0, piece = chess.QUEEN; i < 4; i ++, piece ++) {
		images[i].setAttributeNS(NS_XLINK, "xlink:href", "img/" + PIECE_NAMES[piece] + "_" + COLOR_NAMES[color] + ".svg");
		images[i].setAttribute("data-piece", piece);
		images[i].addEventListener("click", promotionPieceClicked);
	}
}

// Show or hide popup by id
function setPopupVisible(id, visible) {
	$(id).style.display       = (visible ? "initial" : "none");
	$(id).style.pointerEvents = (visible ? "auto"    : "none");
}

// Close promotion
function cancelPromote(evt) {
	// Reset selection
	resetSelection();
	// Hide popup
	setPopupVisible("prom", false);
	// Prevent link to #
	evt.preventDefault();
}

// Apply promotion
function promotionPieceClicked(evt) {
	selection.promote = parseInt(evt.target.getAttribute("data-piece"));
	// Hide popup
	setPopupVisible("prom", false);
	// Check if the move is legal
	var move = checkMove();
	if (move) playMove(move);
}

// play again (after win)
function playAgain(evt) {
	setPopupVisible("win", false);
	setPopupVisible("lose", false);
	restartGame();
	evt.preventDefault();
}

// unplay (after lose) 
function unplayAfterLose(evt) {
	setPopupVisible("lose", false);
	unplayLastMove();
	evt.preventDefault();
}

// Restart the game by unplaying all history moves
function restart() {
   while(chess.history.length > 0) {
        chess.unplay(chess.history[chess.history.length - 1]);
    }
}

// Called by dumb-client
function getLegalMove(row1, col1, row2, col2, promote) {
	var legal = chess.getLegalMoves(chess.colorToPlay()).filter(function(m) {
		return m.row1 === row1 && m.col1 === col1 && m.row2 === row2 && m.col2 === col2 && m.promote === promote;
	});
	if (legal.length === 1) return legal[0];
}

function toggleLevel() {
	if (chess.getLevel() == "EASY") {
		chess.setLevel("MEDIUM"); 
	} else if (chess.getLevel() == "MEDIUM") {
		chess.setLevel("HARD");
	} else if (chess.getLevel() == "HARD") {
		chess.setLevel("EASY");
	}
	$("toggleLevel").setAttribute("class", "token " + chess.getLevel());
}