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


/**
 * Why reinvent the wheel when you can make a hexadecagon instead -- Me
 * 
 * -- OR --
 * 
 * Reinventing the wheel to run myself over -- FOB
 */

var moveables = new Array(); 
var move_idx = -1;

var sliders = new Array();
var slider_idx = -1;

var overlay = new Array(); 
var overlay_adjust = 100; // px
var open_overlay_idx = -1;
var overlay_time = 5;
var overlay_hide_on_resize = true; // hide content on resize?

var xpath_queries;

function debug(str, force) {
	
	/* switch && false to true on release */
	if(typeof(force)=="undefined" && true) {
		return;
	}

	var d = document.getElementById('debugbox');
	if(d==null) {
	  d = create_node("div");
	  d.id = "debugbox"; 
	  document.body.appendChild(d);
	}

	var n = create_node("p", null, str);
	n.style.padding = "0px";
	n.style.margin = "0px";
	d.appendChild(n);
	try {
		scrollIntoView(d.lastChild);
	}
	catch (e) {}
}

function get_time() {
	var d = new Date();
	return d.getTime();
}

/* evaluates json response and returns object containing information */
function evaluate_json(txt) {
	var obj = new Object();

	/* limit context */
	obj = eval(txt, obj);
	return obj;
}

function browser_is_opera() {
	return window.opera?true:false;
}
function browser_is_konqueror() {
	if(navigator.vendor=="KDE")
		return true;
	return false;
}

// replaces rem with ins
function replace_node(ins, rem) {
	return rem.parentNode.replaceChild(ins, rem);
}
// removes this nodes children
function remove_children(what) {
	if(!what.hasChildNodes)
		return null;
	var buf = create_fragment();
	while(what.hasChildNodes()) 
		buf.appendChild(what.removeChild(what.firstChild));
	return buf;
}

function remove_node(what) {
	if(what)
		return what.parentNode.removeChild(what);
	return null;
}

function remove_children_after(container, after) {
	/* removing elements outside list */
	var c = container.childNodes;
	if(after>=c.length)
		return;
	var node = c[parseInt(after)];
	while(node) {
		var t = node.nextSibling;
	    	container.removeChild(node);
		node = t;
	}
}

/* insert 'node' first on 'at' */
function insert_first(node, at) {
	if(at.hasChildNodes())
		at.insertBefore(node, at.firstChild);
	else at.appendChild(node);
}

function insert_before(what, before) {
	before.parentNode.insertBefore(what, before);
}

function insert_after(what, after) {
	var p = after.parentNode;
	if(after.nextSibling)
		p.insertBefore(what, after.nextSibling);
	else p.appendChild(what);
}

function get_node_content(node) {

	if(node.hasChildNodes && node.hasChildNodes())
		node = node.childNodes[0];

	if(node.nodeValue) {
		return node.nodeValue;
	}
	else if(node.textContent) {
		return node.textContent;
	}
	else if(node.textValue) {
		return node.textValue;
	}
	else if(node.text) {
		return node.text;
	}
	else {
		return node;
	}
}

/*Returns content of first node with specified tag
 */
function get_tag(item, tag) {
	if(item.getElementsByTagName) {
		var tmp = item.getElementsByTagName(tag)[0];
		if(tmp!=null)
			return get_node_content(tmp);
	}
	return null;
}

function get_absolute_top(node) {
	var height = 0; 
	while(node.offsetParent != null)  {
		node = node.offsetParent;
		if(node.offsetTop)
			height += node.offsetTop;
	}
	return height;
}

// returns the absolute distance to start of page
function get_absolute_height(node) {
	return node.offsetTop + get_absolute_top(node); 
}

function get_absolute_left(node) {
	var left = node.offsetLeft; 
	while(node.offsetParent != null)  {
		node = node.offsetParent;
		if(node.offsetLeft) {
			left += node.offsetLeft;
		}
	}
	return left;
}

function EventListener(to, type, func) {
	this.to = to;
	this.type = type;
	this.func = func;
}

EventListener.prototype.register = function() {
	if( this.to.addEventListener ) {
		this.to.addEventListener(this.type, this.func, false);
	}
	else if(this.to.attachEvent) {
		this.to.attachEvent(this.type, this.func);
	}
	else debug("unable to add listener");
}

EventListener.prototype.unregister = function() {
	if(this.to.removeEventListener) {
		this.to.removeEventListener(this.type, this.func, false); 
	}
	else if(to.detachEvent) {
		this.to.detachEvent(this.type, this.func);
	}
	else debug("unable to detach event");
}

/**
 * Creates a new event listener, register it and return it
 */
function add_listener(to, event_s, func) {
	var el = new EventListener(to, event_s,func);
	el.register();
	return el;
}

