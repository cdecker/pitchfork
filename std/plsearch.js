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


var sidebar = null;

function Sidebar() {
	this.is_open = false;
	this.view = new HashMap();
	this.header_height = new HashMap();
	this.open_view = "metadata";
	this.header_height.put("metadata", 20);
	/* TODO: find another way to determine the height of this */
	this.display_base_top = 107;
	this.header = document.getElementById("sidebar_header");
	this.display = document.getElementById("sidebar_display");
	this.display_txt = document.getElementById("sidebar_display_txt");
	this.last_metadata_request = null;
	this.PLSEARCH_OPTS = new Array("Any", "Artist", "Title", "Album", "Genre", "Filename", "Composer", "Performer", "Date");
	this.plsearch_choice = null; // select box
	this.plsearch_input = null; // search input box
}

Sidebar.prototype.say_loading = function(txt) {
	if(typeof(txt)=='undefined')
		txt = LANG.WAIT_LOADING;
	this.set_content(create_txt(txt));
}

Sidebar.prototype.adjust_height = function(name) {
	var h = this.header_height.get(name);
	this.display.style.top = (this.display_base_top + h) + "px";
	this.header.style.height = h + "px";
}

Sidebar.prototype.set_content = function(fragment) {
	remove_children(this.display_txt);
	this.display_txt.appendChild(fragment);
}

/* Name of view, buffer/element that is this view, and height of view */
Sidebar.prototype.add_view = function(name, buffer, height) {
	this.view.put(name,buffer);
	if(!height)
		height = 20;
	this.header_height.put(name, height);
}

/* will switch to the specified view if it isn't already open */
Sidebar.prototype.switch_view = function(name) {
	if(this.open_view==name) 
		return;
	var n = this.view.remove(name); // make sure we can get it first
	if(!n) {
		debug("can't get new sidebar view: " + name);
		return;
	}
	var buf = remove_children(this.header);
	this.view.put(this.open_view, buf);
	this.header.appendChild(n);
	this.open_view = name;
}


function sidebar_close() {
	if(browser_is_opera()) {
		sidebar.header.style.display = "none";
		opera_quirk_set_display_none(sidebar.display);
	}
	else {
		sidebar.header.style.display = "none";
		sidebar.display.style.display = "none";
	}
	remove_children(sidebar.display_txt);
}

function sidebar_open(view) {
	if(view&&view!=sidebar.open_view) { // we have to change view
		sidebar.switch_view(view);
		sidebar.adjust_height(view);
	}
	sidebar.header.style.display = "block";
	sidebar.display.style.display = "block";
}


function sidebar_init() {
	sidebar = new Sidebar();
}

function plsearch_init() {
	/* you can either use a buffer like in create_fragment()
	 * or add it to a top-container like I've done here*/
	var t = create_node("p");
	t.className = "nomargin";
	t.appendChild(create_txt("Playlistsearch:  "));
	var close = create_node("span", null, " ["+LANG.CLOSE+"]");
	add_listener(close, "click", sidebar_close);
	close.className = "fakelink";
	t.appendChild(close);
	t.appendChild(create_node("br"));

	var search = create_search_choices(sidebar.PLSEARCH_OPTS, plsearch_choice_change)

	t.appendChild(search);

	sidebar.plsearch_choice = search;
	search = create_node("input");
	search.type = "text";
	sidebar.plsearch_input = search;
	add_listener(search, "keyup", plsearch_term_change);
	add_listener(search, "keydown", stop_propagation);
	search.className = "browse_type";
	t.appendChild(search);
	
	sidebar.add_view("plsearch", t, 45);
}

function plsearch_choice_change(e) {
	stop_propagation(e);
	sidebar.plsearch_input.focus();
}

function plsearch_open() {
	sidebar_open("plsearch");
	sidebar.set_content(create_txt(""));
	sidebar.plsearch_input.focus();
}

function plsearch_set_content(content) {
	if(sidebar.open_view=="plsearch") 
		sidebar.set_content(content);
}

function plsearch_term_change(e) {
	stop_propagation(e); // we'll keep it
	if(e.keyCode == RETURN_KEY_CODE) { // send search
		var s = sidebar.plsearch_input.value.trim();
		if(s.length>0) {
			send_command("plsearch=" + sidebar.plsearch_choice.selectedIndex + 
				"&s=" + s, plsearch_search_cb, LANG.WAIT_SEARCHING);
		}
		else { // clear results
			// fixme, possible leak
			remove_listener(sidebar.display.firstChild , "click", plsearch_click);
			remove_listener(sidebar.display.firstChild , "mousedown", stop_event);
			plsearch_set_content(create_txt(""));
		}
	}
}

function plsearch_search_cb(resp) {
	if(typeof(resp)!='undefined'&&resp!="failed") {
		var dst= create_node("p");
		dst.style.padding = "0px";
		for(var i=0; i<resp.length; i++) {
			var file = resp[i]["file"];
			var artist = resp[i]["Artist"];
			var title = resp[i]["Title"];
			var pos = resp[i]["Pos"];
			var name = "";
			if(title==null||!title.length) {
				name = file.substring(file.lastIndexOf(DIR_SEPARATOR)+1);
			}
			else {
				name = artist + " - " + title;
			}

			var e = create_node("span", null, name);
			e.className = "plse";
			e.setAttribute("diritem", file);
			e.setAttribute("dirtype", "file");
			e.setAttribute("plpos", pos);
			dst.appendChild(e);
		}
		plsearch_set_content(dst);
		add_listener(dst, "click", plsearch_click);
		add_listener(dst, "mousedown", stop_event);
	}
	else {
		plsearch_set_content(create_txt(LANG.E_INVALID_RESULT));
	}
}

function plsearch_click(e) {
	stop_event(e);
	var target = e.target;
	if(target&&target.hasAttribute("plpos")) {
		if(e.detail==1) {
			playlist_scroll_to_pos(parseInt(target.getAttribute("plpos")), true);	
		}
		else if(e.detail==2) {
			send_play_pos(target.getAttribute("plpos"));
		}
	}
}

