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
	require_once("../inc/function_test.php");
	function get_checkbox_from_config($name) {
		$var = get_config($name);
		if(!is_null($var)&&strlen($var)) {
			return "checked='checked'";
		}
		return "";
	}

	function return_bytes($val) {
	    $val = trim($val);
	    $last = strtolower($val{strlen($val)-1});
	    switch($last) {
		// The 'G' modifier is available since PHP 5.1.0
		case 'g':
		    $val *= 1024;
		case 'm':
		    $val *= 1024;
		case 'k':
		    $val *= 1024;
	    }

	    return $val;
	}


	$title = "";
	@ob_start();
	require_once("../inc/base.php");
	require_once("../lang/master.php");
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
<meta name="robots" content="noindex,nofollow" />
<style type="text/css"> 
	body {
		font: 12.4px/160% sans-serif;
	}
	.main_container {
		border: 1px solid #e2e2e2;
		background-color: #f7f7f7; 
		padding-left: 8px;
		padding-bottom: 10px; 
	}
	.red-box {
		border:		1px solid #a20000;
		background-color: #ffcccc;
		padding-left: 5px;
	}
	#pinfo {
		border: 1px solid #877E6E; 
		background-color: #DEE7F7; 
		background: #f1f1f1;
		padding: 0px 5px 0px 5px;
		position: absolute;
		top: 30px;
		right: 20px;
	}
	select, input {
		font-size: 0.90em;
		line-height: 1em;
	}
</style>
<script type='text/javascript'>
	var showing = false;
	function toggle_showing_plentries() {
		var e = null;
		var i =3; 
		showing = !showing;
		while(e = document.getElementById('ple_' + i)) {
			e.style.display = showing?"":"none";
			i++;
		}
		var t = document.getElementById('plentry_show');
		t.innerHTML = showing?"&nbsp;&nbsp;Hide nonstandard [~]":"&nbsp;&nbsp;Show nonstandard [+]";
	}
</script>
<title><?php echo m("Pitchfork MPD Client Configuration"); ?></title>
</head>
<body>
<?php
	$new_config = $config?false:true;
	if(!$config) {
		$config = simplexml_load_string("<?xml version='1.0' ?>\n<root>\n</root>\n");
	}
	if(isset($_POST['submit'])) {
		$vars = array( 'mpd_host', 'mpd_port', 'mpd_pass', 'login_pass', 'update_delay', 
				'metadata_disable', 'theme', 'stop_button', 'shout_url', 'pagination', 'lang');
		foreach ($vars as $var) {
			$add = "";
			if(isset($_POST[$var])&&trim($_POST[$var])!="") 
				$add = trim($_POST[$var]);
			
			if($var=="pagination") {
				if(!is_numeric($add))
					$add = 0;
				else $add = intval($add);
			}
			else if($var=="login_pass"&&strlen($add)>0) {
				if($add== HASH_PASS)
					continue;
				$add = generate_hash($add);
			}

			
			if(isset($config->$var)) {
				$config->$var = $add;
			}
			else {
				$config->addChild($var, $add);
			}
		}

		$plentry = null;
		if(isset($config->plentry))
			$plentry = $config->plentry;
		else 
			$plentry = $config->addChild("plentry");

		foreach($pl_fields as $field) {
			$val = isset($_POST['plentry_' . $field])?"yes":"";
			$plentry->$field = $val;
		}

		// need to save config!
		if($config->asXML("../config/config.xml")) {
			header("Location: index.php");
			echo "<p>If you're not redirected, go here: <a href='index.php'>player</a></p>";
			exit();
		}
		else {
			echo "<p class='error'>Could not save your configuration, check that config/config.xml is writeable</p>\n";
		}
	}

	if(!is_writeable("../config")) {
		echo "<p class='red-box'>";
		echo m("Warning: Your config/ directory is not writeable! Please change owner of directory to apache user.");
		echo "</p>\n";
	}
	@ob_end_flush();

?>



<div class='main_container' id='main_container'>

<h1>Pitchfork configuration</h1>

<?php if(isset($_GET['new_config'])) 
	echo "<p>" . m("Let us take a minute to configure this player") . "</p>\n";
   else echo "<p>" . m("Configure settings") . "</p>";