function remove_listener(to, event_s, func) {
	if(to.removeEventListener) {
		to.removeEventListener(event_s, func, false); 
	}
	else if(to.detachEvent) {
		to.detachEvent(event_s, func);
	}
	else debug("unable to detach event");
}

/* Get's first real child (e.g. one with an id
 * from the element specified */
function get_first_real_child(from) {
	from = from.firstChild;
	while(from.nextSibling) {
		if(from.id)
			return from;
		from = from.nextSibling;
	}
	return null;
}

function get_last_real_child(from) {
	var children = from.childNodes;
	for(var i=children.length-1; i>=0; i++) {
		if(children[i].id) 
			return children[i];
	}
	return null;
}


/*
 * Operations for creating elements
 */ 
// creates node of type type with id id and content content
// returns the node created
function create_node(type, id, content) {
	var node = document.createElement(type);
	if(id&&id!=null) {
		node.id = id;
		node.name = id;
	}
	if(content&&content!=null) {
		if(document.createTextNode) 
		  node.appendChild(document.createTextNode(content));
		else
		  node.innerHTML = content;
	}
	return node;
}

function create_txt(txt) {
	return document.createTextNode(txt);
}

function create_fragment() {
	return document.createDocumentFragment();
}

// creates an empty table row with id and
// returns it
function create_tr(id) {
	return create_node("tr", id, null);
}

function create_param(name, value) {
	var p = create_node("param");
	p.name = name;
	p.value = value;
	return p;
}

// add a new TD with id id and content to a tr 
function add_td(tr, content, id) {
	var n = create_node("td", id, content);
	tr.appendChild(n);
	return n;
}

function add_li(list, content, id) {
	var n = create_node("li", id, content);
	list.appendChild(n);
	return n;
}

function add_txt(node, txt) {
	node.appendChild(create_txt(txt));
}

function apply_border_style_to_children(who, style) {
	var c = who.childNodes;
	for(var i=0; i<c.length; i++) {
		if(c[i].style) {
			c[i].style.borderBottom = style;
			c[i].style.borderTop = style;
		}
	}
}

function MoveObject(container, on_change, multi_move) {
	// container, moving, element that's moving, initial position, element that's simulating movement,
	// function to call if something has been moved and a variable to know if mouse key is down, 
	// if we should be able to move thigns around, optional doubleclick handler, optional selection change handler,
	// if we *think* something is selected or not
	this.container = container; 	// container for the elements
	this.on_change = on_change; 	// function to call if something has been moved
	this.moving = false;		// if we are moving something
	this.moving_elem = null;	// the elemnt that is moving
	this.moving_init_pos = null;	// initial position of moving element (pagex,pagey)
	this.moving_clone = null;	// the clone that is actually moving
	/* this is for interaction between mousemoving and mousedown */
	this.possible_move_node = null; // the node the user might try moving
	this.can_move = true; 		// if we are allowed to move anything at all
	this.double_click_cb = null; 	// function to call on doubleclick
	this.selection_change_cb = null;// function to call when the selection changes (with true or false 
	this.select_if_no_move = false; // if nothing has moved the node should be selected
	this.multi_move = multi_move;   // if allow for multiple move we won't do any of the moving and this function should
					// return text that should be placed on the "moving" object
	this.something_selected = false; // whether something currently is selected
}

/* visual effects 0> moving */

function setup_node_move(container, on_change, multi_move) {
	var id = moveables.length;
	add_listener(container, "mousedown", mouse_down_node);
	add_listener(container, "mouseup", mouse_up_node);
	add_listener(container, "mousemove", move_node);
	container.setAttribute("move_id", id);
	if(!multi_move)
		multi_move = false;

	moveables[id] = new MoveObject(container, on_change, multi_move);
	return id;
}

function add_move_doubleclick(id, func) {
	moveables[id].double_click_cb = func;
}

function set_moveable(id, moveable) {
	moveables[id].can_move = moveable;
}

function set_selection_change_handler(id, func) {
	moveables[id].selection_change_cb = func;
}

/* NodeSelection _ find out if a node is selected */
function is_node_selected(node) {
	return node.hasAttribute&&node.hasAttribute("selected");
}

/* NodeSelection - set whether a node is selectable or not */
function set_node_selectable(node, val) {
	if(val&&node.hasAttribute&&node.hasAttribute("noselect")) {
		node.removeAttribute("noselect");
	}
	else node.setAttribute("noselect", "true");
}

/* NodeSelection - select node */
function select_node(node) {
	if(node.hasAttribute("noselect"))
		return false;
	if(node.hasAttribute("selected"))
		return true;

	node.setAttribute("selected", "1");
	return true;
}

function unselect_node(node) {
	if(node.hasAttribute("selected")) {
		node.removeAttribute("selected");
	}
}

