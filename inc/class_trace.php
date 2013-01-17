<?php
/**
 * class name is in lowerclass to match table name ("commun" class __construct) and file name (__autoload function)
 */
class trace extends commun {
	// Constructor
	public function __construct(){
		//for "commun" ($this->db & co)
		parent::__construct();
	}

	/**
	 * @param string $target: trace target
	 * @return array[]
	 */
	public function getTraceByTarget( $target ){
		try {
			$getTraceByTarget = $this->db->prepare("
				SELECT *
				FROM trace
				WHERE target = :target
			");

			$getTraceByTarget->execute(array( ':target' => $target ));

			return $getTraceByTarget->fetch();

		} catch( PDOException $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param array $data
	 */
	public function updTrace( $data ){
		try {
			//book
			$upd = $this->db->prepare("
				UPDATE trace
				SET timestamp = :ts,
					page = :page,
					next = :next
				WHERE target = :target
			");

			$params = array(
				':target' => $data['target'],
				':ts' => $data['timestamp'],
				':page' => $data['page'],
				':next' => $data['next'],
			);

			$upd->execute( $params );

		} catch ( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * check and parse form data for add or update
	 * errors are returned with form inputs ids as (id, text, type)
	 *
	 * @return array[]
	 */
	public function checkAndPrepareFormData(){
		$formData = array();
		$errors = array();

		$args = array(
			'action'		=> FILTER_SANITIZE_STRING,
			'target'		=> FILTER_SANITIZE_STRING,
			'timestamp'		=> FILTER_SANITIZE_STRING,
			'page'			=> FILTER_SANITIZE_NUMBER_INT,
			'next'			=> FILTER_SANITIZE_STRING,
		);

		foreach( $args as $field => $validation ){
			if( !isset($_POST[$field]) ){
				$errors[] = 'Le champ '.$field.' est manquant.';
			}
		}

		if( empty($errors) ){
			$formData = filter_var_array($_POST, $args);

			foreach( $formData as $field => $value ){
				${$field} = $value;
			}

			//target
			if( is_null($target) || $target === false ){
				$errors[] = 'Cible incorrecte.';
			} elseif( empty($target) ){
				$errors[] = 'Cible requise.';
			} else {
				$formData['target'] = trim($target);
			}

			//timestamp
			if( is_null($timestamp) || $timestamp === false ){
				$errors[] = 'Date incorrecte.';
			} else {
				$formData['timestamp'] = trim($timestamp);
			}

			//page
			if( is_null($page) || $page === false ){
				$errors[] = 'Numéro de page incorrect.';
			} else {
				$page = filter_var($page, FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $page === false ){
					$errors[] = 'Numéro de page incorrect.';
				} else {
					$formData['page'] = trim($page);
				}
			}

			//next
			if( is_null($next) || $next === false ){
				$errors[] = 'Date incorrecte.';
			} else {
				$formData['next'] = trim($next);
			}
		}
		$formData['errors'] = $errors;

		return $formData;
	}
}
?>
