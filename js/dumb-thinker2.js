self.importScripts("dumb-chess.js");

self.addEventListener("message", function(e) {
	var obj = JSON.parse(e.data);
	if (obj.board) {
		// Initialize the game
		self.game = obj;
		// Search the best move
		var negaMaxObj = negaMax(chess.options.negaMaxDepth, -Infinity, +Infinity);
		// Return the negamax object
		self.postMessage(JSON.stringify(negaMaxObj));
		// Close
		self.close();
	}
});
