$(function() {
	
	// menu
	
	$('header select').change(function() {
		var goTo = $(this).val();
		var section = $('#'+goTo);
		var offset = section.offset().top;
		$('html, body').scrollTop(offset);
	});
	
	// usual tooltips
	
	$('.tooltip').not('#welcome .tooltip').tooltipster();
	
	$('#welcome .tooltip').tooltipster({
		theme: 'tooltipster-light'
	});
	
	// demos
	
	$('#demo-default').tooltipster({});
	
	$('#demo-html').tooltipster({
		content: $(
			'<div>' +
				'<img src="doc/images/spiderman.png" width="50" height="50" />' +
				'<p style="text-align:left;">' +
					'<strong>Lorem ipsum dolor sit amet</strong>' +
					'<br />' +
					'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu.' +
				'</p>' +
			'</div>'
		),
		// setting a same value to minWidth and maxWidth will result in a fixed width
		minWidth: 400,
		maxWidth: 400,
		side: 'right'
	});
	
	$('#demo-theme').tooltipster({
		animation: 'grow',
		theme: 'tooltipster-pink'
	});
	
	$('#demo-callback').tooltipster({
		content: 'Loading...',
		updateAnimation: false,
		functionBefore: function(instance, helper) {
			
			var $origin = $(helper.origin);
			
			if ($origin.data('ajax') !== 'cached') {
				
				$.jGFeed(
					'http://ws.audioscrobbler.com/2.0/user/ce3ge/recenttracks.rss?',
					function(feeds){
						
						if(!feeds){
							instance.content('Woops - there was an error retrieving my last.fm RSS feed');
						}
						else {
							
							instance.content($('<span>I last listened to: <strong>' + feeds.entries[0].title + '</strong></span>'));
							
							$origin.data('ajax', 'cached');
						}
					},
					10
				);
				
				$origin.data('ajax', 'cached');
			}
		},
		functionAfter: function(instance) {
			alert('The tooltip has closed!');
		}
	});
	
	$('#demo-events').tooltipster({
		trigger: 'click'
	});
	
	/*
	// for testing purposes
	var instance = $('#demo-events').tooltipster('instance');
	instance.on('reposition', function(){
		alert('hey');
	});
	*/
	
	$(window).keypress(function() {
		$('#demo-events').tooltipster('hide');
	});
	
	$('#demo-interact').tooltipster({
		contentAsHTML: true,
		interactive: true
	});
	
	$('#demo-touch').tooltipster({
		touchDevices: false
	});
	$('#demo-imagemaparea').tooltipster();
	
	$('#demo-multiple').tooltipster({
		animation: 'swing',
		content: 'North',
		side: 'top'
	});
	$('#demo-multiple').tooltipster({
		content: 'East',
		multiple: true,
		side: 'right',
		theme: 'tooltipster-punk'
	});	
	$('#demo-multiple').tooltipster({
		animation: 'grow',
		content: 'South',
		delay: 200,
		multiple: true,
		side: 'bottom',
		theme: 'tooltipster-light'
	});	
	$('#demo-multiple').tooltipster({
		animation: 'fall',
		content: 'West',
		multiple: true,
		side: 'left',
		theme: 'tooltipster-shadow'
	});
	
	var complexInterval;
	
	$('#demo-complex')
		.tooltipster({
			positionTracker: true,
			trackerInterval: 10,
			trigger: 'custom'
		})
		.click(function(){
			
			var $this = $(this);
			
			if($this.hasClass('complex')){
				
				$this
					.removeClass('complex')
					.tooltipster('hide')
					.css({
						left: '',
						top: ''
					});
				
				clearInterval(complexInterval);
			}
			else {
				
				var bcr = this.getBoundingClientRect(),
					odd = true;
				
				$this
					.addClass('complex')
					.css({
						left: bcr.left + 'px',
						top: bcr.top + 'px'
					})
					.tooltipster('show');
				
				complexInterval = setInterval(function(){
					
					var offset = odd ? 200 : -200;
					
					$this.css({
						left: bcr.left + offset
					});
					
					odd = !odd;
				}, 2000);
			}
		});
	
	$('#demo-position').tooltipster({
		content: $('<div>Tooltipster goes like clockwork.<br /><br />A<br />B<br />C<br />D<br />E<br />F</div>'),
		side: ['right'],
		functionPosition: function(instance, helper, data){
			
			// this function is pretty dumb and does not check if there is actually
			// enough space available around the tooltip to move it, it just makes it
			// snap to the grid.
			// You might want to do something smarter in your application!
			
			var gridBcr = $('#demo-position-grid')[0].getBoundingClientRect(),
				arrowSize = parseInt($(helper.tooltip).find('.tooltipster-box').css('margin-left'));
			
			// check if the grid is floating at the right of the origin or below
			// (happens on tiny phone screens)
			var side = 'right';
			if (gridBcr.top - helper.geo.origin.windowOffset.top > 30) {
				side = 'bottom';
			}
			
			// override these
			data.side = side;
			data.coord.top = gridBcr.top;
			data.coord.left = gridBcr.left;
			
			// lastly, take care of the arrow
			if (side == 'right') {
				
				// move the tooltip so the tooltip borders snap to the grid
				data.coord.left -= arrowSize;
			}
			else {
				
				// same as above
				data.coord.top -= arrowSize;
				
				// we need to give the new arrow target since we override
				// the side property
				data.arrowTarget = helper.geo.origin.windowOffset.left + helper.geo.origin.size.width/2;
			}
			
			return data;
		}
	});
	
	// nested demo
	$('#nesting').tooltipster({
		content: $('<span>Hover me too!</span>'),
		functionReady: function(instance){
			
			// the nested tooltip must be initialized once the first
			// tooltip is open, that's why we do this inside
			// functionReady()
			instance.content().tooltipster({
				content: 'I am a nested tooltip!',
				distance: 0
			});
		},
		interactive: true
	});
	
	// themes
	
	$('.tooltipster-light-preview').tooltipster({
		theme: 'tooltipster-light'
	});
	$('.tooltipster-borderless-preview').tooltipster({
		theme: 'tooltipster-borderless'
	});
	$('.tooltipster-punk-preview').tooltipster({
		theme: 'tooltipster-punk'
	});
	$('.tooltipster-noir-preview').tooltipster({
		theme: 'tooltipster-noir'
	});
	$('.tooltipster-shadow-preview').tooltipster({
		theme: 'tooltipster-shadow'
	});
	
	prettyPrint();
});