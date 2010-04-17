/* these files need to be written in utf-8 */

var LANG = new Object(); 
// Messages
LANG.VOLUME		='Volume';
LANG.BITRATE		='Bitrate: ';
LANG.POSITION		='Position: ';
LANG.CROP		='Crop'; 
LANG.CROP_SELECTION	="Crop to selection";
LANG.CLEAR_PLAYLIST	="Clear playlist";

LANG.PLAY		="Play";
LANG.STOP		="Stop";


LANG.WAIT_LOADING	="Loading.."; 
LANG.WAIT_UPDATING_DB	="Updating database.."
LANG.WAIT_UPDATING_PL	="Updating playlist, please wait..";
LANG.WAIT_REMOVING	="Removing..";
LANG.WAIT_ADDING	="Adding..";
LANG.WAIT_ADDING_PL	="Adding playlist..";
LANG.WAIT_SEARCHING	= "Searching..";

LANG.UPDATE_DB		="Update DB";
LANG.ARTIST 		="Artist";
LANG.TITLE 		="Title";
LANG.ALBUM 		="Album";
LANG.GENRE		="Genre";
LANG.FILENAME		="Filename";
LANG.FILESYSTEM		="Filesystem";
LANG.LYRICS		="Lyrics";
LANG.SEARCH		="Search";
LANG.ADD		="Add";
LANG.EDIT		="Edit";
LANG.DELETE		="Delete";
LANG.CONFIRM_REMOVE	="Really remove";
LANG.YES		="Yes";
LANG.NO			="No";
LANG.BY_URL		="By URL";
LANG.FROM_FILE		="From file";
LANG.TEXT		="Text";
LANG.OUTPUTS		="Outputs";
LANG.CLOSE		="Close";
LANG.SAVE		="Save";
LANG.REFETCH		="Refetch";
LANG.HIDE		="Hide";
LANG.AUTOPLAY		="Autoplay";
LANG.NO_AUTOPLAY	="No autoplay";
LANG.STREAMING		="Streaming";

LANG.ANYTAG		="Any tag";
LANG.COMPOSER		="Composer";
LANG.PERFORMER		="Performer";
LANG.DATE		="Date";


LANG.PL_SAVE_AS 	="Save playlist as: ";
LANG.PL_SAVING		="Saving playlist";

LANG.REPEAT		="Repeat";
LANG.RANDOM		="Random";
LANG.XFADE		="X-Fade: ";

LANG.QUICK_ADD		="Quick add";

LANG.ALBUM_REVIEW	="Album review";
LANG.ALBUM_DESC		="Album description";
// e.g. album review for some album by some artist, the spaces are important
LANG.ALBUM_AA_NAME	=" for %s by %s"; 
LANG.ALBUM_AMAZON	="Album on amazon.com (new window)";

LANG.JUMP_CURRENT	= "Jump to currently playing song [Space]";
LANG.PAGINATION_FOLLOW	= "Following currently playing song";
LANG.PAGINATION_NOFOLLOW= "Not following currently playing song";

LANG.LYRICWIKI_LYRIC	= "%s lyric at lyricwiki.org";  // add/edit lyric at ..

// ERRORS
LANG.E_CONNECT		="Unable to connect to MPD server";
LANG.E_INVALID_RESPONSE	="Server returned invalid response";
LANG.E_INVALID_RESULT	="Invalid result from server";
LANG.E_NO_RESPONSE	="Unable to get response from server";
LANG.E_CONNECT		="Unable to connect to mpd";
LANG.E_INIT		="Init failed "
LANG.E_INIT_PL		="Failed to initialize playlist";
LANG.E_PL_MOVE		="Moving in playlist failed";
LANG.E_REMOVE		="Could not remove songs";
LANG.E_FAILED_ADD	="Failed to add";
LANG.E_FAILED_ADD_PL	="Failed to add playlist";
LANG.E_FAILED_SAVE_PL	="Failed to save playlist";
LANG.E_FAILED_LOAD_DIR	="Failed to load directory list";
LANG.E_NOTHING_FOUND	="Nothing found..";
LANG.E_NO_OUTPUTS	="No outputs found";
LANG.E_NOT_FOUND	="Did not find any %ss."; // We didn't find any of these
LANG.E_MISSING_CACHE	="Missing cache dir";
LANG.E_MISSING_AA_NAME	="Missing artist or album name.";
LANG.E_MISSING_AS_NAME	="Missing artist or song-title.";
LANG.E_LYRICS_NOT_FOUND	="Lyrics not found";
LANG.E_MISSING_LYRICS	="We seem to be missing the lyrics.."; // this should be something better
LANG.E_LYRICS_FAILURE	="Retrieval of lyrics failed";
LANG.E_COMM_PROBLEM	="Communication problem";
LANG.E_GET_INFO		="Unable to get information";

LANG.RECOMMEND_RECOMMENDATIONS	= "Recommendations ";
LANG.RECOMMEND_EMPTY_PLAYLIST	="To fetch recommendations based on your playlist you need to have something in your playlist";
LANG.RECOMMEND_ADDTOPLAYLIST	="Add to playlist";
LANG.RECOMMEND_SIMILAR		="Similar artists from your library";
LANG.RECOMMEND_ARTISTS		="Recommended artists";


/* Don't need translation, but needs to be here: */
LANG.NT_AMAZON = "[Amazon.com]";
