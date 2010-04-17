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

/* this is so broken that I can hardly describe it */

var BROWSER_ID = "browser_"; 
var BROWSE_FILE = 0;
var BROWSE_ARTIST = 1;
var BROWSE_ALBUM = 2;
var BROWSE_SEARCH = 3;

var blist;

var BROWSE_SEARCH_OPTS;

function BrowserList(browser) {
	this.open_name = "";
	this.open = null;
	this.first = null;
	this.type = BROWSE_FILE;
	this.type_name = new Array();
	this.type_name[BROWSE_FILE] = LANG.FILESYSTEM;
	this.type_name[BROWSE_ARTIST] = LANG.ARTIST;
	this.type_name[BROWSE_ALBUM] = LANG.ALBUM;
	this.browser = browser;
	this.search = new KeySearch(null); // this is for key-typing in the fields, not the search field
	this.search_select = null; // jeje.. search field et al. 
	this.search_field = null;
	this.search_opt = null;
	this.act_buttons = null;
	this.open_popup = null;
	this.eventListener = null;
}

function BrowserWindow(value) {
	this.value = value;
	this.next = null;
}

BrowserList.prototype.get_window_by_value = function (elem) {
	var w = this.first;
	while(w!=null) {
		if(w.value==elem) 
			return w;
		w = w.next;
	}
	return null;
}
BrowserList.prototype.get_last_window = function() {
	var w = this.first;
	while(w.next!=null)
		w = w.next;
	return w;
}

BrowserList.prototype.get_previous_window = function(node) {
	var w = this.first;
	while(w!=null&&w.next!=node)
		w = w.next;
	return w;
}
BrowserList.prototype.get_next_window = function(node) {
	var w = this.first;
	while(w) {
		if(w==node) 
			return w.next;
		w = w.next;
	}
	return null;
}

function dirlist_init() {
	BROWSE_SEARCH_OPTS = new Array(LANG.ANYTAG, LANG.ARTIST, LANG.TITLE, 
				LANG.ALBUM, LANG.GENRE, LANG.FILENAME, LANG.COMPOSER,
				LANG.PERFORMER, LANG.DATE, LANG.LYRICS);

	remove_children(pl_overlay_write);
	send_command("dirlist", dirlist_init_handler);
}

function dirlist_init_handler(response) {
	if(response=="failure") {
		show_status_bar(LANG.E_FAILED_LOAD_DIR);
	}
	else {
	  var ul;
	  var ul_tmp = null;
	  blist = new BrowserList(pl_overlay_write);
	  var stuff = create_node("div");
	  stuff.className = "browse_type_container";

	  for(var i=0; i<blist.type_name.length; i++) {
	  	var n = create_node("p");
		n.className = "browse_type";
		n.appendChild(create_txt(blist.type_name[i]));
		stuff.appendChild(n);
		if(i==BROWSE_FILE)
			add_listener(n, "click", browse_file_init);
		else if(i==BROWSE_ARTIST)
			add_listener(n, "click", browse_artist_init);
		else if(i==BROWSE_ALBUM) 
			add_listener(n, "click", browse_album_init);
		add_listener(n, "mousedown", stop_event);
		
	  }

	  var search = blist.search_select = create_search_choices(BROWSE_SEARCH_OPTS, browse_search_change);
	  stuff.appendChild(search);  
	  var opt = blist.search_opt = create_node("option", "bs_search");
	  opt.value = "-1";
	  opt.appendChild(create_txt("Search:"));
	  insert_first(opt, search);
	  search.selectedIndex = 0;
	  search.id ="browse_search_select";

	  blist.search_field = search = create_node("input", "browse_search_field");
	  search.className = "browse_type";
	  search.size = "20";
	  /* make sure it doesn't get captured by someone else */
	  add_listener(search, "keydown", stop_propagation);
	  add_listener(search, "keyup", browser_search_field_keyhandler);
	  search.disabled = "disabled";
	  stuff.appendChild(search);

	  var update = create_node("p");
	  update.className = "browse_type";
	  update.appendChild(create_txt(LANG.UPDATE_DB));
	  add_listener(update, "click", send_update_db_cmd);
	  stuff.appendChild(update);

	  blist.browser.appendChild(stuff);

	  var buttons = blist.act_buttons = create_node("ul", "browser_act_buttons");
	  var btn;

	  var bl = new Array();
	  for(var i=0; i<BROWSER_NUM; i++) {
	  	ul = create_node("ul", BROWSER_ID + i);
		bl[i] = ul;
	  	ul.className = "browser_field";
	  	blist.browser.appendChild(ul);
		setup_dirlist_listeners(ul);

		btn = create_node("li", "browser_btn_add_" + i);
		btn.className = "browser_button_add";
		if(i>0)
			btn.style.left = 29*i + "%";
		btn.setAttribute("field", i);
		btn.appendChild(create_txt(LANG.ADD));
		add_listener(btn, "click", browser_multi_add); 
		buttons.appendChild(btn);
	  }
	  add_listener(buttons, "mousedown", stop_event);
	  blist.browser.appendChild(buttons);
	  /* link it up */
	  var last = null;
	  for(var i=0; i<BROWSER_NUM; i++) {
		var bw = new BrowserWindow(bl[i]);
		if(i==0) 
			blist.first = last = bw;
		else 
			last = last.next = bw;
	  }

	  browser_fill_entry(blist.first.value, response, 0, "");
	}
}