function unselect_all_nodes(container) {
	if(xpath_ok()) {
		var nodes = xpath_query(container, ".//.[@selected]");
		var n; 
		var elems = new Array();
		while((n = nodes.iterateNext())) {
			elems[elems.length] = n;
		}
		for(var i=0; i<elems.length; i++) 
			unselect_node(elems[i]);
	}
	else {
		var node = container.childNodes
		if(!node)
			return;
		for(var i=0; i < node.length; i++)  {
			if(node[i].hasAttribute("selected"))
				unselect_node(node[i]);
		}
	}
}

/* will check if anything is selected */
function selection_anything_selected(container) {
	if(xpath_ok()) {
		var x = xpath_query(container, ".//.[@selected]", XPathResult.ANY_UNORDERED_NODE_TYPE);
		return x.singleNodeValue?true:false;
	}
	else {
		var nodes = container.childNodes
		for(var i=0; i < nodes.length; i++)  {
			if(node.hasAttribute("selected"))
				return true;
		}
		return false;
	}
	
}

/* Will find the first selected node and set attribute needle
 *  in needle if it is found before it returns
 */
function find_first_selected_node(container, needle) {
	if(xpath_ok()&&!needle) {
		var x = xpath_query(container, ".//.[@selected]", XPathResult.FIRST_ORDERED_NODE_TYPE);
		return x.singleNodeValue;
	}
	else {
		var nodes = container.childNodes
		var length = nodes.length;
		for(var i=0; i < length; i++)  {
			var node = nodes[i];
			if(needle&&needle==node)
				needle.setAttribute("needle", "found");
			if(node.hasAttribute&&node.hasAttribute("selected"))
				return node;
		}
		return null;
	}
}

/* selects all nodes between the two */
function select_range(from, to) {
	var node = from; 
	select_node(from);
	while(node != null && node!=to) {
		node = node.nextSibling;
		select_node(node);
	} 
}

/* will return an array of selected elements attribute in container */
function get_attribute_from_selected_elems(container, attribute) {
	var c = container.childNodes;
	var ret = new Array();
	var l = c.length;
	for(var i=0; i<l; i++) {
		if(is_node_selected(c[i]) && c[i].hasAttribute(attribute)) {
			ret[ret.length] = c[i].getAttribute(attribute);
		}
	}
	return ret;
}

function mouse_down_node(e) {
	if(e.button!=0&&e.button!=1)
		return;
	
	move_idx = get_target_id(e.target);

	if(move_idx<0) 
		return;
	stop_event(e);

	var m = moveables[move_idx];
	var elem = find_target_node(e.target);
	if(elem==null)
		return;
	/* move_node will toggle this if true and call start_node_move to initiate moving*/
	// do not move if it specified not to move
	if(m.can_move) {
		m.moving_init_pos = new Array(e.pageX, e.pageY);
		m.possible_move_node = elem;
	}
	var something_selected = true;
	if(e.detail>1) { // we were just here, don't do the other stuff again..
		/* double click */
		if(m.double_click_cb&&e.detail==2) 
			m.double_click_cb(elem, e);
	}
	else if(e.ctrlKey||e.metaKey) {
		if(is_node_selected(elem)) {
			unselect_node(elem);
			if(m.selection_change_cb&&m.something_selected)
				something_selected = selection_anything_selected(m.container);
		}
		else {
			select_node(elem);
		}
	}
	else if (e.shiftKey) {
		var sel_node = null; 
		
		sel_node = find_first_selected_node(m.container, elem);
		if(sel_node==null) {
			select_node(elem);
		}
		else {
			if(elem.hasAttribute("needle")) {
				select_range(elem, sel_node);
				elem.removeAttribute("needle");
			}
			else {
				select_range(sel_node, elem);
			}
		}
	}
	else {
		if(!is_node_selected(elem)) {
			unselect_all_nodes(m.container);
			select_node(elem);
		}
		else {
			m.select_if_no_move = true;
		}
	}
	/* something selected */
	if(m.selection_change_cb) {
		m.selection_change_cb(something_selected);
		m.something_selected = something_selected;
	}
}

function mouse_up_node(e) {
	if(move_idx<0)
		return;
	var m = moveables[move_idx];
	if(m.moving) {
		stop_node_move(e);
	}
	else if(m.select_if_no_move) {
		var elem = find_target_node(e.target);
		unselect_all_nodes(m.container);
		select_node(elem);
	}
	m.select_if_no_move = false;
	m.possible_move_node = null;
	// safari workaround
	m.container.className = m.container.className;
}

