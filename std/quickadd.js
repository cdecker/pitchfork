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

var quickadd_last_term = "";

function quickadd_focus(e) {
	var qa = document.getElementById('quickadd');
	var qa_disp = document.getElementById('qa_suggestions');
	if(e&&e.type&&e.type!="focus");
		qa.focus();
	if(qa.value==qa.defaultValue) {
		qa.value = "";
	}
	qa_disp.style.display = "block";
}
function quickadd_blur(e) {
	var qa = document.getElementById('quickadd');
	var qa_disp = document.getElementById('qa_suggestions');

	if(qa.value.trim().length==0) {
		qa.value=qa.defaultValue;
		quickadd_hide();
	}
}
function quickadd_keydown_handler(e) { 
	e.stopPropagation(); 
	var qa = document.getElementById('quickadd');
	var key = e.keyCode;

	/* return key, send request to add if something to add */
	if(key==RETURN_KEY_CODE) {
		stop_event(e);
		var add = qa.value;
		add = add.trim();
		if(add.length>0) {
			var txt_node = document.getElementById('qa_suggestions_txt');
			var elems = txt_node.getElementsByTagName("span");
			var i = qa_get_selected_id(elems);
			if(i>=0) {
				add = elems[i].name;
			}
			quickadd_clean();
			send_command("add=" + encodeURIComponent(add), function(response) 
					{ if(response=="failed") show_status_bar(LANG.E_FAILED_ADD); }, 
					LANG.WAIT_ADDING);
		}
		else {
			quickadd_clean();
		}
	}
	else if(key==27) { // esc :(
		stop_event(e);
		qa.value = "";
		qa.blur();
		quickadd_hide();
	}
	else if(key>=37&&key<=40) { /* left up right down */
		if(key==40) { // down
			quickadd_move_selection(1);
			stop_event(e);
		}
		else if(key==38) {  // up
			quickadd_move_selection(-1);
			stop_event(e);
		}
		else if(key==39) { // right
			var txt_node = document.getElementById('qa_suggestions_txt');
			var elems = txt_node.getElementsByTagName("span");
			var sel = qa_get_selected_id(elems);
			if(sel>=0) {
				//stop_event(e);
				qa.value = elems[sel].name + "/";
				quickadd_keyup_handler();
				qa.focus();
				setCaretToEnd(qa);
			}
		}
		else if(key==37) { // left
		}
	}
}

function quickadd_clean() {
	var qa = document.getElementById('quickadd');
	qa.value = "";
	qa.blur();
	quickadd_hide();
}

function qa_get_selected_id(elems) {
	for(var i=0; i<elems.length; i++) {
		if(elems[i].hasAttribute("qa_selected")) {
			return i;
		}
	}
	return -1;
}

function quickadd_move_selection(num) {
	var txt_node = document.getElementById('qa_suggestions_txt');
	var elems = txt_node.getElementsByTagName("span");
	var sel_node = qa_get_selected_id(elems);

	if(sel_node>=0) {
		elems[sel_node].removeAttribute("qa_selected");
	}

	num = num+sel_node;

	if(num>=elems.length ||num==-1) {
		return;
	}
	else if(num<0) // flip it around
		num=elems.length-1;
	elems[num].setAttribute("qa_selected", "omg");
	/* safari workaround */
	elems[num].className = elems[num].className;
}

function quickadd_hide() {
	var txt_node = document.getElementById('qa_suggestions_txt');
	var qa_disp = document.getElementById('qa_suggestions');
	qa_disp.style.display = "none";
	remove_children(txt_node);
}

function quickadd_keyup_handler(e) {
	var qa = document.getElementById('quickadd');
	var search_str = qa.value;
	search_str = search_str.trim();

	/* unwanted event */
	if(e) {
		e.stopPropagation(); 
		if(e.altKey||e.metaKey||e.ctrlKey) {
			return;
		}
	}

	if(search_str.length>0) {
		if(search_str!=quickadd_last_term) {
			quickadd_last_term = search_str;
			send_command("quick_search=" + encodeURIComponent(search_str), quickadd_result_handler);
		}
	}
	else {
		var txt_node = document.getElementById('qa_suggestions_txt');
		remove_children(txt_node);
		quickadd_last_term = "";
	}
}

function quickadd_result_handler(res) {
	var txt_node = document.getElementById('qa_suggestions_txt');
	if(!res||res=="failed") {
		remove_children(txt_node);
		txt_node.appendChild(create_txt(LANG.E_NOTHING_FOUND));
	}
	else {
		remove_children(txt_node);
		for(var ix in res) {
			var name = res[ix];
			var node = create_node("span");
			node.className = "qa_element";
			node.name = name;
			var idx = name.lastIndexOf(DIR_SEPARATOR);
			node.appendChild(create_txt((idx>0?"..":"") + name.substring(idx)));
			txt_node.appendChild(node);
		}
	}
}
