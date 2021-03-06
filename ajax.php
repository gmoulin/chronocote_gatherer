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

				if( $target == 'christies' ){
					$month = filter_has_var(INPUT_POST, 'month');
					if( is_null($month) || $month === false ){
						throw new Exception('mois manquant.');
					}

					$month = filter_var($_POST['month'], FILTER_VALIDATE_INT, array('min_range' => 1, 'max_range' => 12));
					if( $month === false ){
						throw new Exception('mois incorrect.');
					}
				}

				if( $target == 'antiquorum' || $target == 'christies' ){
					$year = filter_has_var(INPUT_POST, 'year');
					if( is_null($year) || $year === false ){
						throw new Exception('année manquante.');
					}

					$year = filter_var($_POST['year'], FILTER_VALIDATE_INT, array('min_range' => 2007, 'max_range' => date('Y')));
					if( $year === false ){
						throw new Exception('année incorrecte.');
					}
				}


				if( $target == 'antiquorum' ){
					$postData = 'action=search&s_year='.$year;

				} else if( $target == 'sothebys' ){
					//end date timestamp to javascript format (milliseconds)
					//$postData = 'invertLocations=false&eventTypes=/data/dictionaries/eventType/AUC&departments=/data/departments/watches&showPast=true&startDate=1167606000000&endDate='.(time() * 1000).'&_charset_=utf-8&tzOffset=-3600000&filterExtended=true&ajaxScrolling=false&ascing=asc&orderBy=date&part=true&delete=undefined&from='.($page - 1 * 10).'&to='.($page * 10);
					$postData = '_charset_=utf-8&tzOffset=14400000&startDate=1167606000000&endDate='.(time() * 1000).'&eventTypes=%2Fdata%2Fdictionaries%2FeventType%2FAUC&showPast=true&resultSections=departments%3Blocations%3Btopics&filterExtended=true&search=&ascing=desc&orderBy=date&lowPriceEstimateUSD=&highPriceEstimateUSD=&artists=&genres=&types=&mediums=&locations=&departments=%2Fdata%2Fdepartments%2Fwatches&topics=&currency=USD&part=true&from='.($page - 1 * 12).'&to='.($page * 12).'&isAuthenticated=false';

				} else if ( $target == 'christies' ){
					$postData = 'month='.$month.'&year='.$year.'&locations=&scids=9&initialpageload=false'.($page > 1 ? '&pg='.$page : '');
				}

				$url = filter_var(base64_decode($url), FILTER_SANITIZE_URL);
				if( $url === false ){
					throw new Exception('url incorrecte.');
				}

				$output = '';
				if( $target == 'antiquorum' ){
					//first curl to get a session id
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://catalog.antiquorum.com/index.html');
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_COOKIESESSION, true);
					curl_setopt($ch, CURLOPT_HEADER, 1);
					$header = curl_exec($ch);
					preg_match('/^Set-Cookie: (.*?);/m', $header, $m);
					$_SESSION['cookie_PHPSESSID'] = isset($m[1]) ? $m[1] : '';
					curl_close($ch);


					//need a POST to "initialize" the search
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://catalog.antiquorum.com/index.html');
					curl_setopt($ch, CURLOPT_POST, 1);
					curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, 'http://catalog.antiquorum.com/index.html');
					if( $_SESSION['cookie_PHPSESSID'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['cookie_PHPSESSID'].';language=en');
					}
					$output = curl_exec($ch);
					curl_close($ch);

					//http://catalog.antiquorum.com/index.html is in iso
					$output = utf8_encode($output);
					header('Content-Type: text/html; charset=utf-8');

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
					curl_setopt($ch, CURLOPT_URL, 'http://www.sothebys.com/en/auctions/list/_jcr_content.eventsList.html');
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

				} elseif( $target == 'christies' ){
					//first curl to get a session id
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, 'http://www.christies.com/results/?'.$postData);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_COOKIESESSION, true);
					curl_setopt($ch, CURLOPT_HEADER, 1);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					if( $_SESSION['christies_cookie'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['christies_cookie']);
					}
					$output = curl_exec($ch);
					preg_match('/^Set-Cookie: (.*?);/m', $output, $m);
					$_SESSION['christies_cookie'] = isset($m[1]) ? $m[1] : '';
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
				if( $referer !== false ){
					$referer = filter_var(base64_decode($_POST['referer']), FILTER_SANITIZE_URL);
				}

				$output = '';
				if( $target == 'antiquorum' ){
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, is_string($referer) && strlen($referer) > 0 ? $referer : 'http://catalog.antiquorum.com/index.html');
					if( $_SESSION['cookie_PHPSESSID'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['cookie_PHPSESSID']);
					}
					$output = curl_exec($ch);
					curl_close($ch);

					//http://catalog.antiquorum.com/index.html is in iso
					$output = utf8_encode($output);
					header('Content-Type: text/html; charset=utf-8');

				} elseif( $target == 'sothebys' ){
					$currency = filter_has_var(INPUT_POST, 'currency');
					if( is_null($currency) || $currency === false ){
						throw new Exception('monnaie manquante.');
					}

					$currency = filter_var($_POST['currency'], FILTER_SANITIZE_STRING);
					if( $currency === false ){
						throw new Exception('monnaie incorrecte.');
					}

					//$postData = 'charset_=utf-8&ascing=asc&currency='.$currency.'&from=0&to=12';
					$postData = '_charset_=utf-8&artists=&ascing=asc&currency=USD&departments=&endDate=&eventTypes=/data/dictionaries/eventType/AUC;/data/dictionaries/eventType/EXH&filterExtended=true&from=0&genres=&highPriceEstimateUSD=999999999.0&isAuthenticated=false&locations=&lots=&lowPriceEstimateUSD=0.0&mediums=&orderBy=lotSortNum&part=true&resultSections=departments;locations;topics&showPast=false&startDate=&to=999&topics=&types=&tzOffset=14400000';

					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 1);
					curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // pagination is already in postData
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

				} elseif( $target == 'christies' ){
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, is_string($referer) && strlen($referer) > 0 ? $referer : 'http://www.christies.com/');
					if( $_SESSION['christies_cookie'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['christies_cookie']);
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

				} elseif( $target == 'christies' ){
					$ch = curl_init();
					curl_setopt($ch, CURLOPT_URL, $url);
					curl_setopt($ch, CURLOPT_POST, 0);
					curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
					curl_setopt($ch, CURLOPT_HEADER, false);
					curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
					curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17');
					curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
					curl_setopt($ch, CURLOPT_REFERER, is_string($referer) && strlen($referer) > 0 ? $referer : 'http://www.christies.com/');
					if( $_SESSION['christies_cookie'] != '' ){
						curl_setopt($ch, CURLOPT_COOKIE, $_SESSION['christies_cookie']);
					}
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
				if( !filter_has_var(INPUT_POST, 'field') ){
					throw new Exception('paramètre manquant.');
				}

				$field = filter_input(INPUT_POST, 'field', FILTER_SANITIZE_STRING);
				if( is_null($field) || $field === false ){
					throw new Exception('liste incorrecte.');
				}

				$oCandidate = new candidate();

				$response = $oCandidate->getDistinct( $field );
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
		case 'send':
		case 'update':
				$oCandidate = new candidate();

				$formData = $oCandidate->checkAndPrepareFormData();

				if( empty($formData['errors']) ){
					$id = $oCandidate->updCandidate( $formData );

					if( $action == 'send' ){
						//send data to chronocote
						$oCandidate->updStatus( $id, 'sent' );

						$response = 'ok';

					} else {
						$oCandidate->updStatus( $id, 'validated' );
						$response = 'ok';
					}
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
		case 'multi-delete':
				$ids = filter_has_var(INPUT_POST, 'ids');
				if( is_null($ids) || $ids === false ){
					throw new Exception('identitifants des candidats manquant.');
				}

				$ids = explode(',', $ids);

				foreach( $ids as $id ){
					$id = filter_var($id, FILTER_VALIDATE_INT, array('min_range' => 1));
					if( $id === false ){
						throw new Exception('identifiant incorrect.');
					}
				}

				foreach( $ids as $id ){
					$ocandidate = new candidate();
					$ocandidate->delcandidate( $id );
				}

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

				$page = filter_has_var(INPUT_POST, 'page');
				if( is_null($page) || $page === false ){
					throw new Exception('page manquante.');
				}

				$page = filter_var($_POST['page'], FILTER_VALIDATE_INT, array('min_range' => 0));
				if( $page === false ){
					throw new Exception('page incorrecte.');
				}

				$maxPerPage = 25;

				$oCandidate = new candidate();
				$candidates = $oCandidate->getCandidatesByTarget( $target, $page, $maxPerPage );

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

				if( $target == 'christies' ){
					$month = filter_has_var(INPUT_POST, 'month');
					if( is_null($month) || $month === false ){
						throw new Exception('mois manquant.');
					}

					$month = filter_var($_POST['month'], FILTER_VALIDATE_INT, array('min_range' => 1, 'max_range' => 12));
					if( $month === false ){
						throw new Exception('mois incorrect.');
					}
				}

				if( $target == 'antiquorum' || $target == 'christies' ){
					$year = filter_has_var(INPUT_POST, 'year');
					if( is_null($year) || $year === false ){
						throw new Exception('année manquante.');
					}

					$year = filter_var($_POST['year'], FILTER_VALIDATE_INT, array('min_range' => 2007, 'max_range' => date('Y')));
					if( $year === false ){
						throw new Exception('année incorrecte.');
					}
				}

				$oTrace = new trace();
				$trace = $oTrace->getTraceByTarget( $target );

				$trace['page'] = $page;
				$trace['auctionId'] = $auctionId;
				$trace['lotPage'] = $lotPage;

				if( $target == 'christies' ){
					$trace['month'] = $month;
				}

				if( $target == 'antiquorum' || $target == 'christies' ){
					$trace['year'] = $year;
				}

				$oTrace->updTrace( $trace );
				$trace = $oTrace->getTraceByTarget( $target );
				$response = $trace;
			break;
		case 'increaseDate':
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
				if( $trace['month'] + 1 > 12 ){
					$trace['month'] = 1;
					$trace['year']++;
				} else {
					$trace['month']++;
				}

				$oTrace->updTraceDate( $trace );
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

