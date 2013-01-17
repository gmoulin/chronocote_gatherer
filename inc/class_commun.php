<?php
/**
 * class for database interractions shared functions
 *
 * class name is in lowerclass to match table name ("commun" class __construct) and file name (__autoload function)
 *
 * @author Guillaume MOULIN <gmoulin.dev@gmail.com>
 * @copyright Copyright (c) Guillaume MOULIN
 *
 * @package Commun
 * @category Commun
 */
class commun {
	//db connexion
	public $db;

	//constructor
	public function __construct() {
		$instance = init::getInstance();

		$this->db = $instance->dbh();
	}

	/**
	 * @return array[][]
	 */
	public function columns() {
		try {
			$columns = $this->db->prepare("SHOW COLUMNS FROM ".get_class($this));

			$columns->execute();

			return $columns->fetchAll(PDO::FETCH_ASSOC);

		} catch (PDOException $e) {
			erreur_pdo($e, get_class($this), __FUNCTION__);
		}
	}

	/**
	 * @return integer
	 */
	public function nbResult() {
		try {
			$nbResult = $this->db->prepare("SELECT found_rows()");

			$nbResult->execute();

			$nb = $nbResult->fetch();

			//robustesse en cas de retour vide
			$nb = !empty( $nb ) ? $nb["found_rows()"] : 0;

			return $nb;

		} catch (PDOException $e) {
			erreur_pdo($e, get_class($this), __FUNCTION__);
		}
	}

	/**
	 *
	 */
	protected function _cleanImage( $id ){
		foreach( array('jpg', 'png', 'gif') as $ext ){
			$path = IMG_PATH.$id.'_thumbnail'.$ext;
			if( file_exists($path) ){
				@unlink($path);
			}

			$path = IMG_PATH.$id.'_medium'.$ext;
			if( file_exists($path) ){
				@unlink($path);
			}

			$path = IMG_PATH.$id.'_full'.$ext;
			if( file_exists($path) ){
				@unlink($path);
			}
		}
	}
}
?>
