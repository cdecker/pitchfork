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

var RETURN_KEY_CODE = 13; // enter...

var keyboard_listeners;
var keyboard_elem_count = 0;

var KEYBOARD_NO_KEY = 0;
var KEYBOARD_CTRL_KEY = 1;
var KEYBOARD_ALT_KEY = 1 << 1;
var KEYBOARD_META_KEY = 1 << 2;
var KEYBOARD_SHIFT_KEY = 1 << 3;

var KEYBOARD_MATCH_ALL = "";


function KeyListener(callback_function, match_char, extra_keys, active) {
	this.callback = callback_function;
	this.matchChar = match_char; 
	this.extra_keys = extra_keys;
	this.active = active;
}

function keyboard_init() {
	document.addEventListener("keydown", keyboard_input_handler_cb, false);
	keyboard_listeners = new HashMap();
	if(document.body.focus)
		document.body.focus();
}

function keyboard_register_listener(callback_func, match_char, extra_keys, active) {
	var kid = keyboard_elem_count++;

	if(match_char==KEYBOARD_MATCH_ALL) {
		match_char = -1;
		keyboard_listeners.insert(kid, new KeyListener(callback_func, match_char, extra_keys, active));
	}
	else {
		match_char = match_char.toUpperCase().charCodeAt(0);
		keyboard_listeners.put(kid, new KeyListener(callback_func, match_char, extra_keys, active));
	}

	return kid;
}

function keyboard_set_active(id, active) {
	try {
		keyboard_listeners.get(id).active = active;
	}
	catch(e) {
		debug("setting kb " + id + " to " + active + " failed");
	}
}

function keyboard_remove_listener(key) {
	keyboard_listeners.remove(key);
}

function keyboard_input_handler_cb(ev) {
	var key = -1;

	//debug("got a key: " + (ev.shiftKey?"shift ":"") + (ev.ctrlKey?"ctrl ":"") + (ev.altKey?"alt ":"") + (ev.metaKey?"meta ":""));
	
	if(ev.which&&ev.which>0)
		key = ev.which;
	else key = ev.keyCode; // hmm....

	// this is ctrl+some key, yank it up by 64
	if(ev.ctrlKey&&key>0&&key<27) {
		key+=64;
	}

	// just match a-z and some special chars (search: ascii key table)
	if(key<32||key>90)
		return true;
	
	var num = KEYBOARD_NO_KEY;
	if(ev.ctrlKey)
		num += KEYBOARD_CTRL_KEY;
	if(ev.shiftKey)
		num += KEYBOARD_SHIFT_KEY
	if(ev.altKey)
		num += KEYBOARD_ALT_KEY;
	if(ev.metaKey)
		num += KEYBOARD_META_KEY;
	var it = keyboard_listeners.iterator();
	var l = null;
	while((l = it.next())!=null) {
		if(l.active && num == l.extra_keys && (l.matchChar == key||l.matchChar<0)) {
			l.callback(ev);
			stop_event(ev);
			return false;
		}
	}
	return true;
}
