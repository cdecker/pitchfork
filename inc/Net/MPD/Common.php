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
 * API for the common peices of Music Player Daemon commands
 *
 * Used for basic interaction and output handeling, as well as
 * several standard commands.
 *
 * @category  Networking
 * @package   Net_MPD
 * @author    Graham Christensen <graham.christensen@itrebal.com>
 * @copyright 2006 Graham Christensen
 * @license   http://www.php.net/license/3_01.txt
 * @version   CVS: $ID:$
 */
class Net_MPD_Common
{
    //Connection & Write Errors
    const CONNECTION_NOT_OPENED   = 100;
    const CONNECTION_FAILED       = 102;
    const WRITE_FAILED            = 103;

    //MPD Errors
    const ACK_NOT_LIST            = 1;
    const ACK_ARG                 = 2;
    const ACK_PASSWORD            = 3;
    const ACK_PERMISSION          = 4;
    const ACK_UNKOWN              = 5;
    const ACK_NO_EXIST            = 50;
    const ACK_PLAYLIST_MAX        = 51;
    const ACK_SYSTEM              = 52;
    const ACK_PLAYLIST_LOAD       = 53;
    const ACK_UPDATE_ALREADY      = 54;
    const ACK_PLAYER_SYNC         = 55;
    const ACK_EXIST               = 56;
    const ACK_COMMAND_FAILED      = -100;

    //MPD Responces
    const RESPONSE_OK             = 'OK';

    private $_connection          = null;
    protected $_errors            = array();
    private $_current_error       = array();
    protected $_commands          = array();
    protected $_output            = array();
    private $connection_params    = array();



    /**
     * Set connection params
     *
     * @param $host host to connect to, (default: localhost)
     * @param $port port to connec through, (default: 6600)
     * @param $password password to send, (default: null)
     * @return void
     */
    function __construct($host = 'localhost', $port = 6600, $password = null)
    {
        $this->connection_params['host'] = $host;
        $this->connection_params['port'] = $port;
        $this->connection_params['password'] = $password;
    }



    /**
     * Connect to MPD
     *
     * @return bool
     */
    public function connect()
    {
        if ($this->isConnected()) {
            return true;
        }
        $connection = @fsockopen($this->connection_params['host'], $this->connection_params['port'], $errn, $errs, 4);
        if ($connection) {
            $this->_connection = $connection;
            // Read from the source until its ready for commands
            //$this->read();
            while (!feof($this->_connection)) {
                $line = fgets($this->_connection);
                if (trim(substr($line, 0, 2)) == self::RESPONSE_OK) {
                    break;
                }
            }
            if (!is_null($this->connection_params['password'])) {
                if (!$this->runCommand('password', $this->connection_params['password'])) {
                    throw new PEAR_Exception('Password invalid.', self::ACK_PASSWORD);
                }
            }
            return true;
        }
        throw new PEAR_Exception('Error connecting: '.$errn.' ; '.$errs, self::CONNECTION_FAILED);
    }



    /**
     * Check connection status
     *
     * @return bool
     */
    public function isConnected()
    {
        if (!is_resource($this->_connection)) {
            return false;
        }
        return true;
    }



    /**
     * Disconnect from MPD
     *
     * @return bool
     */
    public function disconnect()
    {
	$this->runCommand('close');
	fclose($this->_connection);
	$this->_connection = null;
	return true;
    }



    /**
     * Write data to the socket
     *
     * @param $command string data to be sent
     *
     * @return bool
     *
     */
    function write($data)
    {
        //Are we connected?
        if (!$this->isConnected()) {
            // Try to connect
	    $this->connect();
        }
        //Write the data
        if (!fwrite($this->_connection, $data."\r\n")) {
            throw new PEAR_Exception('Write failed', self::WRITE_FAILED);
        }
        $this->_commands[] = $data;
        return true;
    }



    /**
     * Read data from the socket
     *
     * @return array of raw output
     *
     */
    function read()
    {
        //Are we connected?
        if (!$this->isConnected()) {
            throw new PEAR_Exception('Not connected', self::CONNECTION_NOT_OPENED);
        }
        //Loop through the connection, putting the data into $line
        $output = array();
        while (!feof($this->_connection)) {
            $line = fgets($this->_connection);
            if (preg_match('/^ACK \[(.*?)\@(.*?)\] \{(.*?)\} (.*?)$/', $line, $matches)) {
                //If the output is an ACK error
                //$this->runCommand('clearerror'); //Cleanup the error
                $this->_errors[] = $matches;
                $this->_current_error = array('ack' => $matches[1], 'func' => $matches[3], 'error' => $matches[4]);
                throw new PEAR_Exception('Command Failed', self::ACK_COMMAND_FAILED);
            } elseif (trim($line) == self::RESPONSE_OK) {
                //The last line of output was hit, close the loop
                break;
            } else {
                //Output from the server added to the return array
                $output[] = $line;
            }
        }
        return $output;
    }



    /**
     * Get the current error data
     *
     * @return array of error data
     */
    public function getErrorData()
    {
        return $this->_current_error;
    }


    public function clearError() {
         $this->runCommand('clearerror'); //Cleanup the error
    }