/* todo; rework to use elem instead of event */
function start_node_move(e, elem) {
	stop_event(e);

	move_idx = get_target_id(e.target);

	if(move_idx<0)
		return;
	if(!moveables[move_idx].can_move)
		return;

	var m = moveables[move_idx];
	var move = find_target_node(e.target);
	var container = m.container;
	if(move!=null) {
		m.moving = true; // moving 
		m.moving_elem = find_target_node(m.possible_move_node); // what
		move = m.moving_elem;
		m.possible_move_node = null;
		var txt = "Moving";
		if(m.multi_move) 
			txt = m.multi_move();
		else if(move.childNodes[1])
			txt = move.childNodes[1].textContent; 
		else txt = move.childNodes[0].textConten;

		m.moving_clone = detach_node(move, txt);
		set_node_offset(e, m.moving_clone);

		add_listener(document.body, "mouseup", stop_node_move);
		add_listener(document.body, "mousemove", move_node);

		container.style.cursor = "move";
	}
	else move_idx = -1; 
}


/* basically the reverse of start */
function stop_node_move(e) {
	if(move_idx<0||!moveables[move_idx].moving)
		return;

	var m = moveables[move_idx];
	m.moving = false;
	var move = m.moving_elem;
	var container = m.container;
	var target = find_target_node(e.target);

	if(m.multi_move) {
		/* don't move it if we are moving on top of selection */
		if(target&&!is_node_selected(target)) {
			m.on_change(null,target);
		}
		reattach_node(move, null, m.moving_clone, 4); // remove moving node
	}
	else if(target!=null&&target!=move) {
		/* if first in list or above the one beeing moved, move it up */
		var to = null;
		if(target==get_first_real_child(container)||target.nextSibling==move) {
			to = target;
			reattach_node(move, target, m.moving_clone, 1);
		}
		else if(target.nextSibling!=null) {
			/* normally default action */
			var attach_at;
			to = target;
			if(is_moving_up(container, move, target)) {
				attach_at = target;
			}
			else {
				attach_at = target.nextSibling;
			}
			reattach_node(move, attach_at, m.moving_clone, 1);
		}
		else {
			/* basically this means we don't know any better */
			/* should not happen unless target actually is last in list */
			/*to = get_last_real_child(container);
			reattach_node(move, container, m[4], 2);*/
			to = target;
			reattach_node(move, container, m.moving_clone, 2);
		}

		// say we changed
		m.on_change(null, to);
	}
	else {
		reattach_node(move, null, m.moving_clone, 4); // don't move it
	}

	container.style.cursor = "default";

	remove_listener(document.body, "mouseup", stop_node_move);
	remove_listener(document.body, "mousemove", move_node); 

	m.moving_elem = null;
	m.moving_init_pos = null;
	m.moving_clone = null;
	move_idx = -1; 
}

function move_node(e) {
	var id = window.move_idx || -1;
	var o = 4; // required offset
	if(id&&id>=0) { 
		if(moveables[id].possible_move_node!=null) {
			var p = moveables[id].moving_init_pos;
			if(Math.abs(p[0]-e.pageX)>=o||Math.abs(p[1]-e.pageY)>o)
				start_node_move(e);
		}
		if(!moveables[id].moving)
			return;

		stop_event(e);
		set_node_offset(e, moveables[id].moving_clone);
	}
}

function is_moving_up(container, move, target) {
	var c = container.childNodes;
	for(var i=0; i<c.length; i++) {
		if(move==c[i])
			return false;
		if(target==c[i])
			return true;
	}
	debug("Wops, not moving up or down!")
	return false;
}


function detach_node(d, txt) {
	var rep = create_node("div");
	
	rep.style.width = d.offsetWidth/4 + "px";
	rep.className = "moving_box";

	txt = create_node("p", null, txt);
	txt.className = "nomargin";
	rep.appendChild(txt);

	d.setAttribute("old_class", d.className);
	d.className = "moving";

	document.body.appendChild(rep);
	return rep;
}
 /* reattach node at specified position (at) with action
 *  1 => insertBefore
 *  2 => appendChild
 *  3 => replaceChild
 *  4 => dont move
 */
function reattach_node(node, at, clone, action) {
	node.style.width =""; 
	node.style.top = "";
	node.style.position = "";
	node.className = node.getAttribute("old_class");
	if(action==1) {
		remove_node(node);
		at.parentNode.insertBefore(node, at);
	}
	else if(action == 2) {
		remove_node(node);
		at.appendChild(node); 
	}
	else if(action == 3) {
		remove_node(node);
		replace_node(node, at);
	}
	else if(action==4)  { 
	}
	else {
		debug("invalid action in reattach_node");
	}
	remove_node(clone);
}

function get_target_id(target) {
	var t = find_target_node(target);
	if(t!=null&&t.parentNode&&t.parentNode!=null) 
		return t.parentNode.getAttribute("move_id");
	else return -1;
}

function find_target_node(target) {
	while(target != null && target.parentNode&&target.parentNode != null) {
	  for(var i=0; i<moveables.length; i++) 
	    if(moveables[i].container==target.parentNode)
	      return target;
	  target = target.parentNode;
	}
	return null;
}

