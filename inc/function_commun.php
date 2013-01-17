<?php
/**
 * Fonction magique de chargement des classes si elle ne l'est pas encore
 *
 * @param string $class_name
 */
function __autoload( $class_name ){
	require_once PATH . "/inc/class_" . $class_name . ".php";
}

/**
 * Fonction pour afficher les erreurs des blocs try catch
 * finalise la page (die)
 *
 * @param msg : le message de l'erreur
 */
function erreur( $msg ) {
	print "Error!: " . $msg->getMessage() . "<br />";
	die();
}

/**
 * Affiche les erreurs "PDOException"
 *
 * @param string $msg : le message de l'erreur
 * @param string $className : le nom de la classe où l'erreur a été détectée
 * @param string $functionName : le nom de la fonction où l'erreur a été détectée
 */
function erreur_pdo( $msg, $className, $functionName ) {
	print "erreur dans la classe ".$className.", fonction ".$functionName."<br />";
	erreur( $msg );
}

// Remplace tous les accents par leur équivalent sans accent.
function stripAccents($string) {
	$string = str_replace(
		array(' ',
			'à', 'â', 'ä', 'á', 'ã', 'å',
			'î', 'ï', 'ì', 'í',
			'ô', 'ö', 'ò', 'ó', 'õ', 'ø',
			'ù', 'û', 'ü', 'ú',
			'é', 'è', 'ê', 'ë',
			'ç', 'ÿ', 'ñ',
			'À', 'Â', 'Ä', 'Á', 'Ã', 'Å',
			'Î', 'Ï', 'Ì', 'Í',
			'Ô', 'Ö', 'Ò', 'Ó', 'Õ', 'Ø',
			'Ù', 'Û', 'Ü', 'Ú',
			'É', 'È', 'Ê', 'Ë',
			'Ç', 'Ÿ', 'Ñ',
		),
		array('',
			'a', 'a', 'a', 'a', 'a', 'a',
			'i', 'i', 'i', 'i',
			'o', 'o', 'o', 'o', 'o', 'o',
			'u', 'u', 'u', 'u',
			'e', 'e', 'e', 'e',
			'c', 'y', 'n',
			'A', 'A', 'A', 'A', 'A', 'A',
			'I', 'I', 'I', 'I',
			'O', 'O', 'O', 'O', 'O', 'O',
			'U', 'U', 'U', 'U',
			'E', 'E', 'E', 'E',
			'C', 'Y', 'N',
		),
		$string
	);

	return str_replace(' ', '_', $string);
}
?>
