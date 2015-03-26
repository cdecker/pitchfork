/* 
    Pitchfork Music Player Daemon Client
    Copyright (C) 2007  Roger Bystrøm

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; version 2 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

var streaming_info = null;

function StreamingInfo() {
	this.open = false;
	this.display = null;
	this.auto_play_node = null;
	this.streamer = null;
	this.notification_txt = null;
	this.eventListeners = new Array();
	
	var c = setting_get("sap");
	if(c == null) {
		this.auto_play = STREAM_AUTO;
		setting_set("sap", this.auto_play);
	} else {
		this.auto_play = c=="true"?true:false;
	}
	
	this.mode = STREAM_MODE;
	this.check_interval = STREAM_INT;
	
	switch (this.mode) {
	    case 1:
	        this.initHTML = function (streaming_div) {
        	    var d2 = create_node("div");
		        d2.style.marginLeft = "5px";
		        d2.innerHTML =
		            "<applet type='application/x-java-applet'" +
		            " width='70'" + 
			        " height='32'" +
			        " id='streamplayer'" + 
			        " style='display: inline; visibility: hidden; position: absolute;'" +
			        " archive='../jorbis/jorbis-pitchfork.jar'" +
			        " classid='java:JOrbisPlayer.class'" +
			        " code='JOrbisPlayer.class'" +
			        "<param name='archive' value='../jorbis/jorbis-pitchfork.jar' />" +
			        (this.auto_play?"<param name='jorbis.player.playonstartup' value='yes' />":"") +
			        "<param name='jorbis.player.play.0' value='" + SHOUT_URL + "' />" +
			        "<param name='jorbis.player.bgcolor' value='" + IMAGE.STREAM_BGCOLOR + "' />" + 
			        "</applet>";
		        streaming_div.appendChild(d2);
	        }
	        
	        this.setStreamer = function () {
	            this.streamer = document.applets['streamplayer'];
	        }
	        
	        this.isPlaying = function () {
	            return this.streamer.isPlaying();
	        }
	        
	        this.tryPlay = function () {
	            this.streamer.play_sound();
	        }
	        
	        this.tryStop = function () {
	            this.streamer.stop_sound();
	        }
	        
	        this.addListeners = function () {
	            // Nothing to do here
	        }
	        
	        break;
	        
	    default:
	        this.initHTML = function (streaming_div) {
	            var d2 = create_node("div");
		        d2.style.marginLeft = "5px";
		        d2.innerHTML =
		            "<audio id='streamplayer' preload='none'>" +
                    "  <source src='" + SHOUT_URL + "' />" +
                    "</audio>";
		        streaming_div.appendChild(d2);
	        }
	        
	        this.setStreamer = function () {
	            this.streamer = document.getElementById('streamplayer');
	        }
	        
	        this.isPlaying = function () {
	            return !this.streamer.paused;
	        }
	        
	        this.tryPlay = function () {
	            if (this.streamer.networkState == 2) {
                    // If state is 2, audio is already loaded and we only need to start playback
                    this.streamer.play();
                } else {
                    // Otherwise need to load
                    this.streamer.load();
                    this.streamer.play();
                }
	        }
	        
	        this.tryStop = function () {
	            this.streamer.pause();
	        }
	        
            function streaming_error(e) {
                if (playing.state == "play") {
                    setTimeout(streaming_try_autoplay, this.check_interval);
                }
            }
	        
	        this.addListeners = function () {
	            this.eventListeners.push(add_listener(streaming_info.streamer, "emptied", streaming_error));
	        }
	}
}

function streaming_init() {
	streaming_info = new StreamingInfo();
	if (streaming_info.auto_play && window.SHOUT_URL) {
        streaming_open(null);
    }
}

function streaming_destroy() {
	while(streaming_info.eventListeners.length)
		streaming_info.eventListeners.pop().unregister();
	
	remove_node(streaming_info.streamer);
	remove_node(streaming_info.auto_play_node);
	remove_node(streaming_info.notification_txt);
	remove_node(streaming_info.display);

	streaming_info.streamer = null;
	streaming_info.auto_play_node = null;
	streaming_info.notification_txt = null;
	streaming_info.display = null;

	streaming_info.open = false;
}

function streaming_open(e) {
	var s = streaming_info.display; 
	if(!s) {
		s = create_node("div", "streaming_display");
		if(!window.SHOUT_URL)
			return;
		/* if someone can make this work in all browsers and not crash/hang
		   anyone of them I'd like to know... */

		function make_item(txt) {
			var item = create_node("li");
			item.className = "fakelink";
			item.style.borderLeft = item.style.borderRight = "none";
			add_txt(item, txt);
			return item;
		}

		streaming_info.initHTML(s);
		
		var txt = create_node("ul");
		//txt.className = "fakelink";
		txt.className = "nomargin";
		//txt.style.margin = "0px 2px 0px 0px";
		txt.style.padding = "0px 0px 0px 0px";
		txt.style.fontSize = "smaller";

		var sp = create_node("span");
		sp.style.fontWeight = "bold";
		sp.style.padding = "5px 0px 5px 0px";
		add_txt(sp, LANG.STREAMING);
		txt.appendChild(sp);

		var item = make_item(LANG.CLOSE);
		streaming_info.eventListeners.push(add_listener(item, "click", streaming_destroy));
		txt.appendChild(item);

		item = make_item(LANG.HIDE);
		streaming_info.eventListeners.push(add_listener(item, "click", streaming_hide));
		txt.appendChild(item);
		
		item = make_item( streaming_info.auto_play?LANG.AUTOPLAY:LANG.NO_AUTOPLAY );
		txt.appendChild(item);
		streaming_info.eventListeners.push(add_listener(item, "click", streaming_toggle_auto_play));
		streaming_info.auto_play_node = item;

		item = make_item("");
		streaming_info.notification_txt = item;
		txt.appendChild(streaming_info.notification_txt);
		streaming_info.eventListeners.push(add_listener(streaming_info.notification_txt, "click", streaming_toggle_event));

		// insert container first in area
		insert_first(txt, s);

		document.getElementById('player_control').appendChild(s);
		streaming_info.display = s;
		
		streaming_info.setStreamer();
		streaming_info.addListeners();

		streaming_check_playing();
		document.body.focus();
	}
	if(streaming_info.open) {
		streaming_hide(e);
	}
	else {
		s.style.visibility = "";
		streaming_info.open = true;
		streaming_try_autoplay();
		if(e) {
			stop_event(e);
		}
	}
}