/* set's this node to the position in event */
function set_node_offset(ev, node) {
	/* relative positioning:*/
	var ot = 0; 
	var ol = 0; 
	if(node.hasAttribute("ot")&&node.hasAttribute("ol")) {
		ot = node.getAttribute("ot");
		ol = node.getAttribute("ol");
	}
	else {
		ot = node.offsetTop; 
		ol = node.offsetLeft - 10;
		node.setAttribute("ot", ot);
		node.setAttribute("ol", ol); 
	}
	var h = ev.pageY - ot; 
	var l = ev.pageX - ol;
	/* absolute: 
	var h = ev.pageY - (node.offsetHeight/2);
	var l = ev.pageX + 10;*/ 
	node.style.top = h + "px";
	node.style.left = l + "px";
	return h;
}

function Slider(sid, main_slider, change, text_area) {
	this.main_slider = main_slider;
	this.change_call = change;
	this.text_area = text_area;
	this.value = 0;
	this.moving_pos = 0;
	this.user_moving = false;
	this.timer = null;
	this.timer_last_pos = null;
	this.sid = sid;
}

Slider.prototype.setup_timer = function() {
	if(this.timer!=null)
		clearTimeout(this.timer);
	this.timer_last_pos = this.moving_pos;
	this.timer = setTimeout(this.timer_cb, 250);
}
Slider.prototype.timer_cb = function() {
 	// user has managed to hold mousepoitner stil
	if(this.timer_last_pos==this.moving_pos) {
		// omg...
		var idx = window.slider_idx;
		window.slider_send_callback(idx);
	}
	else if(this.user_moving) {
		this.setup_timer();
	}
}

/* should be a div */
function setup_slider(slider, callback, txt) {
	var sid = sliders.length;
	if(txt!=null) {
		txt = create_node("p", "slider_txt_" + sid, txt);
		txt.className = "slider_txt";
		slider.appendChild(txt);
	}
	var s = create_node("div");
	s.className = "slider_main";
	s.id = "slider_main" + sid;
	slider.appendChild(s);
	var pointer = create_node("div", " ");
	pointer.className = "slider_pointer";
	pointer.id = "slider_pointer" + sid;
	s.setAttribute("sliderid", sid);
	add_listener(s, "mousedown", mouse_down_slider);
	pointer.style.height = (s.offsetHeight) + "px";
	s.appendChild(pointer);
	sliders[sid] = new Slider(sid, slider, callback, txt);
	set_slider_pos(sid, 0);
	return sid;
}

function get_slider_txt(sid) {
	return sliders[sid].text_area;
}

function slider_send_callback(sid) {
	if(sliders[sid].change_call)
		sliders[sid].change_call(sliders[sid].value);
}

function set_slider_pos(sid, pos, force) {
	var pointer = document.getElementById("slider_pointer" + sid);
	var s = document.getElementById("slider_main" + sid);
	if(!force)
		force = false;
	if(pointer==null||s==null) {
		debug("no slider pointer||main");
		return;
	}

	if(sliders[sid].user_moving&&!force)
		return;

	if(pos>100)
		pos=100;
	if(pos<0)
		pos=0;

	if(pos==sliders[sid].value) {
		return;
	}

	sliders[sid].value = pos;

	var dist = (s.offsetWidth * pos) /100
	if(isNaN(dist)||dist=="NaN")
		dist = 0;
	
	pointer.style.left =  dist+ "px";
}

function get_slider_pos(sid) {
	return sliders[sid].value;
}

function mouse_down_slider(e) {
	var targ = e.target;
	/* TODO: rewrite test */
	if(!targ||!targ.hasAttribute||!targ.hasAttribute("sliderid")) {
		if(targ) 
			targ = targ.parentNode;
		// *umpf*
		if(!targ||!targ.hasAttribute||!targ.hasAttribute("sliderid")) 
			return;
	}
	
	slider_idx = targ.getAttribute("sliderid");

	add_listener(document.body, "mousemove", mouse_move_slider);
	add_listener(document.body, "mouseup", mouse_up_slider);

	sliders[slider_idx].user_moving = true;
	sliders[slider_idx].main_slider.setAttribute("slider_moving", "yeahitis");

	mouse_move_slider(e); // lazy
	//e.stopPropagation();

}

function mouse_move_slider(e) {
	if(slider_idx<0) {
		debug("mouse_move_slider should not be called now");
		mouse_up_slider(e);
		return;
	}
	stop_event(e);
	var left = slider_get_left(e, slider_idx)
	set_slider_pos(slider_idx, left, true);
	sliders[slider_idx].moving_pos = left;
	sliders[slider_idx].setup_timer(sliders[slider_idx].change_call);
}

function mouse_up_slider(e) {
	if(slider_idx<0)
		return;

	// prolly not necessary though
	clearTimeout(sliders[slider_idx].timer);
	sliders[slider_idx].timer = null;

	remove_listener(document.body, "mousemove", mouse_move_slider);
	remove_listener(document.body, "mouseup", mouse_up_slider);
	sliders[slider_idx].user_moving = false;
	sliders[slider_idx].main_slider.removeAttribute("slider_moving");
	slider_send_callback(slider_idx);
	slider_idx = -1;
}

