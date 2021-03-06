var express = require('express');
var chalk = require('chalk');
var fs = require('fs');
var EmberApp = require('./ember-app');
var debug   = require('debug')('ember-cli-fastboot:server');

function FastBootServer(options) {
  this.app = new EmberApp({
    appFile: options.appFile,
    vendorFile: options.vendorFile
  });

  this.html = fs.readFileSync(options.htmlFile);
  this.html = this.html.toString();

  this.ui = options.ui;
}

FastBootServer.prototype.log = function(statusCode, message) {
  var color = statusCode === 200 ? 'green' : 'red';

  this.ui.writeLine(chalk[color](statusCode) + " " + message);
};

var contentForRegex = /\{\{content-for ['"](.+)["']\}\}/g;

FastBootServer.prototype.insertIntoIndexHTML = function(body) {
  var html = this.html.replace("{{content-for 'body'}}", body);
  html = html.replace(contentForRegex, '');

  return html;
};

FastBootServer.prototype.handleSuccess = function(res, path, body) {
  this.log(200, 'OK ' + path);
  res.send(this.insertIntoIndexHTML(body));
};

FastBootServer.prototype.handleFailure = function(res, path, error) {
  if (error.name === "UnrecognizedURLError") {
    this.log(404, "Not Found " + path);
    res.sendStatus(400);
  } else {
    console.log(error.stack);
    this.log(500, "Unknown Error: " + error);
    res.sendStatus(500);
  }
};

FastBootServer.prototype.handleAppBootFailure = function(error) {
  debug("app boot failed");
  self.ui.writeLine(chalk.red("Error loading the application."));
  self.ui.writeLine(error);
};

FastBootServer.prototype.middleware = function() {
  return function(req, res, next) {
    var path = req.path;
    debug("middleware request; path=%s", path);

    var server = this;

    this.app.waitForBoot().then(function(handleURL) {
      debug("handling url; url=%s", path);
      debug("handleURL; %s", handleURL);
      handleURL(path).then(
        success, failure
      ).finally(function() {
        debug("finished handling; url=%s", path);
      });

      function success(body) {
        server.handleSuccess(res, path, body);
      }

      function failure(error) {
        server.handleFailure(res, path, error);
      }
    });
  }.bind(this);
};

module.exports = FastBootServer;
