var $body, $win, $doc, $formModal, $form, $confirmModal,
	$progressionModal, $progressionModalBody,
	$parts, $navLinks, $listContainer, $help,
	$lightboxImg, $notify,
	activeTab, target,
	nextPage = false,
	stop = false,
	updating = 0;

/**
 * hashchange listener
 * change the current tab
 */
var tabSwitch = function(){
	'use strict';
	target = window.location.hash.substr(1) || $navLinks.eq(0).attr('href').substr(1);

	$navLinks.parents().removeClass('active');
	$navLinks.filter('[href$="'+ target +'"]').parent().addClass('active');

	$parts.hide()
		.filter('[id$="_'+ target +'"]').show();

	activeTab = target;

	if( $('#list_'+ target).length > 0 ){ // Argument is a valid tab name
		window.location.hash = '#' + target; //security if hash empty

		getList();
	}
};

/**
 * load the list
 * @param integer type
 * 		0: new list
 * 		1: search or sort
 * 		2: list refresh after item modification
 * 		3: new page on current list (infinite scroll)
 */
var getList = function( type ){
	'use strict';
	//multiple call protection
	if( updating !== 1 ){
		updating = 1;

		if( activeTab === undefined ) return;

		var $list = $('#list_'+ activeTab);

		$body.css('cursor', 'progress');

		$.ajax({
			url: 'ajax.php',
			data: 'action=list&target='+ activeTab,
			type: 'POST',
			dataType: 'json'
		})
		.always(function(){
			updating = 0;
			$body.css('cursor', '');
		})
		.done(function( data ){
			if( data.list && data.list.length > 0 ){
				$list.find('tbody').html( tmpl('list_tmpl', data) );
			} else {
				$notify.notify({message: {text: 'Aucun lot trouvé pour ce site'}, type: 'warning'}).show();
			}
		})
		.fail(function(){
			//inform user
			$notify.notify({message: {text: 'Échec du chargement de la liste'}, type: 'error'}).show();
		});
	}
};

/**
 * ajax load <datalist> and <select> content
 */
$.fn.loadList = function(){
	'use strict';
	return this.each(function(){
		var $this = $(this),
			key = $this.attr('id'),
			decoder = $('<textarea>');

		//ask the list values to the server and create the <option>s with it
		$.ajax({
			url: 'ajax.php',
			data: 'action=loadList&field=' + $this.attr('id'),
			dataType: 'json'
		})
		.done(function(data, textStatus, jqXHR){
			if( $this.is('datalist') ){
				$this.empty();
			} else {
				$this.find('option:gt(0)').remove(); //keep the first option aka "placeholder"
			}

			$.each(data, function(i, obj){
				obj.value = decoder.html(obj.value).val();
				$('<option>', { "value": ( obj.id ? obj.id : obj.value ), text: obj.value }).appendTo( $this );
			});
		})
		.fail(function(){
			//inform user
			$notify.notify({message: {text: 'Échec du chargement de la liste d\'auto-complétion'}, type: 'error'}).show();
		});
	});
};

/**
 * dynamic form fields validation using HTML5 form validation API
 * called through javascript events listeners
 * set classes for css form validation rules
 * @param object event
 */
var checkField = function( event ){
	'use strict';
	var $el = $(event.target),
		$controlGroup = $el.closest('.control-group');

	$controlGroup.attr('class', 'control-group');

	if( $el[0].validity ){
		if( $el[0].validity.valid ){
			if( $el.val() !== '' ){
				$controlGroup.addClass('success');
			}
		} else if( $el[0].validity.valueMissing ){
			$controlGroup.addClass('warning');
		} else {
			$controlGroup.addClass('error');
		}
	}
};

/**
 * display the form errors
 * @param array [[field id, message, error type]]
 */
var formErrors = function( data ){
	'use strict';
	$.each(data, function(index, error){
		$('#'+ error[0])
			//add error class
			.closest('.control-group').addClass( error[2] == 'required' ? 'warning' : error[2] )
			.find('.controls')
				//remove previous error message if present
				.find('.help-block').remove().end()
				//add error message
				.append( $help.clone().text(error[1]) );
	});
};

