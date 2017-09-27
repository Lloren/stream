"use strict";

var storage_location = "";
var modala_handle = "";
var has_internet = false;
var uuid = "comp";
var ad_manager = false;
var thePlatform = "";
var templates = {};

String.prototype.ucfirst = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

function Settings(save_key, def_data){
	this.save_key = save_key || "settings_data";
	this.save_handle = false;
	
	this.data = JSON.parse(window.localStorage.getItem(this.save_key) || def_data || "{}");
	
	this.set = function (key, val){
		if (this.data[key] != val){
			this.data[key] = val;
			this.save();
		}
	};
	
	this.get = function (key){
		return this.data[key];
	};
	
	this.delete = function (key){
		delete this.data[key];
		this.save();
	};
	
	this.save = function (local_only){
		window.localStorage.setItem(this.save_key, JSON.stringify(this.data));
		if (!local_only){
			if (typeof save_settings != "undefined"){
				if (this.save_handle)
					clearTimeout(this.save_handle);
				this.save_handle = setTimeout(function (){
					save_settings();
				}, 10);
			}
		}
	};
}
window.settings = new Settings(false, '{}');

var last_touch = {x: 0, y:0, trigger:""};
function set_touch(e, trigger){
	var touch = e.originalEvent.changedTouches[0];
	last_touch.trigger = trigger;
	last_touch.x = touch.screenX;
	last_touch.y = touch.screenY;
}
function good_touch(e, trigger){
	var touch = e.originalEvent.changedTouches[0];
	
	if (Math.abs(last_touch.x - touch.screenX) < 10 && Math.abs(last_touch.y - touch.screenY) < 10 && trigger == last_touch.trigger){
		return true;
	}
	return false;
}

function click_event(limiter, callback, target, no_prop){
	target = target || false;
	no_prop = no_prop || false;
	if (target){
		if (target === true)
			target = document;
		$(target).on("touchstart", limiter, function (e){
			set_touch(e, limiter);
			if (no_prop){
				e.stopPropagation();
				return false;
			}
		});
		$(target).on("touchend click_event", limiter, function (e){
			if (e.type != "click_event" && !good_touch(e, limiter))
				return;
			callback(e);
			if (no_prop){
				e.stopPropagation();
				return false;
			}
		});
	} else {
		$(limiter).on("touchstart", function (e){
			set_touch(e, limiter);
			if (no_prop){
				e.stopPropagation();
				return false;
			}
		});
		$(limiter).on("touchend click_event", function (e){
			if (e.type != "click_event" && !good_touch(e, limiter))
				return;
			callback(e);
			if (no_prop){
				e.stopPropagation();
				return false;
			}
		});
	}
}

function hide_keyboard() {
	//this set timeout needed for case when hideKeyborad
	//is called inside of "onfocus" event handler
	setTimeout(function() {
		$(":focus").blur();
		//creating temp field
		var field = document.createElement("input");
		field.setAttribute("type", "text");
		//hiding temp field from peoples eyes
		//-webkit-user-modify is nessesary for Android 4.x
		field.setAttribute("style", "position:absolute; top: 0px; opacity: 0; -webkit-user-modify: read-write-plaintext-only; left:0px;");
		document.body.appendChild(field);
		//adding onfocus event handler for out temp field
		field.onfocus = function(){
			field.setAttribute("style", "display:none;");
			setTimeout(function() {
				document.body.removeChild(field);
				document.body.focus();
			}, 14);
		};
		//focusing it
		field.focus();
	}, 50);
}

function dump(obj, name, pre, depth, ret){
	ret = ret || false;
	pre = pre || "";
	name = name || "";
	depth = typeof depth !== "undefined" ? depth : 2;
	var out = "";
	if (typeof obj == "object" && depth > 0){
		var prop = false;
		for (var i in obj) {
			prop = true;
			out += dump(obj[i], name, pre+"["+i+"] ", depth-1, ret);
		}
		if (prop)
			return out;
		else
			out = "{}";
	} else {
		out += pre + (typeof obj) + ": " + obj;
	}
	if (ret)
		return name+"; "+out;
	console.log(name+"; "+out);
}

function ret_dump(obj, depth){
	depth = typeof depth !== "undefined" ? depth : 1;
	return dump(obj, "", "", depth, true);
}

function argdump(){
	for (var i = 0; i < arguments.length; ++i)
		alert(ret_dump(arguments[i]));
}

function template(key, data){
	var dat = templates[key];
	for(var key in data){
		dat = dat.replace(new RegExp("##"+key+"##", "g"), data[key]);
		dat = dat.replace(new RegExp("{{"+key+"\\?([^}]*)}}", "gm"), "$1");
	}
	dat = dat.replace(new RegExp("{{[^}]*}}", "gm"), "");
	return dat;
}

