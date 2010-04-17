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

	/* test for required stuff */
	$fn_prob = false;

	foreach(array("simplexml_load_string", "simplexml_load_file") as $fn) {
		if(!function_exists($fn)) {
			$fn_prob = $fn_prob?"$fn_prob $fn":"$fn";
		}
	}

	if($fn_prob) {
		echo "You are missing function(s): $fn_prob. Cowardly bailing out..\n";
		echo "This means that your php installation is either compiled without simplexml support or you have an old version of PHP. Version 5.1.3 or later is required.\n";
		exit();
	}

?>