/* opts: array with options
   onchange_cb: what to call when something changes
   return: search box 
*/
function create_search_choices(opts, onchange_cb) {
	  var search = create_node("select");
	  search.className = "browse_type";
	  add_listener(search, "change", onchange_cb);
	  var opt = null;
	  for(var i=0; i<opts.length; i++) {
	  	opt = create_node("option");
	  	opt.value = i;
	  	opt.appendChild(create_txt(opts[i]));
	  	search.appendChild(opt);
	  }
	  return search;
}

function browse_file_init() {
	browse_style_changed(BROWSE_FILE);
}
function browse_album_init() {
	browse_style_changed(BROWSE_ALBUM);
}
function browse_artist_init() {
	browse_style_changed(BROWSE_ARTIST);
}
function browse_search_change(e) {
	/* this is when opening the search browser */
	if(blist.type!=BROWSE_SEARCH) {
		var w = blist.first; 
		while(w) {
			browser_clear_window(w.value);
			w = w.next;
		}
		browse_style_changed(BROWSE_SEARCH);
		browser_search_field_enable();
	}
	else {
	}
}

function browse_style_changed(type) {
	if(type==blist.type)
		return;

	/* this is when switching back to normal view from search */
	if(blist.type==BROWSE_SEARCH) {
		var w = blist.first;
		while(w) {
			w.value.style.display = "";
			w.value.style.width = "";
			w = w.next;
		}
		browser_search_field_clear();
		insert_first(blist.search_opt, blist.search_select);
		blist.search_opt.selected = "selected";
		blist.search_select.blur(); // just in case it is selected..
		browser_act_buttons_display(true);
	}
	else if(type==BROWSE_SEARCH) {
		// only show first
		var w = blist.first.next;
		while(w) {
			w.value.style.display = "none";
			w = w.next;
		}
	
		blist.first.value.style.width = "95%";
		browser_act_buttons_display(false);
		remove_node(blist.search_opt);
	}
	blist.type = type;
	if(type!=BROWSE_SEARCH)
		browser_open_single_item(blist.first.value);
}
function setup_dirlist_listeners(ul) {
	add_listener(ul, "click", browser_click);
	/* no text selection support: */
	add_listener(ul, "mousedown", prevent_dirlist_default);
}

function prevent_dirlist_default(e) {
	if(e.target.hasAttribute("diritem")||e.target.parentNode.hasAttribute("diritem"))
		stop_event(e);
}