function open_modal(options){
	options = $.extend({}, {content: "", title: "", callback: false, button1: "Ok", button2: false, overwrite: true, add_class: ""}, options || {});
	if (options.button2 === true)
		options.button2 = "Cancel";
	
	$("#modal h1").html(options.title);
	if (options.overwrite || !$("#modal").is(":visible")){
		$("#modal > div").html(options.content);
	} else {
		$("#modal > div").append("<br />"+options.content);
	}
	$("#mbutton1").html(options.button1);
	if (options.button2){
		$("#mbutton1").removeClass("fullwidth");
		$("#mbutton2").show().html(options.button2);
	} else {
		$("#mbutton1").addClass("fullwidth");
		$("#mbutton2").hide();
	}
	$("#modal a").off().on("touchend", function (e){
		if (!$(this).hasClass("no_close")){
			$("#modal").hide();
			$("#modal-overlay").removeClass("enabled");
			if (options.callback)
				options.callback($(this).html());
		}
	});
	$("#modal").attr("class", options.add_class).show();
	$("#modal-overlay").addClass("enabled");
}

function open_modala(text, dismiss, time){
	dismiss = dismiss || false;
	time = time || 10000;
	$("#modal h1").html(text);
	$("#modal").addClass("loading").css("display", "table");
	$("#modal-overlay").off().addClass("enabled");
	modala_handle = setTimeout(function (){
		close_modala();
	}, time);
	if (dismiss){
		$("#disable-overlay").on("touchend", function(e){
			$("#modal").hide();
			$("#modal-overlay").removeClass("enabled");
		});
	}
}

function reopen_modal(){
	$("#modal").show();
	$("#modal-overlay").addClass("enabled");
}

function close_modala(){
	clearTimeout(modala_handle);
	$("#modal").hide().removeClass("loading");
	$("#modal-overlay").removeClass("enabled");
}

function track(catigory, action, label, value){
	if (typeof GA != "undefined"){
		catigory = catigory || "Hit";
		action = action || catigory;
		label = label || action;
		value = value || 1;
		GA.trackEvent(catigory, action, label, value);
	}
}

var splash_checks = 1;
function start_splash_remove(){
	console.log("splash_remove");
	--splash_checks;
	if (splash_checks <= 0 && navigator.splashscreen){
		console.log("splash_remove start");
		setTimeout(function () { navigator.splashscreen.hide(); console.log("splash_remove run"); }, 100);
	}
}



function iads(){
	var scope = this;
	this.available = (thePlatform == "ios" && window.plugins.iAd);
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 1;
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			window.plugins.iAd.createBannerView({
				"bannerAtTop": false,
				"overlap": false,
				"offsetTopBar": false
			}, function(){
				scope.dshow();
			}, function(){
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("iads");
			});
			document.addEventListener("onFailedToReceiveAd", function(ret){
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("iads");
			}, false);
			document.addEventListener("onReceiveAd", function(){
				if (!ad_manager.hide_others("iads")){
					scope.hide();
				}
				scope.dshow();
			}, false);
		} else {
			this.dshow();
		}
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 1000);
	};
	
	this.show = function(){
		if (this.priority <= ad_manager.pri_active && !this.active){
			ad_manager.pri_active = this.priority;
			window.plugins.iAd.showAd(true);
			this.active = true;
			setTimeout(function (){
				$(window).trigger("resize");
			}, 1000);
		}
	};
	
	this.hide = function(){
		if (this.active){
			ad_manager.pri_active = 999;
			this.active = false;
			window.plugins.iAd.showAd(false);
		}
	};
}

function admob(){
	var scope = this;
	this.available = typeof AdMob != "undefined";
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 2;
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			var code = admob_code;
			if (typeof admob_code_droid != "undefined" && thePlatform == "android")
				code = admob_code_droid;
			AdMob.createBanner({
				adId: code,
				adSize: "SMART_BANNER",
				position: AdMob.AD_POSITION.BOTTOM_CENTER,
				autoShow: false,
				isTesting: dev,
				adExtras: {color_bg: "333333"}
			});
			
			document.addEventListener("onAdFailLoad", function(data) {
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("AdMob");
			});
			document.addEventListener("onAdLoaded", function(data){
				if (!ad_manager.hide_others("AdMob")){
					scope.hide();
				}
				scope.dshow();
			});
		} else {
			this.dshow();
		}
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 1000);
	};
	
	this.show = function(){
		if (this.priority <= ad_manager.pri_active && !this.active){
			ad_manager.pri_active = this.priority;
			this.active = true;
			AdMob.showBanner(AdMob.AD_POSITION.BOTTOM_CENTER);
			setTimeout(function (){
				$(window).trigger("resize");
			}, 1000);
		}
	};
	
	this.hide = function(){
		if (this.active){
			ad_manager.pri_active = 999;
			this.active = false;
			AdMob.hideBanner();
		}
	};
}

