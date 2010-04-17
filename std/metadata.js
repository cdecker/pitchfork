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

var ALBUMART_NO_COVER = "../images/gmpc-no-cover.png";
var ALBUMART_NO_COVER_THUMB = "../images/gmpc-no-cover-thumb.png";

function metadata_open_default() {
	sidebar_open("metadata");
	metadata_open_lyrics(); // default opening is lyrics
}

function metadata_init() {

	var elem = document.getElementById('metadata_open');
	if(elem)
		add_listener(elem, "click", metadata_open_default);
	elem = document.getElementById("metadata_close");
	if(elem)
		add_listener(elem, "click", sidebar_close);

	elem = document.getElementById("metadata_open_lyrics");
	if(elem)
		add_listener(elem, "click", metadata_open_lyrics);
	elem = document.getElementById('metadata_open_review');
	if(elem)
		add_listener(elem, "click", metadata_open_review);
	elem = document.getElementById('metadata_open_description');
	if(elem)
		add_listener(elem, "click", metadata_open_description);
	if(sidebar.display)
		add_listener(sidebar.display, "click", metadata_lyrics_refetch);
	elem = document.getElementById("recommendation_open");
	if(elem)
		add_listener(elem, "click", recommend_open);
}

function parse_html_tags(txt) {
	txt = txt.replace(/&lt;i&gt;/gi, "<i>");
	txt = txt.replace(/&lt;\/i&gt;/gi, "</i>");
	txt = txt.replace(/\n/g, "<br/>\n");
	txt = txt.replace(/&lt;p&gt;/gi, "<br/><br/>\n");
	txt = txt.replace(/&lt;\/p&gt;/gi, "");
	return txt;
}

function metadata_set_content(content) {
	/* don't display the content if right view is not open */
	if(sidebar.open_view=="metadata") 
		sidebar.set_content(content);
}

function metadata_open_lyrics(e, force) {
	sidebar.say_loading();
	sidebar.last_metadata_request = "lyrics";
	if(playing.title&&playing.artist&&playing.title.length>0&&playing.artist.length>0) {
		var http = new XMLHttpRequest();
		http.open("GET", "metadata.php?lyric" + (force?"&force":""), true);
		http.onreadystatechange = function() {
			if(http.readyState==4&&sidebar.last_metadata_request=="lyrics") {
				var lyrics = create_fragment();
				if(http.responseText=="nocachedir") {
					lyrics.appendChild(create_txt(LANG.E_MISSING_CACHE));
				}
					
				if(http.responseXML) {
					var result = get_tag(http.responseXML, "result");
					if(result=="failed") {
						lyrics.appendChild(create_txt(LANG.E_LYRICS_FAILURE));
					}
					else if(result=="notfound") {
						lyrics.appendChild(create_txt(LANG.E_LYRICS_NOT_FOUND));
						var url = get_tag(http.responseXML, "url");
						if(url) {
							lyrics.appendChild(metadata_build_lyricwiki_url(url, LANG.ADD));
						}
					}
					else {
						var refetch = create_node("p");
						refetch.appendChild(create_txt("["+LANG.REFETCH+"]"));
						refetch.className = "fakelink";
						refetch.id = "lyrics_refetch_button";
						lyrics.appendChild(refetch);
						var title = create_node("span");
						title.style.fontSize = "larger";
						title.style.marginRight = "60px";
						title.appendChild(create_txt(get_tag(http.responseXML, "title")));
						var artist = create_node("span");
						artist.style.fontSize = "100%";
						artist.appendChild(create_txt(get_tag(http.responseXML, "artist")));

						lyrics.appendChild(title);
						lyrics.appendChild(create_node("br"));
						lyrics.appendChild(artist);
						lyrics.appendChild(create_node("br"));
						lyrics.appendChild(create_node("br"));
						
						var song = get_tag(http.responseXML, "lyric");
						if(song&&song.length) {
							add_string_with_br(lyrics, song);
						}
						else {
							lyrics.appendChild(create_txt(LANG.E_MISSING_LYRICS));
						}
						var url = get_tag(http.responseXML, "url");
						if(url) {
							lyrics.appendChild(metadata_build_lyricwiki_url(url, LANG.EDIT));
						}
					}
				}
				else {
					lyrics.appendChild(create_txt(LANG.E_COMM_PROBLEM));
				}
				metadata_set_content(lyrics);
			}
		}
		http.send(null);
	}
	else {
		metadata_set_content(create_txt(LANG.E_MISSING_AS_NAME));
	}
}