?>
<form action="config.php<?php echo $new_config?'?new_config':''; ?>" method="post">
<h2><?php echo m("Connection-settings"); ?> </h2>
<p><?php echo m("Where can I find your MPD-server?"); ?></p>
<table>
<tr><td><?php echo m("Hostname:"); ?> </td>
<td><input type='text' value='<?php echo  htmlspecialchars(get_config('mpd_host', 'localhost')) ?>' name='mpd_host' /></td></tr>
<tr><td><?php echo m("Port:");?>
</td><td><input type='text' value='<?php echo htmlspecialchars(get_config('mpd_port', '6600')) ?>' name='mpd_port' /></td></tr>
<tr><td><?php echo m("Password:");?>
</td><td><input type='password' value='<?php echo htmlspecialchars(get_config('mpd_pass', '')) ?>' name='mpd_pass' /></td></tr>

</table>
<h2><?php echo m("User interface");?></h2>
<p><?php echo m("Some other settings!");?><br/></p>
<table>
<tr><td><?php echo m("Update time:"); ?> 
</td><td><input type='text' title='<?php echo m("How often we should request updates from the server");?>' value='<?php echo htmlspecialchars(get_config('update_delay', '1')) ?>' name='update_delay' /></td></tr>
	<tr><td><?php echo m("Login password (optional):");?>
	</td><td><input type='password' title='<?php echo m("If you want to require a password to see these pages you may specify it here");?>' value='<?php 
	
	$pass = get_config('login_pass', '');
	if(substr($pass,0, 4)=="sha:") {
		echo HASH_PASS;
	}
	else {
		echo htmlspecialchars($pass);
	}

?>' name='login_pass' /></td></tr>
<tr><td><?php echo m("Theme:");?> </td>
<td>
<select name='theme'>
<?php
$themes = get_available_themes();
$ctheme = get_config("theme", "default");
foreach($themes as $theme) {
	echo "\n<option value='$theme' ";
	if($theme==$ctheme)
		echo "selected='selected' ";
	echo ">$theme</option>";
}

?>
</select>
</td>
</tr>
<tr><td><?php echo m("Language:");?> </td><td>
<select name="lang">
<?php 
	// TODO: move
	$languages = array("eu" => "Basque", "en" => "English", "fr" => "French", "de" => "German");
	$clang = get_config("lang", "en");
	foreach($languages as $l => $n) {
		echo "\n<option value='$l'";
		if($l==$clang)
			echo " selected='selected' ";
		echo ">$n</option>";
	}
?>
</select>
</td></tr>

<tr><td><?php echo m("Include stop button:");?></td><td>
<input type='checkbox' <?php if(!is_null(get_config("stop_button"))) echo "checked='checked'"; ?> name='stop_button' value='yesplease' />
</td></tr>
<tr><td><?php echo m("Pagination:");?></td><td><input name='pagination' type='text' value="<?php echo get_config("pagination", 0); ?>" 
title="<?php echo m("Maximum number of entries pr. page. Set to 0 to disable.");?>" size="5" /></td></tr>
<tr><td>&nbsp; </td><td> </td></tr>
<tr><td colspan="2"><?php echo m("Show these fields in the playlist:");?> </td></tr>
<tr><td>&nbsp;</td><td><input type='checkbox' disabled='disabled' checked='checked' id='tnode_1' /> <label for='tnode_1'>
<?php echo m("Position"); ?></label></td></tr>
<?php

$selected_fields = get_selected_plfields();
$length = count($pl_fields);
for($i=0; $i<$length;$i++) {
	if($i==3) {
		echo "<tr><td colspan='2' style='cursor: pointer;' id='plentry_show' onclick='toggle_showing_plentries();'>&nbsp;&nbsp;";
		echo m("Show nonstandard") . " [+]</td></tr>";
	}
	echo "<tr id='ple_$i' ";
	if($i>=3)
		echo "style='display: none; ' ";
	echo "><td>&nbsp;</td><td>";
	echo "<input type='checkbox' ";
	if($selected_fields[$i])
		echo "checked='checked' ";
	echo "name='plentry_".$pl_fields[$i]."' id='pl_i_$i' /> <label for='pl_i_$i'>".$pl_fields[$i]."</label></td></tr>\n";
}

