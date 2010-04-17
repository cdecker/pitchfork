<?php
if(function_exists("mb_internal_encoding"))
	mb_internal_encoding("UTF-8");
define('HASH_PASS', "********");
define('SALT_LENGTH', 15);

session_start();

/* make sure . is first in include path */
set_include_path("." . PATH_SEPARATOR . get_include_path());
require_once('Net/MPD.php');

$release_version = "0.5.5";
$release_date = "18-01-2008";

$config_dir = "../config";

/* should be metadata_dir, no time to change now TODO */
$cover_dir = "$config_dir/metadata/"; 
$metadata_dir = $cover_dir;


$theme_dir = "../theme/";

$config = @simplexml_load_file("../config/config.xml");
$error_msg = false;

/* playlist fields */
$pl_fields = array("Title", "Album", "Artist", "Track", "Name", "Genre", "Date", "Composer", "Performer", "Comment", "Disc");

if(!$config&&!isset($_GET['new_config'])) {
	header("Location: config.php?new_config=true") or die("Unable to redirect, go here <a href='config.php?new_config=true'>config</a>");
	exit(); 
}

$language = get_config("lang", "en");


$selected_theme = get_config("theme", "default");
if(!is_theme_dir_ok($theme_dir . $selected_theme)) 
	$selected_theme = "default";

$lpass = get_config('login_pass');

if(!is_null($lpass)&&$lpass!="") {
	if(!isset($_SESSION['logged_in'])||!$_SESSION['logged_in']) {
		if(!isset($no_require_login)) {
			header("Location: login.php");
			echo "Wrong password";
			exit();
		}
	}
}

function get_config($name, $default = null) {
	global $config;
	if(isset($config->$name)) {
		if(trim($config->$name)=="")
			return $default;
		return ((string)$config->$name);
	}
	else {
		return $default;
	}
}

function get_selected_plfields() {
	global $config, $pl_fields;
	$plentry = false;
	if(isset($config->plentry)) 
		$plentry = $config->plentry;
	$ret = array();
	$i = 0;
	foreach($pl_fields as $field) {
		if($plentry) {
			$ret[] = ((string)$plentry->$field)!="";
		}
		else {
			$ret[] = $i++<3;
		}
	}
	return $ret;
}

function set_config($name, $value) {

}
/* if a key is found to be numeric it will be replaced by numb_replace 
*/
function array_to_xml($arr, $xml = null, $numb_replace = "elem") {
	if(is_null($xml)) {
		$xml = simplexml_load_string("<?xml version='1.0' ?><root/>");
	}
	foreach($arr as $key => $value) {
		if(is_numeric($key)) 
			$key = $numb_replace;
		if(is_array($value)) {
			$tmp = $xml->addChild($key);
			array_to_xml($value, $tmp, $numb_replace);
		}
		else {
			$xml->addChild($key, htmlspecialchars($value));
		}
	}
	return $xml;
}

function get_mpd($type) {
	try {
		$port = 6600;
		if(is_numeric(get_config("mpd_port")))
			$port = (int) get_config("mpd_port");
		$ret = Net_MPD::factory($type, get_config('mpd_host'), intval($port), get_config("mpd_pass"));
		$ret->connect();
		return $ret;
	}
	catch(PEAR_Exception $e) {
		return false;
	}
}
function get_playlist() {
	return get_mpd("Playlist");
}
function get_playback() {
	return get_mpd("Playback");
}
function get_database() {
	return get_mpd("Database");
}
function get_admin() {
	return get_mpd("Admin");
}

/* mimic behaviour of java System.currentTimeMillis() */
// ex: 1172151695935.8
function current_time_millis() {
	return microtime(true)*1000;
}

// returns array with available themes
function get_available_themes() {
	global $theme_dir;
	$dirs = scandir($theme_dir);
	$themes = array();
	foreach($dirs as $dir) {
		if($dir=="."||$dir=="..")
			continue;

		if(is_theme_dir_ok($theme_dir . $dir)) {
			$themes[] = $dir;
		}
	}
	return $themes;
}

function is_theme_dir_ok($tdir) {
	return is_dir($tdir) && file_exists($tdir . "/theme.css")  && file_exists($tdir . "/theme.js");
}

function generate_hash($val, $salt = false) {
	if(function_exists("hash")) {
		if($salt===false)
			$salt = substr(md5(uniqid(rand(), true)), 0, SALT_LENGTH);
		
		$p = hash("sha256", $val . $salt);
		return "sha:" . $p . $salt;
	}
	else return $val;
}
function check_hash($proper, $check) {
	$len = strlen($proper);
	$nhash = generate_hash($check, substr($proper, $len-SALT_LENGTH));
	if($proper==$nhash) {
		return true;
	}
	return false;
}

/* someone find me a php equiv */
function str_byte_count($data) {
	if(function_exists("mb_strlen")) {
		/* count bytes, not characters if utf-8, 
		 * I imagine this works, but hard to actually test  */
		return mb_strlen($data, "ascii");
	}
	else {
		return strlen($data);
	}
}
?>