function metadata_build_lyricwiki_url(url, txt) {
	var a = create_node("a");
	a.href = url.replace(/&amp;/i, "&");
	a.title = sprintf(LANG.LYRICWIKI_LYRIC, txt);
	a.target = "_new";
	a.appendChild(create_txt("[" + txt + "]"));
	a.style.display = "block";
	a.style.marginTop = "10px";
	return a;
}

function metadata_lyrics_refetch(e) {
	if(e&&e.target&&e.target.id=="lyrics_refetch_button") {
		stop_event(e);
		metadata_open_lyrics(e, true);
	}
}

function metadata_open_review() {
	request_review_desc(0);
}
function metadata_open_description() {
	request_review_desc(1);
}

function request_review_desc(type) {
	sidebar.say_loading();
	sidebar.last_metadata_request = "review";
	if(playing.album&&playing.artist&&playing.album.length>0&&playing.artist.length>0) {
		var http = new XMLHttpRequest()
		var album = playing.album;
		var artist = playing.artist;
		http.open("GET", "metadata.php?review&artist=" + encodeURIComponent(playing.artist) + 
			"&album=" + encodeURIComponent(playing.album), true);
		http.onreadystatechange = function() {
			if(http.readyState==4&&sidebar.last_metadata_request=="review") {
				if(get_tag(http.responseXML, "result")) {
					metadata_set_content(LANG.E_GET_INFO);
					return;
				}

				var content = create_fragment();
				var tmp = "";
				var stuff = "";
				if(type==0) {
					tmp = LANG.ALBUM_REVIEW;
					stuff = get_tag(http.responseXML, "review");
				}
				else if(type==1) {
					tmp = LANG.ALBUM_DESC;
					stuff = get_tag(http.responseXML, "desc");
				}
				if(stuff) {
					if(!playing.asin) {
						var asin = get_tag(http.responseXML, "asin");
						if(asin)
							playing.asin = asin; 
					}
					tmp+=sprintf(LANG.ALBUM_AA_NAME, album, artist);
					tmp = create_node("span", null, tmp);
					tmp.style.fontSize = "larger";
					content.appendChild(tmp);
					content.appendChild(create_node("br"));
					content.appendChild(create_node("br"));
					tmp = create_node("span");
					tmp.innerHTML = parse_html_tags(stuff);
					content.appendChild(tmp);
					tmp = create_node("a");
					tmp.appendChild(create_txt(LANG.NT_AMAZON));
					if(build_amazon_link(tmp)) {
						content.appendChild(create_node("br"));
						content.appendChild(create_node("br"));
						content.appendChild(tmp);
					}
				}
				else {
					content.appendChild(create_txt(sprintf(LANG.E_NOT_FOUND, tmp.toLowerCase())));
				}
				metadata_set_content(content);
			}
		}
		http.send(null);
	}
	else {
		metadata_set_content(create_txt(LANG.E_MISSING_AA_NAME));
	}
}


