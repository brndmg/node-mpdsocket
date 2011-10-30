/*******
** node-mpdsocket :: an MPD library for node.js
**
** author: Eli Wenig (http://eliwenig.com/) <eli@csh.rit.edu>
**
** copyright (c) 2011 Eli Wenig
** made available under the MIT license
**   http://www.opensource.org/licenses/mit-license.php
**
*******/

var net = require('net');
var sys = require('sys');

function mpdSocket(host,port) {
	if (!host) { 
		this.host = "localhost";
	} else {
		this.host = host;
	}

	if (!port){
		this.port = 6600;
	} else {
		this.port = port;
	}

	this.open(this.host,this.port);
}

var data = [];

mpdSocket.prototype = {
	callbacks: [],
	commands: [],
	isOpen: false,
	socket: null,
	version: "0",
	host: null,
	port: null

	handleData: function(datum) {
		data.push(datum);
		if (datum.match(/^(OK MPD|ACK)/) || datum.match(/OK\s*$/)) {
			this.handleAllData(data.join(''));
			data = [];
		}
	},

  handleAllData: function(data) { 
		var response = {};
		var responses = [];
		var lines = data.split("\n");
		var match;
		for (var l in lines) {
			var line = lines[l];

			if (match = line.match(/^ACK\s+\[.*?\](?:\s+\{.*?\})?\s+(.*)/)) {
				this.callbacks.shift()(match[1], null);
			}
			else if (line.match(/^OK MPD/)) {
				this.version = lines[l].split(' ')[2];
			}
			else if (line.match(/^OK/)) {
				if (responses.length > 0) {
					if (Object.keys(response).length > 0) { responses.push(response); }
					this.callbacks.shift()(null, responses);
				}
				else {
					this.callbacks.shift()(null, response);
				}
			}
			else {
				// Matches 'key: val' or 'val'
				match = line.match(/^(?:(.*?):)?\s*(.*?)\s*$/)
				var key = match[1];
				var value = match[2];
				
				//New response if old response was a string or had this key defined already
				if (typeof(response) == 'string' || typeof(response[key]) != 'undefined') {
					responses.push(response);
					response = {};
				}
				
				if (typeof(key) == 'undefined') {
					response = value;
				}
				else {
					response[key] = value;
				}
			}
		}
	},
	
	on: function(event, fn) {
		this.socket.on(event,fn);
	},

	open: function(host,port) {
		var self = this;
		if (!(this.isOpen)) {
			this.socket = net.createConnection(port,host);
			this.socket.setEncoding('UTF-8');
			this.socket.addListener('connect',function() { self.isOpen = true; });
			this.socket.addListener('data',function(data) { self.handleData.call(self,data); self._send(); });
			this.socket.addListener('end',function() { self.isOpen = false; });
		}
	},

	_send: function() {
		if (this.commands.length != 0) this.socket.write(this.commands.shift() + "\n");
	},

	send: function(req,callback) {
		if (this.isOpen) {
			this.callbacks.push(callback);
			this.commands.push(req);
			if (this.commands.length == 1) this._send();
		} else {
			var self = this;
			this.open(this.host,this.port);
			this.on('connect',function() {
				self.send(req,callback);
			});
		}
	}
}

module.exports = mpdSocket;
