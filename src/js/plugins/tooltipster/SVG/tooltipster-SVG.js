$.tooltipster.plugin({
	name: 'tooltipster.SVG',
	core: {
		_init: function() {
			
			$.tooltipster.on('init', function(event) {
				
				var window = $.tooltipster.env.window,
					$origin = $(event.origin);
				
				if (	window.SVGElement
					&&	event.origin instanceof window.SVGElement
				) {
					
					// jQuery < v3.0's addClass and hasClass do not work on SVG elements.
					// However, $('.tooltipstered') does find elements having the class.
					if (!$origin.hasClass('tooltipstered')) {
						
						var c = $origin.attr('class') || '';
						
						if (c.indexOf('tooltipstered') == -1) {
							$origin.attr('class', c + ' tooltipstered');
						}
					}
					
					// auto-activation of the plugin on the instance
					if ($.inArray('tooltipster.SVG', event.instance.option('plugins')) === -1) {
						event.instance._plugin('tooltipster.SVG');
					}
					
					// if there is no content yet, let's look for a <title> child element
					if (event.instance.content() === null) {
						
						// TODO: when there are several <title> tags (not supported in
						// today's browsers yet though, still an RFC draft), pick the right
						// one based on its "lang" attribute 
						var $title = $origin.find('title');
						
						if ($title[0]) {
							event.instance.content($title.text());
						}
					}
					
					// rectify the geometry if SVG.js and its screenBBox plugin have been included
					event.instance
						._on('geometry', function(event) {
							
							// SVG coordinates may need fixing but we need svg.screenbox.js
							// to provide it. SVGElement is IE8+
							if (window.SVG.svgjs) {
								
								if (!window.SVG.parser) {
									window.SVG.prepare();
								}
								
								var svgEl = window.SVG.adopt(event.origin);
								
								// not all figures need (and have) screenBBox
								if (svgEl && svgEl.screenBBox) {
									
									var bbox = svgEl.screenBBox();
									
									event.edit({
										height: bbox.height,
										left: bbox.x,
										top: bbox.y,
										width: bbox.width
									});
								}
							}
						})
						// if jQuery < v3.0, we have to remove the class ourselves
						._on('destroyed', function() {
							
							if (!$origin.hasClass('tooltipstered')) {
								var c = $origin.attr('class').replace('tooltipstered', '');
								$origin.attr('class', c);
							}
						});
				}
			});
		}
	}
});

/* a build task will add "return $;" here */