function house_ads(){
	this.available = false;
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 3;
	
	this.init = function(){
		if (!this.loaded) {
			this.loaded = true;
		} else {
			this.show();
		}
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
	};
	
	this.hide = function(){
	};
}

function admanager() {
	this.ads = {"iads": new iads(), "AdMob": new admob(), "house": new house_ads()};
	this.pri_active = 999;
	
	this.init = function(){
		for (var key in this.ads){
			if (this.ads[key].available){
				this.ads[key].init();
				break;
			}
		}
	};
	
	this.ad_fail = function(who){
		this.ads[who].hide();
		for(var key in this.ads){
			if (key != who && this.ads[key].available && this.ads[key].failed_at < (new Date()).getTime()-100000){
				this.ads[key].init();
				break;
			}
		}
	};
	
	this.hide_others = function(who){
		if (this.ads[who].priority <= this.pri_active){
			for(var key in this.ads){
				if (key != who && this.ads[key].available){
					this.ads[key].hide();
					break;
				}
			}
			return true;
		} else {
			return false;
		}
	};
}

function device_info(){
	var dev = {};
	if (typeof device != "undefined"){
		dev.model = device.model;
		dev.platform = device.platform;
		dev.version = device.version;
	} else {
		dev.model = "comp";
		dev.platform = "unknown";
		dev.version = navigator.userAgent;
	}
	return dev;
}

function app_info(){
	if (typeof AppVersion == "undefined"){
		var AppVersion = {version:"0.0.0", build: "1"};
	}
	return {name: app, version: AppVersion.version, build: AppVersion.build, phone_id: uuid, user_id: settings.get("user_id"), device: device_info()};
}

var started = false;
function on_ready(){
	console.log("on_ready");
	setTimeout(function (){
		console.log("on_ready2");
		if (started){
			console.log("double start catch");
			return;
		}
		started = true;
		thePlatform = "";
		$("#templates>div").each(function (i, data){
			templates[$(data).data("key")] = $(data).html();
		});
		$("#templates").remove();
		if (typeof device != "undefined"){
			navigator.splashscreen.show();
			thePlatform = device.platform.toLowerCase();
			
			GA.startTrackerWithId(ga_code);
			track("Load", "load");
			
			has_internet = navigator.connection.type != Connection.NONE;
			
			if(ads){
				ad_manager = new admanager();
				ad_manager.init();
			}
			
			var ver = device.version.split(".");
			document.body.className = "v"+ver[0]+" version"+device.version.replace(/\./g, "_");
			
			uuid = device.uuid;
			
			cordova.plugins.Keyboard.disableScroll(true);
			
			//if (fb_app_id)
			//	FB.init({appId: fb_app_id, nativeInterface: CDV.FB, useCachedDialogs: false});
		} else {
			thePlatform = "non-gap";
			has_internet = true;
			if (fb_app_id){
				$("body").prepend('<div id="fb-root"></div><script>(function(d, s, id) {var js, fjs = d.getElementsByTagName(s)[0];if (d.getElementById(id)) return;js = d.createElement(s); js.id = id;js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&appId='+fb_app_id+'&version=v2.0";fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));</script>');
			}
		}
		if (thePlatform == "android"){
			document.body.id = "android";
		} else if (thePlatform == "wince"){
			document.body.id = "win";
		} else if (thePlatform == "non-gap"){
			document.body.id = "non-gap";
		} else if (thePlatform == "ios"){
			document.body.id = "ios";
			uuid = window.localStorage.getItem("set_uuid");
			if (uuid === null){
				uuid = device.uuid;
				window.localStorage.setItem("set_uuid", uuid);
			}
		}
		settings.set("uuid", uuid);
		if (typeof startup === "function")
			startup();
	}, 1);
}

function online_check(){
	if (has_internet){
		return true;
	} else {
		open_modal({title: "Notice<i class='fa fa-info-circle'></i>", content: "Internet access is required for this action."});
		return false;
	}
}

function onLoad(){
	document.addEventListener("deviceready", on_ready, false);
	document.addEventListener("online", function (){
		has_internet = navigator.connection.type != Connection.NONE;
	}, false);
	document.addEventListener("offline", function (){
		has_internet = navigator.connection.type != Connection.NONE;
	}, false);
}

function onunload(){
	track("Close", "close");
	if (typeof GA != "undefined") {
		GA.exit(false, false);
	}
}

$(function () {
	if (!dev)
		$(".dev").remove();
	
	jQuery["postJSON"] = function( url, data, callback ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			callback = data;
			data = undefined;
		}
		
		return jQuery.ajax({
			url: url,
			type: "POST",
			dataType: "json",
			data: data,
			success: callback
		});
	};
	
	Origami.fastclick(document.body);
	if (typeof window.cordova == "undefined")
		on_ready();
	
	$(document).on("touchend", ".touch_focus", function(e){
		$(this).focus();
	});
	$(document).on("touchend", ".touch_click", function(e){
		$(this).click();
	});
});