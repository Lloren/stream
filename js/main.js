"use strict"


window.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
window.RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.URL = window.URL || window.webkitURL;

window.iceServers = {
	iceServers: [{
		url: 'stun:23.21.150.121'
	}]
};

/* offerer */
function offererPeer(stream){
	// stream is only attached by offerer
	rtc_connection.addStream(stream);
	
	rtc_connection.candidites = [];
	
	rtc_connection.onicecandidate = function (event){
		if (!event || !event.candidate) return;
		rtc_connection.candidites.push(event.candidate);
		//console.log(event);
		//answerer.addIceCandidate(event.candidate);
	};
	
	rtc_connection.onaddstream = function (event) {
		console.log('remote stream', event.stream);
		
		var video = document.createElement('video');
		video.src = URL.createObjectURL(event.stream);
		document.body.appendChild(video);
		video.controls = true;
		var p = video.play();
		if (p !== undefined){
			p.then(function(){
				console.log("playing");
			}).catch(function (e){
				console.log(e);
			});
		}
	};
	
	rtc_connection.receiveInfo = function (info) {
		console.log(info);
		if (info.sdp){
			var remote_descr = new RTCSessionDescription();
			remote_descr.type = info.type;
			remote_descr.sdp  = info.sdp;
			rtc_connection.setRemoteDescription(remote_descr).then(function () {
				console.log("setRemoteDescription");
			});
			
			//if (info.type == "offer"){
			rtc_connection.createAnswer(function (answer) {
				console.log('answer sdp', answer.sdp);
				ws.send(JSON.stringify({"type":"message", user_id: to, m: JSON.stringify({t: "answer", d: answer})}));
				//document.getElementById("offer").value = JSON.stringify(answer);
				rtc_connection.setLocalDescription(answer);
			}, function (err){
				console.log("createAnswer err", err);
			});
			ws.send(JSON.stringify({"type":"message", user_id: to, m: JSON.stringify({t: "ice", d: rtc_connection.candidites})}));
			//}
		} else if (info.candidate){
			rtc_connection.addIceCandidate(new RTCIceCandidate(info));
		} else {
			console.log("Receved ICE");
			for (var i=0;i<info.length;i++){
				rtc_connection.addIceCandidate(new RTCIceCandidate(info[i]));
			}
		}
	};
}

function create_offer(){
	console.log("create_offer");
	rtc_connection.createOffer().then(function (offer){
		//console.log('offer sdp', offer.sdp);
		
		rtc_connection.setLocalDescription(offer);
		
		setTimeout(function (){
			ws.send(JSON.stringify({"type":"message", user_id: to, m: JSON.stringify({t: "offer", d: offer})}));
			avail = false;
		});
		//document.getElementById("offer").value = JSON.stringify(offer);
		//console.log(offer);
	});
}

var avail = true;
var to = "";
var me = "";
var ws = false;
var rtc_connection = false;

function startup(){
	console.log("startup");
	if (!has_internet){
		$("body").html("This app requires internet to function.");
		start_splash_remove();
		return;
	}
	
	rtc_connection = new RTCPeerConnection(window.iceServers);
	
	navigator.getUserMedia({
		audio: true,
		video: true
	}, offererPeer, function (e) {
		console.error(e);
	});
	
	ws = $.websocket("wss://notomono.onnix.net:28921", {message:function (omess){
		if (typeof omess != "string"){
			//console.log(omess);
			bytes += omess.byteLength;
			var data = new jDataView(omess);
			var command = data.getUint8();
			//data.getUint16(); // tick
			//dump(data.getUint16(), "tick");
			//console.log(new Uint8Array(data.buffer));
			switch(command){
				case 0://ping
					var num = data.getUint8();
					$("#ping_val").html(new Date().getTime() - packet_times[num]);
					break;
				default:
					console.log("Unknown command: "+command);
					break;
			}
		} else {
			var mess = JSON.parse(omess);
			switch(mess.type){
				case "user":
					me = mess.user_id;
					$("#user_id").html(me);
					ws.send('{"type":"join", "room_id": "test1"}');
					break;
				case "new_user":
					//create_offer();
					$("#users").append('<div id="user_'+mess.id+'" class="user" data-user_id="'+mess.id+'">'+mess.id+'</div>');
					break;
				case "leave":
					$("#user_"+mess.id).remove();
					break;
				case "message":
					if (mess.user != me){
						if (mess.m[0] == "{"){
							var dat = JSON.parse(mess.m);
							if (dat.t == "request"){
								if (avail){
									avail = false;
									to = dat.d;
									create_offer();
								}
							} else if (dat.t == "offer"){
								rtc_connection.receiveInfo(dat.d);
							} else if (dat.t == "answer"){
								rtc_connection.receiveInfo(dat.d);
							} else if (dat.t == "ice"){
								rtc_connection.receiveInfo(dat.d);
							}
						}
					}
					break;
				default:
					console.log("Unknown command", mess);
					break;
			}
		}
	}, open:function (omess){
		setInterval(function (){
			ws.send('{"type":"k"}');
		}, 5000);
		ws.send('{"type":"connection"}');
	}, error: function (e){
		console.log(e);
		ws = false;
		
		alert("Server connection failure.");
	}, close: function (e){
		alert("Connection lost from server, please reload to connect.");
	}});
	$(document).on("click", ".user", function (){
		ws.send(JSON.stringify({"type":"message", m: JSON.stringify({t: "request", d: me})}));
	});
};