function slider_get_left(e, sid) {
	var x = e.pageX - get_absolute_left(sliders[sid].main_slider);
	x = (x*100)/sliders[sid].main_slider.offsetWidth;
	x-=3;
	if(x<0)
		x = 0;
	return x;
}

function OverlayObject(back, sizes, open_callback, close_callback) {
	this.back = back; // element to put overlay over
	this.sizes = sizes; // minimum sizes [top, left, min-height, min-width ]
	this.open_callback = open_callback;
	this.close_callback = close_callback;
	this.overlay = null; // the overlay element
	this.write = null; // write area
}

/* overlay */
function setup_overlay(back, sizes, open_callback, close_callback) {
	var oid = overlay.length;
	overlay[oid] = new OverlayObject(back, sizes, open_callback, close_callback); 
	var t = create_node("div", "overlay_" + oid);
	overlay[oid].overlay = t;
	t.className = "overlay";
	t.style.height = overlay_adjust + "px";
	var img = create_node("img", "overlay_close_" + oid);
	img.src = IMAGE.CLOSE;
	img.setAttribute("oid", oid);
	img.className = "close fakelink";
	img.title = "Close [Ctrl+Shift+X]";
	add_listener(img, "click", close_overlay_cb);

	t.appendChild(img);

	document.body.appendChild(t);

	return oid;
}

function get_overlay_write_area(oid) {
	if(overlay[oid].write==null) {
		overlay[oid].write = create_node("div", "overlay_write_area_" + oid);
		overlay[oid].overlay.appendChild(overlay[oid].write);

	}
	return overlay[oid].write;
}

function open_overlay(oid) {
	var sizes = overlay[oid].sizes;
	var o = overlay[oid].back;
	var top = get_absolute_top(o);
	if(top<sizes[0])
		top = sizes[0];
	var left = get_absolute_left(o);
	if(left<sizes[1])
		left = sizes[1];
	var height = o.offsetHeight;
	if(height<sizes[2])
		height = sizes[2];
	var width = o.offsetWidth;
	if(width<sizes[3])
		width = sizes[3];

	if(overlay_hide_on_resize&&overlay[oid].write)
		overlay[oid].write.style.display = "none";
	
	var op = overlay[oid].overlay;
	open_overlay_idx = oid;
	op.style.left = left + "px";
	op.style.top = top + "px";
	op.style.width = overlay_adjust + "px";
	op.style.height = overlay_adjust + "px";

	op.style.display = "block";
	var hx = 1, wx =1;
	if(width>height) 
		wx = width/height;
	else 
		hx = height/width;

	overlay[oid].close_key = keyboard_register_listener(close_overlay_cb, "x", KEYBOARD_CTRL_KEY|KEYBOARD_SHIFT_KEY, true);

	setTimeout(adjust_overlay_size, overlay_time, oid, new Array(overlay_adjust, overlay_adjust), new Array(height, width, hx, wx));
}

function open_overlay_fixed(oid) {
	// TODO: find another way to determine these heights
	var sizes = new Array(106, 56, 800, 500); 

	var height = sizes[3];
	var width = sizes[2];
	var op = overlay[oid].overlay;
	open_overlay_idx = oid;
	if(overlay_hide_on_resize&&overlay[oid].write)
		overlay[oid].write.style.display = "none";
	
	op.style.position = "fixed";

	op.style.left = sizes[1] + "px";
	op.style.top = sizes[0] + "px";
	op.style.width = overlay_adjust + "px";
	op.style.height = overlay_adjust + "px";

	op.style.display = "block";

	/* adjust to browser window */
	var x_o = 30;
	var w_h = window.innerHeight; 
	var w_w = window.innerWidth; 

	/* ignore it if unreasonable values.. */
	if(w_h&&w_w&&w_h>100&&w_w>100) {
		if(height+sizes[0]+x_o>w_h)
			height = w_h - sizes[0] - x_o;
		if(width+sizes[1]+x_o>w_w)
			width = w_w - sizes[1] - x_o;
	}

	var hx = 1, wx =1;
	if(width>height) 
		wx = width/height;
	else 
		hx = height/width;

	overlay[oid].close_key = keyboard_register_listener(close_overlay_cb, "x", KEYBOARD_CTRL_KEY|KEYBOARD_SHIFT_KEY, true);

	setTimeout(adjust_overlay_size, overlay_time, oid, new Array(overlay_adjust, overlay_adjust), new Array(height, width, hx, wx));
}

