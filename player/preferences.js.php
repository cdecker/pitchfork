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
	header("Content-Type: text/javascript");
	$delay = get_config("update_delay");
	$disable_amazon = get_config("amazon_link_disable");
	$metadata_disable = get_config("metadata_disable");

	if(is_null($delay)||!is_numeric($delay)) {
		$delay = 1;
	}

	echo "var update_delay = " . $delay . ";\n";

	if(is_null($metadata_disable)) {
		$metadata_disable = "false";
	}
	else $metadata_disable = "true";
	echo "var metadata_disable = " . $metadata_disable . ";\n";

	echo "var stop_button = ";
	if(is_null(get_config("stop_button"))) {
		echo "false";
	}
	else {
		echo "true";
	}
	echo ";\n";


	echo "var pl_entries = new Array('Pos', ";
	
	$selected = get_selected_plfields();
	$length = count($pl_fields);
	for($i=0; $i<$length; $i++) {
		if($selected[$i])
			echo "'" . $pl_fields[$i] . "', ";
	}

	echo "'Time');\n";

	echo "var SHOUT_URL=";
	$shout = get_config("shout_url");
	if(!is_null($shout))
		echo "\"" . str_replace("\"", "\\\"", $shout) . "\"";
	else echo "false";
	echo ";\n";
	
	echo "var pagination_max = " . get_config("pagination", "0") . ";\n";

	echo "\n";
?>
