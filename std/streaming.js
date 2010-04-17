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
	var c = setting_get("sap");
	if(c==null) {
		this.auto_play = true;
		setting_set("sap", "true");
	}
	else {
		this.auto_play = c=="true"?true:false;
	}
	this.auto_play_node = null;
	this.applet = null;
	this.notification_txt = null;
	this.check_delay = 0.3 * 1000;
	this.eventListeners = new Array();
}

function streaming_init() {
	streaming_info = new StreamingInfo();
}

function streaming_destroy() {
	while(streaming_info.eventListeners.length)
		streaming_info.eventListeners.pop().unregister();
	
	remove_node(streaming_info.applet);
	remove_node(streaming_info.auto_play_node);
	remove_node(streaming_info.notification_txt);
	remove_node(streaming_info.display);

	streaming_info.applet = null;
	streaming_info.auto_play_node = null;
	streaming_info.notification_txt = null;
	streaming_info.display = null;

	streaming_info.open = false;
}

function streaming_open(e) {
	var s =streaming_info.display; 
	if(!s) {
		s = create_node("div", "streaming_display");
		var d2 = create_node("div");
		d2.style.marginLeft = "5px";
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

		var obj = "<applet type='application/x-java-applet'" +
		          " width='70'" + 
			  " height='32'" +
			  " id='streamplayer'" + 
			  " style='display: inline; visibility: hidden; position: absolute;'" +
			  " archive='../jorbis/jorbis-pitchfork.jar'" +
			  " classid='java:JOrbisPlayer.class'" +
			  " code='JOrbisPlayer.class'" +
			  "<param name='archive' value='../jorbis/jorbis-pitchfork.jar' />" +
			  (streaming_info.auto_play?"<param name='jorbis.player.playonstartup' value='yes' />":"") +
			  "<param name='jorbis.player.play.0' value='"+SHOUT_URL+"' />" +
			  "<param name='jorbis.player.bgcolor' value='" + IMAGE.STREAM_BGCOLOR + "' />" + 
			  "</applet>";
		d2.innerHTML = obj;
		s.appendChild(d2);
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
		streaming_info.applet = document.applets['streamplayer'];

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
	if(streaming_info.applet) {
		try {
			return streaming_info.applet.isPlaying();
		} catch(e) { } 
	}
	return false;
}

/* tries to start playback if the applet is available */
function streaming_try_play() {
	if(streaming_info.applet) {
		try {
			streaming_info.applet.play_sound();
		} catch(e) { }
	}
}

/* tries to stop playback if the applet is available */
function streaming_try_stop() {
	if(streaming_info.applet) {
		try {
			streaming_info.applet.stop_sound();
		} catch(e) { }
	}
}

/* tries to start playing if autoplay is enabled */
function streaming_try_autoplay() {
	if(streaming_info.auto_play&&streaming_info.display&&streaming_info.applet) {
		streaming_try_play();
	}
}

/* tries to stop the audio playback if autoplay is enabled */
function streaming_try_autostop() {
	if(streaming_info.auto_play&&streaming_info.display) {
		streaming_try_stop();
	}
}

function streaming_update_stat() {
	remove_children(streaming_info.notification_txt);
	streaming_info.notification_txt.appendChild(create_txt(streaming_info.stat?LANG.STOP:LANG.PLAY));
}

function streaming_check_playing() {
	var stat = streaming_is_playing();
	if(streaming_info.stat != stat) {
		streaming_info.stat = stat;
		streaming_update_stat();
	}
	setTimeout(streaming_check_playing, streaming_info.check_delay);
}
function streaming_toggle_event(e) {
	if(e) stop_event(e);
	if(!streaming_is_playing()) {
		streaming_try_play();
	} else {
		streaming_try_stop();
	}
}
