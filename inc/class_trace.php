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
				SET page = :page,
					auctionId = :auctionId,
					lotPage = :lotPage,
					month = :month,
					year = :year
				WHERE target = :target
			");

			$params = array(
				':target' => $data['target'],
				':page' => $data['page'],
				':auctionId' => $data['auctionId'],
				':lotPage' => $data['lotPage'],
				':month' => $data['month'],
				':year' => $data['year'],
			);

			$upd->execute( $params );

		} catch ( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param array $data
	 */
	public function updTraceDate( $data ){
		try {
			//book
			$upd = $this->db->prepare("
				UPDATE trace
				SET month = :month,
					year = :year,
				WHERE target = :target
			");

			$params = array(
				':target' => $data['target'],
				':month' => $data['month'],
				':year' => $data['year'],
			);

			$upd->execute( $params );

		} catch ( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param array $data
	 */
	public function updTraceWithDate( $data ){
		try {
			//book
			$upd = $this->db->prepare("
				UPDATE trace
				SET page = :page,
					auctionId = :auctionId,
					lotPage = :lotPage,
					month = :month,
					year = :year,
				WHERE target = :target
			");

			$params = array(
				':target' => $data['target'],
				':page' => $data['page'],
				':auctionId' => $data['auctionId'],
				':lotPage' => $data['lotPage'],
				':month' => $data['month'],
				':year' => $data['year'],
			);

			$upd->execute( $params );

		} catch ( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}
}
?>