function adjust_overlay_size(oid, current, dest) {
	var h = current[0] = current[0] + (dest[2]*overlay_adjust);
	var w = current[1] = current[1] + (dest[3]*overlay_adjust);
	var adjusted = false;

	if(h<dest[0]) {
		adjusted = true;
	}
	else { 
		h = dest[0];
	}
	if(w<dest[1]) {
		adjusted = true
	}
	else {
		w = dest[1];
	}
	h = parseInt(h);
	w = parseInt(w);
	overlay[oid].overlay.style.height = h + "px";
	overlay[oid].overlay.style.width = w + "px";
	//debug("h: " + h + ", w: " + w);

	if(adjusted) {
		//debug("setting timeout");
		setTimeout(adjust_overlay_size, overlay_time, oid, current, dest);
	}
	else {
		var height = (overlay[oid].overlay.offsetHeight-20);
		if(overlay[oid].write) {
			if(overlay_hide_on_resize) {
				overlay[oid].write.style.display = "block"; // kiss
			}
		}
		if(overlay[oid].open_callback) 
			overlay[oid].open_callback(height);
	}
}

function close_overlay(oid) {
	var o = overlay[oid].overlay;
	open_overlay_idx = -1;
	o.style.display = "none";
	if(overlay[oid].close_key) 
		overlay[oid].close_key = keyboard_remove_listener(overlay[oid].close_key);
	if(overlay[oid].close_callback) 
		overlay[oid].close_callback();
}
function close_overlay_cb(e) {
	var t = e.target;
	if(t&&t.hasAttribute&&t.hasAttribute("oid")) {
		close_overlay(t.getAttribute("oid"));
		stop_event(e);
	}
	else if(open_overlay_idx>=0) {
		close_overlay(open_overlay_idx);
		stop_event(e);
	}
	
}

function stop_propagation(e) {
	if(e.stopPropagation)
		e.stopPropagation();
}

function stop_event(e) {
	if(e) {
		if(e.preventDefault) 
			e.preventDefault();
		if(e.stopPropagation)
			e.stopPropagation();
		if(e.returnValue) 
			e.returnValue = false;
	}
}

/* range selection (to put ranges in a "list" */
/* txt: excisting range:
 * from: from what number
 * to: optional to argument
 */
function add_range(txt, from, to) {
	if(txt.length>0)
		txt+=";";
	txt+=from;
	if(to)
		txt+="-" + to;
	return txt;
}

function scrollIntoView(elem, top) {
	if(!top)
		top = false;
	/* seriously though, if you don't support it, don't claim you do!*/
	//if(elem.scrollIntoView) {
	if(navigator.product&&navigator.product=="Gecko") {
		elem.scrollIntoView(top);
	}
	else if(elem.parentNode) {
		// TODO: top
		try { 
			elem.parentNode.scrollTop=elem.offsetTop - (top?elem.offsetHeight*2:elem.parentNode.offsetHeight);
		} catch (e) { }
	}
}

function setSelectionRange(input, selectionStart, selectionEnd) {
  if (input.setSelectionRange) {
    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);
  }
  else if (input.createTextRange) {
    var range = input.createTextRange();
    range.collapse(true);
    range.moveEnd('character', selectionEnd);
    range.moveStart('character', selectionStart);
    range.select();
    range.detach();
  }
}
function setCaretToEnd (input) {
  setSelectionRange(input, input.value.length, input.value.length);
}
function setCaretToBegin (input) {
  setSelectionRange(input, 0, 0);
}
function setCaretToPos (input, pos) {
  setSelectionRange(input, pos, pos);
}



String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,'');
}

function add_string_with_br(to, str) {
	str = str.replace("\r", "").split('\n');
	for(var i=0; i<str.length; i++) {
		if(str[i].length>0)
			to.appendChild(create_txt(str[i]));
		to.appendChild(create_node("br"));
	}
}

function adjust_opacity_timer(node, current_opacity, dest_opacity, last_time) {
	var now = get_time(); 
	var time = now;
	if(last_time) 
		time -= last_time;
	else time = 0;
	
	time = 100-time;
	//debug("time: " + time);
	if(time<0) {
		time = 0;
		current_opacity+=0.2;
	}
	else {
		current_opacity+=0.1;
	}

	if(current_opacity<dest_opacity) {
		node.style.opacity = current_opacity ;
		setTimeout(adjust_opacity_timer, time, node, current_opacity, dest_opacity, now);
	}
	else {
		node.style.opacity = dest_opacity ;
	}
}

/* what to blink, what color and count, two first arguments are required */
function blink_node(what, color, count) {
	if(typeof(count)=='undefined') {
		count = 3;
	}
	if(count%2==1)
		what.style.backgroundColor = color;
	else 
		what.style.backgroundColor = "";
	if(count>0) {
		setTimeout(blink_node, 350, what, color, --count);
	}
}

/* popup */
/* if content is null, we'll use tabs */
function Popup(point, content) {
	this.point = point;
	this.content = content;
	this.popup = create_node("div");
	if(content)
		this.popup.appendChild(content);
	this.popup.className = "popup";
	this.point.appendChild(this.popup);
}

