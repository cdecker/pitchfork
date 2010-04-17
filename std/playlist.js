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

/* this file contains anything pertaining to playlist management */

var playlist_element = null;


function playlist_init() {
	show_status_bar(LANG.WAIT_LOADING, true);
	var http = new XMLHttpRequest(); 
	http.open("GET", "command.php?ping");
	remove_children(playlist_element);

	var c = create_node("tr");
	function ctws(size) {
		var tmp = create_node("td");
		tmp.style.width = size + "px";
		c.appendChild(tmp);
	}
	ctws(23); // pos
	for(var i=1; i< pl_entries.length-1; i++) {
		if(pl_entries[i]=="Track") {
			ctws(50);
		}
		else {
			ctws(200);
		}
	}
	ctws(30); // time
	c.className = "playlist";
	pl_entry_clone = c;

	http.onreadystatechange = function() {
	  if(http.readyState==4) {
	    var resp = null;
	    if(!http.responseText||!(resp = evaluate_json(http.responseText))) {
	    	show_status_bar(LANG.E_INVALID_RESPONSE);
		throw("Init failed");
	    }
	    else if(http.status==200) {
	      if(resp['connection']&&resp['connection']=="failed") {
	      	show_status_bar(LANG.E_CONNECT);
		throw(LANG.E_CONNECT);
	      }

	      /* for pagination to work properly we need to know some values in forehand */
	      if(resp.status) {
	      	var s = resp.status;
		if(typeof(s.song)!='undefined') 
			playing.pos = parseInt(s.song);
	      }

	      if(pagination_is_following())
	      	playlist_scroll_to_playing();

	      hide_status_bar(1);
	      dirlist_init();
	      setTimeout(need_update,10);
	    }
	    else {
	    	show_status_bar(LANG.E_INIT_PL);
		throw("init failed");
	    }
	  }
	}
	http.send(null);
}

function create_lazy_pl_row(info, id) {
	var tr = null;
	var pos = parseInt(info["cpos"]);
	tr = pl_entry_clone.cloneNode(true);
	tr.firstChild.appendChild(create_txt(parseInt(pos)+1));
	tr.setAttribute("plpos", pos);
	tr.id = id;
	return tr;
}

function get_plid(node) {
	return node.id.substring(7);
}

function get_plpos(node) {
	return node.getAttribute("plpos");
}

function set_pl_position(node, new_pos) {
	node.childNodes[0].childNodes[0].nodeValue = (new_pos+1);
	node.setAttribute("plpos", new_pos);
}