    /**
     * Run command
     *
     * @param $command string a command to be executed through MPD
     * @param $args mixed string for a single argument, array for multiple
     * @param $parse mixed false to parse the output, int for parse style
     *
     * @return array of server output
     */
    public function runCommand($command, $args = array(), $parse = 0)
    {
        //Generate the command
        if (is_array($args)) {
            foreach($args as $arg) {
                $command.= ' "'.str_replace('"', '\"', $arg) .'"';
            }
        } elseif (!is_null($args)) {
            $command.= ' "'.str_replace('"', '\"', $args) .'"';
        }
        //Write and then capture the output
	$this->write($command);
	$output = $this->read();
	
        $this->_output[] = array($command, $output);
        if ($output === array()) {
            return true;
        }
        if ($parse !== false) {
            return $this->parseOutput($output, $parse);
        }
        return $output;
    }



    /**
     * Parse MPD output on a line-by-line basis
     * creating output that is easy to work with
     *
     * @param $input array of input from MPD
     * @param $style int style number,'0' for the "intelligent" sorting
     *
     * @return array
     */
    public function parseOutput($input, $style = 0)
    {
        if (!is_array($input)) {
            $input = array($input);
        }
        $count = array('outputs' => 0, 'file' => -1, 'key' => 0);
        $used_keys = array();
        $output = array();
        $prev = array('key' => null, 'value' => null);
        $dirtoggle = false;
        foreach($input as $line) {
            if (is_array($line)) {
                $this->_errors[] = 'Server output not expected: '.print_r($line, true);
                continue;
            } else {
                $parts = explode(': ', $line, 2);
                if (!isset($parts[0], $parts[1])) {
                    $this->errors[] = 'Server output not expected: '.$line;
                    continue;
                }
            }
            $key = trim($parts[0]);
            $value = trim($parts[1]);
            if ($style == 0) {
                switch ($key) {
                    //The following has to do strictly
                    //with files in the output
                    case 'file':
                    case 'Artist':
                    case 'Album':
                    case 'Title':
                    case 'Track':
                    case 'Name':
                    case 'Genre':
                    case 'Date':
                    case 'Composer':
                    case 'Performer':
                    case 'Comment':
                    case 'Disc':
                    case 'Id':
                    case 'Pos':
                    case 'Time':
                    case 'cpos':
                        if ($key == 'file'||$key== 'cpos') {
                            $count['file']++;
                        }
                        $output['file'][$count['file']][$key] = $value;
                        break;

                    //The next section is for a 'stats' call
                    case 'artists':
                    case 'albums':
                    case 'songs':
                    case 'uptime':
                    case 'playtime':
                    case 'db_playtime':
                    case 'db_update':
                        $output['stats'][$key] = $value;
                        break;

                    //Now for a status call:
                    case 'volume':
                    case 'repeat':
                    case 'random':
                    case 'playlistlength':
                    case 'xfade':
                    case 'state':
                    case 'song':
                    case 'songid':
                    case 'time':
                    case 'bitrate':
                    case 'audio':
                    case 'updating_db':
                    case 'error':
                        $output['status'][$key] = $value;
                        break;

                    //Outputs
                    case 'outputid':
                    case 'outputname':
                    case 'outputenabled':
                        if ($key == 'outputid') {
                            $count['outputs']++;
                        }
                        $output['outputs'][$count['outputs']][$key] = $value;
                        break;

                    //The 'playlist' case works in 2 scenarios
                    //1) in a file/directory listing
                    //2) in a status call
                    // This is to determine if it was in a status call
                    // or in a directory call.
                    case 'playlist':
                        if ($output['status']) {
                            $output['status'][$key] = $value;
                        } else {
                            $output[$key][] = $value;
                        }
                        break;

                    //Now that we've covered most of the weird
                    //options of output,
                    //lets cover everything else!
                    default:
                        if (isset($used_keys[$key])) {
                            $used_keys = array();
                            $count['key']++;
                        }
                        $used_keys[$key] = true;
                        //$output[$count['key']][$key] = $value;//This is rarely useful
                        $output[$key][] = $value;
                        break;
                }
            } elseif ($style == 1) {
                $output[$key][] = $value;
            }
            if ($key == 'directory') {
                $dirtoggle = true;
            }
            $prev['key'] = $key;
            $prev['value'] = $value;
        }
        return $output;
    }



    /**
     * A method to access errors
     *
     * @return array
     */
    public function getErrors()
    {
        return $this->_errors;
    }



    /**
     * Used to discover commands that are not available
     *
     * @return array (null on no functions not being available)
     */
    public function getNotCommands()
    {
	$cmds = $this->runCommand('notcommands');
        if (!isset($cmds['command'])) {
            return array();
        }
        return $cmds['command'];
    }



    /**
     * Used to discover which commands are available
     *
     * @return array (null on no functions being available
     */
    public function getCommands()
    {
	$cmds = $this->runCommand('commands');
	if (!isset($cmds['command'])) {
            return array();
        }
        return $cmds['command'];
    }

    public function hasCommand($name) {
        $cmds = $this->getCommands();
        foreach ($cmds as $cmd)
            if($cmd==$name)
                return true;
        return false;
    }



    /**
     * Ping the MPD server to keep the connection running
     *
     * @return bool
     */
    public function ping()
    {
	if ($this->runCommand('ping')) {
	    return true;
	}
        return false;
    }



    /**
     * Get various statistics about the MPD server
     *
     * @return array
     */
    public function getStats()
    {
	$stats = $this->runCommand('stats');
	if (!isset($stats['stats'])) {
	    return false;
	}
	return $stats['stats'];
    }



    /**
     * Get the status of the MPD server
     *
     * @return array
     */
    public function getStatus()
    {
	$status = $this->runCommand('status');
	if (!isset($status['status'])) {
	    return false;
	}
	return $status['status'];
    }
}
?>
