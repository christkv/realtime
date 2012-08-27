var nopt = require("nopt")
  , fs = require('fs')
  , net = require('net')
  , EventEmitter = require('events').EventEmitter
  , WebSocketClient = require('websocket').client
  , format = require('util').format
  , Stream = require("stream").Stream
  , inherits = require('util').inherits
  , crypto = require('crypto')
  , path = require("path");

// Agents
var top_agent = require('./agents/top_agent'),
  iostat_agent = require('./agents/iostat_agent'),
  netstat_agent = require('./agents/netstat_agent');

var Agent = function Agent(config) {
  EventEmitter.call(this);
  // Unpack the config
  this.host = config.host || "localhost";
  this.port = config.port || 9090;
  this.log = config.log;
  this.apiKey = config.api_key || null;
  this.secretKey = config.secret_key || null;
  this.cryptoAlgorithm = config.crypto_algorithm || 'aes256';
  this.retries = config.retries || 3;
  this.agentConfigs = Array.isArray(config.agents)
                      ? config.agents
                      : [{agent:"top"}, {agent:"iostat"}, {agent:"netstat"}];
  // If no apiKey provided throw an error
  if(this.apiKey == null) throw new Error("api key must be provided");
  // All agent instances
  this.running = true;
  this.agents = [];
  // Create a log instance
  if(this.log) {
    this.logger = new Logger(fs.createWriteStream(this.log, {flags:"a+", encoding:'ascii', mode: 0666}));
  }
}

inherits(Agent, EventEmitter);

Agent.prototype.start = function start() {
  var self = this;
  // Setup the server connection for reporting the numbers
  _connectToServer(self, function() {
    // Unpack the parameters and instantiate the components
    _setUpAgents(self);
  });
}

Agent.prototype.shutdown = function shutdown() {
  if(this.logger) this.logger.error("agent shutting down");
  // Set state to not runnint
  this.running = false;
  // Terminate all agents
  for(var i = 0; i < this.agents.length; i++) {
    this.agents[i].stop();
  }
}

var _connectionErrorHandler = function _connectionErrorHandler(event, self) {
  return function(err) {
    if(self.logger && err != true) self.logger.error(format("agent received error:%s", err.toString()));
    if(err != null) self.shutdown();
  }
}

var _connectionDataHandler = function _connectionDataHandler(self) {
  return function(data) {
    if(logger) logger.info(format("agent received data:%s", JSON.stringify(data)));
  }
}

var _connectToServer = function _connectToServer(self, callback) {
  this.client = new WebSocketClient();
  this.client.on('connectFailed', _connectionErrorHandler('connectFailed', self));
  this.client.on('connect', function(connection) {
    self.connection = connection;
    self.connection.on('error', _connectionErrorHandler('error', self));
    self.connection.on('close', _connectionErrorHandler('error', self));
    self.connection.on('message', _connectionDataHandler('message', self));

    // Callback to start
    callback(null, null);
  });

  // Connect to the websocket
  this.client.connect(format('ws://%s:%s/', self.host, self.port), 'agent');
}

var _setUpAgents = function _setUpAgents(self) {
  var agentConfigs = self.agentConfigs;
  var logger = self.logger;
  // Go over all the agents
  for(var i = 0; i < agentConfigs.length; i++) {
    var agentConfig = agentConfigs[i];

    switch(agentConfig.agent) {
      case 'top':
        if(logger) logger.info("Configuring top agent");
        _configureTopAgent(self, agentConfig);
        break;
      case 'iostat':
        if(logger) logger.info("Configuring iostat agent");
        _configureIoStatAgent(self, agentConfig);
        break;
      case 'netstat':
        if(logger) logger.info("Configuring netstat agent");
        _configureNetStatAgent(self, agentConfig);
        break;
      case 'mongodb':
        if(logger) logger.info("Configuring mongodb agent");
        _configureMongoDBAgent(self, agentConfig);
        break
      default:
        if(logger) logger.error("no agent available for " + agentConfig.agent);
        throw new Error("no agent available for " + agentConfig.agent);
    }
  }
}

