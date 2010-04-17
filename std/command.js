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

var position_txt_node = null;
var bitrate_txt_node = null;
var ALBUMART_URL = "metadata.php?pic=";
var OUTPUT_ID = "output_";

var DIR_SEPARATOR = "/";

var STATUS_DEFAULT_TIMEOUT = 10;

/* todo: put these in an object, no reason for them to be lying around here */
var last_update_cmd_id;
var problem_update_delay = 5;
var last_update = -1; 
var pl = new Array();
var possliderid = -1;
var volsliderid = -1;
var playing = new Object();
playing.id = -1;
playing.pos = -1;
playing.length = 0;
playing.pl_version = 0;
playing.pl_size = 0;
playing.size = 0;
playing.artist = "";
playing.album = "";
playing.title = "";
playing.image = "";	// 
playing.asin = "";	
playing.random = 0;	// random on/off
playing.repeat = 0; 	// repeat on/off
playing.xfade = 0;	// crossfade seconds
playing.update = false; // dbupdate
playing.show_node = null; // node that is supposed to have playing status
playing.is_stream = false; // true if the playing song is a stream
playing.error = false;
playing.error_time = 0;

playing.state = "";
playing.volume = -1;
playing.TIME_ELAPSED = 0; 
playing.TIME_REMAINING = 1;
playing.TIME_END = 2; 
playing.time_dtype = playing.TIME_ELAPSED;

/* various elements found around the document */
playing.disp_info = null;
playing.pp_button = null;
playing.disp_artist = null;
playing.disp_title = null; 
playing.disp_album = null;
playing.albumart = null;

var last_pl_selected = true;

var output_toggle_id = null;

var pl_overlay_id = -1;
var pl_overlay_write = null;

var status_bar = null;

var send_command_rm_status = false;
var pl_entry_clone = null;

var settings_time = 10;

var need_info_arr = null;

var init_failed = false;

var playlist_add_popup = null;
var playlist_save_popup = null;

var pagination = new Object();
pagination.max = 0; // max pr. page
pagination.page = 0; // what page we currently are on
pagination.pages = 0; // number of pages being advertised
pagination.need_update = false; // indicates wheter we need an update
pagination.list = null; // reference to the displaying area
pagination.container = null; // reference to the container

function init_player() {
	try {
		status_bar = new StatusBar();

		if(update_delay) {
			if(update_delay<0)
				update_delay = 1;
			update_delay = update_delay * 1000;
		}
		else window.update_delay = 1000;

		possliderid = setup_slider(document.getElementById('posslider'), position_adjust, LANG.POSITION);
		set_slider_pos(possliderid, 0);
		
		volsliderid = setup_slider(document.getElementById('volslider'), volume_adjust, LANG.VOLUME);
		set_slider_pos(volsliderid, 0);

		playlist_element = document.getElementById('playlist')
	
		var pltmp_id = setup_node_move(playlist_element, playlist_move, playlist_get_move_txt);
		add_move_doubleclick(pltmp_id, playlist_dblclick);
		set_selection_change_handler(pltmp_id, pl_selection_changed);
		
		pl_overlay_id = setup_overlay(playlist_element, new Array(10, 10, 300, 300 ), pl_overlay_open_cb, pl_overlay_close_cb);
		pl_overlay_write = get_overlay_write_area(pl_overlay_id);

		playing.disp_info =  document.getElementById('disp_info');
		playing.disp_artist = document.getElementById('disp_artist');
		playing.disp_title = document.getElementById('disp_title');
		playing.disp_album = document.getElementById('disp_album');
		playing.albumart = document.getElementById("albumart");
		playing.pp_button = document.getElementById("pp_button");

		pagination.list = document.getElementById('pagination_list');
		pagination.container = document.getElementById('pagination');
		pagination.max = pagination_max; // nice :S

		var tmp = setting_get("time_dtype");

		if(tmp==null) {
			setting_set("time_dtype", playing.time_dtype);
		}
		else {
			if(tmp==playing.TIME_ELAPSED)
				playing.time_dtype = playing.TIME_ELAPSED;
			else if(tmp==playing.TIME_REMAINING)
				playing.time_dtype = playing.TIME_REMAINING;
		}
		
		xpath_init();
		buttons_init();
		setup_keys(); 
		pagination_init();
		sidebar_init();
		plsearch_init();
		streaming_init();

		if(typeof(window.metadata_init)=='function')
			metadata_init();
		if(typeof(window.recommend_init)=='function')
			recommend_init();
		playlist_init();
	}
	catch(e) {
		init_failed = true;
		debug(LANG.E_INIT +": " + e.message, true);
	}
}

