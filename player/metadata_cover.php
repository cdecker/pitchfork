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

	$amazon_cover_url = $amazon_base_url . "&Operation=ItemSearch&SearchIndex=Music&ResponseGroup=Images";
	$cover_providers = array("directory_cover", "amazon_search_cover");

	/* If you want to use this you'll need php-gd as well */
	/* first %s will be replaced by Artist and second %s will be replaced by Album */
	/* can be local path or url (http://someserver/path/%s/%s/cover.jpg will become
	   e.g. http://someserver/path/Escape The Fate/Dying Is Your Latest Fashion/cover.jpg */
	//$directory_search_url = "/path/to/somehere/%s/%s.jpg";
	$directory_search_url = false;

	function amazon_search_cover($artist, $album) {
		global $amazon_cover_url, $metadata_dir;

		$xml = amazon_album_query($amazon_cover_url, $artist, $album);
		if($xml) {
			if(isset($xml->Items[0])&&isset($xml->Items[0]->Item[0])) {
				$item = $xml->Items[0]->Item[0];
				$small = false;
				$small_name = false;
				$large = false;
				$large_name = false;
				
				if(isset($item->SmallImage[0])) {
					$small = @file_get_contents($item->SmallImage[0]->URL[0]);
					if($small) {
						$small_name = escape_name($artist) . "-" . escape_name($album) . basename($item->SmallImage[0]->URL[0]);
						if(!@file_put_contents($metadata_dir . $small_name, $small)) {
							$small = false;
						}
					}
				}
				if(isset($item->LargeImage[0])) {
					$large = @file_get_contents($item->LargeImage[0]->URL[0]);
					if($large) {
						$large_name = escape_name($artist) . "-" . escape_name($album) . basename($item->LargeImage[0]->URL[0]);
						if(!@file_put_contents($metadata_dir . $large_name, $large)) {
							$large = false;
						}
					}
				}
				else if(isset($item->MediumImage[0])) {
					$large = @file_get_contents($item->MediumImage[0]->URL[0]);
					if($large) {
						$large_name = escape_name($artist) . "-" . escape_name($album) . basename($item->MediumImage[0]->URL[0]);
						if(!@file_put_contents($metadata_dir . $large_name, $large)) {
							$large = false;
						}
					}
				}
				if($small && $large) {
					$data = array();
					$data['asin'] = $item->ASIN[0];
					$data['thumbnail'] = $small_name;
					$data['image'] =  $large_name;
					return $data;
				}
			}
		}
		return false;
	}

	function directory_cover($artist, $album) {
		global $directory_search_url, $metadata_dir;

		if(!$directory_search_url) 
			return false;
		
		$artist = escape_name($artist);
		$album = escape_name($album);

		$name = sprintf($directory_search_url, $artist, $album);

		return make_thumb_and_store_image($name, get_cover_base_name($artist, $album));
	}

	/* yay for me and function names */
	function make_thumb_and_store_image($file, $store_bname) {
		// only supports jpeg for now..
		$max_size = 75; 
		$image = @imagecreatefromjpeg($file);
		if(!$image)
			return false;

		$ix = imagesx($image);
		$iy = imagesy($image);
		$rx = $ry = $max_size;
		
		$max_i = $ix>$iy?$ix:$iy;
		$res = array();
		$res['image'] = basename($store_bname . ".jpg");
		if(!@imagejpeg($image, $store_bname . ".jpg", 90)) {
			return false;
		}
		if($max_i>$max_size) {
			$ratio = (double)$max_i/(double)$max_size;
			$rx = (int)((double)$ix/$ratio);
			$ry = (int)((double)$iy/$ratio);
			$thumb = imagecreatetruecolor($rx,$ry);
			imagecopyresampled($thumb, $image, 0,0,0,0, $rx, $ry, $ix, $iy);
			$res['thumbnail'] = basename($store_bname . "_thumb.jpg");
			if(!@imagejpeg($thumb, $store_bname . "_thumb.jpg", 90)) {
				return false;
			}
		}
		else {
			$res['thumb'] = $res['image'];
		}
		return $res;
	}
?>