function moved_plitem(stat) {
	if(stat!="ok") {
		show_status_bar(LANG.E_PL_MOVE);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}

function playlist_get_move_txt() {
	/* todo */
	return "Moving selection..";
}

/* a note on this... if to is null then it was put first in the list */
/* if move is null then it's a multi-move (which it always will be for now) */
function playlist_move(move, to) {

	if(move==null) {
		var range = get_pl_selection_range(false);
		to = get_plpos(to);
		send_command("rangemove=" + encodeURIComponent(to) + "&elems=" + encodeURIComponent(range));
		return;
	}
	
	if(to==move) {
	  debug("trying to move to same, you should never see this");
	  return;
	}

	var from = get_plid(move);
	var topos = get_plpos(to);
	if(from<0 || topos == null || topos == "" ) {
		debug("Missing id on to or from!");
	}
	send_command("playlist=move&from=" + from + "&to=" + topos, moved_plitem);
}

/* cut's of elements at the end of playlist */
function playlist_resize(size) {
	if(pagination.max>0&&pagination.pages>1) {
		if(pagination.page==pagination.pages-1 && size%pagination.max!=0 ) {
			remove_children_after(playlist_element, size%pagination.max);
		}
	}
	else {
		remove_children_after(playlist_element, size);
	}
}

function select_playing_song() {
	var new_p = document.getElementById("plitem_" + playing.id);
	if(playing.show_node) {
		if(playing.show_node==new_p) // same node
			return;
		apply_border_style_to_children(playing.show_node, "none");
		playing.show_node.removeAttribute("playing");
		playing.show_node = null;
	}
	if(new_p) {
		apply_border_style_to_children(new_p, PLAYLIST_PLAYING_STYLE);
		new_p.setAttribute("playing", "i");
		playing.show_node = new_p;
	}
	
}

/* not really lazy, but it needs a name */
function get_lazy_info(need_info) {
	var ids = "";
	var start_id=-1, last_id=-1, id;
	for(id in need_info) {
		if(start_id<0) {
			start_id = last_id = id;
		}
		else if(last_id==id-1) {
			last_id = id;
		}
		else {
			ids = add_range(ids, start_id, (start_id==last_id?false:last_id));
			start_id = last_id = id;
		}
	}
	ids = add_range(ids, start_id, (start_id==last_id?false:last_id));

	if(ids.length>0) {
		need_info_arr = need_info;
		/* get missing info and don't get plchanges */
		send_command("playlist=info", get_lazy_info_cb, LANG.WAIT_UPDATING_PL, true, "ids=" + encodeURIComponent(ids), true);
	}
}

function get_lazy_info_cb(res) {

	var node,id,info;
	var ple = pl_entries;

	var need_info = need_info_arr;
	need_info_arr = null;
	if(need_info==null) {
		//debug("get lazy info cb called, but no need_info array available");
		/* FIXME: we have a potential race condition here 
		(may get several results, but only one of them is the one we need and or can use) */
		return;
	}
		
	if(!res) {
		show_status_bar(LANG.E_INVALID_RESULT);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
		return;
	}
	show_status_bar(LANG.WAIT_UPDATING_PL);
	
	/* todo: hide when more than 500 changes */
	var length = res.length;
	var plength = ple.length;
	for(var i=0; i<length; i++) {
		info = res[i];
		var res_id = info.Id;
		id = false;
		node = need_info[res_id];
		if(node) {
	   		info = res[i];
			for(var j=1; j<plength;j++) {
				var val = info[ple[j]];

				if(val) {
					if(ple[j]=="Time") 
						val = convert_minsec(val);
				}
				else { 
					if(ple[j]=="Title") {
						val = info["file"];
						val = val.substring(val.lastIndexOf(DIR_SEPARATOR)+1);
					}
					else {
						val = "";
					}
				}
				if(val.length>29) {
					node.childNodes[j].title = val;
					val = val.substring(0,27) + "..";
				}
				else if(node.childNodes[j].title) {
					node.childNodes[j].removeAttribute("title");
				}

				if(node.childNodes[j].hasChildNodes())
					node.childNodes[j].childNodes[0].nodeValue = val;
				else node.childNodes[j].appendChild(create_txt(val));
			}
		}
	}
	hide_status_bar();

	if(browser_is_konqueror()) {
		playlist_element.className = "pltemp";
		setTimeout(cclass_for_konqueror, 1);
	}
}

/* see bug #46 */
function cclass_for_konqueror() {
	playlist_element.className  = "";
}

function pl_selection_changed(sel) {
	if(sel!=last_pl_selected) {
		last_pl_selected = sel;
		document.getElementById('crop_items_button').title = sel?LANG.CROP_SELECTION:LANG.CLEAR_PLAYLIST;
	}
}

function plchanges_handler3(list, size) {
	if(!list||!list.length||list.length<=0)
		return;
	var cont = playlist_element;
	var df = create_fragment();  // temporary storage until we end
	var buf = create_fragment(); // for appending
	var i=0;
	var id;
	var plid;
	var pointer = null; // working point in playlist
	var cursor = null; // temporary point in playlist to make get from doc more effective
	var need_info = new Array();
	var count = 0;

	/* returns the id of the next item in the list */
	function _gn_id() {
		if(i+1<list.length) 
			return "plitem_" + list[i+1]["Id"];
		else return null;
	}
	/* checks if it is in cache */
	function _get_from_df(id) {
		var cf = df.childNodes;
		for (var j=0; j<cf.length; j++) {
			if(cf[j].id&&cf[j].id==id) {
				return df.removeChild(cf[j]);
			}
		}
		return null;
	}

	function _get_from_doc(id) {
		/* document.getElementById seems slow on large lists,
		   and there are a few assumptions we can make.. */
		if(!cursor)
			cursor = pointer.nextSibling;
		var start_point = cursor;
		var stop_at = false;
		while(cursor) {
			if(cursor.id == id) {
				var ret = cursor;
				cursor = cursor.nextSibling;
				return cont.removeChild(ret);
			}
			cursor = cursor.nextSibling;
			if(!cursor&&start_point) {
				if(start_point!=pointer.nextSibling) {
					stop_at = start_point;
					start_point = false;
					cursor = pointer.nextSibling;
				}
			}
			if(stop_at == cursor)
				break;
		}
		return null;
	}
	
	/* create a row */
	function _create_row(id) {
		/* wow, what a mess.... */
		n = create_lazy_pl_row(list[i], "plitem_" + id);
		need_info[id] = n;
		return n;
	}

	function _update_current_row(id) {
		pointer.id = "plitem_" + id;
		need_info[id] = pointer;
	}

	function _get_from_df_or_create(id) {
		var n = _get_from_df("plitem_" + id);
		if(!n) n = _create_row(id);
		return n;
	}

	var changes_length = list.length;
	var changes_start = parseInt(list[0]["cpos"]); 
	var changes_end = parseInt(list[list.length-1]['cpos']);
	var pagination_start = pagination.max * pagination.page;
	var pagination_end = pagination.max + pagination_start;
	var start_pos = 0;

	var pagination_switched_page = pagination.need_update;

	if(pagination.max==0) {
		start_pos = changes_start;
	}
	else if(changes_start<=pagination_start&&changes_end>=pagination_start) {
		i = pagination_start - changes_start;
	}
	else if(changes_start<pagination_end) {
		i = 0; 
		start_pos = changes_start - pagination_start;
	}
	else { // outside range
		return; // let's hope we can just return...
	}

	if(start_pos<cont.childNodes.length&&start_pos>=0) {
		pointer = cont.childNodes[start_pos];
	}
	else if(pointer==null) {
		pointer = _create_row(list[0]["Id"]);
		cont.appendChild(pointer);
	}

	if(start_pos==0) { // make sure there are no-one before us...
		if(pointer.previousSibling) {
			// todo obviously (if needed)
			debug("let me know if you ever see this message (NTS, plchanges_handler)");
		}
	}

	var append = false;
	var length = list.length;
	var n, nid; 
	var max = pagination.max || Number.MAX_VALUE;

	var _insert_before = insert_before;
	var _replace_node = replace_node;

	for(; i < length && start_pos++ < max; i++) {
		id = list[i]["Id"];
		if(append) {
			n = _get_from_df_or_create(id)
			buf.appendChild(n);
			continue;
		}
		plid = "plitem_" + id;

		// if it's a page switch everything will have to be updated
		if(pagination_switched_page) {
			_update_current_row(id); 
		}
		else if(pointer.id!=plid) {
			nid = _gn_id();
			n = _get_from_df(plid);
			/* if n is found in df it has been removed, but wants back in */
			if(n||nid==null||pointer.id==nid) {
				if(!n)
					n = _get_from_doc(plid);
				if(!n)
					n = _create_row(id);
				_insert_before(n, pointer);
				//debug("insert");
			}
			else {
				if(!n)
					n = _get_from_doc(plid);
				if(!n)
					n = _create_row(id);
				_replace_node(n,pointer);
				df.appendChild(pointer);
				//debug("replace");
			}
			pointer = n;
		}
		if(pointer.nextSibling)
			pointer = pointer.nextSibling;
		else 
			append = true;
	}

	if(buf.hasChildNodes())
		cont.appendChild(buf);
	if(need_info.length>0) 
		get_lazy_info(need_info);

	playlist_resize(size);
	update_node_positions2(cont);
	select_playing_song();

	// must be called last
	if(pagination_switched_page)
		pagination_post_pageswitch();
}

function update_node_positions2(container) {
	var node = container.firstChild;
	var found_diff = false;
	var i = pagination.max * pagination.page;
	while(node) {
		if(found_diff) {
			set_pl_position(node, i++);
			node = node.nextSibling;
		}
		else {
			if(get_plpos(node)==i) {
				node = node.nextSibling;
				i++;
			}
			else {
				found_diff = true;
			}
		}
	}
	return i;
}

function pagination_init() {

	pagination.following = null; // set to true/false in pagination_is_following

	/* these values shouldn't be hard-coded, but they are */
	pagination.left =   50;
	pagination.width = 680;

	pagination.scroll_id = false;
	pagination.scroll_left = false;

	pagination.follow_button = document.getElementById("pagination_follow_current");
	pagination.scroll_to_pos_after_switch = false;
	pagination_update_follow();
}

/* should only be called when the size of the list has been changed and pages no longer fit*/
function pagination_update_list(size) {
	if(pagination.max<=0) 
		return;
	var l = pagination.list;
	var npages = Math.ceil(size/pagination.max); // number of pages
	var cpages = pagination.pages; // current number of pages
	var cpage = pagination.page;

	while(npages>cpages) {
		var n = add_li(l, cpages+1);
		n.setAttribute("page", cpages++);
	}
	while(npages<cpages) {
		remove_node(l.lastChild);
		cpages--;
	}

	pagination.container.style.display = cpages>1?"block":"";

	pagination.pages = cpages;
	/* if we have switched page it needs update */
	if(cpage>=cpages) {
		cpage = cpages - 1;
	}
	pagination_update_current_page(cpage);
}

/* c: new page number */
function pagination_update_current_page(c) {
	if(pagination.max<=0) 
		return;
	var p = pagination.list.firstChild;
	
	if(pagination.cpage&&pagination.cpage.hasAttribute("cpage")) 
		pagination.cpage.removeAttribute("cpage");

	while(p) {
		if(p.getAttribute("page")==c) {
			scrollIntoView(p);
			p.setAttribute("cpage", "1");
			break;
		}
		p = p.nextSibling;
	}
	pagination.cpage = p;
	pagination.page = c;
}

function pagination_fetch_current_page() {
	playing.pl_version = -1; 
	pagination.need_update = true;
	reschedule_update_now();
}

function pagination_change_page(e, page) {
	if(e!=null&&e.target.hasAttribute("page")) {
		pagination.page = parseInt(e.target.getAttribute("page"));
	}
	else if(typeof(page)!='undefined') {
		pagination.page = page;
	}
	else {
		return;
	}
	
	pagination_update_current_page(pagination.page);
	pagination_fetch_current_page();
	unselect_all_nodes(playlist_element);
}

function pagination_scroll_view(e) {
	var x = e.pageX - pagination.left;
	var left = false;
	var abort = true;

	if(x>pagination.width-20) {
		abort = false;
	}
	else if(x<20&&pagination.list.scrollLeft>0) {
		abort = false;
		left = true;
	}

	if(!pagination.scroll_id&&!abort) {
		pagination_scroll_real(left);
	}
	else if(pagination.scroll_id&&abort) {
		pagination_scroll_stop();
	}

	stop_event(e);
}

function pagination_scroll_stop(e) {

	if(e && e.relatedTarget && (e.relatedTarget.id=="pagination_list"||e.relatedTarget.parentNode.id=="pagination_list"||typeof(e.relatedTarget.page)!='undefined'))
		return;
	
	if(pagination.scroll_id) {
		clearTimeout(pagination.scroll_id);
		pagination.scroll_id = false;
	}
}

function pagination_is_following() {
	if(pagination.following == null) {
		var f = setting_get("follow_playing");
		if(f&&parseInt(f))
			pagination.following = true;
		else pagination.following = false;
	}
	return pagination.following;
}

function pagination_set_following(follow) {
	setting_set("follow_playing", (follow?"1":"0"));
	pagination.following = follow;
	pagination_update_follow();
}

function pagination_toggle_following() {
	pagination_set_following(!pagination_is_following());
}

function pagination_update_follow() {
	if(!pagination.follow_button)
		return;
	if(pagination_is_following()) {
		pagination.follow_button.src = IMAGE.PAGINATION_FOLLOW;
		pagination.follow_button.title = LANG.PAGINATION_FOLLOW;
	}
	else {
		pagination.follow_button.src = IMAGE.PAGINATION_NOFOLLOW;
		pagination.follow_button.title =LANG.PAGINATION_NOFOLLOW;
	}
}

/** left or right */
function pagination_scroll_real(left) {
	var l = pagination.list;
	var adjust = 0;

	if(left) {
		if(l.scrollLeft>0)
			adjust = -10;
		else return;
	}
	else {
		adjust = 10;
	}
	try {
		l.scrollLeft += adjust;
		if(pagination.scroll_id)
			clearTimeout(pagination.scroll_id);
		pagination.scroll_id = setTimeout(pagination_scroll_real, 50, left);
	}catch(e) {debug(e.message);}
}

function pagination_post_pageswitch() {
	pagination.need_update = false;
	if(pagination.scroll_to_pos_after_switch!=false) {
		var n = playlist_scroll_to_pos_real(pagination.scroll_to_pos_after_switch);
		pagination.scroll_to_pos_after_switch = false; 
		if(n) {
			unselect_all_nodes(playlist_element);
			select_node(n);
		}
	}
	else if(pagination_is_following()&&playing.show_node) {
		playlist_scroll_to_pos_real(playing.pos);
	}
}


/* Returns false if have to switch page, true otherwise */
function playlist_scroll_to_playing() {
	return playlist_scroll_to_pos(playing.pos);
}

/* set select to true if all other nodes should be unselected and the right node selected */
function playlist_scroll_to_pos(pos, select) {
	if(pagination.max>0) {
		if(pos<0) pos = 0;
		var page = Math.floor(pos/pagination.max);
		if(page!=pagination.page) {
			pagination_change_page(null, page);
			if(select) 
				pagination.scroll_to_pos_after_switch = pos;
			return false; // selecting handled in pagination_post_pageswitch
		}
	}
	var n = playlist_scroll_to_pos_real(pos);
	if(select) {
		unselect_all_nodes(playlist_element);
		select_node(n);
	}
	return true;
}

function playlist_scroll_to_pos_real(pos) {
		if(pagination.max>0) {
			pos = pos%pagination.max
		}

		if(pos<0) {
		}
		else if(pos<playlist_element.childNodes.length) {
			var n = playlist_element.childNodes[pos];
			window.scrollTo(0,n.offsetTop -20);
			return n;
		}
		else if(playlist_element.childNodes.length) {//if something in playlist, nag about it
			debug("scroll to node request outside range");
		}
		return null;
}

function get_pl_selection_range(invert) {
	var c = playlist_element.childNodes;
	var sel = "";
	var pagination_add = invert&&pagination.max>0;

	/* if we have pagination and not on page one, we need to add everything up until this page first */
	if(pagination_add&&pagination.page>0) {
		sel = add_range(sel, 0, pagination.max * pagination.page -1);
	}

	var tmp_start = null;
	var tmp_stop = null;
	var length = c.length;
	for(var i=0; i<length; i++) {
		var selected = is_node_selected(c[i]);
		if(invert)
			selected = !selected;
		if(selected) {
			if(!tmp_start)
				tmp_start = c[i];
			else tmp_stop = c[i];
		}
		else if(tmp_start) {
			tmp_start = get_plpos(tmp_start);
			if(tmp_stop)
				tmp_stop = get_plpos(tmp_stop);
			sel = add_range(sel, tmp_start, tmp_stop);
			tmp_start = null;
			tmp_stop = null;
		}
	}
	if(tmp_start) {
		tmp_start = get_plpos(tmp_start);
		// todo: what if not proper last node
		if(tmp_stop)
			tmp_stop = get_plpos(tmp_stop);
		sel = add_range(sel, tmp_start, tmp_stop);
	}

	// add after this page
	if(pagination_add&&pagination.page+1<pagination.pages) {
		sel = add_range(sel, (pagination.page+1)*pagination.max, playing.pl_size-1); 
	}
	return sel;
}

function playlist_dblclick(elem, e) {
	var id = get_plid(elem);
	if(id>=0) {
		var cmd = "act=play&id=" + get_plid(elem);
		send_command(cmd);
	}
}

function playlist_add_button(e) {
	if(!playlist_add_popup) {
		playlist_add_popup = playlist_add_create_content(
					document.getElementById("playlist_add"));
	}
	stop_event(e);
	playlist_add_popup.show();
}

function playlist_save_button(e) {
	if(!playlist_save_popup) {
		playlist_save_popup = playlist_save_create_content(
					document.getElementById("playlist_save"));
	}
	stop_event(e);
	playlist_save_popup.show();
}

/* these functions should be merged somehow */
function playlist_add_create_content(padd) {
	var cats = new Array(LANG.BY_URL); //, "From file", "Text");
	var c = create_fragment();
	var ul = create_node("ul");
	ul.className = "playlist_popup";
	c.appendChild(ul);
	var li;
	for(var i=0; i < cats.length; i++) {
		li = add_li(ul, cats[i]);
		li.className = "playlist_popup";
	}
	li = add_li(ul, LANG.CLOSE);
	li.className = "playlist_popup";
	add_listener(li, "click", playlist_add_close);
	var d = create_node("div");
	c.appendChild(d);

	var tmp = create_node("input", "playlist_add_url");
	add_listener(tmp, "keydown", playlist_add_by_url);
	d.appendChild(tmp);

	tmp = create_node("span");
	d.appendChild(tmp);
	tmp.className = "playlist_popup";
	tmp.appendChild(create_txt(" Add"));
	add_listener(tmp, "click", playlist_add_by_url);

	var pop = new Popup(padd, c);
	pop.popup.style.marginLeft = "-140px";
	/* don't let the click get anywhere else either */
	add_listener(pop.popup, "click", stop_event);
	return pop;
}

function playlist_save_create_content(psave) {
	var c = create_fragment();
	var tmp = create_node("p");
	tmp.className = "nomargin";
	tmp.appendChild(create_txt(LANG.PL_SAVE_AS));
	var close = create_node("span");
	add_listener(close, "click", playlist_save_close);
	close.appendChild(create_txt(LANG.CLOSE));
	close.className = "playlist_popup";
	tmp.appendChild(close);
	tmp.appendChild(create_node("br"));
	c.appendChild(tmp);
	tmp = create_node("input", "playlist_save_box");
	add_listener(tmp, "keydown", playlist_save_listener);
	c.appendChild(tmp);
	tmp = create_node("span");
	tmp.appendChild(create_txt(" " + LANG.SAVE));
	tmp.className = "playlist_popup";
	add_listener(tmp, "click", playlist_save_listener);
	c.appendChild(tmp);

	var pop = new Popup(psave, c);
	pop.popup.style.marginLeft = "-140px";
	/* don't let the click get anywhere else either */
	add_listener(pop.popup, "click", stop_event);
	return pop;
}

function playlist_add_by_url(e) {
	stop_propagation(e);
	if((e.type=="keydown"&&e.keyCode==RETURN_KEY_CODE)||e.type=="click") {
		stop_event(e);
		var p = document.getElementById("playlist_add_url");
		var url = p.value;
		url = url.trim();
		if(url.length>6) {
			send_command("playlist_add_url=" + encodeURIComponent(url), 
					playlist_add_by_url_cb, LANG.WAIT_ADDING_PL);
			p.value = "";
			playlist_add_close();
		}
	}
}

function playlist_save_listener(e) {
	stop_propagation(e);
	if((e.type=="keydown"&&e.keyCode==RETURN_KEY_CODE)||e.type=="click") {
		stop_event(e);
		var p = document.getElementById("playlist_save_box");
		var name = p.value;
		name = name.trim();
		if(name.length>0) {
			send_command("playlist_save=" + encodeURIComponent(name), playlist_save_cb, LANG.PL_SAVING);
			p.value = "";
			playlist_save_popup.hide();
		}
	}
}

function playlist_add_by_url_cb(result) {
	if(result=="failed") {
		show_status_bar(LANG.E_FAILED_ADD_PL);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
	else {
	}
}

function playlist_save_cb(result) {
	if(result=="failed") {
		show_status_bar(LANG.E_FAILED_SAVE_PL);
		hide_status_bar(STATUS_DEFAULT_TIMEOUT);
	}
}

function playlist_add_close(e) {
	if(e)
		stop_event(e);
	if(playlist_add_popup)
		playlist_add_popup.hide();
}
function playlist_save_close(e) {
	if(e)
		stop_event(e);
	if(playlist_save_popup)
		playlist_save_popup.hide();
}
