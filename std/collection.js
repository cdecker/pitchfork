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

/* HashMap implementation, guess it's more of a key-lookup-linked-list though */

function HashNode(key, val) {
	this.key = key;
	this.value = val;
	this.next = null;
}
function HashMap() {
	this.header = null;
}

/* 
 * Usage: var it = hashmap.iterator();
 * var tmp;
 * while(tmp = it.next()); 
 */
function HashMapIterator(first) {
	this.c = first;
}

HashMapIterator.prototype.next = function() {
	var ret = this.c;
	if(this.c != null) {
		ret = ret.value;
		this.c = this.c.next;
	}
	return ret;
}

/* get an entry from the list */
HashMap.prototype.get = function(key) {
	var n = this.header;
	while(n!=null) {
		if(n.key==key) 
			return n.value;
		n = n.next;
	}
	return null;
}

/* Removes an entry from the list and returns it */
HashMap.prototype.remove = function(key) {
	if(this.header==null) 
		debug("wops, header null");
	if(key==this.header.key) {
		var tmp = this.header;
		this.header = this.header.next;
		return tmp.value;
	}
	else {
		var n = this.header;
		while(n.next != null) {
			if(n.next.key == key) {
				var ret = n.next;
				n.next = n.next.next;
				return ret.value;
			}
			n = n.next;
		}
	}
	return null;
}

/* put a new entry in the list */
HashMap.prototype.put = function(key, value) {
	var node = new HashNode(key,value);
	var next = this.header;
	if(next==null) {
		this.header = node;
	}
	else {
		while(next.next!=null)
			next = next.next;
		next.next = node;
	}
}

HashMap.prototype.insert = function(key, value) {
	var node = new HashNode(key,value);
	node.next = this.header;
	this.header = node;
}

HashMap.prototype.iterator = function() {
	return new HashMapIterator(this.header);
}


/* A proper hashtable implementation 
*/
function Hashtable() {
	this.data = new Object();
	this._size = 0;
}

/* clears the hashtable */
Hashtable.prototype.clear = function() {
	for(var key in this.data)
		delete this.data[key];
	this._size = 0;
}

/* tests whether the specified value is in this hashtable 
  returns true if it does, falseotherwise */
Hashtable.prototype.contains = function(obj) {
	if(obj==null) return false;

	for(var opt in this.data) {
		if(obj == this.data[opt])
			return true;
	}
	return false;
}

/* Tests whether the specified key is in this hashtable  
   returns true if it does, false otherwise*/
Hashtable.prototype.containsKey = function(key) {
	return typeof this.data[key] != "undefined" && this.data[key] != null;
}

Hashtable.prototype.put = function (key, value) {
	this.data[key] = value;
	this._size++;
}

/** puts all the in to this hashtable */
Hashtable.prototype.putAll = function(map) {
	for(var key in map) {
		this.data[key] = map[key];
		this._size++;
	}
}

Hashtable.prototype.get = function (key) {
	return this.data[key];
}

Hashtable.prototype.isEmpty = function() {
	return this._size == 0;
}
/**
 remove the object and key from this hashtable,
 returns the object if it's there, null otherwise
 */
Hashtable.prototype.remove = function(key) {
	if(!this.containsKey(key))
		return null;
	var ret = this.data[key];
	delete this.data[key];
	this._size--;
	return ret;
}
/** Returns the number of keys in this hashtable */
Hashtable.prototype.size = function() {
	return this._size;
}

/** Returns an array with all the values in this hashtable */
Hashtable.prototype.elements = function() {
	var ret = new Array();
	for (var key  in this.data) {
		ret.push(this.data[key]);
	}
	return ret;
}

/** Returns an array with all the keys in this hashtable */
Hashtable.prototype.keys = function() {
	var ret = new Array();
	for (var key  in this.data) {
		ret.push(key);
	}
	return ret;
}

/** Returns a string with the keys and values */
Hashtable.prototype.toString = function() {
	var ret = "";
	for(var key in this.data) {
		ret +="{" + key + "," + value + "}";
	}
	return ret;
}