/* arg-list: command to send, command to call when result is return, show status message when working, 
	don't request status update with this sendcommand, 
	post data if we should use that, if it should form-urlencoded content type should be set */
function send_command(command, result_callback, status_msg, nostatus, do_post, form_urlencoded) {
	if(init_failed)
		return;

	var http = new XMLHttpRequest(); 
	var url = "command.php?" + command;

	if(!nostatus) {
	  url+="&plchanges=" + playing.pl_version;
	  if(pagination.max>0) {
	  	url+="&pmax=" + pagination.max + "&page=" + pagination.page;
		//debug("pmax: " + pagination.max + ", page: " + pagination.page);
	  }
	}

	if(send_command_rm_status) {
		hide_status_bar();
		send_command_rm_status = false;
	}

	http.onreadystatechange = function() {
	  if(http.readyState==4) {
		var resp = null;
		if(http.responseText&&(resp = evaluate_json(http.responseText))) {
			if(resp['connection']&&resp['connection']=="failed") {
	    			last_update = get_time();
				show_status_bar(LANG.E_CONNECT);
				send_command_rm_status = true;
				try {
					result_callback("failed");
				}
				catch(e) {}
				return;
			}
		}
		else {
			show_status_bar(LANG.E_INVALID_RESPONSE);
			send_command_rm_status = true;
	    		last_update = get_time();
			try {
				result_callback("failed");
			}
			catch(e) {}
			return;
		}

	    if(http.status==200) {
	    	var res = resp['result'];
		var stat = resp["status"];
		var plchanges = resp["plchanges"];
		var has_plchanges = plchanges && stat && playing.pl_version != stat.playlist;

		if(res&&result_callback) {
			result_callback(res);
		}

		if(stat) {
			current_status_handler(stat, has_plchanges);
			last_update = get_time();
		}

		if(has_plchanges) {
			playing.pl_version = stat.playlist;
			plchanges_handler3(plchanges, stat.playlistlength);
			/* the currently playing song might have changed if it's a stream */
			if(playing.is_stream) {
				request_song_info();
			}
		}

		/* don't remove if there's no message or a timer */
		if(status_msg&&!status_bar.timer)
			hide_status_bar();
	    }
	    else {
	    	if(result_callback) { 
	    		result_callback("server operation failed");
		}
	    	show_status_bar(LANG.NO_RESPONSE); // maybe add a 10 second delay here and reconnect!
		send_command_rm_status = true;
	    }
	  }
	}

	if(status_msg) {
		show_status_bar(status_msg, true);
	}


	if(do_post) {
		http.open("POST", url);
		if(form_urlencoded) {
			http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		}
		http.send(do_post);
	}
	else {
		http.open("GET", url); 	
		http.send(null);
	}
}

function update_callback(res) {
	var time = update_delay;
	if(res=="failed")
		time = problem_update_delay*update_delay;
	last_update_cmd_id = setTimeout(need_update, time);
}

function reschedule_update_now() {
	clearTimeout(last_update_cmd_id);
	// make sure it get's run immidiately
	last_update_cmd_id = setTimeout(need_update, 0, -update_delay);
}

function need_update(delay) {
	if(!delay)
	   delay = 0;
	var now = get_time();
	if(now>last_update+update_delay+delay-20) { // giving it a little slack
		send_command("ping", update_callback);
	}
	else {
		delay = last_update+update_delay-now;
		if(delay<10)
			delay = 10;
			
	 	last_update_cmd_id = setTimeout(need_update, delay);
	}
}

/* stop program */
function handle_fatal_error(txt) {
	show_status_bar(txt);
	clearTimeout(last_update_cmd_id);
}

/* current status handler, info is stats
 * if has_plchanges it is assumed the data also carries plchanges 
 * which will handle resizing of the playlist */
