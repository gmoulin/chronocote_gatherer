var $body, $win, $doc, $formModal, $form, $confirmModal,
	$progressionModal, $progressionModalBody,
	$parts, $navLinks, $listContainer, $help,
	$lightboxImg, $notify,
	activeTab, target,
	nextPage = false,
	stop = false,
	updating = 0,
	page, scrolling, noMoreWarn;

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
		page = 0;
		getList();
	}
};

/**
 * load the list
 */
var getList = function(){
	'use strict';
	//multiple call protection
	if( updating !== 1 ){
		updating = 1;

		if( activeTab === undefined ) return;

		var $list = $('#list_'+ activeTab);

		$body.css('cursor', 'progress');

		if( page === 0 ){
			$list.find('tbody').empty();
			noMoreWarn = false;
		}

		$.ajax({
			url: 'ajax.php',
			data: 'action=list&page='+ page +'&target='+ activeTab,
			type: 'POST',
			dataType: 'json'
		})
		.always(function(){
			updating = 0;
			$body.css('cursor', '');
		})
		.done(function( data ){
			if( data.list && data.list.length > 0 ){
				$list.find('tbody').append( tmpl('list_tmpl', data) );

			} else {
				if( !noMoreWarn ){
					$notify.notify({message: {text: page === 0 ? 'Aucun lot trouvé pour ce site' : 'Aucun lot supplémentaire trouvé pour ce site'}, type: 'warning'}).show();
					if( page > 0 ) noMoreWarn = true;
				}
			}

			scrolling = false;
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
			listUrl: 'http://catalog.antiquorum.com/index.html',
			lotListUrl: 'http://catalog.antiquorum.com/catalog_asta.html?hideauctions=1&auctionid=AID',
			lotDetailUrl: 'http://catalog.antiquorum.com/catalog.html?action=load&lotid=LID&auctionid=AID',
			baseUrl: 'http://catalog.antiquorum.com',
			minYear: 2007,
			maxLotPerPage: 10 // do not change
		},
		sothebys: {
			listUrl: 'http://www.sothebys.com/en/auctions/results/_jcr_content.auctionsList.html',
			minYear: 2007,
			baseUrl: 'http://www.sothebys.com',
			maxLotPerPage: 10 // do not change
		},
		christies: {
			baseUrl: 'http://www.christies.com',
			listUrl: 'http://www.christies.com/results/?',
			lotListUrl: 'http://www.christies.com/lotfinder/salebrowse.aspx?viewType=listview&intsaleid=',
			maxLotPerPage: 30 // do not change
		}
	};
	var completedPage = false,
		isLastPage;
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

		var tmp = '';
		if( activeTab == 'christies' ){
			tmp = ', '+ (parseInt(last[ activeTab ].month, 10) < 10 ? '0' : '') + last[ activeTab ].month +'-'+ last[ activeTab ].year;
		}

		progress('Récupération de la page #'+ last[ activeTab ].page +' du catalogue '+ activeTab + tmp);
		progress('Comptez environ 30s');

		var params = 'action=proxyList&target='+ activeTab +'&page='+ last[ activeTab ].page +'&url='+ $.base64.encode( conf.listUrl );
		if( activeTab == 'christies' ){
			params += '&month='+ last[ activeTab ].month +'&year='+ last[ activeTab ].year;

		} else if( activeTab == 'antiquorum' ){
			params += '&year='+ last[ activeTab ].year;
		}

		$.ajax({
			url: 'ajax.php',
			data: params,
			type: 'POST',
			timeout: 2 * 60 * 1000,
			dataType: 'text',
			cache: false
		})
		.done(function( data ){
			progress('Récupération finie - analyse des résultats');

			var $data, $lots;
			if( activeTab == 'antiquorum' ){
				//get only the <body>, also change <img> srcs' to data-srcs' to avoid images requests
				data = data.substring(data.indexOf('<body'), data.indexOf('</html>') - 1).replace(/src=/g, 'data-src=');
				$data = $(data);
				$parts = $data.find('.maintable');
				isLastPage = true; //all auctions for the year are on one page

				progress($parts.length +' auctions potentielles trouvées');

			} else if( activeTab == 'sothebys' ){
				$data = $('<tbody>'+ data +'</tbody>');
				$parts = $data.find('tr');
				isLastPage = $parts.length != 10; // 10 results per page

				progress($parts.length +' auctions potentielles trouvées');

			} else if( activeTab == 'christies' ){
				data = data.substring(data.indexOf('<div id="results"'), data.indexOf('<!-- /#results -->') - 1);
				$data = $(data);
				$parts = $data.find('#list-items > li');
				isLastPage = $data.find('#paginglist').length ? ($data.find('#paginglist').find('li').last().text() == last[ activeTab ].page) : false;

				progress($parts.length +' auctions potentielles trouvées');
			}

			$.when( parseLots( activeTab, conf, $parts ) )
				.done(function(){
					if( !nextPage ){
						$progressionModal.find('.finished').removeClass('btn-error').addClass('btn-success');
					}

					//update trace page
					//use isLastPage and completedPage to check if page number should be increased
					if( activeTab == 'antiquorum'){
						nextPage = true;
						if( completedPage ){
							progress('Page complètement analysée, passage à l\'année suivante pour '+ activeTab.capitalize());
						}

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

								if( !stop && nextPage ){
									progress('Passage à la prochaine auction ou année dans 30 secondes', 'info');
									window.setTimeout(function(){
										if( !stop ){
											$progressionModalBody.find('ul').empty();
											parseTarget();
										}
									}, 30000);
								}
							} else {
								progress('Échec de la mise à jour des informations', 'error');
							}
						})
						.fail(function(){
							progress('Échec de la mise à jour des informations', 'error');
						});

					} else if( activeTab == 'sothebys' ) {
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

					} else if( activeTab == 'christies' ){
						progress('Analyse de l\'auction finie, limitation à une auction par vérification, sauvegarde sauvegarde de l\'état d\'avancement pour '+ activeTab.capitalize());

						$.ajax({
							url: 'ajax.php',
							data: 'action=updateLast&target='+ activeTab +'&'+ $.param( last[ activeTab ] ),
							type: 'POST',
							dataType: 'json',
							timeout: 2000,
							cache: false
						})
						.done(function( data ){
							if( data.page ){
								last[ activeTab ] = data;

								if( !stop && nextPage ){
									progress('Passage à la prochaine page dans 30 secondes', 'info');
									window.setTimeout(function(){
										if( !stop ){
											$progressionModalBody.find('ul').empty();
											parseTarget();
										}
									}, 30000);
								}
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
						if( activeTab == 'antiquorum' || activeTab == 'sothebys' ){
							progress('Toute auction partiellement traitée (au moins un lot enregistré) sera retraitée complètement à la prochaine vérification', 'warning');
						}
					}

					$progressionModal.find('.finished').removeClass('btn-success').addClass('btn-error');
				})
				.always(function(){
					if( !nextPage ){
						$('#parse').removeClass('disabled');
						$progressionModal.find('.stop').hide().next().show();
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

			} else if( activeTab == 'christies' ){
				return dfd.pipe( parseChristiesResults(dfd, activeTab, conf, $parts) );

			}
		}).promise();
	};

	/**
	 * antiquorum have a lot list,
	 * parsing it page per page
	 * store the current page number
	 */
	var parseAntiquorumResults = function( dfd, activeTab, conf, $auctions ){
		'use strict';
		if( stop ) return dfd.reject();

		var i = -1,
			auctions = [],
			maxDate = 0,
			size = $auctions.length,
			lots = [],
			isfullPage = size == conf.maxLotPerPage,
			auctionParsed = false,
			j, k, nbPages, auction, $auction, $date, date, ts, nbLots, $lots, lot, nextUrl, totalLots;

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
						progress('Dernière auction traitée trouvée, #'+ auction.auctionId +', passage à la suivante');
						i = k + 1;

						if( i >= auctions.length ){
							auctionParsed = true;
							return dfd.pipe( byAuction(dfd) );
						}

						auction = auctions[ i ];
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

			//gather available data
			auction = {};

			auction.source = activeTab;
			auction.auctionTitle = $.trim( $auction.find('.titlelistauctions').text().replace(/’/, '\'') );

			auction.auctionId = $auction.find('a').attr('href').replace(/javascript:opencatalog\('/, '').replace(/','0'\);?/, '');

			auction.sourceUrl = conf.lotListUrl.replace(/AID/, auction.auctionId);

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
				progress('Traitement fini pour auction #'+ auction.auctionId, 'success');

				if( i + 1 < auctions.length ){
					completedPage = false; // only one auction per gathering for antiquorum, still more on page

					last[ activeTab ].auctionId = auction.auctionId;
					last[ activeTab ].lotPage = 0;

				} else {
					var year = (new Date()).getFullYear();
					if( last[ activeTab ].year != year ){
						last[ activeTab ].year++;
						last[ activeTab ].auctionId = '';
					}
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
				data: 'action=proxyLotsList&target='+ activeTab + '&url='+ $.base64.encode( auction.sourceUrl ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $(data);

				nextUrl = $data.find('.maintablesearch').last().find('.navigationbar').last().find('a').attr('href');

				$lots = $data.find('.searchtitle').closest('table').closest('table');

				totalLots = $data.find('.searchcount').text().replace(/Lots found: /, '');
				nbPages = Math.ceil( parseInt(totalLots, 10) / conf.maxLotPerPage );

				progress(totalLots +' lot(s) trouvé(s) réparti(s) sur '+ nbPages +' page(s) pour auction #'+ auction.auctionId);
				j = -1;
				lots = [];
				return dfd.pipe( lotsPagesLoop(dfd) );
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

			if( nextUrl && nextUrl.length > 0 ){
				return dfd.pipe( getLotsPage(dfd) );

			} else {
				progress('Dernière page traitée pour auction #'+ auction.auctionId);
				auctionParsed = true;
				return dfd.pipe( byAuction(dfd) );
			}
		};

		var getLotsPage = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Récupération des lots de la page '+ (j + 1) +' / '+ nbPages);

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotsList&target='+ activeTab +'&referer='+ $.base64.encode( auction.sourceUrl ) +'&url='+ $.base64.encode( conf.baseUrl + nextUrl ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substr(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $(data);

				nextUrl = $data.find('.maintablesearch').last().find('.navigationbar').last().find('a').attr('href');

				$lots = $data.find('.searchtitle');

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

			$lots.each(function(){
				var $lot = $(this).closest('table').parent().closest('table');

				lot = {};

				var thumbUrl = $lot.find('.imagetd').find('img').attr('data-src');

				if( thumbUrl ){
					lot.thumbnail = $.base64.encode( thumbUrl );
					lot.medium = $.base64.encode( thumbUrl.replace(/thumb/, 'medium') );
					lot.full = $.base64.encode( thumbUrl.replace(/thumb/, 'full') );
				}

				var href = $lot.find('.imagetd').find('a').attr('href');
				lot.lotId = href.substring(href.indexOf('(') + 1, href.indexOf(','));
				lot.url = conf.lotDetailUrl.replace(/LID/, lot.lotId).replace(/AID/, auction.auctionId);
				lot.sourceUrl = $.base64.encode( lot.url );

				lot.id = 0;
				lot.title = $.trim( $lot.find('.searchsubtitle').find('font').empty().end().html().replace(/<br ?\/?>/, ' ').replace(/’/, '\'') );

				if( !auction.hasOwnProperty('auctionDate') ){
					var title = $.trim( $lot.find('.bidauctiontitle').html() );
					var tmp = title.replace(/<br ?\/?>/, '|').split('|');

					var date = new Date( Date.parse( tmp[1] ) );
					auction.auctionDate = date.getFullYear() +'-'+ (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) +'-'+ (date.getDate() < 10 ? '0' : '') + date.getDate();
				}

				lot.auctionId = auction.auctionId;
				lot.source = activeTab;
				lot.auctionTitle = auction.auctionTitle;
				lot.auctionDate = auction.auctionDate;

				var price = $.trim( $lot.find('.bidonlinestart').text() );
				if( price && price.length > 0 ){
					price = $.trim( price.substring( price.indexOf(':') + 1 ) ).split(' ');
					lot.price = price[0].replace(/,/, '');
					lot.currency = price[1];
				} else {
					lot.price = 'N/A';
					lot.currency = 'N/A';
				}

				var estimates = $.trim( $lot.find('.searchfooter').first().find('.searchfooterlight').empty().end().text() );
				if( estimates && estimates.length > 0 ){
					lot.estimates = $.trim( estimates.replace(/Estimate:/, '') );
				} else {
					lot.estimates = 'N/A';
				}

				var criteria = $.trim( $lot.find('.searchpayload').text() );
				if( criteria && criteria.length > 0 ){
					lot.criteria = criteria.replace(/’/, '\'');
				} else {
					lot.criteria = 'N/A';
				}

				lot.info = lot.title +' #||# '+ lot.criteria +' #||# '+ lot.estimates +' #||# '+ lot.price +' '+ lot.currency;

				lots.push( lot );
			});

			nbLots = lots.length;

			k = -1;
			return dfd.pipe( lotsDetailLoop(dfd) ); // only one page lot per gathering for sotheby's
		};

		var lotsDetailLoop = function( dfd ){
			if( stop ) return dfd.reject();

			k++;

			if( k >= lots.length ){
				lots = [];
				return dfd.pipe( lotsPagesLoop(dfd) );
			}

			if( k === 0 ){
				progress('Sauvegarde des lots pour auction #'+ auction.auctionId);
			}

			lot = lots[ k ];

			return dfd.pipe( addLot(dfd) );
		};

		var addLot = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Sauvegarde du lot #'+ lot.lotId +' en attente de validation');
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
			auctionParsed = false,
			j, nbPages, auction, $auction, $date, date, ts, $lots, nbLots, lot, lotsListUrls, totalLots;

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
				completedPage = true;
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
				return dfd.pipe( lotsPagesLoop(dfd) );
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
				lot.lotId = $.trim( $lot.find('.list-lot-item-col2').find('h4').text() );
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

	/**
	 * christies's have a filtered auction list,
	 * get one,
	 * go to the lots
	 * parse lots page per page
	 * store the auction list current month and year
	 * store the auction list current page number
	 * store the current auction detail page url
	 * store the current lots list page
	 */
	var parseChristiesResults = function( dfd, activeTab, conf, $auctions ){
		'use strict';
		if( stop ) return dfd.reject();
		var i = -1,
			auctions = [],
			maxDate = 0,
			size = $auctions.length,
			lots = [],
			isfullPage = size == conf.maxLotPerPage,
			auctionParsed = false,
			hasWatchesCategory = false,
			watchCategoryUrl, j, k, nbPages, auction, $auction, $date, date, ts, $lots, nbLots, lot, lotsListUrls, totalLots;

		var auctionsLoop = function( dfd ){
			if( stop ) return dfd.reject();
			if( size === 0 ){
				progress('Aucune auction trouvée');

				nextPage = true;
				if( isLastPage ){

					//augmentation du mois / année
					d = new Date();
					d.setFullYear( last[ activeTab ].year );
					d.setMonth( parseInt(last[ activeTab ].month, 10) - 1 );
					d.setDate(1);

					d.setMonth( d.getMonth() + 1 );

					d2 = new Date();

					if( d2.getMonth() > d.getMonth() ){
						last[ activeTab ].page = 1;
						last[ activeTab ].month = d.getMonth() + 1;
						last[ activeTab ].year = d.getFullYear();
						last[ activeTab ].auctionId = '';
					} else {
						progress('Dernière auction traitée trouvée, #'+ auction.auctionId +', passage à la suivante');
					}

				} else {
					last[ activeTab ].page = parseInt(last[ activeTab ].page, 10) + 1;
				}

				return dfd.resolve();
			}

			i++;
			if( i >= size ){
				progress(auctions.length +' auctions valides trouvées');

				i = -1;

				//check if the storage auction url is in the list
				if( last[ activeTab ].auctionId !== '' ){
					for( var k = 0; k < auctions.length; k += 1 ){
						if( auctions[ k ].auctionId == last[ activeTab ].auctionId ){
							auction = auctions[ k ];
							break;
						}
					}

					if( auction ){
						progress('dernière auction traitée trouvée, #'+ auction.auctionId +', passage à la suivante');
						i = k; //byAuction does an i++
						if( i + 1 >= auctions.length ){
							nextPage = true;
							if( isLastPage ){
								//augmentation du mois / année
								var d = new Date();
								d.setFullYear( last[ activeTab ].year );
								d.setMonth( parseInt(last[ activeTab ].month, 10) - 1 );
								d.setDate(1);

								d.setMonth( d.getMonth() + 1 );

								var d2 = new Date();

								if( d2.getMonth() > d.getMonth() && d2.getFullYear() >= d.getFullYear() ){
									last[ activeTab ].page = 1;
									last[ activeTab ].month = d.getMonth() + 1;
									last[ activeTab ].year = d.getFullYear();
									last[ activeTab ].auctionId = '';
								}

							} else {
								last[ activeTab ].page = parseInt(last[ activeTab ].page, 10) + 1;
							}

							return dfd.resolve();
						}
					}
				}

				return dfd.pipe( byAuction(dfd) );
			}

			$auction = $auctions.eq(i);

			return dfd.pipe( analyseAuction(dfd) );
		};

		var analyseAuction = function( dfd ){
			if( stop ) return dfd.reject();
			date = $auction.find('.auction-date').find('span').map(function(){ return $.trim( this.innerHTML ); }).get().join(' ');

			if( date.indexOf('-') > -1 ){ //range, get only first date and add the year
				date = $.trim( date.substring(0, date.indexOf('-') - 1) );
				var year = (new Date()).getFullYear();
				date += (date.indexOf(year) > -1 ? '' : ' '+ year);
			}

			date = new Date( date );
			ts = date.getTime();
			date = date.getFullYear() +'-'+ (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) +'-'+ (date.getDate() < 10 ? '0' : '') + date.getDate();

			//gather available data
			auction = {};

			auction.source = activeTab;
			auction.auctionTitle = $.trim( $auction.find('.auction-info').find('a.description').text() );
			auction.auctionDate = date;
			auction.sourceUrl = $.trim( $auction.find('.sale-number').attr('href') );
			var tmp = auction.sourceUrl.split('='); // format /LotFinder/searchresults.aspx?intSaleID=24265
			auction.auctionId = tmp.pop();

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

			var d, d2;

			if( auctionParsed ){ // auction lots page parsed
				progress('Traitement fini pour auction #'+ auction.auctionId, 'success');
			}

			i++;
			if( i >= auctions.length ){
				progress('Analyse de la liste d\'auction finie', 'success');
				completedPage = true;
				last[ activeTab ].page = parseInt(last[ activeTab ].page, 10) + 1;

				nextPage = true;
				if( isLastPage ){
					//augmentation du mois / année
					d = new Date();
					d.setFullYear( last[ activeTab ].year );
					d.setMonth( parseInt(last[ activeTab ].month, 10) - 1 );
					d.setDate(1);

					d.setMonth( d.getMonth() + 1 );

					d2 = new Date();

					if( d2.getMonth() > d.getMonth() ){
						last[ activeTab ].page = 1;
						last[ activeTab ].month = d.getMonth() + 1;
						last[ activeTab ].year = d.getFullYear();
					}
				} else {
					last[ activeTab ].page = parseInt(last[ activeTab ].page, 10) + 1;
				}

				return dfd.resolve();
			}

			progress('Auction '+ (i + 1) +' / '+ size);

			auction = auctions[i];
			hasWatchesCategory = false;
			watchCategoryUrl = '';

			return dfd.pipe( getAuctionDetail(dfd) );
		};

		var getAuctionDetail = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Récupération des lots');

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotsList&target='+ activeTab + '&url='+ $.base64.encode( (watchCategoryUrl === '' ? conf.lotListUrl + auction.auctionId : watchCategoryUrl) ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substring(data.indexOf('<body'), data.indexOf('</html>')).replace(/src=/g, 'data-src=');

				var $data = $(data);

				$data.find('.chr-action-checkbox').each(function(){
					var href = $(this).attr('href');
					if( href.indexOf('selectedids=28') > -1 ){ /* this.href would return http://currenthost/... */
						hasWatchesCategory = true;
						watchCategoryUrl = href;
						return false; // break
					}
				});

				if( hasWatchesCategory ){
					return dfd.pipe( getAuctionDetail(dfd) );
				}

				var tmp = $data.find('.chr-numbers-wrap').find('.chr-numbers-list:not(:last-child)').last().find('a').attr('href').split('=');
				var lastPageNum = tmp.pop();
				var lastPageUrl = tmp.join('=');

				lotsListUrls = [];
				for( var k = 1; k <= lastPageNum; k++ ){
					lotsListUrls.push( lastPageUrl +'='+ k );
				}
				$lots = $data.find('.chr-content-results');

				totalLots = $.trim( $data.find('.chr-search-lot-results').text() ).split(' ');
				totalLots = totalLots[ totalLots.length - 1 ];
				nbPages = lotsListUrls.length;

				progress(totalLots +' lot(s) trouvé(s) réparti(s) sur '+ nbPages +' page(s) pour auction #'+ auction.auctionId);
				j = -1;
				lots = [];
				return dfd.pipe( lotsPagesLoop(dfd) );
			})
			.fail(function(){
				progress('Échec du chargement du détail d\'une auction', 'error');
				return dfd.reject();
			});
		};

		var lotsPagesLoop = function( dfd ){
			if( stop ) return dfd.reject();
			j++;

			if( j >= nbPages ){
				auctionParsed = true;
				return dfd.pipe( byAuction(dfd) );
			}

			progress('Traitement des lots');

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

				$lots = $data.find('.chr-content-results');

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

			lots = [];
			$lots.each(function(){
				var $lot = $(this);

				lot = {};

				lot.thumbnail = $.base64.encode( $lot.find('.chr-result-img').find('img').attr('data-src') );
				lot.url = $lot.find('.chr-result-hd-link').attr('href');
				lot.sourceUrl = $.base64.encode( lot.url );

				lot.id = 0;
				lot.lotId = $.trim( $lot.find('.chr-sale-lot-link').text() ).replace(/Lot /, '');
				lot.title = $.trim( $lot.find('.chr-result-hd-link').text() );

				var $price = $lot.find('.chr-result-lot-price').filter(':not(.chr-lot-price-realized)').find('strong');
				lot.price = $price.text().match(/[0-9]+/g).join('');
				lot.currency = $price.text().match(/[^0-9,'\.]+/g).join('');

				lots.push( lot );
			});

			nbLots = lots.length;

			k = -1;
			return dfd.pipe( lotsDetailLoop(dfd) ); // only one page lot per gathering for sotheby's
		};

		var lotsDetailLoop = function( dfd ){
			if( stop ) return dfd.reject();

			k++;

			if( k >= lots.length ){
				last[ activeTab ].lotPage = parseInt( last[ activeTab ].lotPage, 10 );
				return dfd.pipe( lotsPagesLoop(dfd) );
			}

			if( k === 0 ){
				progress('Récupération du détail des lots pour auction #'+ auction.auctionId);
			}

			lot = lots[ k ];

			return dfd.pipe( byLot(dfd) );
		};

		var byLot = function( dfd ){
			if( stop ) return dfd.reject();
			progress('Lot '+ (k + 1) +' / '+ nbLots +' pour auction #'+ auction.auctionId +' lot #'+ lot.lotId);

			//gather lot informations
			$.ajax({
				url: 'ajax.php',
				data: 'action=proxyLotDetail&target='+ activeTab +'&referer='+ $.base64.encode( conf.baseUrl + auction.sourceUrl ) + '&url='+ $.base64.encode( lot.url ),
				dataType: 'text',
				type: 'POST',
				timeout: 2 * 60 * 1000,
				cache: false
			})
			.done(function( data ){
				data = data.substring(data.indexOf('<section class="details-content"'), data.indexOf('<!-- /#details-content -->') - 1).replace(/src=/g, 'data-src=');

				var $data = $(data).filter('.details-content');

				lot.medium = $.base64.encode( $data.find('#main-link').find('img').attr('data-src') );
				var fullUrl = $data.find('#main-link').attr('href');
				if( fullUrl ) lot.full = $.base64.encode( fullUrl.substring(fullUrl.indexOf('http:'), fullUrl.indexOf('\')')) );
				else lot.full = null;

				lot.estimates = $.trim( $data.find('.estimate-wrapper').find('.estimate-info-items').find('.currency-info-item').eq(0).text() );

				lot.criteria = $.trim( $data.find('#tabWindow1').find('.overview').text() );

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

		//start sequence
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
	$progressionModal = $('#progression_modal');
	$progressionModalBody = $progressionModal.find('.modal-body');

	$progressionModal.modal({show: false, keyboard: false});
	scrolling = false;
	page = 0;

	//initial load
		tabSwitch();

	/** _____________________________________________ INFINITE SCROLL **/
		$win.scroll(function(){
			if( !scrolling ){
				var wintop = $(window).scrollTop(),
					docheight = $(document).height(),
					winheight = $(window).height(),
					scrolltrigger = 0.75;

				if( (wintop/ (docheight-winheight)) > scrolltrigger ){
					scrolling = true;
					page++;
					getList();
				}
			}
		});

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

							//TODO update row
							//getList();

						} else {
							//form errors display
							formErrors();
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
				data = {item: JSON.parse( $this.closest('.item').attr('data-raw') )};

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
				progress('Traitement stoppé sur demande', 'info');
				$progressionModal.find('.stop').hide().next().show();
				nextPage = false;
			});

})(window, document, jQuery, undefined);
