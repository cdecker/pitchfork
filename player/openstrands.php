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

	function strands_send_request($url) {
		$STRANDS_URL = "https://www.mystrands.com/services";

		$url = $STRANDS_URL . $url . "&subscriberId=5a05bc1dd3d608e96c8d336daf3544c5";
		$xml = @file_get_contents($url);
		$xml = @simplexml_load_string($xml);
		return $xml;
	}

	/*
	 * artists must be an array
	 */
	function strands_get_recommendations($artists) {
		$url = "num=15&";
		foreach($artists as $a) 
			$url .= "&name=" . urlencode($a);
		$url = "/recommend/artists?" . $url;

		$res = strands_send_request($url);

		if(!$res)
			return false;

		$ret = array();
		if(!$res->SimpleArtist) return $ret;

		foreach($res->SimpleArtist as $sa) {
			if($sa->ArtistName)
				$ret[] = (string)$sa->ArtistName;

		}
		return $ret;
	}

?>
