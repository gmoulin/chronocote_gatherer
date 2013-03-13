<?php
/**
 * Class for candidate management
 *
 * class name is in lowerclass to match table name ("commun" class __construct) and file name (__autoload function)
 *
 * @author Guillaume MOULIN <gmoulin.dev@gmail.com>
 * @copyright Copyright (c) Guillaume MOULIN
 *
 * @package Candidates
 * @category Candidates
 */
class candidate extends commun {
	// Constructor
	public function __construct(){
		//for "commun" ($this->db & co)
		parent::__construct();
	}

	/**
	 * @param string $target
	 * @return array[][]
	 */
	public function getCandidatesByTarget( $target ){
		try {
			$getCandidates = $this->db->prepare("
				SELECT *
				FROM candidate
				WHERE source = :target
				AND status = 'pending'
				ORDER BY id ASC
			");

			$getCandidates->execute(array(':target' => $target));

			return $getCandidates->fetchAll();

		} catch( PDOException $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param integer $id
	 * @return array[]
	 */
	public function getCandidateById( $id ){
		try {
			$getCandidate = $this->db->prepare("
				SELECT *
				FROM candidate
				WHERE id = :id
			");

			$getCandidate->execute(array(':id' => $id));

			return $getCandidate->fetch();

		} catch( PDOException $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param array $data
	 * @return integer
	 */
	public function addCandidate( $data ){
		try {
			$addCandidate = $this->db->prepare("
				INSERT INTO candidate (auction_id, lot_id, source, source_url, auction_title, auction_date, auction_timestamp, lot_title, lot_criteria, lot_estimates, lot_price, lot_currency, info, img_thumbnail, img_medium, img_full, modified_date)
				VALUES (:auctionId, :lotId, :source, :sourceUrl, :auctionTitle, :auctionDate, :auctionTs, :title, :criteria, :estimates, :price, :currency, :info, :imageThumbnail, :imageMedium, :imageFull, NOW())
			");

			$addCandidate->execute(array(
				':auctionId' => $data['auctionId'],
				':lotId' => $data['lotId'],
				':source' => $data['source'],
				':sourceUrl' => $data['sourceUrl'],
				':auctionTitle' => $data['auctionTitle'],
				':auctionDate' => $data['auctionDate'],
				':auctionTs' => $data['auctionDate'],
				':title' => $data['title'],
				':criteria' => $data['criteria'],
				':estimates' => $data['estimates'],
				':price' => $data['price'],
				':currency' => $data['currency'],
				':info' => $data['info'],
				':imageThumbnail' => $data['imageThumbnail'],
				':imageMedium' => $data['imageMedium'],
				':imageFull' => $data['imageFull'],
			));

			$candidateID = $this->db->lastInsertId();

			if( empty($candidateID) ) throw new PDOException('Bad candidate id.');

			return $candidateID;

		} catch( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param array $data
	 */
	public function updCandidate( $data ){
		try {
			$updCandidate = $this->db->prepare("
				UPDATE candidate
				SET auction_title = :auctionTitle,
					auction_date = :auctionDate,
					auction_timestamp = :auctionTs,
					lot_title = :title,
					lot_criteria = :criteria,
					lot_estimates = :estimates,
					lot_price = :price,
					lot_currency = :currency,
					img_thumbnail = :imageThumbnail,
					img_medium = :imageMedium,
					img_full = :imageFull,
					status = 'validated',
					modified_date = NOW()
				WHERE id = :id
			");

			$params = array(
				':id' => $data['id'],
				':auctionTitle' => $data['auctionTitle'],
				':auctionDate' => $data['auctionDate'],
				':auctionTs' => $data['auctionDate'],
				':title' => $data['title'],
				':criteria' => $data['criteria'],
				':estimates' => $data['estimates'],
				':price' => $data['price'],
				':currency' => $data['currency'],
				':imageThumbnail' => $data['imageThumbnail'],
				':imageMedium' => $data['imageMedium'],
				':imageFull' => $data['imageFull'],
			);

			$updCandidate->execute( $params );

		} catch( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * remove data from candidate and set it to "deleted" status
	 * the source, auctionId and lotId are keept for future checks
	 * @param integer $id
	 */
	public function delCandidate( $id ){
		try {
			$delCandidate = $this->db->prepare("
				UPDATE candidate
				SET auction_title = NULL,
					auction_date = NULL,
					auction_timestamp = NULL,
					lot_title = NULL,
					lot_criteria = NULL,
					lot_estimates = NULL,
					lot_price = NULL,
					lot_currency = NULL,
					info = NULL,
					img_thumbnail = NULL,
					img_medium = NULL,
					img_full = NULL,
					status = 'deleted',
					modified_date = NOW()
				WHERE id = :id
			");

			$delCandidate->execute( array( ':id' => $id ) );

			$this->_cleanImage($data['id']);

		} catch( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param string $source
	 * @param integer $auction
	 * @param integer $lot
	 * @return id or false
	 */
	public function check( $source, $auction, $lot ) {
		try {
			$exists = $this->db->prepare('
				SELECT id
				FROM candidate
				WHERE source = :source
				AND auction_id = :auction
				AND lot_id = :lot
			');

			$exists->execute(array(
				':source' => $source,
				':auction' => $auction,
				':lot' => $lot,
			));

			$result = $exists->fetchAll();
			if( count($result) > 0 ){
				$id = $result[0]['id'];
			} else $id = false;

			return $id;

		} catch ( PDOException $e ) {
			erreur_pdo( $e, get_class( $this ), __FUNCTION__ );
		}
	}

	/**
	 * @param string $source
	 * @param integer $auction
	 * @return true or false
	 */
	public function checkAuction( $source, $auction ) {
		try {
			$exists = $this->db->prepare('
				SELECT id
				FROM candidate
				WHERE source = :source
				AND auction_id = :auction
			');

			$exists->execute(array(
				':source' => $source,
				':auction' => $auction,
			));

			$result = $exists->fetchAll();
			file_put_contents('/var/tmp/debug.log', print_r($result, true));
			return count($result) > 0 ? 1 : 0;

		} catch ( PDOException $e ) {
			erreur_pdo( $e, get_class( $this ), __FUNCTION__ );
		}
	}

	/**
	 * @param integer $id
	 * @return boolean
	 */
	public function exists( $id ){
		try {
			$verif = false;

			$exists = $this->db->prepare("
				SELECT COUNT(id) AS verif
				FROM candidate
				WHERE id = :id
			");

			$exists->execute( array( ':id' => $id ) );

			$result = $exists->fetch();

			if( !empty($result) && $result['verif'] == 1 ) {
				$verif = true;
			}

			return $verif;

		} catch ( PDOException $e ) {
			erreur_pdo( $e, get_class( $this ), __FUNCTION__ );
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
			'id'			=> FILTER_SANITIZE_NUMBER_INT,
			'auctionId'		=> FILTER_SANITIZE_STRING,
			'lotId'			=> FILTER_SANITIZE_STRING,
			'source'		=> FILTER_SANITIZE_STRING,
			'sourceUrl'		=> FILTER_SANITIZE_STRING,
			'auctionTitle'	=> FILTER_SANITIZE_STRING,
			'auctionDate'	=> FILTER_SANITIZE_STRING,
			'title'			=> FILTER_SANITIZE_STRING,
			'criteria'		=> FILTER_SANITIZE_STRING,
			'estimates'		=> FILTER_SANITIZE_STRING,
			'price'			=> FILTER_SANITIZE_STRING,
			'currency'		=> FILTER_SANITIZE_STRING,
			'thumbnail'		=> FILTER_SANITIZE_STRING,
			'medium'		=> FILTER_SANITIZE_STRING,
			'full'			=> FILTER_SANITIZE_STRING,
			'info'			=> FILTER_SANITIZE_STRING,
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

			//id
			if( $action == 'update' ){
				if( is_null($id) || $id === false ){
					$errors[] = 'Identifiant incorrect.';
				} else {
					$id = filter_var($id, FILTER_VALIDATE_INT, array('min_range' => 1));
					if( $id === false ){
						$errors[] = 'Identifiant incorrect.';
					} else {
						if( $this->exists($id) ){
							$formData['id'] = $id;
						} else {
							$errors[] = 'Identifiant inconnu.';
						}
					}
				}
			}

			if( $action == 'update' || $action == 'add' ){
				//id_auction
				if( is_null($auctionId) || $auctionId === false ){
					$errors[] = 'Numéro d\'auction incorrect.';
				} elseif( empty($auctionId) ){
					$errors[] = 'Numéro d\'auction requis.';
				} else {
					$formData['auctionId'] = trim($auctionId);
				}

				//id_lot
				if( is_null($lotId) || $lotId === false ){
					$errors[] = 'Numéro de lot incorrect.';
				} elseif( empty($lotId) ){
					$errors[] = 'Numéro de lot requis.';
				} else {
					$formData['lotId'] = trim($lotId);
				}

				//source
				if( is_null($source) || $source === false ){
					$errors[] = 'Source incorrecte.';
				} elseif( empty($source) ){
					$errors[] = 'Source requise.';
				} else {
					$formData['source'] = trim($source);
				}

				//sourceUrl
				if( is_null($sourceUrl) || $sourceUrl === false ){
					$errors[] = 'URL incorrecte.';
				} elseif( empty($sourceUrl) ){
					$errors[] = 'URL requise.';
				} else {
					$sourceUrl = filter_var(base64_decode($sourceUrl), FILTER_SANITIZE_URL);
					if( $sourceUrl === false ){
						throw new Exception('URL incorrecte.');
					}

					$formData['sourceUrl'] = trim($sourceUrl);
				}

				//auctionTitle
				if( is_null($auctionTitle) || $auctionTitle === false ){
					$errors[] = 'auctionTitle incorrect.';
				} else {
					$formData['auctionTitle'] = trim($auctionTitle);
				}

				//auctionDate
				if( is_null($auctionDate) || $auctionDate === false ){
					$errors[] = 'auctionDate incorrect.';
				} else {
					$formData['auctionDate'] = trim($auctionDate);
				}

				//title
				if( is_null($title) || $title === false ){
					$errors[] = 'title incorrect.';
				} else {
					$formData['title'] = trim($title);
				}

				//criteria
				if( is_null($criteria) || $criteria === false ){
					$errors[] = 'criteria incorrect.';
				} else {
					$formData['criteria'] = trim($criteria);
				}

				//estimates
				if( is_null($estimates) || $estimates === false ){
					$errors[] = 'estimates incorrect.';
				} else {
					$formData['estimates'] = trim($estimates);
				}

				//price
				if( is_null($price) || $price === false ){
					$errors[] = 'prix incorrect.';
				} else {
					$formData['price'] = trim($price);
				}

				//currency
				if( is_null($currency) || $currency === false ){
					$errors[] = 'currency incorrect.';
				} else {
					$formData['currency'] = trim($currency);
				}

				//thumbnail
				if( is_null($thumbnail) || $thumbnail === false ){
					$errors[] = 'thumbnail image incorrecte.';
				} else {
					$thumbnail = filter_var(base64_decode($thumbnail), FILTER_SANITIZE_URL);
					if( $thumbnail === false ){
						throw new Exception('thumbnail incorrecte.');
					}

					$formData['imageThumbnail'] = trim($thumbnail);
				}

				//medium
				if( is_null($medium) || $medium === false ){
					$errors[] = 'medium image incorrecte.';
				} else {
					$medium = filter_var(base64_decode($medium), FILTER_SANITIZE_URL);
					if( $medium === false ){
						throw new Exception('medium image incorrecte.');
					}

					$formData['imageMedium'] = trim($medium);
				}

				//full
				if( is_null($full) || $full === false ){
					$errors[] = 'full image incorrecte.';
				} else {
					$full = filter_var(base64_decode($full), FILTER_SANITIZE_URL);
					if( $full === false ){
						throw new Exception('full image incorrecte.');
					}

					$formData['imageFull'] = trim($full);
				}

				//info
				if( is_null($info) || $info === false ){
					$errors[] = 'Info incorrectes.';
				} elseif( empty($info) ){
					$errors[] = 'Info requises.';
				} else {
					$formData['info'] = trim($info);
				}

			}
		}
		$formData['errors'] = $errors;

		return $formData;
	}
}
?>