/**
 * inform user of parsing progress
 * @param string msg
 */
var progress = function( msg, cssClass ){
	'use strict';
	if( typeof cssClass == 'undefined' ) cssClass = '';
	else if( cssClass.indexOf('text-') !== 0 ) cssClass = 'text-'+ cssClass;

	$progressionModalBody
		.find('ul').append('<li class="'+ cssClass +'">'+ msg +'</li>');

	$progressionModalBody.scrollTop( $progressionModalBody[0].scrollHeight );
};

/** _____________________________________________ DATA GATHERING **/
	var config = {
		antiquorum: {
			listUrl: 'http://catalog.antiquorum.com/catalog.html?action=list&s_batch=',
			detailUrl: 'http://catalog.antiquorum.com/catalog.html?action=load&lotid=LID&auctionid=AID',
			minYear: 2007,
			maxLotPerPage: 10 // do not change
		},
		sothebys: {
			listUrl: 'http://www.sothebys.com/en/auctions/results/_jcr_content.auctionsList.html',
			minYear: 2007,
			baseUrl: 'http://www.sothebys.com',
			maxLotPerPage: 10 // do not change
		}
	};
	var completedPage = false; //for Trace
	/**
	 * get target site list page #num (use trace last data)
	 * with progress display
	 */
	var parseTarget = function(){
		'use strict';
		var conf = config[ activeTab ];
		completedPage = false;

		$progressionModal.modal('show')
			.find('.stop').show().next().hide();

		if( !nextPage ){
			$progressionModal.find('ul').html('');
		}

		nextPage = false;

		progress('Récupération de la page #'+ last[ activeTab ].page +' du catalogue '+ activeTab);
		progress('Comptez environ 30s');

		$.ajax({
			url: 'ajax.php',
			data: 'action=proxyList&target='+ activeTab +'&page='+ last[ activeTab ].page +'&url='+ $.base64.encode( conf.listUrl ),
			type: 'POST',
			timeout: 2 * 60 * 1000,
			dataType: 'text',
			cache: false
		})
		.done(function( data ){
			progress('Récupération finie - analyse des résultats');

			var $data, $lots, isLastPage;
			if( activeTab == 'antiquorum' ){
				//get only the <body>, also change <img> srcs' to data-srcs' to avoid images requests
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>') - 1).replace(/src=/g, 'data-src=');
				$data = $(data);
				$parts = $data.find('.searchtitle');
				isLastPage = $data.find('.maintablesearch').eq(1).find('.navigationbar').eq(2).find('a').length === 0;

				progress($parts.length +' lots potentiels trouvés');

			} else if( activeTab == 'sothebys' ){
				$data = $('<tbody>'+ data +'</tbody>');
				$parts = $data.find('tr');
				isLastPage = $parts.length != 10; // 10 results per page

				progress($parts.length +' auctions potentielles trouvées');
			}


			$.when( parseLots( activeTab, conf, $parts ) )
				.done(function(){
					if( !nextPage ){
						$progressionModal.find('.finished').removeClass('btn-error').addClass('btn-success');
					}

					//update trace page
					//use isLastPage and completePage to check if page number should be increased
					if( activeTab == 'antiquorum' && completedPage && !isLastPage ){
						progress('Page complètement analysée, augmentation du numéro de page pour '+ activeTab.capitalize());

						$.ajax({
							url: 'ajax.php',
							data: 'action=increasePage&target='+ activeTab,
							type: 'POST',
							dataType: 'json',
							timeout: 2000,
							cache: false
						})
						.done(function(data){
							if( data.page ){
								last[ activeTab ] = data;

								if( nextPage ){
									progress('Passage à la prochaine page dans 5 secondes', 'info');
									window.setTimeout(function(){
										parseTarget();
									}, 5000);
								}
							} else {
								progress('Échec de la mise à jour des informations (numéro de page)', 'error');
							}
						})
						.fail(function(){
							progress('Échec de la mise à jour des informations (numéro de page)', 'error');
						});
					}

					if( activeTab == 'sothebys' ) {
						progress('Page de lots complètement analysée, sauvegarde de l\'état d\'avancement pour '+ activeTab.capitalize());
						$.ajax({
							url: 'ajax.php',
							data: 'action=updateLast&target='+ activeTab + $.param( last[ activeTab ] ),
							type: 'POST',
							dataType: 'json',
							timeout: 2000,
							cache: false
						})
						.done(function(data){
							if( data.page ){
								last[ activeTab ] = data;

							} else {
								progress('Échec de la mise à jour des informations', 'error');
							}
						})
						.fail(function(){
							progress('Échec de la mise à jour des informations', 'error');
						});
					}

				})
				.fail(function(){
					if( stop ){
						progress('Traitement stoppé sur demande', 'info');
						if( activeTab == 'sothebys' ){
							progress('Toute auction partiellement traitée (au moins un lot enregistré) sera considérée comme complètement traitée et sera omise à la prochaine vérification', 'warning');
						}
					}

					$progressionModal.find('.finished').removeClass('btn-success').addClass('btn-error');
				})
				.always(function(){
					if( !nextPage ){
						$('#parse').removeClass('disabled');
						$progressionModal
							.find('.stop').hide().next().show();
					}
				});
		})
		.fail(function(){
			$notify.notify({message: {text: 'Échec du chargement de la liste'}, type: 'error'}).show();

			$('#parse').removeClass('disabled');
		});
	};

	/**
	 * parse list results for valid lot
	 * @param jquery collection $lots
	 */
	var parseLots = function( activeTab, conf, $parts ){
		'use strict';
		progress('début analyse');

		return $.Deferred(function( dfd ){
			if( activeTab == 'antiquorum' ){
				return dfd.pipe( parseAntiquorumResults(dfd, activeTab, conf, $parts) );

			} else if( activeTab == 'sothebys' ){
				return dfd.pipe( parseSothebysResults(dfd, activeTab, conf, $parts) );

			}
		}).promise();
	};

	/**
	 * antiquorum have a lot list,
	 * parsing it page per page
	 * store the current page number
	 */
	var parseAntiquorumResults = function( dfd, activeTab, conf, $lots ){
		'use strict';
		if( stop ) return dfd.reject();

		var i = -1,
			lot, nextDate,
			maxDate = 0,
			lots = [],
			$lot, $block, $futureAuction, $detailLink,
			title, date, tmp, ts, href,
			size = $lots.length,
			isfullPage = size == conf.maxLotPerPage;

		var lotsLoop = function( dfd ){
			if( stop ) return dfd.reject();
			if( size === 0 ){
				progress('Aucun lot trouvé');
				return dfd.resolve();
			}

			i++;
			if( i >= size && lots.length === 0 ){
				progress('Aucun lot valide trouvé');
				completedPage = isfullPage;
				nextPage = true;
				return dfd.resolve();
			}

			if( i >= size ){
				progress(lots.length +' lots valides trouvés - récupération de leurs détails');
				i = -1; //reset index for byLot loop
				return dfd.pipe( byLot(dfd) );
			}

			progress('Lot '+ (i + 1) +' / '+ size);

			$lot = $lots.eq(i);

			return dfd.pipe( analyseLot(dfd) );
		};

		var analyseLot = function( dfd ){
			if( stop ) return dfd.reject();
			$block = $lot.parents('table').eq(1);

			$futureAuction = $block.find('.bidonlinestart input');
			title = $.trim( $block.find('.bidauctiontitle').text() );
			date = title.substr(title.length - 10);
			tmp = date.split('-');
			if( tmp.length == 3 ){
				date = tmp[2] +'-'+ tmp[1] +'-'+ tmp[0]; //YYYY-MM-DD
				ts = new Date(tmp[2], tmp[1] - 1, tmp[0]);
				ts = ts.getTime() / 1000;
			} else {
				ts = 0;
			}

			if( $futureAuction.length > 0 ){
				//@TODO nextDate
				progress('Lot d\'une vente future - ignoré');
				return dfd.pipe( lotsLoop(dfd) );

			} else if( conf.hasOwnProperty('minYear') && tmp[2] < conf.minYear ){
				progress('Lot d\'une vente trop éloignée dans le passé (< '+ conf.minYear +') - ignoré');
				return dfd.pipe( lotsLoop(dfd) );

			} else {
				progress('Lot d\'une vente passée - analyse');
				//gather available data
				lot = {};

				lot.source = activeTab;
				lot.auctionTitle = title.substr(0, title.length - 10);
				lot.auctionDate = date;

				maxDate = (maxDate < ts ? ts : maxDate);

				$detailLink = $block.find('.imagetd').find('a');

				href = $detailLink.attr('href'); //javascript:opendetail(291,269);
				tmp = href.replace(/javascript:opendetail\(/, '').replace(/\);/, '');
				tmp = tmp.split(',');
				if( tmp.length == 2 ){
					lot.sourceUrl = $.base64.encode( conf.detailUrl.replace(/LID/, tmp[0]).replace(/AID/, tmp[1]) );
					lot.auctionId = tmp[1];
					lot.lotId = tmp[0];
				}

				lot.thumbnail = $.base64.encode( $detailLink.find('img').attr('data-src') );

				lots.push(lot);

				progress('Lot trouvé, auction #'+ lot.auctionId +' lot #'+ lot.lotId);

				return dfd.pipe( lotsLoop(dfd) );
			}
		};

		var byLot = function( dfd ){
			if( stop ) return dfd.reject();

			i++;
			if( i >= lots.length ){
				progress('Analyse finie', 'success');
				completedPage = isfullPage;
				return dfd.resolve();
			}

			lot = lots[i];
			return dfd.pipe( getDetail(dfd) );
		};

		var getDetail = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Vérification et récupération des détails pour auction #'+ lot.auctionId +' lot #'+ lot.lotId);

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyDetail&'+ $.param(lot),
				dataType: 'json',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				if( data.detail ){
					//get only the <body>, also change <img> srcs' to data-srcs' to avoid images requests
					var detail = data.detail.substr(data.detail.indexOf('<body'), data.detail.indexOf('</html>') - 1).replace(/src=/g, 'data-src='),
						$data = $(detail),
						$details, note, price;

					lot.id = 0;
					lot.title = $.trim( $data.find('.detailsubtitle').text() );

					$details = $data.find('.detailpayload');
					lot.criteria = $.trim( $details.eq(0).text() );
					//remove first estimate and replace other occurence by |, also change the thousand separator of prices
					lot.estimates = $.trim( $details.eq(1).text().replace(/Estimate: /, '').replace(/ Estimate: /g, '|').replace(/,/g, '\'') );
					lot.medium = $.base64.encode( $details.eq(2).next().find('img').attr('data-src') );
					lot.full = $.base64.encode( $details.eq(3).find('a').attr('href') );

					note = $.trim( $data.find('.detailnotes').first().find('.bidonlinestart').first().text() );
					price = note.replace('Sold including buyer\'s premium:', '').replace(',', '');
					price = price.split(' ');
					lot.price = price[0];
					lot.currency = price[1];

					lot.info = lot.title +' #||# '+ lot.criteria +' #||# '+ lot.estimates +' #||# '+ note;

					progress('Lot validé');
					return dfd.pipe( addLot(dfd) );

				} else if( data.id > 0 ){
					progress('Lot déjà présent - ignoré');
					return dfd.pipe( byLot(dfd) );

				} else {
					progress('Échec de la récupération du détail du lot', 'error');
					return dfd.reject();
				}
			})
			.fail(function(){
				progress('Échec du chargement du détail d\'un lot', 'error');
				return dfd.reject();
			});
		};

		var addLot = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Sauvegarde du lot en attente de validation');
			$.ajax({
				url: 'ajax.php',
				data: 'action=add&'+ $.param(lot),
				type: 'POST',
				dataType: 'json',
				timeout: 2000,
				cache: false
			})
			.done(function( data ){
				if( data.id && parseInt(data.id, 10) > 0 ){
					progress('Sauvegarde effectuée');

					$('#list_'+ activeTab).find('tbody').append( tmpl('list_tmpl', { list: [data] }) );

					return dfd.pipe( byLot(dfd) );

				} else {
					if( data.error ){
						for( var i = 0; i < data.error.length; i += 1 ){
							progress(data.error[ i ]);
						}
					}

					progress('Échec lors de la sauvegarde du lot', 'error');
					return dfd.reject();
				}
			})
			.fail(function(){
				progress('Échec lors de la sauvegarde du lot', 'error');
				return dfd.reject();
			});
		};

		return dfd.pipe( lotsLoop(dfd) );
	};

	/**
	 * sotheby's have a filtered auction list,
	 * get one,
	 * parse the auction detail page to get the lots
	 * parse lots page per page
	 * store the auction list current page number
	 * store the current auction detail page url
	 * store the current lots list page
	 */
	var parseSothebysResults = function( dfd, activeTab, conf, $auctions ){
		'use strict';
		if( stop ) return dfd.reject();
		var i = -1,
			auctions = [],
			maxDate = 0,
			size = $auctions.length,
			lots = [],
			isfullPage = size == conf.maxLotPerPage,
			auctionParsed = false,
			j, nbPages, auction, $auction, $date, date, ts, $lots, nbLots, lot, lot, lotsListUrls, totalLots;

		var auctionsLoop = function( dfd ){
			if( stop ) return dfd.reject();
			if( size === 0 ){
				progress('Aucun lot trouvé');
				return dfd.resolve();
			}

			i++;
			if( i >= size ){
				auction = null;
				//check if the storage auction url is in the list
				if( last[ activeTab ].auctionId !== '' ){
					for( var k = 0; k < auctions.length; k += 1 ){
						if( auctions[ k ].auctionId == last[ activeTab ].auctionId){
							auction = auctions[ k ];
							break;
						}
					}

					if( auction ){
						progress('auction en cours de traitement trouvée, #'+ auction.auctionId);
						i = k;
						return dfd.pipe( getAuctionDetail(dfd) );
					}
				}

				progress(auctions.length +' auctions valides trouvées - récupération des lots pour la première');
				i = -1; //reset counter for byAuction loop
				return dfd.pipe( byAuction(dfd) );
			}

			progress('Auction '+ (i + 1) +' / '+ size);

			$auction = $auctions.eq(i);

			return dfd.pipe( analyseAuction(dfd) );
		};

		var analyseAuction = function( dfd ){
			if( stop ) return dfd.reject();
			date = $.trim( $auction.find('.startAuctionDate').text().replace(/\n/gm, ' ').replace(/ +/g, ' ') );

			if( date.indexOf('-') > -1 ){ //range
				date = $.trim( date.substring(0, date.indexOf('-') - 1) ) +' '+ date.substr(date.length - 4, 4);
			}

			date = new Date( Date.parse( date ) );
			ts = date.getTime();
			date = date.getFullYear() +'-'+ (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) +'-'+ (date.getDate() < 10 ? '0' : '') + date.getDate();

			//gather available data
			auction = {};

			auction.source = activeTab;
			auction.auctionTitle = $.trim( $auction.find('.auctionNameTitle').text() );
			auction.auctionDate = date;
			auction.auctionId = $.trim( $auction.find('.auctionNameDescription').find('a').eq(0).text() );

			maxDate = (maxDate < ts ? ts : maxDate);

			auction.sourceUrl = $auction.find('.violetButton').attr('href');

			auctions.push(auction);

			progress('Auction trouvée, auction #'+ auction.auctionId);

			return dfd.pipe( auctionsLoop(dfd) );
		};

		var byAuction = function( dfd ){
			if( stop ) return dfd.reject();
			if( auctions.length === 0 ){
				progress('Aucune auction valide trouvée');
				return dfd.resolve();
			}

			if( auctionParsed ){ // auction lots page parsed
				progress('Traitement fini pour auction #'+ auction.auctionId +' page '+ (parseInt(last[ activeTab ].lotPage, 10) + 1), 'success');

				if( i + 1 < auctions.length ){
					completedPage = false; // only one auction per gathering for sothebys, still more on page

					last[ activeTab ].auctionId = auction.auctionId;

					if( lotsListUrls[ last[ activeTab ].lotPage ] === undefined ){
						last[ activeTab ].lotPage = 0;
					}

				} else {
					last[ activeTab ].page = parseInt(last[ activeTab ].page, 10) + 1;
					last[ activeTab ].auctionId = '';
					last[ activeTab ].lotPage = 0;
				}

				return dfd.resolve();
			}

			i++;
			if( i >= auctions.length ){
				progress('Analyse finie', 'success');
				completedPage = isfullPage;
				return dfd.resolve();
			}

			auction = auctions[i];

			return dfd.pipe( getAuctionDetail(dfd) );
		};

		var getAuctionDetail = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Récupération des lots');

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotsList&target='+ activeTab + '&url='+ $.base64.encode( conf.baseUrl + auction.sourceUrl ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $(data);

				lotsListUrls = $data.find('#ecatNavMenu').find('.lot-paging').find('.page-num').map(function(){ return $(this).attr('href'); /* this.href would return http://currenthost/... */ }).get();
				$lots = $data.find('#listBlock');

				totalLots = $data.find('#filterTotal').text();
				nbPages = lotsListUrls.length;

				progress(totalLots +' lot(s) trouvé(s) réparti(s) sur '+ nbPages +' page(s) pour auction #'+ auction.auctionId);
				j = -1;
				lots = [];
				return dfd.pipe( lotsPagesLoop(dfd) )
			})
			.fail(function(){
				progress('Échec du chargement du détail d\'une auction', 'error');
				return dfd.reject();
			});
		};

		var lotsPagesLoop = function( dfd ){
			if( stop ) return dfd.reject();
			j++;

			progress('Traitement des lots');

			if( last[ activeTab ].lotPage > 0 ){
				progress('Reprise du traitement à la page '+ last[ activeTab ].lotPage);
				j = parseInt( last[ activeTab ].lotPage, 10 );
			}

			if( j === 0 ){ //first page, already have the data
				return dfd.pipe( analyseLotsPage(dfd) );
			}

			return dfd.pipe( getLotsPage(dfd) );
		};

		var getLotsPage = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Récupération des lots de la page '+ (j + 1) +' / '+ nbPages);

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotsList&target='+ activeTab +'&referer='+ $.base64.encode( conf.baseUrl + auction.sourceUrl ) +'&url='+ $.base64.encode( conf.baseUrl + lotsListUrls[ j ] ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $(data);

				$lots = $data.find('#listBlock');

				return dfd.pipe( analyseLotsPage(dfd) );
			})
			.fail(function(){
				progress('Échec du chargement de la page'+ (j + 1) +' pour auction #'+ auction.auctionId, 'error');
				return dfd.reject();
			});
		};

		var analyseLotsPage = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Analyse des lots pour auction #'+ auction.auctionId);

			$lots.find('.list-lot-item').each(function(){
				var $lot = $(this);

				lot = {};

				lot.thumbnail = $.base64.encode( conf.baseUrl + $lot.find('.list-lot-item-col1').find('img').attr('data-src') );
				lot.url = $lot.find('.list-lot-item-col1').attr('href');
				lot.sourceUrl = $.base64.encode( lot.url );

				lot.id = 0;
				lot.lotId = $.trim( $lot.find('.list-lot-item-col2').find('h4').text() )
				lot.title = $.trim( $lot.find('.list-lot-item-col2').find('h2').text() );

				var $estimate = $lot.find('.curr-convert').eq(0);
				lot.estimates = $estimate.attr('data-from') +' - '+ $estimate.attr('data-to') +' '+ $estimate.attr('data-orig-currency');

				var $price = $lot.find('.curr-convert').eq(1);
				lot.price = $price.attr('data-price');
				lot.currency = $price.attr('data-orig-currency');

				lots.push( lot );
			});

			nbLots = lots.length;

			j = -1;
			return dfd.pipe( lotsDetailLoop(dfd) ); // only one page lot per gathering for sotheby's
		};

		var lotsDetailLoop = function( dfd ){
			if( stop ) return dfd.reject();

			j++;

			if( j >= lots.length ){
				auctionParsed = true;
				last[ activeTab ].lotPage = parseInt( last[ activeTab ].lotPage, 10 ) + 1;
				return dfd.pipe( byAuction(dfd) );
			}

			if( j === 0 ){
				progress('Récupération du détail des lots pour auction #'+ auction.auctionId);
			}

			lot = lots[ j ];

			return dfd.pipe( byLot(dfd) );
		};

		var byLot = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Lot '+ (j + 1) +' / '+ nbLots +' pour auction #'+ auction.auctionId +' lot #'+ lot.lotId);

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotDetail&target='+ activeTab +'&referer='+ $.base64.encode( conf.baseUrl + auction.sourceUrl ) + '&url='+ $.base64.encode( conf.baseUrl + lot.url ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $('<div>'+ data +'</div>');

				var imgUrl = $data.find('.lotMainImage').eq(0).find('img').attr('data-src');
				lot.medium = $.base64.encode( conf.baseUrl + imgUrl );
				lot.full = $.base64.encode( conf.baseUrl + imgUrl.substring(0, imgUrl.indexOf('.thumb')) );
				lot.criteria = $.trim( $data.find('.lotBlock').find('div, ul').remove().end().text() );

				lot.auctionId = auction.auctionId;
				lot.source = activeTab;
				lot.auctionTitle = auction.auctionTitle;
				lot.auctionDate = auction.auctionDate;
				lot.info = lot.title +' #||# '+ lot.criteria +' #||# '+ lot.estimates +' #||# '+ lot.price +' '+ lot.currency;

				return dfd.pipe( addLot(dfd) );
			})
			.fail(function(){
				progress('Échec du chargement du détail d\'un lot', 'error');
				return dfd.reject();
			});
		};

		var addLot = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Sauvegarde du lot en attente de validation');
			$.ajax({
				url: 'ajax.php',
				data: 'action=add&'+ $.param(lot),
				type: 'POST',
				dataType: 'json',
				timeout: 2000,
				cache: false
			})
			.done(function( data ){
				if( data.id && parseInt(data.id, 10) > 0 ){
					progress('Sauvegarde effectuée');

					$('#list_'+ activeTab).find('tbody').append( tmpl('list_tmpl', { list: [data] }) );

					return dfd.pipe( lotsDetailLoop(dfd) );

				} else {
					if( data.error ){
						for( var i = 0; i < data.error.length; i += 1 ){
							progress(data.error[ i ]);
						}
					}

					progress('Échec lors de la sauvegarde du lot', 'error');
					return dfd.reject();
				}
			})
			.fail(function(){
				progress('Échec lors de la sauvegarde du lot', 'error');
				return dfd.reject();
			});
		};

		return dfd.pipe( auctionsLoop(dfd) );
	};

