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


require_once 'PEAR/Exception.php';
require_once 'MPD/Common.php';


/**
 * Central class for the Music Player Daemon objects
 *
 * Used to utilize the functionality of the provided classes
 *
 * @category  Networking
 * @package   Net_MPD
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   http://www.php.net/license/3_01.txt
 * @version   CVS: $ID:$
 */
class Net_MPD
{
    /**
     * The Net_MPD_Admin object
     */
    public $Admin;

    /**
     * The Net_MPD_Common object
     */
    public $Common;

    /**
     * The Net_MPD_Database object
     */
    public $Database;

    /**
     * The Net_MPD_Playback object
     */
    public $Playback;

    /**
     * The Net_MPD_Playlist object
     */
    public $Playlist;

    /**
     * Creates new instances of objects
     * @param $host Host to connect to, optional (default: localhost)
     * @param $port Port to connect to, optional (default: 6600)
     * @param $pass Pass to connect to, optional (default: null)
     * @return object or false on failure
     */
    function __construct($host = 'localhost', $port = 6600, $pass = null)
    {
        $this->Admin    = self::factory('Admin'   , $host, $port, $pass);
        $this->Common   = self::factory('Common'  , $host, $port, $pass);
        $this->Database = self::factory('Database', $host, $port, $pass);
        $this->Playback = self::factory('Playback', $host, $port, $pass);
        $this->Playlist = self::factory('Playlist', $host, $port, $pass);
    }

    /**
     * Creates new instances of objects
     * @param $class Class to initiate, with out Net_MPD_$class
     * @param $host Host to connect to, optional (default: localhost)
     * @param $port Port to connect to, optional (default: 6600)
     * @param $pass Pass to connect to, optional (default: null)
     * @return object or false on failure
     */
    public static function factory($class, $host = 'localhost', $port = 6600, $pass = null)
    {
        $class = ucfirst(strtolower($class));

        if (!self::_loadClass($class)) {
            return false;
        }

        $class = 'Net_MPD_' . $class;
        $obj = new $class($host, $port, $pass);

        return $obj;
    }

    /**
    * Loads the class
    * @param $class Class to include, with out Net_MPD_
    * @return bool
    */
    protected static function _loadClass($class)
    {
        if (class_exists('Net_MPD_' . $class)) {
            return true;
        }
        require_once 'Net/MPD/' . $class . '.php';
        return true;
    }
}
?>