function current_status_handler(info, has_plchanges) {
	if(!info) {
		// something is wrong
		set_slider_pos(possliderid, 0);
		return;
	}
	
	var tmp = info.playlistlength;
	if((tmp = parseInt(tmp))>=0) {
		if(playing.pl_size!=tmp) {
			playing.pl_size = tmp;
			if(pagination.max>0) {
				// make sure size fits inside what we have as number of pages
				var s = pagination.max * (pagination.pages);
				if(tmp < s-pagination.max || tmp>=s) {
					pagination_update_list(tmp);
				}
				if(!has_plchanges) {
					playlist_resize(tmp); 
				}
			}
			else if(!has_plchanges) { // if it doesn't carry plchanges we have to do it here
				playlist_resize(tmp); 
			}
		}
	}

	tmp = info.updating_db;
	if(tmp) {
		tmp = parseInt(tmp);
		if(playing.update!=tmp) {
			playing.update = tmp;
			show_status_bar(LANG.WAIT_UPDATING_DB, true);
		}
	}
	else if(playing.update) {
		playing.update = false;
		hide_status_bar();
	}
	
	var state = info["state"];
	var volume = info[ "volume"];
	if(volume!=null&&volume!=playing.volume) {
		set_slider_pos(volsliderid, volume);
		playing.volume = volume;
	}

	playing.repeat = info.repeat;
	playing.random = info.random;
	playing.xfade = info.xfade;

	if(state!="stop") {
		
		var pos = info["time"].split(":");
		set_slider_pos(possliderid, (pos[0]*100)/pos[1]);
		playing.length = pos[1];

		/* complex, but seems to be somewhat better in firefox */
		var tmp = info.bitrate;
		if(tmp&&playing.bitrate!=tmp) {
			var disp_info = playing.disp_info
			if(bitrate_txt_node==null) {
				bitrate_txt_node = document.createTextNode(LANG.BITRATE);
				disp_info.appendChild(bitrate_txt_node);
				if(disp_info.normalize)
					disp_info.normalize();
				bitrate_txt_node = disp_info.firstChild.splitText(LANG.BITRATE.length);
			}
			var rep = document.createTextNode(tmp);
			disp_info.replaceChild(rep, bitrate_txt_node);
			bitrate_txt_node = rep;
			playing.bitrate = tmp;
		}

		var postxt = get_slider_txt(possliderid);
		if(postxt) {
			if(position_txt_node==null) {
				position_txt_node = postxt.firstChild.splitText(LANG.POSITION.length);
			}
			var rep = create_txt(format_playing_time(pos[0], pos[1]));
			postxt.replaceChild(rep, position_txt_node);
			position_txt_node = rep; 
		}
	}
	else if(playing.state!="stop") { // state == stop and last state wasn't stop
		set_slider_pos(possliderid, 0);
		var disp_info = playing.disp_info;
		var rep = document.createTextNode("0");
		var postxt = get_slider_txt(possliderid);
		if(bitrate_txt_node&&bitrate_txt_node!=null) {
			disp_info.replaceChild(rep, bitrate_txt_node);
			bitrate_txt_node = rep;
		}
		playing.bitrate = 0;
		rep = document.createTextNode("");
		if(position_txt_node&&position_txt_node!=null) {
			postxt.replaceChild(rep, position_txt_node);
			position_txt_node = rep; 
		}
	}
	if(state!=playing.state) {
		playing.state = state;
		var bt = playing.pp_button;
		if(state=="play") {
			bt.src = IMAGE.BUTTON_PAUSE;
			if(typeof(window.streaming_try_autoplay)=='function')
				streaming_try_autoplay();
		}
		else {
			bt.src = IMAGE.BUTTON_PLAY;
			if(typeof(window.streaming_try_autostop)=='function')
				streaming_try_autostop();
		}
	}
	
	if(typeof info.error != 'undefined' || playing.error) {
		if(playing.error && get_time() - 10000 > playing.error_time) {
			playing.error = false;
			hide_status_bar();
			send_clear_error();
		}
		else if(typeof info.error != 'undefined' && playing.error != info.error) {
			playing.error = info.error;
			playing.error_time = get_time();
			show_status_bar("MPD error: " + playing.error);
		}
	}

	var c_play = info.songid;
	if(typeof(c_play)=='undefined') {
		playing.id = -1;
		playing.pos = -1;
		request_song_info();
		select_playing_song();
	}
	else if(c_play!=playing.id) {
		playing.id = c_play;
		playing.pos = parseInt(info.song);
		select_playing_song();
		if(pagination_is_following()) {
			playlist_scroll_to_playing();
		}
		/* this is last because it needs the id */
		request_song_info();
	}
	else if(playing.pos!=info.song) {
	  	playing.pos = parseInt(info.song);
	}
}

