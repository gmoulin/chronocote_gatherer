<?php
try {
	require_once('inc/conf.ini.php');

	header('Content-type: application/json');

	$action = filter_has_var(INPUT_POST, 'action');
	if( is_null($action) || $action === false ){
		throw new Exception('action manquante.');
	}

	$action = filter_var($_POST['action'], FILTER_SANITIZE_STRING);
	if( $action === false ){
		throw new Exception('action incorrecte.');
	}

	switch ( $action ){
		case 'proxyList':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('cible manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('cible incorrecte.');
				}

				$page = filter_has_var(INPUT_POST, 'page');
				if( is_null($page) || $page === false ){
					throw new Exception('page manquante.');
				}

				$page = filter_var($_POST['page'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $page === false ){
					throw new Exception('page incorrecte.');
				}

				if( !filter_has_var(INPUT_POST, 'url') ){
					throw new Exception('paramètre manquant.');
				}

				$url = filter_input(INPUT_POST, 'url', FILTER_SANITIZE_STRING);
				if( is_null($url) || $url === false ){
					throw new Exception('url incorrecte.');
				}

				if( $target == 'antiquorum' ){
					$postData = 'action=search&s_searchtype=1&s_order=lotid.desc&s_hideauctions=&s_keywords=&s_fromprice=&s_toprice=&s_auction=0&s_grading=-1&s_batchstep=10&searchsubmit=SEARCH';

				} else if( $target == 'sothebys' ){
					//end date timestamp to javascript format (milliseconds)
					$postData = 'invertLocations=false&eventTypes=/data/dictionaries/eventType/AUC&departments=/data/departments/watches&showPast=true&startDate=1167606000000&endDate='.(time() * 1000).'&_charset_=utf-8&tzOffset=-3600000&filterExtended=true&ajaxScrolling=false&ascing=asc&orderBy=date&part=true&delete=undefined&from='.($page - 1 * 10).'&to='.($page * 10);
				}

				$url = filter_var(base64_decode($url), FILTER_SANITIZE_URL);
				if( $url === false ){
					throw new Exception('url incorrecte.');
				}

				$output = '';
				if( $target == 'antiquorum' ){
					//first curl to get a session id
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://catalog.antiquorum.com/catalog.html');
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_COOKIESESSION, true);
					curl_setopt($ch, CURLOPT_HEADER, 1);
					$header = curl_exec($ch);
					preg_match('/^Set-Cookie: (.*?);/m', $header, $m);
					if( isset($m[1]) ){
						$sessionId = $m[1];
					} else {
						$sessionId = 'PHPSESSID=a1526hnkmq6hfo74h1c59rbqq3';
					}
					$_SESSION['cookie_PHPSESSID'] = 'PHPSESSID=a1526hnkmq6hfo74h1c59rbqq3';
					curl_close($ch);


					//need a POST to "initialize" the search
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://catalog.antiquorum.com/catalog.html');
					curl_setopt($ch, CURLOPT_POST, 1);
					curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, 'http://catalog.antiquorum.com/catalog.html');
					curl_setopt($ch, CURLOPT_COOKIE, $sessionId.';language=en');
					$output = curl_exec($ch);
					curl_close($ch);

					//next pages are GETs
					if( $page > 1 ){
						//need a post
						$ch = curl_init();
						curl_setopt($ch, CURLOPT_URL, $url);
						curl_setopt($ch, CURLOPT_POST, 0);
						curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
						curl_setopt($ch, CURLOPT_HEADER, false);
						curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
						curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
						curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
						curl_setopt($ch, CURLOPT_REFERER, 'http://catalog.antiquorum.com/catalog.html');
						curl_setopt($ch, CURLOPT_COOKIE, $sessionId.';language=en');
						$output = curl_exec($ch);
						curl_close($ch);
					}
				} elseif( $target == 'sothebys' ){
					//first curl to get a session id
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://www.sothebys.com/en/auctions/results.html');
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_COOKIESESSION, true);
					curl_setopt($ch, CURLOPT_HEADER, 1);
					$header = curl_exec($ch);
					preg_match('/^Set-Cookie: (.*?);/m', $header, $m);
					$_SESSION['sothebys_cookie'] = isset($m[1]) ? $m[1] : '';
					curl_close($ch);

					//need a POST to "initialize" the search
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://www.sothebys.com/en/auctions/results/_jcr_content.auctionsList.html');
					curl_setopt($ch, CURLOPT_POST, 1);
					curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // pagination is already in postData
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, 'http://www.sothebys.com/en/auctions/results.html');
					if( $_SESSION['sothebys_cookie'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['sothebys_cookie']);
					}
					$output = curl_exec($ch);
					curl_close($ch);
				}

				//client need html
				echo $output;
				die();
			break;
		case 'proxyLotsList':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('cible manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('cible incorrecte.');
				}

				$url = filter_has_var(INPUT_POST, 'url');
				if( is_null($url) || $url === false ){
					throw new Exception('url manquante.');
				}

				$url = filter_var(base64_decode($_POST['url']), FILTER_SANITIZE_URL);
				if( $url === false ){
					throw new Exception('url incorrecte.');
				}

				$referer = filter_has_var(INPUT_POST, 'referer');
				$referer = filter_var(base64_decode($_POST['referer']), FILTER_SANITIZE_URL);

				$output = '';
				if( $target == 'sothebys' ){
					//need a post
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, is_string($referer) && strlen($referer) > 0 ? $referer : 'http://www.sothebys.com/en/auctions/results.html');
					if( $_SESSION['sothebys_cookie'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['sothebys_cookie']);
					}
					$output = curl_exec($ch);
					curl_close($ch);
				}

				//client need html
				echo $output;
				die();
			break;
		case 'proxyLotDetail':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('cible manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('cible incorrecte.');
				}

				$url = filter_has_var(INPUT_POST, 'url');
				if( is_null($url) || $url === false ){
					throw new Exception('url manquante.');
				}

				$url = filter_var(base64_decode($_POST['url']), FILTER_SANITIZE_URL);
				if( $url === false ){
					throw new Exception('url incorrecte.');
				}

				$referer = filter_has_var(INPUT_POST, 'referer');
				if( is_null($referer) || $referer === false ){
					throw new Exception('referer manquant.');
				}

				$referer = filter_var(base64_decode($_POST['referer']), FILTER_SANITIZE_URL);
				if( $referer === false ){
					throw new Exception('referer incorrect.');
				}

				$output = '';
				if( $target == 'sothebys' ){
					//need a post
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, $referer);
					curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['cookie']);
					//curl_setopt($ch, CURLOPT_COOKIE, $sessionId.';language=en');
					$output = curl_exec($ch);
					curl_close($ch);
				}

				//client need html
				echo $output;
				die();
			break;
		case 'proxyDetail':
				$source = filter_has_var(INPUT_POST, 'source');
				if( is_null($source) || $source === false ){
					throw new Exception('cible manquante.');
				}

				$source = filter_var($_POST['source'], FILTER_SANITIZE_STRING);
				if( $source === false ){
					throw new Exception('cible incorrecte.');
				}

				$sourceUrl = filter_has_var(INPUT_POST, 'sourceUrl');
				if( is_null($sourceUrl) || $sourceUrl === false ){
					throw new Exception('url manquante.');
				}

				$sourceUrl = filter_var($_POST['sourceUrl'], FILTER_SANITIZE_STRING);
				if( $sourceUrl === false ){
					throw new Exception('url incorrecte.');
				}

				$sourceUrl = filter_var(base64_decode($sourceUrl), FILTER_SANITIZE_URL);
				if( $sourceUrl === false ){
					throw new Exception('url incorrecte.');
				}

				$auctionId = filter_has_var(INPUT_POST, 'auctionId');
				if( is_null($auctionId) || $auctionId === false ){
					throw new Exception('cible manquante.');
				}

				$auctionId = filter_var($_POST['auctionId'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $auctionId === false ){
					throw new Exception('cible incorrecte.');
				}

				$lotId = filter_has_var(INPUT_POST, 'lotId');
				if( is_null($lotId) || $lotId === false ){
					throw new Exception('cible manquante.');
				}

				$lotId = filter_var($_POST['lotId'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $lotId === false ){
					throw new Exception('cible incorrecte.');
				}

				//check unicity
				$oCandidate = new candidate();
				$check = $oCandidate->check( $source, $auctionId, $lotId );
				if( $check === false ){
					//need a post
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $sourceUrl);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, 'http://catalog.antiquorum.com/catalog.html');
					curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['cookie_PHPSESSID'].';language=en');
					$output = curl_exec($ch);
					curl_close($ch);

					$response = array('detail' => $output);

				} else {
					$response = array('id' => $check);
				}
			break;
		case 'checkAuctionExists':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('cible manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('cible incorrecte.');
				}

				$auctionId = filter_has_var(INPUT_POST, 'auctionId');
				if( is_null($auctionId) || $auctionId === false ){
					throw new Exception('auction manquante.');
				}

				$auctionId = filter_var($_POST['auctionId'], FILTER_SANITIZE_STRING);
				if( $auctionId === false ){
					throw new Exception('auction incorrecte.');
				}

				//check unicity
				$oCandidate = new candidate();
				$check = $oCandidate->checkAuction( $target, $auctionId );

				$response = array('exists' => $check);
			break;
		case 'loadList':
				if( !filter_has_var(INPUT_GET, 'field') ){
					throw new Exception('paramètre manquant.');
				}

				$field = filter_input(INPUT_GET, 'field', FILTER_SANITIZE_STRING);
				if( is_null($field) || $field === false ){
					throw new Exception('liste incorrecte.');
				}

				//@TODO
				$response = array();
			break;
		case 'add':
				$oCandidate = new candidate();

				$formData = $oCandidate->checkAndPrepareFormData();

				if( empty($formData['errors']) ){
					$id = $oCandidate->addCandidate( $formData );
					$response = $oCandidate->getCandidateById( $id );
				} else {
					$response = $formData['errors'];
				}
			break;
		case 'update':
				$oCandidate = new candidate();

				$formData = $oCandidate->checkAndPrepareFormData();

				if( empty($formData['errors']) ){
					$id = $oCandidate->updCandidate( $formData );
					$response = 'ok';
				} else {
					$response = $formData['errors'];
				}
			break;
		case 'delete':
				$id = filter_has_var(INPUT_POST, 'id');
				if( is_null($id) || $id === false ){
					throw new Exception('identitifant du candidat manquant.');
				}

				$id = filter_var($_POST['id'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $id === false ){
					throw new Exception('identifiant incorrect.');
				}

				$oCandidate = new candidate();
				$oCandidate->delCandidate( $id );
				$response = 'ok';
			break;
		case 'list':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('source manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('source incorrecte.');
				}

				$oCandidate = new candidate();
				$candidates = $oCandidate->getCandidatesByTarget( $target );

				$response = array('list' => $candidates);
			break;
		case 'increasePage':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('source manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('source incorrecte.');
				}

				$oTrace = new trace();
				$trace = $oTrace->getTraceByTarget( $target );
				$trace['page']++;

				$oTrace->updTrace( $trace );
				$response = $trace;
			break;
		case 'updateLast':
				$target = filter_has_var(INPUT_POST, 'target');
				if( is_null($target) || $target === false ){
					throw new Exception('source manquante.');
				}

				$target = filter_var($_POST['target'], FILTER_SANITIZE_STRING);
				if( $target === false ){
					throw new Exception('source incorrecte.');
				}

				$auctionId = filter_has_var(INPUT_POST, 'auctionId');
				if( is_null($auctionId) || $auctionId === false ){
					throw new Exception('auctionId manquante.');
				}

				$auctionId = filter_var($_POST['auctionId'], FILTER_SANITIZE_STRING);
				if( $auctionId === false ){
					throw new Exception('auctionId incorrecte.');
				}

				$page = filter_has_var(INPUT_POST, 'page');
				if( is_null($page) || $page === false ){
					throw new Exception('page manquante.');
				}

				$page = filter_var($_POST['page'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $page === false ){
					throw new Exception('page incorrecte.');
				}

				$lotPage = filter_has_var(INPUT_POST, 'lotPage');
				if( is_null($lotPage) || $lotPage === false ){
					throw new Exception('lotPage manquante.');
				}

				$lotPage = filter_var($_POST['lotPage'], FILTER_VALIDATE_INT, array('min_range' => 1));
				if( $lotPage === false ){
					throw new Exception('lotPage incorrecte.');
				}

				$oTrace = new trace();
				$trace = $oTrace->getTraceByTarget( $target );

				$trace['page'] = $page;
				$trace['auctionId'] = $auctionId;
				$trace['lotPage'] = $lotPage;

				$oTrace->updTrace( $trace );
				$trace = $oTrace->getTraceByTarget( $target );
				$response = $trace;
			break;
		default:
			throw new Exception('action non reconnue.');
	}

	echo json_encode($response);
	die;

} catch (Exception $e) {
	header($_SERVER["SERVER_PROTOCOL"]." 555 Response with exception");
	echo json_encode($e->getMessage());
	die;
}
?>

