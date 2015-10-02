$(function() {
	
	$('.tooltip').not('#welcome .tooltip').tooltipster({
		offsetY: 2
	});
	$('#welcome .tooltip').tooltipster({
		offsetY: 2,
		theme: 'tooltipster-light'
	});
	$('#demo-default').tooltipster({
		//trigger: 'click'
	});
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
		position: 'right'
	});
	$('#demo-theme').tooltipster({
		animation: 'grow',
		theme: 'tooltipster-pink'
	});
	$('#demo-callback').tooltipster({
		content: 'Loading...',
		updateAnimation: false,
		functionBefore: function(origin) {
			
			var $origin = $(origin);
			
			if ($origin.data('ajax') !== 'cached') {
				
				$.jGFeed('http://ws.audioscrobbler.com/2.0/user/ce3ge/recenttracks.rss?',
					function(feeds){
						var content = '';
						if(!feeds){
							content = 'Woops - there was an error retrieving my last.fm RSS feed';
							$origin.tooltipster('content', content);
						}
						else {
							content = $('<span>I last listened to: <strong>' + feeds.entries[0].title + '</strong></span>');
							$origin
								.tooltipster('content', content)
								.data('ajax', 'cached');
						}
				}, 10);
				
				$origin.data('ajax', 'cached');
			}
		},
		functionAfter: function(origin) {
			alert('The tooltip has closed!');
		}
	});
	$('#demo-events').tooltipster({
		trigger: 'click'
	});
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
		multiple: true,
		position: 'top'
	});
	$('#demo-multiple').tooltipster({
		content: 'East',
		multiple: true,
		position: 'right',
		theme: 'tooltipster-punk'
	});	
	$('#demo-multiple').tooltipster({
		animation: 'grow',
		content: 'South',
		delay: 200,
		multiple: true,
		position: 'bottom',
		theme: 'tooltipster-light'
	});	
	$('#demo-multiple').tooltipster({
		animation: 'fall',
		content: 'West',
		multiple: true,
		position: 'left',
		theme: 'tooltipster-shadow'
	});
	
	var complexInterval;
	
	$('#demo-complex')
		.tooltipster({
			positionTracker: true,
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
	
	$('header select').change(function() {
		var goTo = $(this).val();
		var section = $('#'+goTo);
		var offset = section.offset().top;
		$('html, body').scrollTop(offset);
	});
	
	prettyPrint();
});