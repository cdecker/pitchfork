<?php
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

	
	require_once("../inc/base.php");
	require_once("../inc/JSON.php");

	define('PF_FAILURE', 'failed');

	$META_SEARCH = array("any", "Artist", "Title", "Album", "Genre", "filename", "Composer", "Performer", "Date" ); // "lyrics"...
	$PL_SEARCH = array("any", "Artist", "Title", "Album", "Genre", "filename", "Composer", "Performer", "Date" ); // "lyrics"...

	header("Content-Type: text/plain; charset=UTF-8");

	function ids_to_list($sel) {
		$arr = explode(";", trim($sel));
		$res = array();
		$size = count($arr);
		foreach($arr as $val) {
			$pos = strpos($val, "-");
			if($pos === FALSE) {
				$res[] = $val;
			}
			else {
				$tmp = explode("-", $val);
				$res = array_merge($res, range($tmp[0], $tmp[1])); 
			}
		}
		return $res;
	}

	function selection_to_list($sel) {
		$res = ids_to_list($sel);
		sort($sel, SORT_NUMERIC);
		return $res;
	}
		
	function selection_to_reverse_list($sel) {
		$res = ids_to_list($sel);
		rsort($res, SORT_NUMERIC);
		return $res;
	}

	function search_add($db, $pl, $search) {
		$tmp = $db->find($search, true);
		foreach($tmp as &$a) {
			$pl->addSong($a['file']);
		}
		if(count($tmp)>0) 
			return true;
		return false;
	}

	function parsePlaylist($txt, $type = false) {
		$txt = explode("\n", $txt); // trim will remove the \r
		$res = array();
		if($type=="pls"||$type===false) {
			foreach($txt as $t) {
				$t = trim($t);
				if(stripos($t, "file")!==false) { 
					$pos = spliti("^file[0-9]*=", $t);
					if(count($pos)==2&&strlen($pos[1])>0)
						$res[] = $pos[1];
				}
			}
		}			
		else if($type=="m3u" || ($type===false&&count($res)==0) ) {
			foreach($txt as $t) {
				$t = trim($t);
				if(strpos($t, "#")!==false||strlen($t)==0) {
					echo "skipping: $t\n";
					continue;
				}
				$res[] = $t;
			}
		}
		return $res;
	}
	function handle_playlist_url($pl, $url, $get = false) {
		if($get) {
			$fp = @fopen($url, "r");
			if($fp) {
				$type = substr($url, strlen($url)-3); // just get three last chars..
				$md = stream_get_meta_data($fp);
				$md = $md['wrapper_data'];
				foreach($md as $m) {
					if(stripos($m, "content-type:")==0) {
						if(stripos($m, "audio/x-scpls")) {
							$typdde = "pls";
						}
						else if(stripos($m, "audio/x-mpegurl")
						     || stripos($m, "audio/mpegurl")) {
						     $type = "m3u";
						}
					}
				}
				$type = strtolower($type);
				$data = stream_get_contents($fp);
				$stuff = parsePlaylist($data, $type);
				foreach($stuff as $s) {
					$pl->addSong($s);
				}
				return true;
			}
			return false;
		}
		else {
			$opts = array(
			  'http'=>array(
			     'method'=>"HEAD",
			));
			$context = stream_context_create($opts);
			$fp = @fopen($url, "r", false, $context);
			$md = null;

			if(!$fp) { 
				$md = array(); // head did not work....
			}
			else {
				$md = stream_get_meta_data($fp);
				$md = $md['wrapper_data'];
			}

			$type = substr($url, strlen($url)-3); // just get three last chars..

			/* these lists are probably incomplete, make a ticket if 
			   you want something added */
			foreach($md as $m) {
				if(stripos($m, "content-type:")==0) {
					if(stripos($m, "audio/x-scpls")||
					   stripos($m, "audio/x-mpegurl")||
					   stripos($m, "audio/mpegurl")) {
						return handle_playlist_url($pl, $url, true);
					}
					else if(stripos($m, "audio/mpeg")||
						stripos($m, "audio/mpeg3")||
						stripos($m, "audio/x-mpeg3")||
						stripos($m, "audio/mpeg2")||
						stripos($m, "audio/x-mpeg2")||
						stripos($m, "application/ogg")||
						stripos($m, "audio/x-ogg")||
						stripos($m, "audio/mp4")||
						stripos($m, "audio/x-mod")||
						stripos($m, "audio/mod")||
						stripos($m, "audio/basic")||
						stripos($m, "audio/x-basic")||
						stripos($m, "audio/wav")||
						stripos($m, "audio/x-wav")||
						stripos($m, "audio/flac")||
						stripos($m, "audio/x-flac")
						) {
						$pl->addSong($url);
						return true;
					}
				}
			}
			$type = strtolower($type);
			$type4 = strtolower($url, strlen($url)-4);
			if($type=="m3u"||$type=="pls") {
				return handle_playlist_url($pl, $url, true);
			}
			else if($type=="ogg"||$type=="mp3"||$type=="mp2"||$type=="wav"
				||$type==".au"||$type=="m4a"||$type4=="flac"||$type4=="aiff") {
				// ugh, just try to add it... 
				$pl->addSong($url);
				return true;
			}
		}
		return false;
	}

	function array_to_json(&$arr) {
		echo "(";
		if(function_exists("json_encode")) {
			echo json_encode($arr);
		} else {
			$json = new Services_JSON();
			$json->encode($arr);
		}
		echo ")";
	}
	
	/* for auto-play-start on empty */
	$playlist_empty = false;
	$something_added = false;

	$json = null;
	$pl = get_playlist();
	if(!$pl) {
		$v = array("connection" => PF_FAILURE);
		echo array_to_json($v);
		exit();
	}
	else if(isset($_GET['add'])||isset($_GET['ma'])||isset($_GET['searchadd'])) {
		/* for automatic playback start */
		try {
			$s = $pl->getStatus();
			if(isset($s['playlistlength'])&&intval($s['playlistlength'])==0) {
				$playlist_empty = true;
			}
		}
		catch (PEAR_Exception $e) {
			$v = array("connection" => PF_FAILURE);
			echo array_to_json($v);
			exit();
		}
	}

	if(isset($_GET['playlist'])) {
		$act = $_GET['playlist'];
		try {
			if($act=="move"&&isset($_GET['from'])&&isset($_GET['to'])) {
				// todo: sanity check
				$response = null; 
				if($pl->moveSongId($_GET['from'], $_GET['to'])) 
					$response = array('result' => "ok");
				else $response = array ('result' => PF_FAILURE);
				$json = $response;
			}
			else if($act=="info"&&isset($_POST['ids'])) {
				$list = ids_to_list($_POST['ids']);
				$ret = array();
				foreach($list as $id) {
					$tmp = $pl->getPlaylistInfoId($id);
					if(isset($tmp['file']))
						$ret[] = $tmp['file'][0];
				}
				$json = array();
				unset($list);
				$json['result'] = &$ret;
			}
			else {
				$json = array("result" => PF_FAILURE);
			}
		}
		catch(PEAR_Exception $e) {
			$json = array ('result' => PF_FAILURE);
		}
	}
	else if(isset($_GET['rangemove'])&&is_numeric(trim($_GET['rangemove']))&&isset($_GET['elems'])) {
		$res = PF_FAILURE;
		$dest = intval($_GET['rangemove']);
		$pos_offset = 0;
		try {
			$list = selection_to_reverse_list($_GET['elems']);
			foreach($list as &$pos) {
				//echo $pos-$pos_offset . "=>" .$dest."\n";

				/* this means we've moved above the place where changing the position will
				 * have any effect on the list */
				if($dest>$pos&&$pos_offset!=0) {
					$pos_offset=0;
					$dest--;
				}

				$pl->moveSong($pos-$pos_offset, $dest);
				if($dest>$pos-$pos_offset) {
					/* means we yanked something from over destination */
					$dest--;
				}
				else if($dest<$pos-$pos_offset) {
					/* means we yanked something from below destination */
					$pos_offset--;
				}
				else {
					/* moved it to our selves O_o */
				//	echo "onself\n";
				}
			}
			$res = "ok";
		}
		catch(PEAR_Exception $e) {
		}
		$json = array ('result' => $res);
	}
	else if(isset($_GET['ping'])) {
		$result = "pong";
		$json = array("result" => $result);
	}
	else if(isset($_GET['volume'])&&is_numeric(trim($_GET['volume']))) {
		$res = PF_FAILURE;
		try {
			$volume = trim($_GET['volume']);
			$play = get_playback();
			if($play->setVolume($volume)) 
				$res = "ok";
			$play->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['position'])&&is_numeric(trim($_GET['position']))
		&& isset($_GET['id']) && is_numeric(trim($_GET['id']))) {
		$result = PF_FAILURE;
		try {
			$pos = trim($_GET['position']);
			$id = trim($_GET['id']);
			$play = get_playback();
			if($play->seekId($id, $pos)) 
				$result = "ok";
			$play->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $result);

	}
	else if(isset($_GET['currentsong'])) {
		$res = "failure";
		try {
			$res = $pl->getCurrentSong();
			if(!$res) 
				$res = "failure";
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['dirlist'])) {
		$dir = trim($_GET['dirlist']);
		$FILE = 0;
		$ARTIST = 1;
		$ALBUM = 2;
		$type = $FILE;

		if(isset($_GET['type'])&&is_numeric($_GET['type'])) {
			$type = $_GET['type'];
		}
		if(is_null($dir)||$dir=="")
			$dir = "/";
		$res = "failure";
		try {
			$db = get_database();

			if($type==$ALBUM||$type==$ARTIST) {
				$t = false;
				if(($t = strrpos($dir, "/")) !== false && $t == strlen($dir)-1) {
					$dir = substr($dir, $t+1);
				}
				if(strlen($dir)==0) {
					$type = $type==$ALBUM?"Album":"Artist";
					$res = array(strtolower($type) => $db->getMetadata($type));
				}
				else {	
					$res = array();
					if($type==$ALBUM) {
						$res["artist"] = $db->getMetadata("Artist", "Album", $dir);
						$res['filelist'] = $db->find(array("Album" => $dir), true);
					}
					else if($type==$ARTIST) {
						$res["album"] = $db->getMetadata("Album","Artist", $dir);
						$res['filelist'] = $db->find(array("Artist" => $dir), true);
					}
				}
			}
			else {
				$tmp = $db->getInfo($dir);
				$res = array();

				if(isset($tmp['directory'])) {
					$res['directory'] =$tmp['directory'];
				}
				if(isset($tmp['file'])) {
					$res['file'] = array();
					foreach($tmp['file'] as &$row) {
						$res['file'][] = $row['file'];
					}
				}
				if(isset($tmp['playlist'])) {
					$res['playlist'] = $tmp['playlist'];
				}
			}
			if(!$res) 
				$res = "failure";
			$db->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['act'])) {
		$act = trim($_GET['act']);
		$result = "failure";
		try {
			$play = get_playback(); 

			if($act=="play") {
				if(isset($_GET['id'])&&is_numeric(trim($_GET['id']))) {
					if($play->playId(trim($_GET['id'])))
						$result = "ok";
				}
				else if(isset($_GET['pos'])&&is_numeric(trim($_GET['pos']))) {
					if($play->play(trim($_GET['pos'])))
						$result = "ok";
				}
				else if($play->play()) {
					$result = "ok";
				}
			}
			else if($act == "toggle") {
				if($play->pause())
					$result = "ok";
			}
			else if($act == "next") {
				if($play->nextSong())
					$result = "ok";
			}
			else if( $act == "previous") {
				if($play->previousSong())
					$result = "ok";
			}
			else if($act=="stop") {
				if($play->stop())
					$result = "ok";
			}
			else $result = "invalid command";
			$play->disconnect();
		}
		catch(PEAR_Exception $e) {
			$result = "failure";
		}
		$json = array("result" => $result);
	}
	else if(isset($_GET['add'])) {
		$add = $_GET['add'];
		try {
			$res = PF_FAILURE;
			if($pl->addSong($add)) {
				$res = "ok";
				$something_added = true;
			}
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['remove'])) {
		$arr = selection_to_reverse_list($_GET['remove']);
		$res = "ok";
		try {
			foreach($arr as &$val) {
				if(!$pl->deleteSong($val))
					$res = "failure";
			}
		}
		catch(PEAR_Exception $e) {
			$result = "failure";
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['updatedb'])) {
		$res = PF_FAILURE;
		try {
			$adm = get_admin();
			if($adm->updateDatabase())
				$res = "ok";
			$adm->disconnect();
		}
		catch(PEAR_Exception $e) {
			$res = PF_FAILURE;
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['outputs'])||isset($_GET['output_e'])||isset($_GET['output_d'])) {
		$res = PF_FAILURE;
		try {
			$admin = get_admin();
			if(isset($_GET['outputs']))
				$res = $admin->getOutputs();
			else if(isset($_GET['output_e'])&&is_numeric($_GET['output_e']))
				$res = $admin->enableOutput(trim($_GET['output_e']))?"1":PF_FAILURE;
			else if(isset($_GET['output_d'])&&is_numeric($_GET['output_d']))
				$res = $admin->disableOutput(trim($_GET['output_d']))?"0":PF_FAILURE;
			$admin->disconnect();
		}
		catch(PEAR_Exception $e) {
			$res = PF_FAILURE;
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['random'])) {
		$res = "failure";
		try {
			$play = get_playback(); 
			$val = $_GET['random']=="1";
			if($play->random($val)) {
				$res = $val?"1":"0";
			}
			$play->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);

	}
	else if(isset($_GET['repeat'])) {
		$res = "failure";
		try {
			$play = get_playback(); 
			$val = $_GET['repeat']=="1";
			if($play->repeat($val)) {
				$res = $val?"1":"0";
			}
			$play->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['xfade'])&&is_numeric($_GET['xfade'])) {
		$res = PF_FAILURE;
		try {
			$play = get_playback(); 
			if($play->setCrossfade(trim($_GET['xfade'])))
				$res = "ok";
			$play->disconnect();
			
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['quick_search'])) {
		$dir = trim($_GET['quick_search']);
		$res = PF_FAILURE;
		try {
			$search_dir = strrpos($dir, "/");
			if($search_dir) {
				$search_dir = substr($dir, 0, $search_dir);
			}
			else {
				$search_dir = "";
			}
			$db = get_database(); 
			$tmp = $db->getInfo($search_dir);
			if(isset($tmp['directory'])) {
				$res = array();
				$i=0;
				foreach($tmp['directory'] as $key => &$value) {
					if(stripos($value, $dir)===0) {
						$i++;
						$res[$key] = &$value;
					}
					if($i>=20) /* return up to x entries */
						break;
				}
			}
			$db->disconnect();
			
		}
		catch(PEAR_Exception $e) {
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['searchadd'])||isset($_GET['searchfile'])) {
		$artist = null;
		$album = null;
		$res = PF_FAILURE;
		if(isset($_GET['artist'])&&strlen($_GET['artist'])>0)
			$artist = $_GET['artist'];
		if(isset($_GET['album'])&&strlen($_GET['album'])>0)
			$album = $_GET['album'];
		if(!(is_null($artist)&&is_null($album))) {
		try {
			$db = get_database();
			$params = array();
			if(!is_null($artist)) 
				$params["Artist"] = $artist;
			if(!is_null($album)) 
				$params["Album"] = $album;


			if(isset($_GET['searchadd'])) {
				if(search_add($db, $pl, $params)) {
					$res = "ok";
					$something_added = true;
				}
				else $res = "notfound";
			}
			else {
				$res = array();
				$res['filelist'] = $db->find($params, true);
			}
			$db->disconnect();
		}
		catch(PEAR_Exception $e) {
			$res = PF_FAILURE;
		}
		}
		$json = array("result" => $res);
	}
	else if(((isset($_GET['metasearch'])&&is_numeric($_GET['metasearch']))||
		 (isset($_GET['plsearch'])&&is_numeric($_GET['plsearch'])))
		&&isset($_GET['s'])) {
		$plsearch = isset($_GET['plsearch']);

		$type = intval($plsearch?$_GET['plsearch']:$_GET['metasearch']);
		$search = $_GET['s'];
		$res = PF_FAILURE;
		if($type>=0&&$type<count($plsearch?$PL_SEARCH:$META_SEARCH)) {
			try {
				$tmp = null; 
				if($plsearch&&$pl->hasFind()) {
					$tmp = $pl->find(array($PL_SEARCH[$type] => $search));
				}
				else if($plsearch) {
					$data = $pl->getPlaylistInfoId();
					if(isset($data['file']))
						$data = $data['file'];
					$tmp = array();
					$t = $PL_SEARCH[$type];
					foreach($data as &$song) {
						if($type===0) { // any
							foreach($song as &$e)
								if(stristr($e, $search)!==FALSE) {
									$tmp[] = $song;
									break;
								}
						}
						else if(isset($song[$t]) && stristr($song[$t],$search)!==FALSE)
							$tmp[] = $song;
					}
				}
				else {
					$db = get_database();
					$tmp = $db->find(array($META_SEARCH[$type] => $search));
					$db->disconnect();
				}
				$res = array();
				/* strip */
				$keys = array("Artist", "Title", "file", "Pos");
				foreach($tmp as &$row) {
					$e = array();
					foreach($row as $key => &$val) {
						if(in_array($key, $keys)!==FALSE)
							$e[$key] = $val;
					}
					$res[] = $e; 
				}
			}
			catch(PEAR_Exception $e) {
				//$res = $e->getMessage();
			}
		}
		else if($type==count($META_SEARCH)) { // search lyrics...
			/* this should probably have been in metadata.php, but don't need 
			 * to change anything if we have it here, kiss */
			$tmp = array();
			if(is_dir($metadata_dir)&&is_readable($metadata_dir)) {
				$files = scandir($metadata_dir); 
				foreach($files as $file) {
					$pos = strrpos($file, ".lyric");
					if($pos!==false&&$pos==strlen($file)-6) {
						$xml = @simplexml_load_file($metadata_dir . $file);
						if($xml&&isset($xml->result[0])&&isset($xml->result[0]->lyric[0])) {
							$l = (string)$xml->result[0]->lyric[0];
							if(stripos($l, $search)!==false) {
								if(isset($xml->file)) {
									/*
									foreach($xml->file as $f) {
										$e = array(); 
										$e['file'] = (string)$f;
										$e['Artist'] = (string)$xml->result[0]->artist[0];
										$e['Title'] = (string)$xml->result[0]->title[0];
										$res[] = $e;
									}
									*/
									$e = array(); 
									$e['Artist'] = (string)$xml->result[0]->artist[0];
									$e['Title'] = (string)$xml->result[0]->title[0];
									$tmp[] = $e;
								}
							}
						}
					}
				}
			}
			$db = get_database();

			$res = array();
			foreach($tmp as &$row) {
				$sr = $db->find(array("Artist" => $row['Artist'], "Title" => $row["Title"]));
				/*var_dump($tmp);
				break;*/
				if(isset($sr[0])&&isset($sr[0]['file'])) {
					$row['file'] = $sr[0]['file'];
					$res[] = $row;
				}
			}
			$db->disconnect();
		}
		$json = array("result" => $res);
	}
	else if(isset($_GET['ma'])) {
		/* note to self: should merge single add with this */
		$res = PF_FAILURE;
		if (!isset($HTTP_RAW_POST_DATA))
		   $HTTP_RAW_POST_DATA = file_get_contents("php://input");
		$ma = explode("\n", $HTTP_RAW_POST_DATA);
		$db = false;
		$sparam = array();
		if(count($ma)) {
			$tmp = explode(":", $ma[0], 2);
			if($tmp[0]=="baseartist") {
				$sparam['Artist'] = $tmp[1];
			}
			else if($tmp[0]=="basealbum") {
				$sparam['Album'] = $tmp[1];
			}	
		}
		try {
			foreach($ma as &$guom) {
				$v = explode(":", $guom, 2);
				if(!count($v)==2)
					continue;
				$res.=$v[0];
				if($v[0]=="file"||$v[0]=="directory") {
					$pl->addSong($v[1]);
				} /* we should never get same as baseartist/album here, if we do I don't care */
				else if($v[0]=="album"||$v[0]=="artist") {
					if($v[0]=="album")
						$sparam["Album"] = $v[1];
					else $sparam["Artist"] = $v[1];
					if(!$db) 
						$db = get_database();
					search_add($db, $pl, $sparam);
				}
				else if($v[0]=="playlist") {
					$pl->loadPlaylist($v[1]);
				}
			}
			$res = "ok";
			$something_added = true;
			if($db)
				$db->disconnect();
		}
		catch(PEAR_Exception $e) { }
		$json = array("result" => $res);
	}
	else if(isset($_GET['playlist_rm'])||isset($_GET['playlist_load'])
		||isset($_GET['playlist_save'])||isset($_GET['playlist_add_url'])) {

		$res = false;
		try {
			if(isset($_GET['playlist_rm'])) {
				$res = $pl->deletePlaylist(trim($_GET['playlist_rm']));
			}
			else if(isset($_GET['playlist_load'])) {
				$res = $pl->loadPlaylist(trim($_GET['playlist_load']));
			}
			else if(isset($_GET['playlist_save'])) {
				$res = $pl->savePlaylist(trim($_GET['playlist_save']));
			}
			else if(isset($_GET['playlist_add_url'])) {
				$url = trim($_GET['playlist_add_url']);
				if(stripos($url, "http://")==0) {
					$res = handle_playlist_url($pl, $url);
				}
			}
		}
		catch(PEAR_Exception $e) {}
		$res = $res?"ok":PF_FAILURE;
		$json = array("result" => $res);
	}
	else if(isset($_GET['clearerror'])) {
		$pl->clearError();
		$json = array("result" => "ok");
	}

	if(!is_null($json)) {
		try {
			if($playlist_empty&&$something_added) {
				$play = get_playback();
				$play->play();
				$play->disconnect();
			}
			$json["status"] = $pl->getStatus();
			if(isset($_GET['plchanges'])&&is_numeric(trim($_GET['plchanges']))&&$_GET['plchanges']!=$json['status']['playlist']) {
				$res = $pl->getChanges(trim($_GET['plchanges']), true);
				if($res&&isset($res['file'])&&is_array($res['file'])) {
					
					if(isset($_GET['pmax'])&&isset($_GET['page'])) {
						$arr = $res['file'];
						$max = intval($_GET['pmax']);
						$page = intval($_GET['page']);
						$start = $max * $page;
						$end = $start + $max;
						$ret = array();
						foreach($res['file'] as $f) {
							if($f['cpos']>=$start&&$f['cpos']<$end)
								$ret[] = $f;
							if($f['cpos']>=$end)
								break;
						}
						if(count($ret)>0)
							$json['plchanges'] = &$ret;

					}
					else {
						$json["plchanges"] = &$res['file'];
					}
				}
			}
			$pl->disconnect();
		}
		catch(PEAR_Exception $e) {
		}
		array_to_json($json);
	}
	else {
		try {
		$pl->disconnect();
		} catch(PEAR_Exception $e) {}
	}
?>
