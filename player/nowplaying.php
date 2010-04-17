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

	/* This is a slightly hidden feature
	 * Also goes to show how impractical it is to program against pitchfork core,
	 * but then again that never was the point :)
	 *
	 * usage: curl -s http://yourmpdhost/path/player/nowplaying.php
	 *
	 * in irssi you would do: 
	 * /alias np exec - -o curl -s http://..
	 *
	 * Never invoke it directly using php command, should always go through web-server
	 * (think of permissions!)
	 *
	 */

	/* If you're using a password you have a little case with specifying the password thing
	 * The only solution as of yet is to not require a password to see now playing
	 *
	 * This does not grant access to anything else though 
	 *
	 * Just uncomment this line if that is something you want to do, I might add this option to the 
	 * configure screen some day though
	 *
	 */
	$no_require_login = "true";



	require_once("../inc/base.php");
	$iamincluded = true;
	require_once("../player/metadata.php"); 
	header("Content-Type: text/plain");
	
	try {
		$pl = get_playback();
		$info = $pl->getCurrentSong();
		$pl->disconnect();

		$rlyric = "";

		if(isset($info['Artist'])&&isset($info['Title'])) {
			$file = get_lyric_filename($info['Artist'], $info['Title']);
			$lyric = false; 
			if(file_exists($file)) {
				$lyric = _get_lyric_cache($file, $info['file']);
			}
			else {
				$lyric = @_get_lyric_lyricwiki($info['Artist'], $info['Title'], $info['file']);
			}

			if($lyric!==FALSE) {
				$lyric = simplexml_load_string($lyric);
				if($lyric&&$lyric->result->lyric) {
					$lyric = (string) $lyric->result->lyric;
					$lyric = explode("\n", $lyric);
					$lines = count($lyric);
					$tmp = "";
					/* try until we hit something */
					while(strlen($tmp)<=0&&$lines>0) {
						$tmp = $lyric[rand(0, count($lyric)-1)];
						if(strlen($tmp)) {
							$rlyric = substr(trim($tmp), 0, 60);
							if($rlyric) {
								$rlyric = " -~\"" . $rlyric . "\"";

							}
						}
						$lines--;
					}
				}
			}
			echo "np: " . $info['Artist'] . " - " . $info['Title'] . $rlyric;
		}
		else {
			echo "np: ";
		        if( isset($info['Artist']))
				echo $info['Artist'] . " - ";
		        if(isset($info['Title'])) 
				echo $info['Title'] . " - ";
			if(isset($info['file']))
				echo $info['file'];
			else echo "not playing";
		}
	}
	catch(PEARException $e) {
		echo "error contacting mpd";
	}
	echo "\n";
?>
