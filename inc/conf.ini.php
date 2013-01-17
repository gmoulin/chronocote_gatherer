<?php
//force le niveau de remontée des erreurs
error_reporting(E_ALL | E_STRICT);
session_start();

/*
	A mettre dans le virtual host
	SetEnv LOCATION XXX
*/
define('PATH', realpath(dirname(__FILE__).'/..'));

define('IMG_PATH', PATH.'/img/');

date_default_timezone_set('Europe/Zurich');

require(PATH.'/inc/function_commun.php');
?>
