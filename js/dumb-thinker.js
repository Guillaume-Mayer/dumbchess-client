self.importScripts("dumb-chess.js");

var index;

self.addEventListener("message", function(e) {
	var obj = JSON.parse(e.data);
	if (obj.board) {
		// If the message is the game: initialize the game
		self.game = obj;
	} else if (obj.index !== undefined) {
		// Set move index
		self.index = obj.index;
	} else if (obj.row1) {
		// If the message is a move: play it and get the score
		play(obj);
		var negaMaxObj = negaMax(chess.options.negaMaxDepth - 1, -Infinity, +Infinity);
		self.postMessage(JSON.stringify({index: self.index, negamax: negaMaxObj}));
		self.close();
	}
});
