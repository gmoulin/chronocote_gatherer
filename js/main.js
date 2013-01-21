var $body, $win, $doc, $formModal, $form, $confirmModal,
	$progressionModal, $progressionModalBody,
	$parts, $navLinks, $listContainer, $help,
	$lightboxImg, $notify,
	activeTab, target,
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

	$progressionModalBody
		.find('ul').append('<li class="'+ cssClass +'">'+ msg +'</li>');

	$progressionModalBody.scrollTop($progressionModalBody[0].scrollHeight);
};

/** _____________________________________________ DATA GATHERING **/
	var config = {
		antiquorum: {
			listUrl: 'http://catalog.antiquorum.com/catalog.html?action=list&s_batch=',
			detailUrl: 'http://catalog.antiquorum.com/catalog.html?action=load&lotid=LID&auctionid=AID',
			maxLotPerPage: 10
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
			.find('.stop').show().next().hide().end().end()
			.find('ul').html('');

		progress('Récupération de la page #'+ last[ activeTab ].page +' du catalogue '+ activeTab);
		progress('Comptez environ 30s');

		$.ajax({
			url: 'ajax.php',
			data: 'action=proxyList&target='+ activeTab +'&page='+ last[ activeTab ].page +'&url='+ $.base64.encode(conf.listUrl + last[ activeTab ].page),
			type: 'POST',
			timeout: 2 * 60 * 1000,
			dataType: 'text',
			cache: false
		})
		.done(function( data ){
			progress('Récupération finie - analyse des résultats');

			//get only the <body>, also change <img> srcs' to data-srcs' to avoid images requests
			data = data.substr(data.indexOf('<body'), data.indexOf('</html>') - 1).replace(/src=/g, 'data-src=');
			var $data = $(data),
				$lots = $data.find('.searchtitle'),
				isLastPage = $data.find('.maintablesearch').eq(1).find('.navigationbar').eq(2).find('a').length === 0;

			progress($lots.length +' lots potentiels trouvés');

			$.when( parseLots( conf, $lots ) )
				.done(function(){
					$progressionModal.find('.finished').removeClass('btn-error').addClass('btn-success');

					//update trace page
					//use isLastPage and completePage to check if page number should be increased
					if( completedPage && !isLastPage ){
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
							} else {
								progress('Échec de la mise à jour des informations (numéro de page)', 'error');
							}
						})
						.fail(function(){
							progress('Échec de la mise à jour des informations (numéro de page)', 'error');
						});
					}
				})
				.fail(function(){
					$progressionModal.find('.finished').removeClass('btn-success').addClass('btn-error');
				})
				.always(function(){
					$('#parse').removeClass('disabled');

					$progressionModal
						.find('.stop').hide().next().show();
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
	var parseLots = function( conf, $lots ){
		'use strict';
		progress('début analyse');
		var i = -1,
			lot, nextDate,
			maxDate = 0,
			lots = [],
			$lot, $block, $futureAuction, $detailLink,
			title, date, tmp, ts, href,
			size = $lots.length,
			isfullPage = size == conf.maxLotPerPage;

		var lotsLoop = function( dfd ){
			if( size === 0 ){
				progress('Aucun lot trouvé');
				return dfd.resolve();
			}

			i++;
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
			if( lots.length === 0 ){
				progress('Aucun lot valide trouvé');
				return dfd.resolve();
			}

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

		return $.Deferred(function( dfd ){
			return dfd.pipe( lotsLoop(dfd) );
		}).promise();
	};


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

			parseTarget();
		});
})(window, document, jQuery, undefined);
