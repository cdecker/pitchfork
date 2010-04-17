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
	ob_start();
	
	/* how much time must pass before we try searching for cover art again */
	$COVER_SEARCH_AGAIN = 86400;

	$amazon_base_url = "http://webservices.amazon.com/onca/xml?Service=AWSECommerceService&SubscriptionId="
	            . "15BH771NY941TX2NKC02";
	$amazon_review_url = $amazon_base_url . "&ResponseGroup=EditorialReview&Operation=";
	require_once("../inc/base.php");
	require_once("metadata_cover.php");
	
	/* metadata should not require locking of session */
	session_write_close();

	$missing_metadata_dir = false;

	if(!file_exists($metadata_dir)) {
		if(!mkdir($metadata_dir, 0755)) {
			$missing_metadata_dir = true;
		}
	}
	if(!is_writeable($metadata_dir)) {
		$missing_metadata_dir = true;
	}

	if($missing_metadata_dir) {
		$xml = array_to_xml(array("result" => "nocachedir"));
		echo $xml->asXML();
		exit();
	}

	function escape_name($name) {
		return str_replace(DIRECTORY_SEPARATOR, "_", $name);
	}

	function get_cover_base_name($artist, $album) {
		global $cover_dir;
		return $cover_dir . escape_name($artist) . " - " . escape_name($album);
	}

	function get_album_info_name($artist, $album) {
		return get_cover_base_name($artist, $album) . ".txt";
	}
	function get_lyric_filename($artist, $title) {
		global $cover_dir; 
		return $cover_dir . escape_name($artist) . " - ". escape_name($title) . ".lyric";
	}

	function find_lyrics($arr) {
		foreach($arr as $val) {
			if(!is_array($val))
				continue;
			if(isset($val['name'])&&$val['name']=="RETURN") {
				return $val['children'];
			}
			else if(is_array($val)) {
				$ret = find_lyrics($val);
				if($ret)
					return $ret;
			}
		}
		return false;
	}

	function fp_get_contents($fp) {
		$ret = "";
		$tmp = false;
		while($tmp = fgets($fp)) 
			$ret .= $tmp;
		fseek($fp, 0);
		if(strlen($ret)==0)
			return false;
		return $ret;
	}

	/* Queries amazon with the specified url, strict serach first and then a more careless one, 
	 * will urlencode artist and albumname 
	 * returns xml document or false upon failure */
	function amazon_album_query($base_url, $artist, $album) {
		$stype = array("Title", "Keywords");
		$artist = urlencode($artist);
		$album = urlencode($album);
		foreach($stype as $st) {
			if(!amazon_wait())
				return false;
			$xml = @simplexml_load_string(@file_get_contents($base_url . "&Artist=$artist&$st=$album"));
			if($xml&&isset($xml->Items[0])&&isset($xml->Items[0]->Item[0]))
				return $xml;
		}
		return false;
	}

	/* returns file pointer or false */
	function get_album_lock($artist, $album) {
		$file_name = get_album_info_name($artist, $album);
		$exists = file_exists($file_name);
		$fp = false;

		if($exists) 
			$fp = @fopen($file_name, "r+");
		else $fp = @fopen($file_name, "w+");
		if($fp && flock($fp, LOCK_EX))
			return $fp;

		trigger_error("Can't lock album-file: $file_name", E_USER_WARNING);
		return false;
	}

	/* waits for appropriate amazon time, have to be called before making any amazon requests
	   returns true if ok to continue otherwise false */
	function amazon_wait() {
		global $metadata_dir;
		
		/* rationale behind this: 
		 * amazon requires that we don't make more than one request pr. second pr. ip */
		
		$file_name = $metadata_dir . "amazon_time";
		if(file_exists($file_name)) 
			$fp = @fopen($file_name, "r+");
		else $fp = @fopen($file_name, "w+");

		if(!$fp) {
			trigger_error("Can't open amazon_time", E_USER_WARNING);
			return false; 
		}
		if(!flock($fp, LOCK_EX)) {
			@fclose($fp);
			trigger_error("Can't lock amazon_time", E_USER_WARNING);
			return false;
		}

		$last = fp_get_contents($fp);
		if($last) {
			$stime = 1000;
			if(is_numeric($last)) {
				$stime = current_time_millis() - $last;
			}
			$stime = abs($stime);
			if($stime<1000)
				usleep($stime*1000); // micro seconds
		}

		if(@fwrite($fp, current_time_millis())===false) {
			@fclose($fp);
			trigger_error("Can't write to amazon_time", E_USER_WARNING);
			return false; 
		}
		else {
			@fclose($fp);
			return true;
		}
	}

	/* returns artist and album info and get's album lock or dies */
	/* return value: array($fp, $artist, $album) */
	function init_album_artist_or_die() {
		ob_end_clean();
		header("Content-Type: text/xml; charset=UTF-8");

		$album = "";
		$artist = "";
		if(isset($_GET['artist'])&&isset($_GET['album']) &&
		   strlen(trim($_GET['artist']))>0&&strlen(trim($_GET['album']))>0) {
			$album = trim($_GET['album']);
			$artist = trim($_GET['artist']);
		}
		else {
			$xml = array_to_xml(array("result" => "missingparam"));
			echo $xml->asXML();
			exit();
		}

		$fp = get_album_lock($artist, $album);

		if(!$fp) {
			$xml = array_to_xml(array("result" => "failed"));
			echo $xml->asXML();
			exit();
		}
		return array($fp, $artist, $album);
	}

	/* returns array(artist, album, filename) or false */
	function get_current_info() {
		try {
			$pl = get_playback();
			if($pl) {
				$info = $pl->getCurrentSong();
				if(isset($info['Artist'])&&isset($info['Title'])) {
					$artist = trim($info['Artist']);
					$title = trim($info['Title']);
					$file_name = $info['file'];
					return array($artist, $title, $file_name);
				}
			}
			$pl->disconnect();
		}
		catch(PEARException $e) {
		}
		return false;
	}


	function get_cover() {
		global $COVER_SEARCH_AGAIN, $amazon_base_url,$cover_providers;

		list($fp, $artist, $album) = init_album_artist_or_die();

		$xml = fp_get_contents($fp);
		if($xml) {
			$xml = @simplexml_load_string($xml);
			if($xml) {
				$use_cache = true;
				if(isset($xml->notfound)&&is_numeric((string)$xml->notfound[0])) {
					$time = @intval((string)$xml->notfound[0]);
					if($time+$COVER_SEARCH_AGAIN<time())
						$use_cache = false;
				}
				else if(!isset($xml->image[0])&&!isset($xml->thumbnail[0])) {
					$use_cache = false;
				}

				if($use_cache) {
					$xml->addChild("cached", "true");
					echo $xml->asXML();
					exit();
				}
			}
		}


		$res = false;

		foreach($cover_providers as $cp) {
			$res = $cp($artist, $album);
			if($res&&is_array($res))
				break;
		}

		if($xml) {
			if($res&&is_array($res)) {
				foreach($res as $key => $val) {
					if(!isset($xml->$key))
						$xml->$key = (string)$val;
				}
			}
			else {
				$xml->notfound = time();
			}
		}
		else {
			if($res&&is_array($res)) {
				$res['time'] = time();
				$xml = array_to_xml($res);
			}
			else {
				$xml = array("notfound" => time());
				$xml = array_to_xml($xml);
			}
		}

		@fwrite($fp, $xml->asXML());

		@fclose($fp);
		echo $xml->asXML();
		exit();
	}

	function get_review() {
		global $amazon_review_url, $COVER_SEARCH_AGAIN;

		list($fp, $artist, $album) = init_album_artist_or_die();

		$xml = fp_get_contents($fp);
		$asin = "";
		$desc = false; 
		$review = false;
		$review_src = false;
		$no_search = false; 
		$failed = false; 
		$changed = false; 


		if($xml) {
			$xml = @simplexml_load_string($xml);
			if($xml) {
				if(isset($xml->rnotfound)&&is_numeric((string)$xml->rnotfound[0])) {
					$time = @intval((string)$xml->rnotfound[0]);
					if($time+$COVER_SEARCH_AGAIN>time())
						$no_search = true;
				}
			}
		}

		if(!$xml||(!(isset($xml->review[0])||isset($xml->desc[0]))&&!$no_search)) {
			$res = false;
			if(!amazon_wait()) {
				echo array_to_xml(array("result" => "failed"))->asXML();
				exit();
			}

			if($xml&&isset($xml->asin[0])) {
				$res = @file_get_contents($amazon_review_url . "ItemLookup&IdType=ASIN&ItemId=" . urlencode($xml->asin[0]));
				if($res)
					$res = @simplexml_load_string($res);
				$asin = false;
			}
			else {
				$res = @amazon_album_query($amazon_review_url . "ItemSearch&SearchIndex=Music&Artist=" , $artist , $album);
			}
			if($res) {
				if($res&&isset($res->Items[0])&&isset($res->Items[0]->Item[0])) {
					$p = $res->Items[0]->Item[0];
					$asin = (string) $p->ASIN;
					if(isset($p->EditorialReviews[0])) {
						$p = $p->EditorialReviews[0];
						foreach($p->EditorialReview as $er) {
							if(!$desc&&"Album Description" == (string)$er->Source) {
								$desc = (string) $er->Content;
							}
							else if(!$review) {
								$review_src = (string) $er->Source;
								$review = (string) $er->Content;
							}
						}
					}
					/* set info in xml-file... */
					if($xml) {
						if($review) {
							$xml->review_src = htmlspecialchars($review_src); 
							$xml->review = htmlspecialchars($review);
						}
						if($desc) {
							$xml->desc = htmlspecialchars($desc);
						}
						if(!isset($xml->asin[0])) {
							$xml->addChild("asin", $asin);
							$changed = true;
						}
						if(!$review&&!$desc) {
							$failed = true;
						}
						else {
							$changed = true;
						}
					}
					else {
						$xml = array();
						$xml['asin'] = $asin;
						if($desc) 
							$xml['desc'] = $desc;
						if($review) {
							$xml['review_src'] = $review_src;
							$xml['review'] = $review;
						}
						if(!$review&&!$desc)
							$failed = true; 
						$xml = array_to_xml($xml);
						$changed = true;
					}
				}
				else {
					$failed = true; 
				}
			}
			else {
				$failed = true;
			}
		}
		else {
			$xml->addChild("cached", "true");
		}

		if($xml) {
			if($failed) {
				if(isset($xml->rnotfound)) {
					$xml->rnotfound = time();
				}
				else {
					$xml->addChild("rnotfound", time());
				}
				@fwrite($fp, $xml->asXML());
			}
			else if($changed) {
				@fwrite($fp, $xml->asXML());
			}
		}
		else {
			$xml = array_to_xml(array("rnotfound" => time()));
			@fwrite($fp, $xml->asXML());
		}
		@fclose($fp);
		echo $xml->asXML();
		exit();
	}

	/* artist, title and song file name in system */
	function _get_lyric_lyricwiki($artist, $title, $file_name) {
		$file = get_lyric_filename($artist, $title);
		$fp = fsockopen("lyricwiki.org", 80);
		if(!$fp) {
			$xml = array_to_xml(array("result"=>"connectionfailed"));
			return $xml->asXML();
		}
		
		$out = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n";
		$out .= "<SOAP-ENV:Envelope SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" ";
		$out .= "xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" ";
		$out .= "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" ";
		$out .= "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ";
		$out .= "xmlns:SOAP-ENC=\"http://schemas.xmlsoap.org/soap/encoding/\" ";
		$out .= "xmlns:tns=\"urn:LyricWiki\">";
		$out .= "<SOAP-ENV:Body><tns:getSong xmlns:tns=\"urn:LyricWiki\">";
		$out .= "<artist xsi:type=\"xsd:string\">";
		$out .= htmlspecialchars($artist);
		$out .= "</artist>";
		$out .= "<song xsi:type=\"xsd:string\">";
		$out .= htmlspecialchars($title);
		$out .= "</song>";
		$out .= "</tns:getSong></SOAP-ENV:Body></SOAP-ENV:Envelope>\r\n";

		$head = "POST /server.php HTTP/1.1\r\n";
		$head .= "Host: lyricwiki.org\r\n";
		$head .= "SOAPAction: urn:LyricWiki#getSong\r\n";
		$head .= "Content-Type: text/xml; charset=UTF-8\r\n";
		$head .= "User-Agent: RemissPitchfork/0.1\r\n";
		$head .= "Content-Length: " . str_byte_count($out) . "\r\n";
		$head .= "Connection: Close\r\n\r\n";

		fwrite($fp, $head . $out);

		$responseHeader = "";
		/* assume everything is dandy */
		do {
			$responseHeader.= fread($fp, 1);
		}
		while (!preg_match('/\\r\\n\\r\\n$/', $responseHeader));

		$ret = "";
		while(!feof($fp)) {
			$ret .= fgets($fp, 128);
		}
		fclose($fp);
		/* stupid hack to get around wrong xml declearation */
		$qmark = "?";
		if(strpos($ret, "<". $qmark . "xml version=\"1.0\" encoding=\"ISO-8859-1\"".$qmark.">")===0)
			$ret = str_replace("<". $qmark . "xml version=\"1.0\" encoding=\"ISO-8859-1\"".$qmark.">",
					"<". $qmark . "xml version=\"1.0\" encoding=\"UTF-8\"".$qmark.">",
					$ret);

		/*echo $ret;
		exit();*/
		$parser = new xml2array();
		$parser->parse($ret);
		$data = find_lyrics($parser->arrOutput);
		// check that data is ok and lyrics exist
		if($data&&isset($data[2]['tagData'])) {
			$res = array();
			foreach($data as $d) {
				if($d['name']=="ARTIST") 
					$res['artist'] = $d['tagData'];
				else if($d['name']=="SONG") 
					$res['title'] = $d['tagData'];
				else if($d['name']=="LYRICS")
					$res['lyric'] = $d['tagData'];
				else if($d['name']=="URL")
					$res['url'] = $d['tagData'];
			}
			$res['from'] = "lyricwiki.org";
			$res['time'] = time();
			/* this caching thing will have to be extracted if we 
			 * put in another lyrics source */
			if(trim($res['lyric'])&&trim($res['lyric'])!="Not found") {
				$xml = array_to_xml(array("result" => $res));
				$xml->addChild("file", htmlspecialchars($file_name));
				$res = $xml->asXML();
				@file_put_contents($file, $res);
			}
			else {
				$out = array("result" => "notfound");
				if(isset($res['url']))
					$out['url'] = $res['url'];
				$res = array_to_xml($out);
				$res = $res->asXML();
			}
			return $res;
		}
		return false;
	}

	/* $file: filename of cached version
	 * $file_name: file name of song */
	function _get_lyric_cache($file, $file_name) {
		$xml = @simplexml_load_file($file);
		if($xml) {
			$add_file = true;
			if(isset($xml->file)) {
				foreach($xml->file as $f) {
					if(((string)$f)==$file_name)
						$add_file = false;
				}
			}
			if($add_file) {
				$xml->addChild("file", htmlspecialchars($file_name));
				@file_put_contents($file, $xml->asXML());
			}
			$xml->addChild("cached", "true");
			return $xml->asXML();
		}
		return false;
	}

	function get_lyric($info = null) {
		header("Content-Type: text/xml; charset=UTF-8");
		ob_end_clean();
		if(is_null($info))
			$info = get_current_info();
		if(!$info) {
			$xml = array_to_xml(array("result"=>"failed"));
			echo $xml->asXML();
			exit();
		}
		$artist = $info[0];
		$title = $info[1];
		$file_name = $info[2];

		$file = get_lyric_filename($artist, $title);
	      	if(file_exists($file)&&!isset($_GET['force'])) {
			$xml = _get_lyric_cache($file, $file_name);
			if($xml) {
				echo $xml;
				exit();
			}
		}

		$xml = _get_lyric_lyricwiki($artist, $title, $file_name);
		if($xml) {
			echo $xml;
		}
		else {
			echo array_to_xml(array("result" => "failed"))->asXML();
		}
		exit();
	}

	function get_pic() {

		global $cover_dir;
		$b_name = basename(trim($_GET['pic']));
		$name = $cover_dir . $b_name;
		if(file_exists($name)&&is_readable($name)) {
			if(function_exists("finfo_open")&&function_exists("finfo_file")) {
				$f = finfo_open(FILEINFO_MIME);	
				header("Content-Type: " . finfo_file($f, $name));
			}
			else if(function_exists("mime_content_type")) {
				header("Content-Type: " . mime_content_type($name));
			}
			else {
				header("Content-Type: image/jpeg");
			}
			$c = "Content-Disposition: inline; filename=\"";
			$c .= rawurlencode($b_name) . "\"";
			header($c);
			echo @file_get_contents($name);
			ob_end_flush();
			exit();
		}
		else {
			echo "File does not exist\n";
			trigger_error("Did not find albumart althought it was requested", E_USER_WARNING);
			exit(); 
		}
	}

	function get_recommendations_from_playlist() {
		require_once("../player/openstrands.php");
		$pl = get_playlist();
		$list = $pl->getPlaylistInfo();
		$artist = array();
		foreach($list as $song) {
			if(isset($song['Artist'])&&$song['Artist'])
				$artist[$song['Artist']] = true;
		}
		$artist = array_keys(array_change_key_case($artist));
		$pl->disconnect();

		header("Content-Type: text/xml; charset=UTF-8");
		
		$ret = strands_get_recommendations($artist);
		$res = array();
		if(!$ret || ! count($ret)) {
			$res['result'] = is_array($ret)?"notfound":"failed";
			echo array_to_xml($res)->asXML();
			exit();
		}
		$db = get_database();
		foreach($ret as $a) {
			$tmp = array();
			$tmp['name'] = $a;
			$tmp['album'] = $db->getMetadata("Album", "Artist", $a);
			$res[] = $tmp;
		}
		$out = array("result" => $res);
		$db->disconnect();
		echo array_to_xml($out)->asXML();
	}

	function do_houseclean() {
		/* this is a *very* inefficient method, but it's needed... */
		//header("Content-Type: text/xml; charset=UTF-8");
		header("Content-type: multipart/x-mixed-replace;boundary=--ThisRandomString");
		
		global $metadata_dir;
		
		echo "--ThisRandomString\n";
		$out = "Content-type: text/html\n\n".
			"<html><head><title>Housecleaning</title></head><body>\n".
			"<p>Performing housecleaning, please wait...</p>\n";

		echo "$out--ThisRandomString\n";
		ob_end_flush();
		flush();
		set_time_limit(300); // this might take a while, but 
				    // shouldn't be more than 5 mins even on slow machines
		$db = get_database();
		$res = "failed";
		try {
			$time = current_time_millis();
			$list = $db->getAll();
			if(!isset($list['file']))
				return;
			$files = $list['file'];
			$db->disconnect(); 
			$list = scandir($metadata_dir);
			$total = count($list);
			$fixed = 0;
			$errors = 0;
			$fcount = 0;
			$fcount_inv = 0;
			$tcount = 0;
			foreach($list as $f) {
				$r = strrpos($f, ".lyric");
				$tcount++;
				if($r!==false&&$r+6==strlen($f)) {
					$xml = @simplexml_load_file($metadata_dir . $f);
					$fcount++;
					if($fcount%100 == 0) {
						echo $out;	
						echo "<p>Processed $fcount (".(int)($tcount*100/$total)."%)..</p>\n";
						echo "--ThisRandomString\n";
						flush();

					}
					if($xml) {
						$x_files = array();
						foreach($xml->file as $v) {
							$x_files[] = (string)$v;
						}
						$dis = array_intersect($x_files, $files);
						if(count($dis)!=count($x_files)) {
							$dom = @dom_import_simplexml($xml);
							if($dom===false) {
								$errors++;
								continue;
							}

							while($elem = $dom->getElementsByTagName("file")->item(0)) {
								$dom->removeChild($elem);
							}

							$xml = simplexml_import_dom($dom);
							array_to_xml($dis, $xml, "file");
							@$xml->asXML($metadata_dir . $f);
							$fixed++;
						}
					}
					else {
						$fcount_inv++;
					}
				}
			}
			$result = array("time" => intval(current_time_millis() - $time), "fixed" => $fixed, "errors" => $errors);
		}
		catch(PEAR_Exception $e) {
		}
		echo "Content-type: text/html\n\n";
		echo "<p>";
		if(is_array($result)) {
			echo "Result of cleaning:<br/>\n";
			echo "$fcount files checked in " . $result['time'] . "ms of which $fcount_inv was invalid<br/>";
			echo "Fixed: " . $result['fixed'] . "<br/>";
			echo "Errors: " . $result['errors'] . "<br/>\n";

		}
		else if($result=="failed") {
			echo "It appears housecleaning failed, check your MPD settings";
		}
		else {
			echo "hmm.. somethings wrong, try again";
		}
		echo "</p><p><a href='config.php'>Back to configuration</a></p></body></html>\n";
		echo "\n--ThisRandomString\n";
	}
	
	
	if(!isset($iamincluded)) {
		if(isset($_GET['cover'])) get_cover();
		else if(isset($_GET['review'])) get_review();
		else if(isset($_GET['lyric'])) get_lyric();
		else if(isset($_GET['pic'])) get_pic(); 
		else if(isset($_GET['housecleaning'])) do_houseclean();
		else if(isset($_GET['plrecommend'])) get_recommendations_from_playlist();
		else {
			header("Content-Type: text/xml; charset=UTF-8");
			$xml = array_to_xml(array("result"=>"what do you want?"));
			echo $xml->asXML();
			exit();
		}
	}