function format_playing_time(pos, total) {
	if(playing.time_dtype==playing.TIME_REMAINING) {
		return convert_minsec(pos-total) + "/" + convert_minsec(total);
	}
	else { // dtype == playing.TIME_ELAPSED || something wrong
		return convert_minsec(pos) + "/" + convert_minsec(total);
	}
}

function request_song_info() {
	/* clean up */
	if(playing.id<0) {
		remove_children(playing.disp_artist);
		remove_children(playing.disp_title);
		remove_children(playing.disp_album);
		if(playing.albumart)
			remove_children(playing.albumart);
		playing.artist = "";
		playing.title = "";
		playing.album = "";
		playing.image = "";
		playing.asin = "";
		playing.length = "";
		playing.is_stream = false;
		set_playing_title();
	}
	else {
		/* or update */
		send_command("currentsong", update_current_song, false, true);
	}
}

function update_current_song(info) {
	var artist = info[ "Artist"];
	var title = info["Title"];
	var album = info[ "Album"];
	var a = playing.disp_artist;
	var t = playing.disp_title;
	var alb = playing.disp_album;
	var new_thumb = false;

	if(typeof(title)=='undefined')
		title = "";
	if(typeof(album)=='undefined')
		album = "";
	if(typeof(artist)=='undefined')
		artist = "";

	if(artist!=playing.artist) {
		playing.artist = artist;
		new_thumb = true;
		remove_children(a);
		a.appendChild(create_txt(artist));
	}
	if(playing.album != album) {
		playing.album = album;
		new_thumb = true;
		remove_children(alb);
		alb.appendChild(create_txt(album));
	}

	if(typeof(info['file'])!='undefined') {
		var f = info['file'];
		if(f&&f.indexOf("http://")==0)
			playing.is_stream = true;
		else playing.is_stream = false;
	}

	remove_children(t);
	playing.title = title;

	if(title==null||title=="") {
		title = info["file"];
		if(title)
			title = title.substring(title.lastIndexOf(DIR_SEPARATOR)+1);
	}
	t.appendChild(create_txt(title));

	set_playing_title(artist, title);

	if(new_thumb&&typeof(window.request_thumbnail) == 'function') {
		setTimeout(request_thumbnail, 1);
	}
}

function set_playing_title(artist, title) {
	if(typeof(artist)=='undefined'||artist==null)
		artist = "";
	if(typeof(title)=='undefined'||title==null)
		title = "";
	
	var wt = "Pitchfork MPD Client";
	if(artist.length||title.length) {
		wt = artist;
		if(title.length)
			wt += " - " + title;
	}
	document.title = wt;
}

function volume_adjust(vol) {
	send_command("volume=" + parseInt(vol));
}

function position_adjust(pos) {
	send_command("position=" + parseInt((pos* parseInt(playing.length))/100) + "&id=" + playing.id);
}

function convert_minsec(sec) {
	var min = parseInt(sec/60);
	var s = Math.abs(sec%60);
	return (sec<0&&min==0?"-" + min:min)  + ":" + (s<10?"0" + s:s);
}