function browser_fill_entry(entry, resp, strip, parent_dir) {
	  if(!strip) 
	  	strip = 0;
	  var p = null;
	  var type = null;

	  /* adding parent */
	  if(strip>0&&resp) { 
		if(blist.type==BROWSE_FILE) {
	  		var tmp = add_li(entry, "< ..", entry.id + "_parent");
			tmp.setAttribute("dirtype", "parent");
			var name;

			out: 
			for(var t in resp) {
				for(var i in resp[t]) {
					name = resp[t][i];
					break out; 
				}
			}

			if(name.substring) {
				name = name.substring(0,strip-1);
				tmp.setAttribute("diritem", name);
				entry.setAttribute("dirlist", name);
			}
			entry.setAttribute("parent_dir", parent_dir);
		}
		else {
			entry.setAttribute("dirlist", blist.open_name);
			entry.setAttribute("parent_dir", parent_dir);
		}
	  }
	  else {
	  	entry.setAttribute("dirlist", "");
	  }
	  var strip_name = null;
	  var rtype = null;
	  for(var type in resp) {
	  	for(var idx in resp[type]) {
			name = resp[type][idx];
			rtype = type;
			if(type=="filelist") {
				if(typeof(name['Title'])!='undefined'&&name["Title"].length) {
					strip_name = name["Title"];
					name = name["file"];
				}
				else {
					name = name["file"];
					strip_name = name.substring(name.lastIndexOf(DIR_SEPARATOR)+1);
				}
				rtype = "file";
			}
			else if(!name.substring) {
				continue;
			}
			else strip_name = name;

			if(type=="directory") {
				strip_name = name.substring(strip);
			}
			else if(type=="file"&&name.lastIndexOf(DIR_SEPARATOR)>=0) {
				strip_name = name.substring(name.lastIndexOf(DIR_SEPARATOR)+1);
			}

			var l = create_node("li", null, strip_name);
			l.setAttribute("diritem", name);
			l.setAttribute("dirtype", rtype);
			entry.appendChild(l);
			if(type=="playlist") 
				add_playlist_hover(l);
		}
	 }
}

function add_playlist_hover(l) {
	var h = create_node("div");
	h.className = "playlist_hover";
	var img = create_node("img");
	img.src = IMAGE.BROWSER_PLAYLIST_REMOVE; 
	img.className = "fakelink";
	h.appendChild(img);
	add_listener(img, "click", show_remove_playlist);
	insert_first(h,l);
}

function show_remove_playlist(e) {
	var t = e.target.parentNode.parentNode;
	var name = t.getAttribute("diritem");
	var content = document.createDocumentFragment();
	content.appendChild(create_txt(LANG.CONFIRM_REMOVE + " '" + name + "'?"));
	var yes = create_node("span");
	yes.className = "fakelink";
	yes.appendChild(create_txt(" Yes,"));
	content.appendChild(yes);

	var no = create_node("span");
	no.className = "fakelink";
	no.appendChild(create_txt(" No"));
	content.appendChild(no);

	if(blist.open_popup)
		destroy_open_popup();
	var pop = new Popup(document.body, content);
	blist.open_popup = pop;
	blist.eventListener = add_listener(document.body, "click", destroy_open_popup);
	add_listener(yes, "click", function() { remove_playlist(t) ; destroy_open_popup(); });
	add_listener(no, "click", destroy_open_popup);
	pop.popup.style.padding = "5px 5px 5px 5px";
	pop.popup.style.position = "absolute"; 
	pop.popup.style.left = "80px";
	pop.popup.style.top = "500px";
	pop.popup.style.margin = "0 auto"; 
	pop.show();
}

function destroy_open_popup() {
	var blist = window.blist; // jic
	if(blist.open_popup) {
		blist.open_popup.destroy();
		blist.open_popup = null;
	}
	if(blist.eventListener) {
		blist.eventListener.unregister();
		blist.eventListener = null;
	}
}

function remove_playlist(elem) {
	var item = elem.getAttribute("diritem");
	send_command("playlist_rm=" + encodeURIComponent(item), remove_playlist_cb);
	remove_node(elem);
}

