<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * MPD Interaction API
 *
 * Net_MPD deals with socket interaction with MPD to ease the
 * use of MPD in web applications.
 *
 * PHP Version 5
 *
 * @package   Net_MPD
 * @category  Networking
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   PHP License 3.01
 * @version   CVS: $ID:$
 */

/**
 * API for the playlist portion of Music Player Daemon commands
 *
 * Used for maintaining, creating, and utilizing playlists in MPD
 *
 * @category  Networking
 * @package   Net_MPD
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   http://www.php.net/license/3_01.txt
 * @vers
 */
class Net_MPD_Playlist extends Net_MPD_Common
{
    /**
     * List playlists in specified directory
     *
     * @param $dir string directory path, optional
     * @return bool true on success int on failure
     */
    public function getPlaylists($dir = '')
    {
	$out = $this->runCommand('lsinfo', $dir);
	return $out['playlist'];
    }

    /**
     * Search for data in the playlist
     *
     * @param array $params         array('search_field' => 'search for')
     * @param bool  $caseSensitive  True for case sensitivity, false for not [default false]
     * @return array
     */
    public function find($params, $caseSensitive = false)
    {
        $prms = array();
        foreach($params as $key => $value) {
            $prms[] = $key;
            $prms[] = $value;
        }
        $cmd = $caseSensitive ? 'playlistfind' : 'playlistsearch';
	
        $out = $this->runCommand($cmd, $prms);
        if (!isset($out['file'])) {
            return array();
        }
        return $out['file'];
    }

    /* Tests whether playlistfind is avilable. If playlistfind 
     * is available playlistsearch is as well
     *
     * @return boolean
     */
    public function hasFind() {
        return $this->hasCommand("playlistfind");
    }

    /**
     * Add file to playlist
     *
     * @param $file string filename
     * @return bool
     */
    public function addSong($file)
    {
	$this->runCommand('add', $file);
	return true;
    }



    /**
     * Clear the playlist
     *
     * @return bool
     */
    public function clear()
    {
	$this->runCommand('clear');
	return true;
    }



    /**
     * Gets the current song and related information
     *
     * @return array of data
     */
    public function getCurrentSong()
    {
	$out = $this->runCommand('currentsong');
	if (!isset($out['file'][0])) {
	    return false;
	}
	return $out['file'][0];
    }



    /**
     * Delete song from playlist
     *
     * @param $song int song position in playlist
     * @return bool
     */
    public function deleteSong($song)
    {
	$this->runCommand('delete', $song);
	return true;
    }



    /**
     * Delete song from playlist by song Id
     *
     * @param $id int song Id
     * @return bool
     */
    public function deleteSongId($id)
    {
	$this->runCommand('deleteid', $id);
	return true;
    }



    /**
     * Loads a playlist into the current playlist
     *
     * @param $playlist string playlist name
     * @return bool
     */
    public function loadPlaylist($playlist)
    {
	$this->runCommand('load', $playlist);
	return true;
    }



    /**
     * Move song in the playlist
     *
     * @param $from int song position in the playlist
     * @param $to int song position to move it to
     * @return bool
     */
    public function moveSong($from, $to)
    {
	$this->runCommand('move', array($from, $to));
	return true;
    }



    /**
     * Move song in the playlist by Id
     *
     * @param $from int song Id
     * @param $to int song Id to move it to
     * @return bool
     */
    public function moveSongId($fromId, $toId)
    {
	$this->runCommand('moveid', array($fromId, $toId));
	return true;
    }



    /**
     * Displays metadata for songs in the playlist by position Id
     *
     * @param $song int song position, optional
     * @return array of song metadata
     */
    public function getPlaylistInfo($song = null)
    {
	$out = $this->runCommand('playlistinfo', $song, 0);
	return isset($out['file']) ? $out['file'] : array();
    }



    /**
     * Displays metadata for songs in the playlist
     *
     * @param $song int song Id, optional
     * @return array of song metadata
     */
    public function getPlaylistInfoId($song = null)
    {
	return $this->runCommand('playlistid', $song);
    }



    /**
     * Get playlist changes
     *
     * @param $version int playlist version
     * @param $limit boolean true to limit return
     *               to only position and id
     *
     * @return array of changes
     */
    public function getChanges($version, $limit = false)
    {
        $cmd = $limit ? 'plchangesposid' : 'plchanges';
	
	return $this->runCommand($cmd, $version);
    }



    /**
     * Delete a playlist
     *
     * @param $playlist string playlist name
     * @return true
     */
    public function deletePlaylist($playlist)
    {
	$this->runCommand('rm', $playlist);
	return true;
    }



    /**
     * Save the playlist
     *
     * @param $playlist string playlist name
     * @return bool
     */
    public function savePlaylist($playlist)
    {
	$this->runCommand('save', $playlist);
	return true;
    }



    /**
     * Shuffle the playlist
     *
     * @return true
     */
    public function shuffle()
    {
	$this->runCommand('shuffle');
	return true;
    }



    /**
     * Swap song by position in the playlist
     *
     * @param $song1 int song position from
     * @param $song2 int song position to
     * @return bool
     */
    public function swapSong($song1, $song2)
    {
	$this->runCommand('swap', array($song1, $song2));
	return true;
    }



    /**
     * Swaps a song with another song, by Id
     *
     * @param $song1 int Id of the first song
     * @param $song2 int Id of the second song
     * @return true
     */
    public function swapSongId($songId1, $songId2)
    {
	$this->runCommand('swapid', array($songId1, $songId2));
	return true;
    }
}
?>
