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

	include_once("../inc/function_test.php");
	require_once('../inc/base.php');
	require_once("../lang/master.php");
	header("Content-Type: text/html; charset=UTF-8");
	header("Expires: Mon, 26 Jul 1997 05:00:00 GMT"); // Date in the past
	header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT"); // always modified
	header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0"); // HTTP/1.1
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache"); // HTTP/1.0
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html>
	<head>
		<link rel="stylesheet" type="text/css" href="../std/base.css" /> 
		<link rel="stylesheet" type="text/css" href="../theme/<?php echo htmlentities($selected_theme); ?>/theme.css" /> 
<?php 
	$scripts = array("player/preferences.js.php", "lang/en.js", "std/collection.js", "std/toolkit.js", "std/streaming.js",
	       	"std/plsearch.js", "std/playlist.js", "std/keyboard.js", "std/browser.js", "std/quickadd.js", 
		"std/command.js",  "theme/" . htmlentities($selected_theme) . "/theme.js" );
		if($language != "en")
			$scripts[] = "lang/".$language.".js";

		if(is_null(get_config("metadata_disable")))
			$scripts[] = "std/metadata.js";

		foreach($scripts as $script)
			echo "\t\t<script type=\"text/JavaScript\" src=\"../".$script."\"></script>\n";
		?>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<meta name="robots" content="noindex,nofollow" />
		<title>Pitchfork MPD Client</title>
	</head>
<body onload='init_player()'>

<div class='player_control' style='' id='player_control'>
	
	<div id='status_bar'>
		<p id='status_bar_txt'></p>
		<img id='status_bar_img' class='status_working' />
	</div>

	<div id='albumart'></div>
	<div class='pc_artist' >
		<p class='disp'><span id='disp_title'></span><br/></p>
		<p class='disp' ><span id='disp_artist'></span><br/></p>
		<p class='disp'><span id='disp_album'></span> <span id='disp_year'></span><br/></p>
	</div>

	<div class='pc_ci' >
		<div class='nomargin'>
		<img id='previous_button' class='act_button fakelink'/>
		<img id='stop_button' style='display: none; ' class='act_button fakelink' />
		<img id='pp_button' class='act_button fakelink' />
		<img id='next_button' class='act_button fakelink'/>
		</div>
		<p class='disp'><span id="disp_info"></span></p>
		<input type='text' id='quickadd' value='<?php echo m("Quick add"); ?>' />
		<div id='qa_suggestions' ><p id='qa_suggestions_txt' ></p></div>
	</div>

	<div class='pc_sliders'>
		<div id='posslider' ></div>
		<div id="volslider" ></div> 
	</div>
	
	<div class='pc_settings'>
	<div id='settings_header' class='settings_header'><p class='nomargin' style='padding-left: 10px;'><?php echo m("Server settings"); ?></p></div>
		<div class='settings_container' id='settings_container'><p id='settings_content'></p></div>
	</div>

	<div class='pc_other'><ul class='nomargin'>
		<li class='menuitem fakelink' title="<?php echo m("Add playlists or audio-files"); ?>" 
				id='playlist_add'><?php echo m("Add playlist"); ?></li>
		<li class='menuitem fakelink' title="<?php echo m("Save current playlist"); ?>" 
				id='playlist_save'><?php echo m("Save playlist"); ?></li>
		<li class='menuitem fakelink' title='<?php echo m("Search current playlist"); ?>' 
				id='playlist_search_btn' ><?php echo m("Search playlist"); ?></li>
		<li class='menuitem' ><a class='pc_other' href='config.php'><?php echo m("Configure"); ?></a></li>

		<?php 
		if(!is_null(get_config("shout_url"))) 
			echo "\t\t<li class='menuitem fakelink' title='" . m("Start streaming to browser") . "' id='streaming_open'>". 
				m("Streaming") . "</li>\n";
		if(is_null(get_config('metadata_disable'))) { 
			echo "\t\t<li title='" . m("Get music recommendations based on current playlist") . "' id='recommendation_open' ".
				"class='menuitem fakelink'>".  m("Recommendation") . "</li>\n";
			echo "\t\t<li title='" . m("Get more information about this song/album") . "' id='metadata_open' class='menuitem fakelink'>".
				m("Song Info") . "</li>\n";

		}
		?>
	</ul></div>
</div>

<div class='selection_menu'>
<img id='crop_items_button' class='menu_button fakelink' title="<?php echo m("Crop to selection"); ?>" />
<img id='remove_items_button' class='menu_button fakelink' title="<?php echo m("Remove selection"); ?>" />
<img id='open_directory_button' class='menu_button fakelink' title="<?php echo m("Open directory"); ?>" />
</div>

<div id='content'>
<table id='playlist' ></table>
</div>

<div id="sidebar_header"><p class='nomargin'><span class='fakelink' id='metadata_open_lyrics'>[<?php echo m("Lyrics"); ?>]</span> <span id='metadata_open_description' class='fakelink'>[<?php echo m("Album description"); ?>]</span> <span id='metadata_open_review' class='fakelink'>[<?php echo m("Album review"); ?>]</span> <span id='metadata_close' class='fakelink'>[<?php echo m("Close"); ?>]</span></p></div>
<div id='sidebar_display'><p class='nomargin' id='sidebar_display_txt'> </p></div>

<div id='pagination_options'><img class="pagination_options" src='' id='pagination_jump_current'/><img class="pagination_options" src='' id='pagination_follow_current'/></div>
<?php if(get_config("pagination", "0")!="0") {?>
<div id='pagination'><ul id='pagination_list'></ul></div>
<div id='pagination_spacer'> </div>
<?php } ?>

</body>
</html>
