<?php
include('html_header.php');
?>
<div class="navbar navbar-inverse navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container-fluid">
			<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</a>

			<button id="parse" class="btn btn-primary pull-right">Vérifier le site pour de nouveaux lots</button>

			<a class="brand" href="#">Gatherer</a>

			<div class="nav-collapse">
				<ul class="nav">
					<?php foreach( $parts as $part ){ ?>
						<li><a href="#<?php echo $part; ?>"><?php echo ucfirst($part); ?></a></li>
					<?php } ?>
				</ul>
			</div>
		</div>
	</div>
</div>

<div class="container-fluid">
	<div class="row-fluid">
		<ul class="next-auction">
			<?php foreach( $parts as $part ){ ?>
				<li class="span4">
					<span class="label">
						Prochaine vente <?php echo ucfirst($part); ?> :
						<?php echo ($next_auction[$part] > 0 ? date('l d F Y', $next_auction[$part]) : ''); ?>
					</span>
				</li>
			<?php } ?>
		</ul>
	</div>

	<div class="row-fluid container-list">
		<?php foreach( $parts as $part ){ ?>
			<table id="list_<?php echo $part; ?>" class="list table table-hover table-striped">
				<thead>
					<tr>
						<th>&nbsp;</th>
						<th>Source</th>
						<th>URL</th>
						<th>Auction-Lot #</th>
						<th>Titre</th>
						<th>Date <small>(a-m-j)</small></th>
						<th>Description</th>
						<th>Critères</th>
						<th>Estimations</th>
						<th>Prix</th>
						<th>Monnaie</th>
						<th>Images</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		<?php } ?>
	</div>
</div>

<div id="notify" class="notifications bottom-right"></div>

<!-- modal-gallery is the modal dialog used for the image gallery -->
<div id="modal-gallery" class="modal modal-gallery hide fade" tabindex="-1">
	<div class="modal-header">
		<a class="close" data-dismiss="modal">&times;</a>
		<h3 class="modal-title"></h3>
	</div>
	<div class="modal-body"><div class="modal-image"></div></div>
	<div class="modal-footer">
		<a class="btn btn-info modal-prev"><i class="icon-arrow-left icon-white"></i> Précédent</a>
		<a class="btn btn-primary modal-next">Suivant <i class="icon-arrow-right icon-white"></i></a>
		<a class="btn modal-download" target="_blank"><i class="icon-download"></i> Download</a>
	</div>
</div>

<script>
	var last = <?php echo json_encode($last); ?>;
</script>
<?php
//list templates
include('views/list.html');

//edit forms
include('views/form.html');

//delete confirm
include('views/confirm.html');

//progression modal
include('views/progression.html');

//scripts and footer
include('html_footer.php');
?>