/* hides the whole streaming area */
function streaming_hide(e) {
	if(streaming_info.display) {
		streaming_info.display.style.visibility = "hidden";
	}
	streaming_info.open = false;
	if(e) {
		stop_event(e);
	}
}

/* toggles the autoplay feature */
function streaming_toggle_auto_play(e) {
	if(e) stop_event(e);
	if(streaming_info.auto_play_node) {
		var s = streaming_info.auto_play_node;
		remove_children(s);
		streaming_info.auto_play = !streaming_info.auto_play;
		add_txt(s, streaming_info.auto_play?LANG.AUTOPLAY:LANG.NO_AUTOPLAY);
		setting_set("sap", streaming_info.auto_play?"true":"false");
	}
}

/* checks whether the applet is currently streaming or not, 
 * returns false on error or non-existing applet */
function streaming_is_playing() {
	if(streaming_info.streamer) {
		try {
			return streaming_info.isPlaying();
		} catch(e) { } 
	}
	return false;
}

/* tries to start playback if the applet is available */
function streaming_try_play() {
	if(streaming_info.streamer) {
		try {
			streaming_info.tryPlay();
		} catch(e) { }
	}
}

/* tries to stop playback if the applet is available */
function streaming_try_stop() {
	if(streaming_info.streamer) {
		try {
			streaming_info.tryStop();
		} catch(e) { }
	}
}

/* tries to start playing if autoplay is enabled */
function streaming_try_autoplay() {
	if(streaming_info.auto_play && streaming_info.display && streaming_info.streamer) {
		streaming_try_play();
	}
}

/* tries to stop the audio playback if autoplay is enabled */
function streaming_try_autostop() {
	if(streaming_info.auto_play && streaming_info.display) {
		streaming_try_stop();
	}
}

function streaming_update_stat() {
	remove_children(streaming_info.notification_txt);
    // Do not try to change status if streaming menu was closed before the scheduled update fires.
	if (streaming_info.notification_txt != null) {
    	streaming_info.notification_txt.appendChild(create_txt(streaming_info.stat?LANG.STOP:LANG.PLAY));
    }
}

function streaming_check_playing() {
	var stat = streaming_is_playing();
	if(streaming_info.stat != stat) {
		streaming_info.stat = stat;
		streaming_update_stat();
	}
	setTimeout(streaming_check_playing, streaming_info.check_interval);
}

function streaming_toggle_event(e) {
	if(e) stop_event(e);
	if(!streaming_is_playing()) {
		streaming_try_play();
	} else {
		streaming_try_stop();
	}
}
