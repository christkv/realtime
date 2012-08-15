var nopt = require("nopt")
  , fs = require('fs')
  , Stream = require("stream").Stream
  , path = require("path");

var Agent = function(options) {
  // Set up the options
  this.options = options;
  // Set up all the options
  this.host = this.options.host || "localhost";
  this.port = this.options.port || 9090;
  this.cfg = this.options.cfg;

  // Check if we have a cfg (JSON file)
  try {
    var configuration = fs.readFileSync(this.cfg, 'ascii');
  } catch(err) {

  }
}

// Known options
var knownOpts = {   "help" : Boolean
                  , "host" : String
                  , "port" : String
                  , "cfg" : String };
// Shorthand for the options
var shortHands = {};
// Parse all options
var parsed = nopt(knownOpts, shortHands, process.argv, 2)

// If we provided the help option
if(parsed.help) {
  console.log("agent usage");
  console.log("\t[--help] :: display help for command");
  console.log("\t[--host] :: reporter host, default: localhost");
  console.log("\t[--port] :: reporter port, default: 9090");
  console.log("\t[--cfg] :: configuration file location, default none");
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