?>
<tr><td>&nbsp;</td><td><input type='checkbox' disabled='disabled' checked='checked' id='tnode_2' /> <label for='tnode_2'> Time</label></td></tr>
</table>
<h2>Metadata</h2>
<p><?php echo m("Configuration for retrieving metadata. This requires that the machine pitchfork is running on can access the internet."); ?></p>
<table>
<tr><td><?php echo m("Disable metadata:"); ?> </td><td><input type='checkbox' <?php echo get_checkbox_from_config('metadata_disable') ?> name='metadata_disable' /></td></tr>
</table>
<h2><?php echo m("Shoutcast integration"); ?></h2>
<p>
<?php echo m("Optionally specify the URL to the shout stream provided by mpd to enable integration with pitchfork.");?> <br/>
<input size="35" type='text' name='shout_url' value='<?php if(!is_null(get_config("shout_url"))) echo htmlspecialchars(get_config("shout_url")); ?>' />
</p>
<p style='padding: 12px 0px 12px 00px;'>
<input name='cancel' type='button' value='Cancel' onclick='window.location = "index.php" ' />
<input name='submit' type="submit" value="Save" />
</p>
</form>
<?php if(!isset($_GET['new_config'])) { ?>
<hr/>
<p>
For lyrics search to work in the directory browser file-names has to be saved with the lyrics, however when you move/delete files from your library this file reference become wrong. This button removes any references to such files.
<br/>
<span id='housecleaning_info'></span>
<input type='button' value='Housecleaning' onclick='location.href="metadata.php?housecleaning"'/>
</p>
<?php } 

function print_yesno($test, $fatal) {
	if($test) return "<span style='color: green;'>" . m("Yes") . "</span>";
	else return "<span style='color: " . ($fatal?"red":"orange") . ";'>" . m("No") . "</span>";
}

// function_name:fatal (0/1)
function test_function($stuff) {
	$stuff = explode(":", $stuff);
	$name = $stuff[0];
	echo $name . ": ";
	echo print_yesno(function_exists($name), $stuff[1]);
	echo "<br/>\n";
}

?>

<div id='pinfo'>
<h2><?php echo m("Pitchfork info"); ?></h2>
<p style='padding: 0px 0px 4px 0px;'>
<?php 
	echo m("Release version:") . " $release_version<br/>\n";
	echo m("Release date:") . " $release_date<br/><br/>\n";
	$pl = get_playback();
	$has_commands = true;
	try {
		if($pl) {
			$commands = $pl->getCommands();
			/* these are just some of the needed commands */
			$needed = array("outputs", "disableoutput", "enableoutput", "plchangesposid");
			$res = array_intersect($needed, $commands);
			if(count($res)!=count($needed))
				$has_commands = false;
			$pl->disconnect();
		}
	}
	catch(PEAR_Exception $e) {
		$has_commands = false;
	}

	echo m("Connect to mpd:"). " ". print_yesno($pl, true) . "<br/>\n";
	if($pl) {
		echo m("MPD commands:")." " . print_yesno($has_commands, true) . "<br />\n";
	}
	echo m("Metadata directory:"). " " . print_yesno((file_exists($metadata_dir)&&is_writeable($metadata_dir))
				||(!file_exists($metadata_dir)&&is_writeable($config_dir)), true);
?>
</p>

<h3><?php echo m("Functions:"); ?></h3>
<p style='padding: 0px 0px 4px 0px; '>
<?php 
	// name:fatal
	foreach(array("json_encode:0", "simplexml_load_string:1", "mb_internal_encoding:0") as $f)
		test_function($f);
	echo "SimpleXMLaddChild: ";
	$sxe = array_to_xml(array("test"));
	if($sxe)
		echo print_yesno(is_callable(array($sxe, "addChild"), true), true) . "<br/>";
	else echo "<span class='color: red'>error</span>\n";
	$mem = ceil(return_bytes(ini_get("memory_limit"))/(1024*1024));
	echo m("PHP memory limit:") . " <span style='color: " . ($mem<32?"orange":"green") . "'>" . $mem . "MB</span>";

?>
</p>
<?php
	if(get_magic_quotes_runtime()) {
		echo "<p style='color: orange'>";
		echo m("Warning: Magic quotes runtime is on, <br/>please use pitchfork.conf or turn<br/> of manually.");
		echo "</p>\n";
	}
	if(get_magic_quotes_gpc()) {
		echo "<p style='color: orange'>";
		echo m("Warning: Magic quotes gpc is on, <br/>please use pitchfork.conf or turn<br/> of manually.");
		echo "</p>\n";
	}

?>
</div>

</div>

</body>
</html>
