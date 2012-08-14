var nopt = require("nopt")
  , Stream = require("stream").Stream
  , path = require("path");

var Agent = function(options) {
  // Set up the options
  this.options = options;
  // Set up all the options
  this.host = this.options.host || "localhost";
  this.port = this.options.port || 9090;
}

// Known options
var knownOpts = {   "help" : Boolean
                  , "host" : String
                  , "port" : String };
// Shorthand for the options
var shortHands = {};
// Parse all options
var parsed = nopt(knownOpts, shortHands, process.argv, 2)

// If we provided the help option
if(parsed.help) {
  console.log("agent usage");
  console.log("\t[--help]");
  console.log("\t[--host]");
  console.log("\t[--port]");
  return;
}

// Create a new agent
var agent = new Agent(parsed);

// KnownOptions
// var knownOpts = {   "foo" : [String, null]
//                   , "bar" : [Stream, Number]
//                   , "baz" : path
//                   , "bloo" : [ "big", "medium", "small" ]
//                   , "flag" : Boolean
//                   , "pick" : Boolean
//                   , "many" : [String, Array] }

// Known options
// // Short hand aliases
// var shortHands = { "foofoo" : ["--foo", "Mr. Foo"]
//                  , "b7" : ["--bar", "7"]
//                  , "m" : ["--bloo", "medium"]
//                  , "p" : ["--pick"]
//                  , "f" : ["--flag"]
//                  }