/* album art */
function request_thumbnail() {
	var albumart = document.getElementById("albumart");
	var rartist = playing.artist;
	var ralbum = playing.album;

	remove_children(albumart);
	if(playing.album&&playing.artist&&ralbum.length>0&&rartist.length>0) {
		var http = new XMLHttpRequest()
		http.open("GET", "metadata.php?cover&artist=" + encodeURIComponent(rartist) + 
			"&album=" + encodeURIComponent(ralbum), true);
		http.onreadystatechange = function() {
			if(http.readyState==4) {
			try {
				if(http.responseText=="nocachedir") {
					debug(LANG.E_MISSING_CACHE); // TODO
					return;
				}
				if(get_tag(http.responseXML, "result")) {
					// something's not okay.... TODO
					return;
				}

				/* test if we're still wanted */
				if(rartist != playing.artist || ralbum != playing.album)
					return;

				var thumb = get_tag(http.responseXML, "thumbnail");
				var url = thumb;
				
				if(!url) {
					url = ALBUMART_NO_COVER_THUMB;
				}
				else {
					url = ALBUMART_URL + encodeURIComponent(thumb);
				}

				playing.image = get_tag(http.responseXML, "image");

				var img = create_node("img");
				img.src = url;
				add_listener(img, "click", show_big_albumart);
				img.className = "thumbnailart";
				if(albumart.hasChildNodes()) {
					/* probably just one, but... */
					var imgs = albumart.getElementsByTagName("img");
					for(var i=0; i<imgs.length; i++) {
						remove_listener(imgs[i], "click", show_big_albumart);
					}
					remove_children(albumart);
				}
				albumart.appendChild(img);

				var asin = get_tag(http.responseXML, "asin");
				if(asin)
					playing.asin = asin;
				else playing.asin = false;

				if(albumart_is_open())
					show_big_albumart();

			}
			catch(e) {
				//debug("request_thumbmail error: " + e.message);
			}
			}
		}
		http.send(null);
	}
}

function show_big_albumart() {
	
	var div = document.getElementById("albumart_show");
	var close = false;
	if(!div) {
		div = create_node("div", "albumart_show");
		div.className = "big_albumart";
		document.body.appendChild(div);
		close = create_node("p");
		close.style.color = "white";
		close.style.position = "absolute";
		close.style.right = "5px";
		close.style.bottom = "0px";
		close.style.margin = "0px 5px 5px 0px";
		close.className = "fakelink";
		close.appendChild(create_txt("[" + LANG.CLOSE + "]"));
	}

	/* if it hadn't been for opera we could have used the old one */
	var oimg = document.getElementById("albumart_img"); 
	var img = create_node("img", "albumart_img");
	img.className = "big_albumart";
	img.style.display = "none";
	if(oimg)
		replace_node(img, oimg);
	else 
		div.appendChild(img);

	add_listener(img, "load", albumart_loaded);

	var node = document.getElementById("albumart_txt");
	if(!node) {
		node = create_node("p", "albumart_txt");
		div.appendChild(node);
	}
	remove_children(node);
	node.appendChild(create_txt(LANG.WAIT_LOADING));

	add_listener(div, "click", albumart_big_remove);
	div.style.display = "";
	var url = "";
	if(playing.image&&playing.image.length)
		url = ALBUMART_URL + encodeURIComponent(playing.image);
	else url = ALBUMART_NO_COVER;
			
	if(close)
		div.appendChild(close);

	img.src = url;

}

function albumart_is_open() {
	var aa = document.getElementById("albumart_show");
	if(aa&&aa.style.display != "none")
		return true;
	return false;
}

function albumart_big_remove() {
	var aa = document.getElementById("albumart_show");
	var img = document.getElementById("albumart_img");
	img.style.display = "none";
	remove_listener(aa, "click", albumart_big_remove);
	aa.style.display = "none";
	aa.style.height = "";
	aa.style.width = "";
}

function albumart_loaded() {
	var img = document.getElementById("albumart_img");
	var disp = document.getElementById("albumart_show");
	var txt = document.getElementById("albumart_txt");
	remove_listener(img, "load", albumart_loaded);
	img.style.opacity = "0.1";
	albumart_resize(disp, img);
	adjust_opacity_timer(img, 0.0, 1.0);
	remove_children(txt);
	if(playing.asin&&playing.asin.length>0) {
		var a = create_node("a");
		build_amazon_link(a);
		a.appendChild(create_txt(LANG.NT_AMAZON));
		a.style.color = "white";
		a.style.textTransform = "none";
		a.title = LANG.ALBUM_AMAZON;
		txt.appendChild(a);
	}
}

