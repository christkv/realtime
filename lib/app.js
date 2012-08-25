WSServer = require('./api/ws_server').WSServer;

var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(9090, function() {
    console.log((new Date()) + ' Server is listening on port 9090');
});

// Create a responding server
var wsServer = new WSServer(server);
wsServer.on("connect", function() {
  console.log("===================================== connect")
});
// Start the server
wsServer.start();