function buttons_init() {
	
	/* player control */
	var elem = document.getElementById('pp_button');
	elem.src = IMAGE.BUTTON_PLAY;
	add_listener(elem, "click", send_play_pause);
	if(window.stop_button) {
		elem = document.getElementById('stop_button');
		elem.style.display = "";
		elem.src = IMAGE.BUTTON_STOP;
		add_listener(elem, "click", send_stop_cmd);
		elem.parentNode.style.marginLeft = "-15px";
	}

	elem = document.getElementById("next_button");
	elem.src = IMAGE.BUTTON_NEXT;
	add_listener(elem, "click", send_next_song);
	elem = document.getElementById("previous_button");
	elem.src = IMAGE.BUTTON_PREVIOUS;
	add_listener(elem, "click", send_previous_song);

	/* left menu buttons */
	elem = document.getElementById("open_directory_button");
	elem.src = IMAGE.MENU_ITEM_DIRECTORY;
	add_listener(elem, "click", open_pl_overlay);
	elem = document.getElementById("crop_items_button");
	elem.src = IMAGE.MENU_ITEM_CROP;
	add_listener(elem, "click", remove_songs_event);
	elem = document.getElementById("remove_items_button");
	elem.src = IMAGE.MENU_ITEM_REMOVE;
	add_listener(elem, "click", remove_songs_event);

	/* server settings */
	elem = document.getElementById("settings_header");
	add_listener(elem, "click", open_close_settings);
	add_listener(elem, "mousedown", stop_event);

	/* playlist */
	elem = document.getElementById("playlist_add");
	add_listener(elem, "click", playlist_add_button);
	elem = document.getElementById("playlist_save");
	add_listener(elem, "click", playlist_save_button);

	/* status bar */
	elem = document.getElementById("status_bar_img");
	elem.src = IMAGE.WORKING;

	/* streaming if applicable */
	elem = document.getElementById("streaming_open");
	if(elem) {
		add_listener(elem, "click", streaming_open);
	}

	/* time display */
	elem = get_slider_txt(possliderid);
	if(elem) {
		add_listener(elem, "click", change_pos_dtype);
	}

	// pagination
	elem = document.getElementById("pagination");
	if(elem) {
		add_listener(elem, "click", pagination_change_page);
		add_listener(elem, "mousemove", pagination_scroll_view);
		add_listener(elem, "mouseout", pagination_scroll_stop);
	}
	elem = document.getElementById("pagination_jump_current");
	if(elem) {
		elem.src = IMAGE.JUMP_CURRENT;
		add_listener(elem, "click", playlist_scroll_to_playing);
		elem.title = LANG.JUMP_CURRENT;
	}
	elem = document.getElementById("pagination_follow_current");
	if(elem) {
		add_listener(elem, "click", pagination_toggle_following);
	}

	elem = document.getElementById("playlist_search_btn");
	if(elem) {
		add_listener(elem, "click", plsearch_open);
	}

	// set it to nothing selected
	pl_selection_changed(false);
}

function send_play_pause(e) {
	stop_event(e);
	var act = "toggle";
	if(playing.state=="stop") {
		act = "play";
		if(playing.id>=0)
			act+="&id=" + playing.id;
	}
	send_command("act=" + act);
}
function send_stop_cmd(e) {
	stop_event(e);
	send_command("act=stop");
}
function send_next_song(e) {
	stop_event(e);
	send_command("act=next");
}
function send_previous_song(e) {
	stop_event(e);
	send_command("act=previous");
}

function send_update_db_cmd(e) {
	stop_event(e);
	send_command("updatedb");
}

function send_clear_error() {
	send_command("clearerror", false, false, true);
}

function remove_songs_event(e) {
	var inv = 'crop_items_button'==e.target.id;
	var sel = get_pl_selection_range(inv);
	if(!inv) {
		/* nothing selected if we just removed it, 
		 * or at least in theory */
		pl_selection_changed(false);
	}
	if(sel.length==0) {
		return;
	}
	send_command("remove=" + encodeURIComponent(sel), remove_songs_cb, LANG.WAIT_REMOVING);
}

