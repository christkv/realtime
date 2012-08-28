var ConnectionHandler = function ConnectionHandler(uri, channel) {
  this.uri = uri;
  this.channel = channel;
  // Create a proper url
  // this.url = "ws://" + this.uri.substr(7).split('/')[0];
  this.url = "ws://localhost:8080"
  console.log(this.url)
}

ConnectionHandler.prototype.start = function() {
  // standard one
  var wsCtor = window.WebSocket;
  this.websocket = new wsCtor(this.url, this.channel);
  this.websocket.binaryType = 'arraybuffer';

  this.websocket.onopen = function(event) {
    console.log(event)
  }

  this.websocket.onclose = function(event) {
    console.log(event)
  }

  this.websocket.onmessage = function(event) {
    console.log(event)
  }

  this.websocket.onerror = function(event) {
    console.log(event)
  }
}

new ConnectionHandler(document.URL, 'stats').start();

