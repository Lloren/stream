/*
 * jQuery Web Sockets Plugin v0.0.1
 * http://code.google.com/p/jquery-websocket/
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2010 by shootaroo (Shotaro Tsubouchi).
 */
(function($){
	$.extend({
		websocketSettings: {
			open: function(e){console.log("Websocket Open: ", e)},
			close: function(e){console.log("Websocket Close: ", e)},
			message: function(e){console.log("Websocket Message: ", e)},
			error: function(e){console.log("Websocket Error: ", e)}
		},
		websocket: function(url, s) {
			var ws = WebSocket ? new WebSocket(url) : {
				send: function(m){ return false },
				close: function(){}
			};
			ws.binaryType = "arraybuffer";
			ws._settings = $.extend($.websocketSettings, s);
			ws.avalible = false;
			$(ws).bind("open", function (e){
				ws.avalible = true;
				ws._settings.open(e);
			}).bind("close", function (e){
				ws.avalible = false;
				ws._settings.close(e);
			}).bind("message", function (e){
				ws._settings.message(e.originalEvent.data);
			}).bind("error", function (e){
				ws._settings.error(e);
			});
			ws._send = ws.send;
			ws.send = function(data) {
				if (ws.avalible)
					return this._send(data);
			};
			ws.reconnect = function (){
				ws = new WebSocket(url);
			};
			$(window).on("unload", function(){ ws.close(); ws = null });
			return ws;
		}
	});
})(jQuery);