function remove_songs_cb(response) {
	if(response!="ok") {
		show_status_bar(LANG.E_REMOVE);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}

function open_close_settings(e) {
	var sc = document.getElementById('settings_container');
	/* close */
	if(sc.style.display == "block") { /* not perfect but I think there's enough vars at the top */
		sc.firstChild.style.display = "none";
		remove_listener(sc, "mousedown", stop_event);
		remove_listener(sc, "click", settings_click_handler);
		setTimeout(open_close_settings_timer, settings_time, sc, false, new Array(0, 200));
	}
	else { 
	/* open */
		var dst_height = sc.scrollHeight; // || innerHeight
		sc.style.height = "50px";
		sc.style.overflow = "hidden";
		remove_children(sc.firstChild);
		sc.firstChild.style.display = "none";
		sc.firstChild.appendChild(document.createTextNode("Loading.."));
		sc.style.display = "block"; 
		add_listener(sc, "mousedown", stop_event);
		add_listener(sc, "click", settings_click_handler);
		setTimeout(open_close_settings_timer, settings_time, sc, true, new Array(0, 200));
		send_command("outputs", open_settings_cb);
	}
}

function open_close_settings_timer(sc, isOpening, heights) {
	var ad = 50;
	if(isOpening)
		heights[0] += ad;
	else heights[1] -=ad;
	
	if(heights[0]<heights[1]) {
		sc.style.height = (isOpening?heights[0]:heights[1]) + "px";
		setTimeout(open_close_settings_timer, settings_time, sc, isOpening, heights);
	}
	else {
		if(isOpening) {
			//sc.style.overflow = "auto";
			sc.firstChild.style.display = "block";
			sc.style.height = heights[1] + "px";
		}
		else {
			sc.style.display = "none";
			sc.style.height = heights[0] + "px";
		}
	}

}

function create_settings_status_image(stat) {
	var img = create_node("img");
	img.className = "server_settings";
	if(stat==1||stat=="1") {
		img.src = IMAGE.SERVER_SETTINGS_ENABLED;
	}
	else {
		img.src = IMAGE.SERVER_SETTINGS_DISABLED;
	}
	return img;
}

function open_settings_cb(response) {
	var txt = document.getElementById('settings_content');
	remove_children(txt);
	var img = create_node("img");
	img.className = "server_settings";

	function add_entry(id, stat, text, no_img) {
		var span = create_node("span", id);
		span.className = "server_settings";
		if(!no_img) {
			var im = create_settings_status_image(stat);
			im.id = id + "_img";
			span.appendChild(im);
		}
		span.appendChild(create_txt(" " + text));
		txt.appendChild(span);
		txt.appendChild(create_node("br"));
		return span;
	}

	add_entry("repeat_toggle", playing.repeat, LANG.REPEAT);
	add_entry("random_toggle", playing.random, LANG.RANDOM);
	var xfade = add_entry("xfade_entry", playing.xfade, LANG.XFADE, true);
	var xe = create_node("img");
	xe.name = "left";
	xe.className = "server_settings";
	xe.src = IMAGE.SERVER_SETTINGS_XFADE_DOWN;
	xfade.appendChild(xe);
	var i_right = xe.cloneNode(true);
	i_right.name = "right";
	i_right.src = IMAGE.SERVER_SETTINGS_XFADE_UP;
	xe = create_node("span", "xfade_adjust_txt", " " + playing.xfade + " ");
	xfade.appendChild(xe);
	xfade.appendChild(i_right);

	var tmp = create_node("hr"); 
	tmp.className = "server_settings";
	txt.appendChild(tmp);
	txt.appendChild(create_txt("Outputs:"));
	txt.appendChild(create_node("br"));
	try {
		var outputs = response['outputs'];
		for(var i in outputs) {
			var id = outputs[i]["outputid"];
			var enabled = outputs[i]["outputenabled"];
			var s = add_entry(OUTPUT_ID + id, enabled, outputs[i]["outputname"]);
			s.setAttribute("outputenabled", enabled);
		}
	}
	catch(e) {
		debug(e.message);
		txt.appendChild(create_txt(LANG.E_NO_OUTPUTS));
	}
}

function settings_click_handler(e) {
	for(var n = e.target; n.parentNode; n=n.parentNode) {
		if(n.id) {
			if(n.id.indexOf(OUTPUT_ID)==0&&n.id.indexOf("img")<0) {
				toggle_output(n);
				break;
			}
			else if(n.id=="repeat_toggle") {
				toggle_repeat(n);
				break;
			}
			else if(n.id=="random_toggle") {
				toggle_random(e);
				break;
			}
			else if(n.id=="xfade_entry") {
				xfade_adjust(n, e);
			}
			else if(n.id=="settings_container") {
				break;
			}
		}
	}
	stop_event(e);
}

function toggle_repeat(e) {
	send_command("repeat=" + (parseInt(playing.repeat)==0?1:0), toggle_repeat_cb);
}
function toggle_random(e) {
	send_command("random=" + (parseInt(playing.random)==0?1:0), toggle_random_cb);
}
function toggle_output(e) {
	target = e;
	output_toggle_id = target.id;
	id = target.id.substring(OUTPUT_ID.length);
	var cmd = "output_";
	if(target.getAttribute("outputenabled")==1)
		cmd+="d";
	else cmd+="e";
	cmd+="=" + id;
	send_command(cmd, output_change_cb);
}

function xfade_adjust(node, ev) {
	if(!ev.target.name) {
		return;
	}
	var name = ev.target.name;
	if(name!="left"&&name!="right") {
		return;
	}
	var xfade= parseInt(playing.xfade) + ("left"==name?-1:+1);
	if(xfade<0)
		xfade=0;
	send_command("xfade=" + xfade);
	var x = document.getElementById("xfade_adjust_txt");
	if(x.firstChild) {
		x.firstChild.nodeValue = " " + xfade + " ";
	}
}

function toggle_repeat_cb(response) {
	var n = document.getElementById("repeat_toggle_img");
	var img = create_settings_status_image(response);
	replace_node(img, n);
	img.id = "repeat_toggle_img";
}
function toggle_random_cb(response) {
	var n = document.getElementById("random_toggle_img");
	var img = create_settings_status_image(response);
	replace_node(img, n);
	img.id = "random_toggle_img";
}
function output_change_cb(response) {
	if(output_toggle_id==null) 
		return;
	var n = document.getElementById(output_toggle_id);
	if(!n) 
		return;
	var o_img = document.getElementById(output_toggle_id + "_img");
	n.setAttribute("outputenabled", response);
	var img = create_settings_status_image(response);
	img.id = o_img.id;
	replace_node(img, o_img);
	output_toggle_id = null;
}


function send_play_pos(pos) {
	send_command("act=play&pos=" + pos);
}

function open_pl_overlay(e) {
	if(open_overlay_idx<0) {
		open_overlay_fixed(pl_overlay_id);
	}
	else {
		close_overlay(pl_overlay_id);
	}
}

function StatusBar(txt) {
	this.txt = document.getElementById('status_bar_txt');
	this.img = document.getElementById('status_bar_img');
	this.main = document.getElementById('status_bar');
	this.timer = false;
}

/* status bar (could be put in toolkit though */
function show_status_bar(txt, working) {
	txt = create_txt(txt);
	remove_children(status_bar.txt);
	status_bar.txt.appendChild(txt);
	if(working) {
		status_bar.img.setAttribute("working", "yeah");
	}
	else {
		if(status_bar.img.hasAttribute("working"))
			status_bar.img.removeAttribute("working");
	}
	status_bar.main.style.display = "block";
	/* to prevent it from disappearing again if it is showing */
	if(status_bar.timer) {
		clearTimeout(status_bar.timer);
		status_bar.timer = false;
	}
}

/* hides status-bar after optional number of seconds */
function hide_status_bar(time) {
	if(typeof(time)!='undefined'&&time&&time>0) {
		status_bar.timer = setTimeout(hide_status_bar, time*1000, false);
	}
	else {
		remove_children(status_bar.txt);
		if(browser_is_opera()) {
			opera_quirk_set_display_none(status_bar.main);
		}
		else {
			status_bar.main.style.display = "none";
		}
		status_bar.timer = false;
	}
}

function setup_keys() {
	keyboard_init(); 
	keyboard_register_listener(send_play_pause, "k", KEYBOARD_NO_KEY, true);
	keyboard_register_listener(send_previous_song, "j", KEYBOARD_NO_KEY, true);
	keyboard_register_listener(send_next_song, "l", KEYBOARD_NO_KEY, true);
	keyboard_register_listener(quickadd_focus, "s", KEYBOARD_CTRL_KEY|KEYBOARD_SHIFT_KEY, true);
	/* for browsers where ctrl+shift does something else */
	keyboard_register_listener(quickadd_focus, "s", KEYBOARD_CTRL_KEY|KEYBOARD_ALT_KEY, true);
	keyboard_register_listener(playlist_scroll_to_playing, " " , KEYBOARD_NO_KEY, true);

	var qa = document.getElementById('quickadd');
	qa.setAttribute("autocomplete", "off");
	add_listener(qa, "keydown", quickadd_keydown_handler); // stop it from getting to the keylisteners!
	add_listener(qa, "keyup", quickadd_keyup_handler);
	add_listener(qa, "focus", quickadd_focus);
	add_listener(qa, "blur", quickadd_blur);
	qa.title = LANG.QUICK_ADD + " [Ctrl+Shift+S]";
}

function change_pos_dtype() {
	playing.time_dtype++;
	if(playing.time_dtype>=playing.TIME_END) {
		playing.time_dtype = 0; 
	}
	setting_set("time_dtype", playing.time_dtype);
}