function albumart_resize(disp, img) {
	var width = 500; 
	var height = 500;
	img.style.visibility = "hidden";
	img.style.display = "inline";
	var got_real = true;
	if(img.height)
		height = img.height;
	else got_real = false;
	if(img.width)
		width = img.width;
	else got_real = false;
	disp.style.height = (height+ 30) + "px";
	disp.style.width = (width + 0) + "px";
	img.style.visibility = "visible";
	return got_real;
}

function build_amazon_link(a) {
	if(playing.asin&&playing.asin.length>0) {
		a.href = "http://www.amazon.com/gp/product/" + playing.asin + "?ie=UTF8&tag=httppitchfork-20" +
			 "&linkCode=as2&camp=1789&creative=9325&creativeASIN=" + playing.asin;
		a.target = "_new";
		return true;
	}
	else {
		return false;
	}
}

function recommend_init() {
	var tmp = create_node("p");
	tmp.className = "nomargin";
	tmp.appendChild(create_txt(LANG.RECOMMEND_RECOMMENDATIONS));
	var close = create_node("span", null, " ["+LANG.CLOSE+"]");
	add_listener(close, "click", sidebar_close);
	close.className = "fakelink";
	tmp.appendChild(close);
	sidebar.add_view("recommend", tmp, 20);
}

function recommend_open() {
	sidebar_open("recommend");
	sidebar.set_content(create_txt(LANG.WAIT_LOADING));
	recommend_fetch_data();	
}

function recommend_set_content(c) {
	if(sidebar.open_view == "recommend")
		sidebar.set_content(c);
}

function recommend_fetch_data() {
	if(!playing.pl_size) {
		recommend_set_content(LANG.RECOMMEND_EMPTY_PLAYLIST);
		return;
	}
	var http = new XMLHttpRequest()
	http.open("GET", "metadata.php?plrecommend", true);
	http.onreadystatechange = function() {
		if(http.readyState==4) {
			
			var result = http.responseXML.getElementsByTagName("result")[0];
			if(!result || result.textContent=="failed" || !result.hasChildNodes()) {
				recommend_set_content(create_txt(LANG.E_COMM_PROBLEM));
				return;
			}
			var exists = create_node("ul");
			var others = create_node("ul");
			exists.className = "recommended";
			others.style.paddingLeft = "10px";

			add_listener(exists, "click", recommend_toggle_open);
			add_listener(exists, "mousedown", stop_event);
			
			result = result.childNodes;
			for(var i=0; i < result.length; i++) {
				var a = result[i];
				var artist = get_tag(a, "name");
				var albums = a.getElementsByTagName( "album")[0];

				if(albums&&albums.hasChildNodes()) {
					var list = create_node("li", null, artist);
					var slist = create_node("ul");
					add_listener(slist, "click", recommend_add_to_playlist);
					var node = albums.firstChild;
					while(node) {
						var tmp = create_node("li", null, node.textContent);
						tmp.title = LANG.RECOMMEND_ADDTOPLAYLIST;
						tmp.setAttribute("artist", artist);
						slist.appendChild(tmp);
						node = node.nextSibling;
					}
					list.appendChild(slist);
					exists.appendChild(list);
				}
				else {
					var li = create_node("li", null, artist);
					others.appendChild(li);
				}
			}
			var tmp = create_fragment();
			// todo: size
			tmp.appendChild(create_txt(LANG.RECOMMEND_SIMILAR));
			tmp.appendChild(exists);
			// todo: size
			tmp.appendChild(create_txt(LANG.RECOMMEND_ARTISTS));
			tmp.appendChild(others);
			recommend_set_content(tmp);
		}
	}
	http.send(null);
}

function recommend_toggle_open(e) {
	if(e.target.parentNode.className != "recommended")
		return;
	if(e.target.hasAttribute("open"))
		e.target.removeAttribute("open");
	else e.target.setAttribute("open", "k");
}

function recommend_add_to_playlist(e) {
	if(!e.target.hasAttribute("artist")) 
		return;
	send_command("searchadd&artist=" + encodeURIComponent(e.target.getAttribute("artist")) + 
		"&album=" + encodeURIComponent(e.target.textContent), browser_add_cb, LANG.WAIT_ADDING);
}