Popup.prototype.show = function() {
	this.popup.style.display = "block";
}
Popup.prototype.hide = function() {
	this.popup.style.display = "";
}
Popup.prototype.destroy = function() {
	remove_node(this.popup);
	this.popup = null;
	this.point = null;
	this.content = null;
}

/* xpath */
function xpath_init() {
	xpath_queries = new Hashtable();
}

/* checks if xpath is available */
function xpath_ok() {
	return document.evaluate?true:false;
}

// remember to check with xpath_ok first when using this function
function xpath_query(container, expression, resulttype, nocache_query) {
	if(!resulttype)
		resulttype = XPathResult.ANY_TYPE;
	if(nocache_query) {
		return document.evaluate(expression, container, null, resulttype, null);
	}
	else {
		var e = xpath_queries.get(expression);
		if(!e) {
			e = document.createExpression(expression, null);
			xpath_queries.put(expression, e);
		}
		return e.evaluate(container, resulttype, null);	
	}
}

function opera_quirk_set_display_none(element, cleanup) {
	if(cleanup) {
		element.style.display = "none";
		element.style.visibility = "";
	}
	else {
		setTimeout(opera_quirk_set_display_none, 10, element, true);
		element.style.visibility = "hidden";
	}
}

function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}
function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}
function eraseCookie(name) {
	createCookie(name,"",-1);
}

// This function is in the public domain. Feel free to link back to http://jan.moesen.nu/
function sprintf() {
	if (!arguments || arguments.length < 1 || !RegExp) {
		return "";
	}
	var str = arguments[0];
	var re = /([^%]*)%('.|0|\x20)?(-)?(\d+)?(\.\d+)?(%|b|c|d|u|f|o|s|x|X)(.*)/;
	var a = b = [], numSubstitutions = 0, numMatches = 0;
	while ((a = re.exec(str))) {
		var leftpart = a[1], pPad = a[2], pJustify = a[3], pMinLength = a[4];
		var pPrecision = a[5], pType = a[6], rightPart = a[7];
		
		//alert(a + '\n' + [a[0], leftpart, pPad, pJustify, pMinLength, pPrecision);

		numMatches++;
		if (pType == '%') {
			subst = '%';
		}
		else {
			numSubstitutions++;
			if (numSubstitutions >= arguments.length) {
				alert('Error! Not enough function arguments (' + (arguments.length - 1) + ', excluding the string)\nfor the number of substitution parameters in string (' + numSubstitutions + ' so far).');
			}
			var param = arguments[numSubstitutions];
			var pad = '';
			       if (pPad && pPad.substr(0,1) == "'") pad = leftpart.substr(1,1);
			  else if (pPad) pad = pPad;
			var justifyRight = true;
			       if (pJustify && pJustify === "-") justifyRight = false;
			var minLength = -1;
			       if (pMinLength) minLength = parseInt(pMinLength);
			var precision = -1;
			       if (pPrecision && pType == 'f') precision = parseInt(pPrecision.substring(1));
			var subst = param;
			       if (pType == 'b') subst = parseInt(param).toString(2);
			  else if (pType == 'c') subst = String.fromCharCode(parseInt(param));
			  else if (pType == 'd') subst = parseInt(param) ? parseInt(param) : 0;
			  else if (pType == 'u') subst = Math.abs(param);
			  else if (pType == 'f') subst = (precision > -1) ? Math.round(parseFloat(param) * Math.pow(10, precision)) / Math.pow(10, precision): parseFloat(param);
			  else if (pType == 'o') subst = parseInt(param).toString(8);
			  else if (pType == 's') subst = param;
			  else if (pType == 'x') subst = ('' + parseInt(param).toString(16)).toLowerCase();
			  else if (pType == 'X') subst = ('' + parseInt(param).toString(16)).toUpperCase();
		}
		str = leftpart + subst + rightPart;
	}
	return str;
}

/* settings */

function setting_set(name, value) {
	var s = readCookie("pf_conf");
	
	var ns = "";
	var set = false;
	if(s) {
		s = s.split(":");
		for(var i=0; i< s.length; i++) {
			var tmp = s[i].split("-");
			if(!tmp[0].length)
				continue;

			if(tmp[0]==name) {
				ns+=name + "-" + value;
				set = true;
			}
			else {
				ns+=s[i];
			}
			ns+=":";
		}
	}
	if(!set) 
		ns+=name + "-" +value + ":";
	
	createCookie("pf_conf", ns, 200);

	return true;
}

function setting_get(name) {
	var val = readCookie("pf_conf");

	if(!val||!val.length)
		return null;

	val = val.split(":");
	for(var i=0; i < val.length; i++) {
		var t = val[i].split("-");
		if(t[0]==name)
			return t[1];
	}
	return null;
}