// Handles incoming data
var _agentDataHandler = function _agentDataHandler(name, agent, self) {
  var logger = self.logger;
  return function(data) {
    if(logger) logger.info(format("[%s]:agent received data", name));
    if(logger) logger.debug(JSON.stringify(data));
    // If we are connected, fire off the message
    if(self.running && self.connection) {
      // Set the final object
      var finalObject = data;
      // Add the information about the originating address of the data
      if(!data.info) data.info = {};
      data.info.net = self.connection.socket.address();
      // Add the timestamp since 1970 in miliseconds
      data.at = new Date().getTime();
      // If we have an apikey and secretKey we are going to encrypt the content
      if(self.apiKey != null && self.secretKey) {
        // Encryp the data as base 64 string
        var cipher = crypto.createCipher(self.cryptoAlgorithm, self.secretKey);
        // Encrypt the data
        var encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'base64');
        encryptedData = encryptedData + cipher.final('base64');
        // Set the encrypted info
        finalObject = {
          api_key: self.apiKey,
          encrypted: true,
          data: encryptedData
        }
      } else {
        data.api_key = self.apiKey;
      }

      // Send the message to the server
      self.connection.sendUTF(JSON.stringify(finalObject));
    }
  }
}

// Handles end commands from agents
var _agentEndHandler = function _agentEndHandler(name, agent, self) {
  var logger = self.logger;
  return function(code) {
    if(logger) logger.info(format("[%s]:agent recived end with code %s", name, code));
    // if we have a single run function start it again
    if(agent.singleRun() && self.running) {
      // Execute in next tick
      process.nextTick(function() {
        try {
          // Reboot the agent and do another collection
          agent.start();
        } catch(err) {
          if(logger) logger.error(format("[%s]:agent received error:%s", name, err.toString()));
        }
      })
    }
  }
}

// Handles error commands
var _agentErrorHandler = function _agentErrorHandler(name, agent, self) {
  var logger = self.logger;
  return function(err) {
    if(self.running) {
      if(logger) logger.error(format("[%s]:agent received error:%s", name, err.toString()));
      if(logger) logger.debug(JSON.stringify(err));
      // Terminate the agent
      self.shutdown();
    }
  }
}

// Seup top agent
var _configureTopAgent = function _configureTopAgent(self, config) {
  if(self.logger) self.logger.info(format("[%s]:agent starting with configuration:%s", 'top', JSON.stringify(config)));
  // Start agent
  _startAgent(self, 'top', top_agent.build(config, self.logger));
}

// Setup iostat agent
var _configureIoStatAgent = function _configureIoStatAgent(self, config) {
  if(self.logger) self.logger.info(format("[%s]:agent starting with configuration:%s", 'iostat', JSON.stringify(config)));
  // Start agent
  _startAgent(self, 'iostat', iostat_agent.build(config, self.logger));
}

// Setup netstat agent
var _configureNetStatAgent = function _configureNetStatAgent(self, config) {
  if(self.logger) self.logger.info(format("[%s]:agent starting with configuration:%s", 'netstat', JSON.stringify(config)));
  // Start agent
  _startAgent(self, 'netstat', netstat_agent.build(config, self.logger));
}

var _startAgent = function(self, name, agent) {
  // Add listeners
  agent.on("data", _agentDataHandler("top", agent, self));
  agent.on("end", _agentEndHandler("top", agent, self));
  agent.on("error", _agentErrorHandler("top", agent, self));

  try {
    // Boot it up
    agent.start();
    // Add the agent to the list of active agents
    self.agents.push(agent);
  } catch(err) {
    if(self.logger) self.logger.error(format("[%s]:agent received error:%s", name, err.toString()));
  }
}

// Setup mongodb agent
var _configureMongoDBAgent = function _configureMongoDBAgent(self, config) {
  if(self.logger) self.logger.info(format("[%s]:agent starting with configuration:%s", 'mongodb', JSON.stringify(config)));
}

/*******************************************************************************
 *  Logger class used in the agent
 *******************************************************************************/
var Logger = function Logger(logger) {
  this.logger = logger;
  this.logLevel = Logger.INFO;
}

Logger.DEBUG = 5;
Logger.INFO = 3;
Logger.ERROR = 1;

var _log = function _log(self, level, line) {
  self.logger.write(format("[%s]:%s:%s\n", level, new Date().toString(), line));
}

Logger.prototype.setLoglevel = function setLoglevel(level) {
  this.logLevel = level;
}

Logger.prototype.info = function info(line) {
  if(this.logLevel >= Logger.INFO) _log(this, "INFO", line);
}

Logger.prototype.debug = function debug(line) {
  if(this.logLevel >= Logger.DEBUG) _log(this, "DEBUG", line);
}

Logger.prototype.error = function error(line) {
  if(this.logLevel >= Logger.ERROR) _log(this, "DEBUG", line);
}

exports.Agent = Agent;
