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
	public function getCandidatesByTarget( $target, $page, $maxPerPage ){
		try {
			$getCandidates = $this->db->prepare("
				SELECT *
				FROM candidate
				WHERE source = :target
				AND status IN ('pending', 'validated')
				ORDER BY id ASC
				LIMIT ".($page * $maxPerPage).", ".$maxPerPage."
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
				VALUES (:auction_id, :lot_id, :source, :source_url, :auction_title, :auction_date, :auctionTs, :lot_title, :lot_criteria, :lot_estimates, :lot_price, :lot_currency, :info, :image_thumbnail, :image_medium, :image_full, NOW())
			");

			$addCandidate->execute(array(
				':auction_id' => $data['auction_id'],
				':lot_id' => $data['lot_id'],
				':source' => $data['source'],
				':source_url' => $data['source_url'],
				':auction_title' => $data['auction_title'],
				':auction_date' => $data['auction_date'],
				':auctionTs' => $data['auction_date'],
				':lot_title' => $data['lot_title'],
				':lot_criteria' => $data['lot_criteria'],
				':lot_estimates' => $data['lot_estimates'],
				':lot_price' => $data['lot_price'],
				':lot_currency' => $data['lot_currency'],
				':info' => $data['info'],
				':image_thumbnail' => $data['image_thumbnail'],
				':image_medium' => $data['image_medium'],
				':image_full' => $data['image_full'],
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
				SET auction_title = :auction_title,
					auction_date = :auction_date,
					auction_timestamp = :auctionTs,
					lot_title = :lot_title,
					lot_criteria = :lot_criteria,
					lot_estimates = :lot_estimates,
					lot_price = :lot_price,
					lot_currency = :lot_currency,
					img_thumbnail = :image_thumbnail,
					img_medium = :image_medium,
					img_full = :image_full,
					product_identifier = :product_identifier,
					validated_title = :validated_title,
					validated_description = :validated_description,
					validated_brand = :validated_brand,
					validated_model = :validated_model,
					validated_ref = :validated_ref,
					validated_case = :validated_case,
					validated_shape = :validated_shape,
					validated_bracelet = :validated_bracelet,
					validated_movement = :validated_movement,
					validated_complication = :validated_complication,
					validated_estimation = :validated_estimation,
					validated_price = :validated_price,
					validated_currency = :validated_currency,
					validated_image = :validated_image,
					modified_date = NOW()
				WHERE id = :id
			");

			$params = array(
				':id' => $data['id'],
				':auction_title' => $data['auction_title'],
				':auction_date' => $data['auction_date'],
				':auctionTs' => $data['auction_date'],
				':lot_title' => $data['lot_title'],
				':lot_criteria' => $data['lot_criteria'],
				':lot_estimates' => $data['lot_estimates'],
				':lot_price' => $data['lot_price'],
				':lot_currency' => $data['lot_currency'],
				':image_thumbnail' => $data['image_thumbnail'],
				':image_medium' => $data['image_medium'],
				':image_full' => $data['image_full'],
				':product_identifier' => $data['product_identifier'],
				':validated_title' => $data['validated_title'],
				':validated_description' => $data['validated_description'],
				':validated_brand' => $data['validated_brand'],
				':validated_model' => $data['validated_model'],
				':validated_ref' => $data['validated_ref'],
				':validated_case' => $data['validated_case'],
				':validated_shape' => $data['validated_shape'],
				':validated_bracelet' => $data['validated_bracelet'],
				':validated_movement' => $data['validated_movement'],
				':validated_complication' => $data['validated_complication'],
				':validated_estimation' => $data['validated_estimation'],
				':validated_price' => $data['validated_price'],
				':validated_currency' => $data['validated_currency'],
				':validated_image' => $data['validated_image'],
			);

			$updCandidate->execute( $params );

		} catch( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * @param integer $id
	 * @param string $status
	 */
	public function updStatus( $id, $status ){
		try {
			$updateStatus = $this->db->prepare("
				UPDATE candidate
				SET status = :status,
					modified_date = NOW()
				WHERE id = :id
			");

			$params = array(
				':id' => $id,
				':status' => $status,
			);

			$updateStatus->execute( $params );

		} catch( Exception $e ){
			erreur_pdo($e, get_class( $this ), __FUNCTION__);
		}
	}

	/**
	 * remove data from candidate and set it to "deleted" status
	 * the source, auction_id and lot_id are keept for future checks
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
					product_identifier = NULL,
					validated_title = NULL,
					validated_description = NULL,
					validated_brand = NULL,
					validated_model = NULL,
					validated_ref = NULL,
					validated_case = NULL,
					validated_shape = NULL,
					validated_bracelet = NULL,
					validated_movement = NULL,
					validated_complication = NULL,
					validated_estimation = NULL,
					validated_price = NULL,
					validated_currency = NULL,
					validated_image = NULL,
					status = 'deleted',
					modified_date = NOW()
				WHERE id = :id
			");

			$delCandidate->execute( array( ':id' => $id ) );

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
	 * @param string $field
	 * @return array
	 */
	public function getDistinct( $field ){
		try {
			$exists = $this->db->prepare("
				SELECT ".$field."
				FROM candidate
				WHERE ".$field." IS NOT NULL
				AND status IN ('validated', 'sent')
			");

			$exists->execute();

			$result = $exists->fetchAll();

			$entries = array();
			foreach( $result as $r ){
				if( !empty($r[ $field ]) ){
					$tmp = explode(',', $r[ $field ]);

					$entries = array_merge($entries, $tmp);
				}
			}

			return array_unique($entries, SORT_STRING);

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

		if( $_POST['action'] == 'update' || $_POST['action'] == 'send' ){
			$args = array(
				'action'			=> FILTER_SANITIZE_STRING,
				'id'				=> FILTER_SANITIZE_NUMBER_INT,
				//gathered fields
				'auction_id'		=> FILTER_SANITIZE_STRING,
				'lot_id'			=> FILTER_SANITIZE_STRING,
				'source'			=> FILTER_SANITIZE_STRING,
				'source_url'		=> FILTER_SANITIZE_STRING,
				'auction_title'		=> FILTER_SANITIZE_STRING,
				'auction_date'		=> FILTER_SANITIZE_STRING,
				'lot_title'			=> FILTER_SANITIZE_STRING,
				'lot_criteria'		=> FILTER_SANITIZE_STRING,
				'lot_estimates'		=> FILTER_SANITIZE_STRING,
				'lot_price'			=> FILTER_SANITIZE_STRING,
				'lot_currency'		=> FILTER_SANITIZE_STRING,
				'img_thumbnail'		=> FILTER_SANITIZE_STRING,
				'img_medium'		=> FILTER_SANITIZE_STRING,
				'img_full'			=> FILTER_SANITIZE_STRING,
				'info'				=> FILTER_SANITIZE_STRING,
				//user validated fields
				'product_identifier'			=> FILTER_SANITIZE_STRING,
				'validated_title'				=> FILTER_SANITIZE_STRING,
				'validated_description'			=> FILTER_SANITIZE_STRING,
				'hidden_validated_brand'		=> FILTER_SANITIZE_STRING,
				'hidden_validated_model'		=> FILTER_SANITIZE_STRING,
				'validated_ref'					=> FILTER_SANITIZE_STRING,
				'hidden_validated_case'			=> FILTER_SANITIZE_STRING,
				'hidden_validated_shape'		=> FILTER_SANITIZE_STRING,
				'hidden_validated_bracelet'		=> FILTER_SANITIZE_STRING,
				'hidden_validated_movement'		=> FILTER_SANITIZE_STRING,
				'hidden_validated_complication'	=> FILTER_SANITIZE_STRING,
				'validated_estimation'			=> FILTER_SANITIZE_STRING,
				'validated_price'				=> FILTER_SANITIZE_STRING,
				'validated_currency'			=> FILTER_SANITIZE_STRING,
				'validated_image'				=> FILTER_SANITIZE_STRING,
			);
		} else {
			$args = array(
				'action'			=> FILTER_SANITIZE_STRING,
				'id'				=> FILTER_SANITIZE_NUMBER_INT,
				//gathered fields
				'auction_id'		=> FILTER_SANITIZE_STRING,
				'lot_id'			=> FILTER_SANITIZE_STRING,
				'source'			=> FILTER_SANITIZE_STRING,
				'source_url'		=> FILTER_SANITIZE_STRING,
				'auction_title'		=> FILTER_SANITIZE_STRING,
				'auction_date'		=> FILTER_SANITIZE_STRING,
				'lot_title'			=> FILTER_SANITIZE_STRING,
				'lot_criteria'		=> FILTER_SANITIZE_STRING,
				'lot_estimates'		=> FILTER_SANITIZE_STRING,
				'lot_price'			=> FILTER_SANITIZE_STRING,
				'lot_currency'		=> FILTER_SANITIZE_STRING,
				'img_thumbnail'		=> FILTER_SANITIZE_STRING,
				'img_medium'		=> FILTER_SANITIZE_STRING,
				'img_full'			=> FILTER_SANITIZE_STRING,
				'info'				=> FILTER_SANITIZE_STRING,
			);
		}

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
			if( $action == 'update' || $action == 'send' ){
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

			if( $action == 'update' || $action == 'send' || $action == 'add' ){
				//id_auction
				if( is_null($auction_id) || $auction_id === false ){
					$errors[] = 'Numéro d\'auction incorrect.';
				} elseif( empty($auction_id) ){
					$errors[] = 'Numéro d\'auction requis.';
				} else {
					$formData['auction_id'] = trim($auction_id);
				}

				//id_lot
				if( is_null($lot_id) || $lot_id === false ){
					$errors[] = 'Numéro de lot incorrect.';
				} elseif( empty($lot_id) ){
					$errors[] = 'Numéro de lot requis.';
				} else {
					$formData['lot_id'] = trim($lot_id);
				}

				//source
				if( is_null($source) || $source === false ){
					$errors[] = 'Source incorrecte.';
				} elseif( empty($source) ){
					$errors[] = 'Source requise.';
				} else {
					$formData['source'] = trim($source);
				}

				//source_url
				if( is_null($source_url) || $source_url === false ){
					$errors[] = 'URL incorrecte.';
				} elseif( empty($source_url) ){
					$errors[] = 'URL requise.';
				} else {
					$source_url = filter_var(base64_decode($source_url), FILTER_SANITIZE_URL);
					if( $source_url === false ){
						throw new Exception('URL incorrecte.');
					}

					$formData['source_url'] = trim($source_url);
				}

				//auction_title
				if( is_null($auction_title) || $auction_title === false ){
					$errors[] = 'auction_title incorrect.';
				} else {
					$formData['auction_title'] = trim($auction_title);
				}

				//auction_date
				if( is_null($auction_date) || $auction_date === false ){
					$errors[] = 'auction_date incorrect.';
				} else {
					$formData['auction_date'] = trim($auction_date);
				}

				//title
				if( is_null($lot_title) || $lot_title === false ){
					$errors[] = 'titre incorrect.';
				} else {
					$formData['lot_title'] = trim($lot_title);
				}

				//criteria
				if( is_null($lot_criteria) || $lot_criteria === false ){
					$errors[] = 'criteria incorrect.';
				} else {
					$formData['lot_criteria'] = trim($lot_criteria);
				}

				//estimates
				if( is_null($lot_estimates) || $lot_estimates === false ){
					$errors[] = 'estimates incorrect.';
				} else {
					$formData['lot_estimates'] = trim($lot_estimates);
				}

				//price
				if( is_null($lot_price) || $lot_price === false ){
					$errors[] = 'prix incorrect.';
				} else {
					$formData['price'] = trim($lot_price);
				}

				//currency
				if( is_null($lot_currency) || $lot_currency === false ){
					$errors[] = 'currency incorrect.';
				} else {
					$formData['currency'] = trim($lot_currency);
				}

				//thumbnail
				if( is_null($img_thumbnail) || $img_thumbnail === false ){
					$errors[] = 'thumbnail image incorrecte.';
				} else {
					$img_thumbnail = filter_var(base64_decode($img_thumbnail), FILTER_SANITIZE_URL);
					if( $img_thumbnail === false ){
						throw new Exception('thumbnail incorrecte.');
					}

					$formData['image_thumbnail'] = trim($img_thumbnail);
				}

				//medium
				if( is_null($img_medium) || $img_medium === false ){
					$errors[] = 'medium image incorrecte.';
				} else {
					$img_medium = filter_var(base64_decode($img_medium), FILTER_SANITIZE_URL);
					if( $img_medium === false ){
						throw new Exception('medium image incorrecte.');
					}

					$formData['image_medium'] = trim($img_medium);
				}

				//full
				if( is_null($img_full) || $img_full === false ){
					$errors[] = 'full image incorrecte.';
				} else {
					$img_full = filter_var(base64_decode($img_full), FILTER_SANITIZE_URL);
					if( $img_full === false ){
						throw new Exception('full image incorrecte.');
					}

					$formData['image_full'] = trim($img_full);
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

			//product_identifier
			if( !isset($product_identifier) || is_null($product_identifier) || $product_identifier === false ){
				$formData['product_identifier'] = null;
			} else {
				$formData['product_identifier'] = trim($product_identifier);
			}

			//validated_title
			if( !isset($validated_title) || is_null($validated_title) || $validated_title === false ){
				$formData['validated_title'] = null;
			} else {
				$formData['validated_title'] = trim($validated_title);
			}

			//validated_description
			if( !isset($validated_description) || is_null($validated_description) || $validated_description === false ){
				$formData['validated_description'] = null;
			} else {
				$formData['validated_description'] = trim($validated_description);
			}

			//validated_brand
			if( !isset($hidden_validated_brand) || is_null($hidden_validated_brand) || $hidden_validated_brand === false ){
				$formData['validated_brand'] = null;
			} else {
				$formData['validated_brand'] = trim($hidden_validated_brand);
			}

			//validated_model
			if( !isset($hidden_validated_model) || is_null($hidden_validated_model) || $hidden_validated_model === false ){
				$formData['validated_model'] = null;
			} else {
				$formData['validated_model'] = trim($hidden_validated_model);
			}

			//validated_ref
			if( !isset($validated_ref) || is_null($validated_ref) || $validated_ref === false ){
				$formData['validated_ref'] = null;
			} else {
				$formData['validated_ref'] = trim($validated_ref);
			}

			//validated_case
			if( !isset($hidden_validated_case) || is_null($hidden_validated_case) || $hidden_validated_case === false ){
				$formData['validated_case'] = null;
			} else {
				$formData['validated_case'] = trim($hidden_validated_case);
			}

			//validated_shape
			if( !isset($hidden_validated_shape) || is_null($hidden_validated_shape) || $hidden_validated_case === false ){
				$formData['validated_shape'] = null;
			} else {
				$formData['validated_shape'] = trim($hidden_validated_case);
			}

			//validated_bracelet
			if( !isset($hidden_validated_bracelet) || is_null($hidden_validated_bracelet) || $hidden_validated_bracelet === false ){
				$formData['validated_bracelet'] = null;
			} else {
				$formData['validated_bracelet'] = trim($hidden_validated_bracelet);
			}

			//validated_movement
			if( !isset($hidden_validated_movement) || is_null($hidden_validated_movement) || $hidden_validated_movement === false ){
				$formData['validated_movement'] = null;
			} else {
				$formData['validated_movement'] = trim($hidden_validated_movement);
			}

			//validated_complication
			if( !isset($hidden_validated_complication) || is_null($hidden_validated_complication) || $hidden_validated_complication === false ){
				$formData['validated_complication'] = null;
			} else {
				$formData['validated_complication'] = trim($hidden_validated_complication);
			}

			//validated_estimation
			if( !isset($validated_estimation) || is_null($validated_estimation) || $validated_estimation === false ){
				$formData['validated_estimation'] = null;
			} else {
				$formData['validated_estimation'] = trim($validated_estimation);
			}

			//validated_price
			if( !isset($validated_price) || is_null($validated_price) || $validated_price === false ){
				$formData['validated_price'] = null;
			} else {
				$formData['validated_price'] = trim($validated_price);
			}

			//validated_currency
			if( !isset($validated_currency) || is_null($validated_currency) || $validated_currency === false ){
				$formData['validated_currency'] = null;
			} else {
				$formData['validated_currency'] = trim($validated_currency);
			}

			//validated_image
			if( !isset($validated_image) || is_null($validated_image) || $validated_image === false ){
				$formData['validated_image'] = null;
			} else {
				$formData['validated_image'] = trim($validated_image);
			}
		}

		$formData['errors'] = $errors;

		return $formData;
	}
}
?>