/** _____________________________________________ DOM MAPPING **/
(function(window, document, $, undefined){
	'use strict';
	$win = $(window);
	$body = $('body');
	$doc = $(document);
	$parts = $('.list');
	$navLinks = $('.nav-collapse').find('a');
	$help = $('<span class="help-block"></span>');
	$lightboxImg = $('#lightbox').find('img');
	$listContainer = $('.container-list');
	$notify = $('#notify');
	$formModal = $('#edit_modal').modal({show: false});
	$form = $('#edit_form');
	$confirmModal = $('#confirm_modal');
	$progressionModal = $('#progression_modal').modal({show: false});
	$progressionModalBody = $progressionModal.find('.modal-body');

	//initial load
		tabSwitch();

	/** _____________________________________________ NAV **/
		//tab change via menu and url#hash
		window.addEventListener("hashchange", tabSwitch, false);

		//menu link
		$navLinks.click(function(e){
			//refresh current tab if already active (url#hash will not change)
			target = $(this).attr('href').substr(1);
			if( target == activeTab ){
				e.preventDefault();
				getList();
			}
		});

	/** _____________________________________________ EDIT FORM **/
		//quick links for title in form
		var $quickLink = $('<a class="btn btn-info quicklink" target="_blank"><i class="icon-link"></i></a>');
		$('.edit-form')
			.on('submit', function(e){
				e.preventDefault();
				var $this = $(this);

				//multiple call protection
				if( $this.data('save_clicked') !== 1 ){
					$this.data('save_clicked', 1);

					$.ajax({
						url: 'ajax.php',
						data: $this.serialize(),
						type: 'POST',
						dataType: 'json'
					})
					.always(function(){
						$this.data('save_clicked', 0);
					})
					.done(function(data){
						if( data == 'ok' ){
							//modal close
							$formModal.modal('hide');

							//inform user
							$notify.notify({message: {text: 'Enregistrement réussi'}, type: 'success'}).show();

							getList();

						} else {
							//form errors display
							formErrors( data );
						}
					});
				}
			})
			.on('change', '.title', function(){
				var $this = $(this);

				if( $this.val() === '' ){
					$this.parent().removeClass('input-append')
						.find('.quicklink').remove();
				}

				if( $this.siblings('.quicklink').length === 0 ){
					$this.parent().addClass('input-append');
					$quickLink.clone()
						.attr('title', 'Rechercher dans Google Image')
						.attr('href', 'http://www.google.com/images?q=' + $this.val() + ' watch')
						.appendTo( $this.parent() );
				}
			})
			.each(function(){
				//add event listener for dynamic form validation
				this.addEventListener("invalid", checkField, true);
				this.addEventListener("blur", checkField, true);
				this.addEventListener("input", checkField, true);
			});

	/** _____________________________________________ EDIT ACTION **/
		$body.on('click', '.edit', function(e){
			e.preventDefault();

			var $this = $(this),
				decoder = $('<textarea>'),
				data = {item: JSON.parse( $.base64.decode( $this.closest('.item').attr('data-raw') ) )};

			//reseting form
			$form
				.data('save_clicked', 0)
				.find('.wrapper').html( tmpl('form_tmpl', data) );

			window.setTimeout(function(){
				//remove validation classes and focus the first field
				$form
					.find('.tagManager').each(function(){ $(this).tagsManager(); }).end()
					.find('select').blur().end()
					.find('input').filter('[type="text"]').first().focus();
			}, 300);
		});

		$form.find('datalist, select').loadList();

	/** _____________________________________________ DELETE ACTION **/
		$body.on('click', '.delete', function(e){
			var $this = $(this),
				$form = $confirmModal.find('.delete-form');

			//modify modal according to rel
			$form
				.find('input')
					.filter('[name="id"]').val( $this.attr('data-itemId') );

			$form
				.data('save_clicked', 0)
				.data('caller', $this);
		});

		$('.delete-form').submit(function(e){
			e.preventDefault();
			var $this = $(this);

			//multiple call protection
			if( $this.data('save_clicked') != 1 ){
				$this.data('save_clicked', 1);

				//send delete
				$.post('ajax.php', $this.serialize(), function(data){
					if( data == 'ok' ){
						//inform user
						$notify.notify({message: {text: 'Suppression réussie'}, type: 'success'}).show();

						//remove deleted item from list
						$this.data('caller').closest('.item').remove();

						//modal close
						$confirmModal.modal('hide');

					} else {
						$notify.notify({message: {text: 'Échec de la suppression'}, type: 'error'}).show();
						//form errors display
						//formErrors( data );
					}
				});
			}
		});

	/** _____________________________________________ PARSE ACTION **/
		$('#parse').click(function(e){
			e.preventDefault();
			var $this = $(this);

			if( $this.hasClass('disabled') ){
				return;
			}

			$this.addClass('disabled');

			stop = false;
			parseTarget();
		});

	/** _____________________________________________ PARSE ACTION **/
		$progressionModal
			.on('click', '.stop', function(){
				stop = true;
			});

})(window, document, jQuery, undefined);
