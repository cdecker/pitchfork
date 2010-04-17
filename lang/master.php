<?php 
	$LANG = array();

	if(!isset($language))
		$language = "en";

	// just in case, even though we should probably die if we find / in it
	$language = str_replace("/", "", $language);

	require_once("../lang/" . $language . ".php");


	function m($str) {
		global $LANG, $language;

		if(!isset($LANG[$language])) {
			return $str;
		}
		
		if(!isset($LANG[$language][$str])) {
	//		generate_mstring($str);
			return $str;
		}
	//	generate_mstring($str, $LANG[$language][$str]);
		
		return $LANG[$language][$str];
	}

	function generate_mstring($str, $res = null) {
		global $generated_output;
		$res = addcslashes(is_null($res)?$str:$res, '\'\\');
		$generated_output .= 
			"'$str' => '$res',\n";

	}
	
?>
