<?php
try {
	require_once('inc/conf.ini.php');

	$lang = 'fr';

	//only for dev to assure last version
	if( file_exists(PATH.'/css/main.css') ) $cssTS = filemtime( PATH.'/css/main.css' );
	if( file_exists(PATH.'/js/main.js') ) $scriptTS = filemtime( PATH.'/js/main.js' );

	$oTrace = new trace();
	$next_auction = array();
	$last = array();

	$parts = array('antiquorum', 'christies', 'sothebys');
	foreach( $parts as $p ){
		$trace = $oTrace->getTraceByTarget($p);
		$last[ $p ] = $trace;
	}

} catch (Exception $e) {
	echo $e->getMessage();
	die;
}

include('views/layout.php');
?>
