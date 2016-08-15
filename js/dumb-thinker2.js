self.importScripts("dumb-const.js", "dumb-chess.js", "dumb-think.js");

self.addEventListener("message", function(e) {
	var obj = JSON.parse(e.data);
	if (obj.board) {
		// Initialize the game
		self.game = obj;
		// Search the best move
		var negaMaxObj = negaMax(game.options.negaMaxDepth, -Infinity, +Infinity);
		// Return the negamax object
		self.postMessage(JSON.stringify(negaMaxObj));
		// Close
		self.close();
	}
});
