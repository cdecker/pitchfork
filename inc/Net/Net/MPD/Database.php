<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Music Player Daemon API
 *
 * PHP Version 5
 *
 * LICENSE: This source file is subject to version 3.01 of the PHP license
 * that is available thorugh the world-wide-web at the following URI:
 * http://www.php.net/license/3_01.txt. If you did not receive a copy of
 * the PHP License and are unable to obtain it through the web, please
 * send a note to license@php.net so we can mail you a copy immediately.
 *
 * @category  Networking
 * @package   Net_MPD
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   http://www.php.net/license/3_01.txt
 * @version   CVS: $ID:$
 */

/**
 * API for the database portion of Music Player Daemon commands
 *
 * Used for maintaining and working with the MPD database
 *
 * @category  Networking
 * @package   Net_MPD
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   http://www.php.net/license/3_01.txt
 * @version   CVS: $ID:$
 */
class Net_MPD_Database extends Net_MPD_Common
{
    /**
     * Case sensitive search for data in the database
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
        $cmd = $caseSensitive ? 'find' : 'search';
	
	$out = $this->runCommand($cmd, $prms);
	if (!isset($out['file'])) {
	    return array();
	}
	return $out['file'];
    }



    /**
     * List all metadata of matches to the search
     *
     * @param string $metadata1 metadata to list
     * @param string $metadata2 metadata field to search in, optional
     * @param string $search    data to search for in search field,
     *                          required if search field provided
     * @return array
     */
    public function getMetadata($metadata1, $metadata2 = null, $search = null)
    {
        //Make sure that if metadata2 is set, search is as well
        if (!is_null($metadata2)) {
            if (is_null($search)) {
                return false;
            }
        }
	if (!is_null($metadata2)) {
	    $out = $this->runCommand('list', array($metadata1, $metadata2, $search), 1);
	} else {
	    $out = $this->runCommand('list', $metadata1, 1);
	}
	return $out[$metadata1];
    }



    /**
     * Lists all files and folders in the directory recursively
     *
     * @param $dir string directory to start in, optional
     * @return array
     */
    public function getAll($dir = '')
    {
	return $this->runCommand('listall', $dir, 1);
    }



    /**
     * Lists all files/folders recursivly, listing any related informaiton
     *
     * @param $dir string directory to start in, optional
     * @return array
     */
    public function getAllInfo($dir = '')
    {
	return $this->runCommand('listallinfo', $dir);
    }

    /**
     * Lists content of the directory
     *
     * @param $dir string directory to work in, optional
     * @return array
     */
    public function getInfo($dir = '')
    {
	return $this->runCommand('lsinfo', $dir);
    }
}
?>