class xml2Array {
  
   var $arrOutput = array();
   var $resParser;
   var $strXmlData;
  
   /* parse to utf-8 */
   function parse($strInputXML) {
  
	   $this->resParser = xml_parser_create("UTF-8");

           xml_set_object($this->resParser,$this);
           xml_set_element_handler($this->resParser, "tagOpen", "tagClosed");
	   xml_parser_set_option($this->resParser, XML_OPTION_TARGET_ENCODING, "UTF-8");
          
           xml_set_character_data_handler($this->resParser, "tagData");
      
           $this->strXmlData = xml_parse($this->resParser,$strInputXML );
           if(!$this->strXmlData) {
               die(sprintf("XML error: %s at line %d",
           xml_error_string(xml_get_error_code($this->resParser)),
           xml_get_current_line_number($this->resParser)));
           }
                          
           xml_parser_free($this->resParser);
          
           return $this->arrOutput;
   }
   function tagOpen($parser, $name, $attrs) {
       $tag=array("name"=>$name,"attrs"=>$attrs);
       array_push($this->arrOutput,$tag);
   }
  
   function tagData($parser, $tagData) {
	   if(isset($this->arrOutput[count($this->arrOutput)-1]['tagData'])) 
	       $this->arrOutput[count($this->arrOutput)-1]['tagData'] .= $tagData;
	   else 
	       $this->arrOutput[count($this->arrOutput)-1]['tagData'] = $tagData;
   }
  
   function tagClosed($parser, $name) {
       $this->arrOutput[count($this->arrOutput)-2]['children'][] = $this->arrOutput[count($this->arrOutput)-1];
       array_pop($this->arrOutput);
   }
}

?>