function remove_playlist_cb(e) {
	if(e!="ok") {
		show_status_bar(LANG.E_FAILED_ADD);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}

function browser_click(e) {
	stop_event(e);
	var elem = e.target;

	if(!elem||!elem.hasAttribute) return;

	/* test if we got one of the direct children as targets */
	if(elem.parentNode&&elem.parentNode.hasAttribute("diritem"))
		elem = elem.parentNode;
	
	if(elem.hasAttribute&&elem.hasAttribute("diritem")) {
		e.stopPropagation();
		var container = elem.parentNode;
		blist.search.focus = container;
		if(e.ctrlKey||e.metaKey) {
			if(is_node_selected(elem))
				unselect_node(elem);
			else 
				select_node(elem);
			// safari workaround
			container.className = container.className;
		}
		else if (e.shiftKey) {
			var sel_node = find_first_selected_node(container, elem);
			unselect_all_nodes(container);
			if(sel_node==null) {
				select_node(elem);
			}
			else {
				if(elem.hasAttribute("needle")) 
					select_range(elem, sel_node);
				else 
					select_range(sel_node, elem);
			}
			if(elem.hasAttribute("needle")) 
				elem.removeAttribute("needle");
			// safari workaround
			container.className = container.className;
		}
		else {
			browser_open_single_item(container, elem, e.detail==2);
		}
	}
}

function browser_open_single_item(container, elem, doubleclick) {
	unselect_all_nodes(container);
	var type;
	if(elem) {
		type = elem.getAttribute("dirtype");
		select_node(elem);
		// safari workaround
		container.className = container.className;
	}
	else {
		type = "other";
	}
	var b_id = blist.get_window_by_value(container);

	if(!doubleclick) {
	   if(type=="directory"||type=="artist"||type=="album") {
		var diritem = elem.getAttribute("diritem")
		
		blist.open = b_id.next;
		blist.open_name = diritem;

		/* test if already open */
		if(blist.open!=null) {
			// this item is already opened
			if(blist.open.value.getAttribute("dirlist")==diritem)
				return;
		}

		/* remove all entries in following rows */
		var tmp = b_id.next;
		while(tmp!=null) {
			if(tmp.value.hasAttribute("dirlist"))
				tmp.value.removeAttribute("dirlist");
			if(tmp.value.hasAttribute("parent_dir"))
				tmp.value.removeAttribute("parent_dir");
			remove_children(tmp.value);
			tmp = tmp.next;
		}
		if(blist.type==BROWSE_ARTIST||blist.type==BROWSE_ALBUM){
			var artist, album;
			if(blist.open == blist.get_last_window()) {
				if(blist.type==BROWSE_ARTIST) {
					artist = b_id.value.getAttribute("dirlist");
					album = diritem;
				}
				else {
					album = b_id.value.getAttribute("dirlist");
					artist = diritem;
				}
				send_command("searchfile&artist=" + encodeURIComponent(artist) + "&album=" + encodeURIComponent(album), browser_click_cb);
				return;
			}
			else if(blist.open==null) {
				// don't open
				return;
			}
			// else do as usual...
		}
		send_command("dirlist=" + encodeURIComponent(blist.open_name) + "&type=" + blist.type, browser_click_cb);
	   }
	   else if(type=="parent"||type=="other") {
		blist.open = blist.first;
		if(type=="parent")
			blist.open_name = blist.first.value.getAttribute("parent_dir");
		else blist.open_name = "";

		var w = blist.first;
		if(type=="parent") // || switch type...
			while(w!=null&&w!=b_id) 
				w = w.next;
		while(w!=null){
			browser_clear_window(w.value);
			w = w.next;
		}

		if(blist.first.value.getAttribute("dirlist")!=""||type=="other") { // already at top
			send_command("dirlist=" + encodeURIComponent(blist.open_name) + "&type=" + blist.type, browser_click_cb);
		}
	   }
	}
	else if(doubleclick&&type!="parent") {
		var diritem = elem.getAttribute("diritem")
		blink_node(elem, DEFAULT_BLINK_COLOR);
		if(elem.getAttribute("dirtype")=="playlist") {
			send_command("playlist_load=" + encodeURIComponent(diritem), null, LANG.WAIT_ADDING);
		}
		else if((blist.type==BROWSE_ARTIST||blist.type==BROWSE_ALBUM)&&elem.getAttribute("dirtype")!="file") {
			var artist, album;
			if(b_id == blist.first.next) {
				if(blist.type==BROWSE_ARTIST) {
					artist = b_id.value.getAttribute("dirlist");
					album = diritem;
				}
				else {
					album = b_id.value.getAttribute("dirlist");
					artist = diritem;
				}
				send_command("searchadd&artist=" + encodeURIComponent(artist) + "&album=" +
					encodeURIComponent(album), browser_add_cb, LANG.WAIT_ADDING);
			}
			else if(b_id==blist.first) {
				var cmd = "searchadd&";
				if(blist.type==BROWSE_ARTIST) {
					cmd+="artist=";
				}
				else {
					cmd+="album=";
				}
				cmd += encodeURIComponent(diritem);
				send_command(cmd, browser_add_cb, LANG.WAIT_ADDING);
			}
		}
		else {
			// else do as usual...
			send_command("add=" + encodeURIComponent(diritem), browser_add_cb, LANG.WAIT_ADDING);
		}
	}
}

function browser_click_cb(response) {
	var strip = 0;
	var parent_dir = null;
	if(blist.open==null) {
		// got to move it
		var last = blist.get_last_window();
		var first = blist.first; 
		var prev = blist.get_previous_window(last);
		parent_dir = prev.value.getAttribute("dirlist");
		var tmp = first.value;

		while(tmp.hasChildNodes()) {
			remove_node(tmp.lastChild);
		}
		remove_node(tmp);
		insert_after(tmp, last.value);
		last.next = first;
		blist.first = first.next;
		first.next = null;
		blist.open = blist.get_last_window();
	}
	else if (blist.open==blist.first) {
		parent_dir = blist.first.value.getAttribute("parent_dir");
		if(parent_dir)
			parent_dir = parent_dir.substring(0,parent_dir.lastIndexOf(DIR_SEPARATOR));

		var first = blist.first;
		var last = blist.get_last_window();
		var prev = blist.get_previous_window(last);
		var tmp = last.value;
		while(tmp.hasChildNodes())
			remove_node(tmp.lastChild);
		remove_node(tmp);
		insert_before(tmp, first.value)
		blist.first = last;
		last.next = first;
		prev.next = null;
		blist.open = blist.first;
	}
	var b = blist.open;
	var prev = blist.get_previous_window(b);
	if(parent_dir==null&&prev!=null) {
		parent_dir = prev.value.getAttribute("dirlist");
	}
	else if(parent_dir==null) {
		parent_dir = "";
	}

	if(blist.open_name.length>0)
		strip = blist.open_name.length + 1;

	browser_fill_entry(b.value, response, strip, parent_dir);
	blist.open_name = "";
	blist.open = null;
}

function browser_add_cb(response) {
	if(response!="ok") {
		show_status_bar(LANG.E_FAILED_ADD);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}

function pl_overlay_open_cb(height) {
	var elem = null;
	var i=0; 
	var w = blist.first;
	while(w != null ) {
		/* this makes room for the top (filesys, artist, search et al.) and bottom (add etc) */
		w.value.style.height = (height - 40)+ "px";
		w = w.next;
	}
	blist.search.listener = keyboard_register_listener(browser_key_search, KEYBOARD_MATCH_ALL, KEYBOARD_NO_KEY, true);
	// TODO, maybe set broswer_focus
}

function pl_overlay_close_cb() {
	keyboard_remove_listener(blist.search.listener);
}

function browser_key_search(e) {
	if(!blist.search.focus) {
		return;
	}
	var clear_time = 1000;

	var c = blist.search.focus.childNodes;

	if(e.keyCode==38||e.keyCode==40||e.keyCode==37||e.keyCode==39) {
		var it = null;
		// find first selected node
		for(var i=0; i < c.length; i++) { 
			if(is_node_selected(c[i])) {
				it = c[i];
				break;
			}
		}
		if(it) {
			var win = null;
			if(e.keyCode==40&&it.nextSibling) {
				it = it.nextSibling;
			}
			else if(e.keyCode==38&&it.previousSibling) {
				it = it.previousSibling;
			}
			else if(e.keyCode==37) { // left
				// todo
				//win = blist.get_previous_window(blist.get_window_by_value(blist.search.focus));
				it = null;
			}
			else if(e.keyCode==39) { // right
				// todo
				//win = blist.get_next_window(blist.get_window_by_value(blist.search.focus));
				it = null;
			}
			else it = null;
			if(it) {
				unselect_all_nodes(blist.search.focus);
				select_node(it);
				scrollIntoView(it, false);
				blist.search.item = it;
			}
			else if (win) {
				win = win.value;
				blist.search.focus = win;
				unselect_all_nodes(win);
				select_node(win.firstChild)
			}
			blist.search.term = "";
		}
	}
	else {
		var s = blist.search.term + String.fromCharCode(e.keyCode);
		blist.search.term = s = s.toLowerCase();

		for(var i=0; i<c.length; i++) {
			var c_name = get_node_content(c[i]);
			if(!c_name||!c_name.toLowerCase)
				continue;
			c_name = c_name.toLowerCase();
			if(c_name.indexOf(s)==0) {
				unselect_all_nodes(blist.search.focus);
				select_node(c[i]);
				scrollIntoView(c[i], false);
				blist.search.item = c[i];
				break;
			}
		}
	}
	clearTimeout(blist.search.timer);
	blist.search.timer = setTimeout(browser_clear_search_term, clear_time);
}
function browser_clear_window(win) {
	remove_children(win);
	if(win.hasAttribute("dirlist"))
		win.removeAttribute("dirlist");
	if(win.hasAttribute("parent_dir"))
		win.removeAttribute("parent_dir");
}

/* clear key-search  */
function browser_clear_search_term() {
	blist.search.term = "";
	if(blist.search.focus&&blist.search.item) {
		browser_open_single_item(blist.search.focus, blist.search.item); 
		blist.search.item = null;
	}
}

function KeySearch(listener) {
	this.listener = listener;
	this.focus = null;
	this.term = "";
	this.timer = null;
}

/* clear search field */
function browser_search_field_clear() {
	blist.search_field.value = "";
	blist.search_field.disabled = "disabled";
	blist.search_field.blur();
}

function browser_search_field_enable() {
	blist.search_field.disabled = "";
	blist.search_field.focus();
}

function browser_search_field_keyhandler(e) {
	if(e.keyCode&&e.keyCode==RETURN_KEY_CODE) {
		if(blist.search_field.value.trim().length>0) {
			send_command("metasearch=" + blist.search_select.value + "&s=" + encodeURIComponent(blist.search_field.value), 
					browser_search_field_keyhandler_cb, LANG.WAIT_SEARCHING);
		}
		else {
			remove_children(blist.first.value);
		}
	}
}

function browser_search_field_keyhandler_cb(resp) {
	var dst = blist.first.value;
	remove_children(dst);
	if(typeof(resp)!='undefined'&&resp!="failed") {
		for(var i=0; i<resp.length; i++) {
			var file = resp[i]["file"];
			var artist = resp[i]["Artist"];
			var title = resp[i]["Title"];
			var name = "";
			if(title==null||!title.length) {
				name = file.substring(file.lastIndexOf(DIR_SEPARATOR)+1);
			}
			else {
				name = artist + " - " + title;
			}

			var l = add_li(dst, name, dst.id + "_" + i);
			l.setAttribute("diritem", file);
			l.setAttribute("dirtype", "file");
			/* used to match css selector */
			l.setAttribute("btype", "search");
			l.appendChild(create_node("br"));
			var fspan = create_node("span", null, file);
			l.appendChild(fspan);
		}
	}
}

function browser_act_buttons_display(visible) {
	var btn = blist.act_buttons.childNodes;
	for(var i=1; i<btn.length; i++) {
		btn[i].style.display = (visible?"":"none");
	}
}


function browser_multi_add(e) {
	var target = e.target;
	if(!target||!target.hasAttribute("field")) 
		return;
	var field = parseInt(target.getAttribute("field"));
	var container = blist.first;
	/* find what field we belong to */
	for(var i=0; i<field&&container; i++) {
		container = container.next;
	}
	if(container) {
		var add = get_attribute_from_selected_elems(container.value, "diritem");
		var type = get_attribute_from_selected_elems(container.value, "dirtype");
		if(add.length<=0||add.length!=type.length) { // add.length must always equal type.length
			//debug("a: " + add.length + ", t: " + type.length);
			return;
		}
		var cmd="";
		if(blist.type==BROWSE_ARTIST||blist.type==BROWSE_ALBUM) {
			if(container==blist.first.next) {
				if(blist.type==BROWSE_ARTIST)
					cmd+="baseartist:";
				else cmd+="basealbum:";
				var dirlist = container.value.getAttribute("dirlist");
				cmd+=dirlist+"\n";
			}
		}
		for(var i=0; i<add.length; i++) {
			if(type[i]=="parent")
				continue;
			cmd+= type[i];
			cmd+= ":";
			cmd+= add[i];
			cmd+= "\n";
		}
		blink_node(target, DEFAULT_BLINK_COLOR);
		send_command("ma", browser_multi_add_cb, LANG.WAIT_ADDING, false, cmd);
	}
}

function browser_multi_add_cb(res) {
	if(res!="ok") {
		show_status_bar(LANG.E_FAILED_ADD);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}
