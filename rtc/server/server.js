var port=3006;
var io=require("socket.io").listen(port);

io.sockets.on("connection",function(socket) {
	socket.on("message",function(msg) {
		socket.broadcast.emit("message",msg);
		console.log(msg);
	});

	socket.on("disconnect",function() {
		socket.broadcast.emit("用户失去连接");
		console.log("用户失去连接")
	}) 
}) 