/*

Tooltipster 2.0.2 | 1/30/13
A rockin' custom tooltip jQuery plugin

Developed by: Caleb Jacob - calebjacob.com
Copyright (C) 2013 Caleb Jacob

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function ($, window, document, undefined) {

	var pluginName = "tooltipster",
		defaults = {
			animation: 'fade',
			arrow: true,
			arrowColor: '',
			content: '',
			delay: 200,
			fixedWidth: 0,
			maxWidth: 0,
			functionBefore: function(origin, continueTooltip) {
				continueTooltip();
			},
			functionAfter: function(origin) {},
			icon: '(?)',
			iconDesktop: false,
			iconTouch: false,
			iconTheme: '.tooltipster-icon',
			interactive: false,
			interactiveTolerance: 350,
			offsetX: 0,
			offsetY: 0,
			onlyOne: true,
			position: 'top',
			speed: 350,
			timer: 0,
			theme: '.tooltipster-default',
			touchDevices: true,
			trigger: 'hover'
		};
	
	function Plugin(element, options) {
		this.element = element;
		
		this.options = $.extend( {}, defaults, options );
		
		this._defaults = defaults;
		this._name = pluginName;
		
		this.init();
	}
	
	// we'll use this to detect for mobile devices
	function is_touch_device() {
		return !!('ontouchstart' in window);
  	}
  	
  	// detecting support for CSS transitions
  	function supportsTransitions() {
	    var b = document.body || document.documentElement;
	    var s = b.style;
	    var p = 'transition';
	    if(typeof s[p] == 'string') {return true; }
	
	    v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'],
	    p = p.charAt(0).toUpperCase() + p.substr(1);
	    for(var i=0; i<v.length; i++) {
	      if(typeof s[v[i] + p] == 'string') { return true; }
	    }
	    return false;
    }
    var transitionSupport = true;
    if (!supportsTransitions()) {
	    transitionSupport = false;
    }
    	
	Plugin.prototype = {
		
		init: function() {		
			var $this = $(this.element);
			var object = this;
			var run = true;
			
			// if this is a touch device and touch devices are disabled, disable the plugin
			if ((object.options.touchDevices == false) && (is_touch_device())) {
				run = false;
			}
			
			// if IE7 or lower, disable the plugin
			if (document.all && !document.querySelector) {
				run = false;
    		}
    					
			if (run == true) {
				
				// detect if we're changing the tooltip origin to an icon
				if ((this.options.iconDesktop == true) && (!is_touch_device()) || ((this.options.iconTouch == true) && (is_touch_device()))) {
					var transferContent = $this.attr('title');					
					$this.removeAttr('title');
					var theme = object.options.iconTheme;
					var icon = $('<span class="'+ theme.replace('.', '') +'" title="'+ transferContent +'">'+ this.options.icon +'</span>');
					icon.insertAfter($this);
					$this.data('tooltipsterIcon', icon);
					$this = icon;
				}
			
				// first, strip the title off of the element and set it as a data attribute to prevent the default tooltips from popping up
				var tooltipsterContent = $.trim(object.options.content).length > 0 ? object.options.content : $this.attr('title');
				$this.data('tooltipsterContent', tooltipsterContent);
				$this.removeAttr('title');
				
				// if this is a touch device, add some touch events to launch the tooltip
				if ((this.options.touchDevices == true) && (is_touch_device())) {
					$this.bind('touchstart', function(element, options) {
						object.showTooltip();
					});
				}
				
				// if this is a desktop, deal with adding regular mouse events
				else {
				
					// if hover events are set to show and hide the tooltip, attach those events respectively
					if (this.options.trigger == 'hover') {
						$this.mouseenter(function() {
							object.showTooltip();
						});
						
						// if this is an interactive tooltip, delay getting rid of the tooltip right away so you have a chance to hover on the tooltip
						if (this.options.interactive == true) {
							$this.mouseleave(function() {
								var tooltipster = $this.data('tooltipster');
								var keepAlive = false;
								
								if ((tooltipster !== undefined) && (tooltipster !== '')) {
									tooltipster.mouseenter(function() {
										keepAlive = true;
									});
									tooltipster.mouseleave(function() {
										keepAlive = false;
									});
									
									var tolerance = setTimeout(function() {
										if (keepAlive == true) {
											tooltipster.mouseleave(function() {
												object.hideTooltip();
											});
										}
										else {
											object.hideTooltip();
										}
									}, object.options.interactiveTolerance);
								}
								else {
									object.hideTooltip();
								}
							});
						}
						
						// if this is a dumb tooltip, just get rid of it on mouseleave
						else {
							$this.mouseleave(function() {
								object.hideTooltip();
							});
						}
					}
					
					// if click events are set to show and hide the tooltip, attach those events respectively
					if (this.options.trigger == 'click') {
						$this.click(function() {
							if (($this.data('tooltipster') == '') || ($this.data('tooltipster') == undefined)) {
								object.showTooltip();
							}
							else {
								object.hideTooltip();
							}
						});
					}
				}
			}
		},
		
		showTooltip: function(options) {
			
			var $this = $(this.element);
			var object = this;
						
			// detect if we're actually dealing with an icon or the origin itself
			if ($this.data('tooltipsterIcon') !== undefined) {
				$this = $this.data('tooltipsterIcon');
			}
			
			// if we only want one tooltip open at a time, close all tooltips currently open
			if (($('.tooltipster-base').not('.tooltipster-dying').length > 0) && (object.options.onlyOne == true)) {
				$('.tooltipster-base').not('.tooltipster-dying').each(function() {
					if ($this.data('tooltipster') !== $(this)) {
						$(this).addClass('tooltipster-kill');
						var origin = $(this).data('origin');
						origin.data('plugin_tooltipster').hideTooltip();
					}
				});
			}
			
			// delay the showing of the tooltip according to the delay time
			$this.clearQueue().delay(object.options.delay).queue(function() {
			
				// call our custom function before continuing
				object.options.functionBefore($this, function() {
					
					// if this origin already has its tooltip open, keep it open and do nothing else
					if (($this.data('tooltipster') !== undefined) && ($this.data('tooltipster') !== '')) {
						var tooltipster = $this.data('tooltipster');
						
						if (!tooltipster.hasClass('tooltipster-kill')) {

							var animation = 'tooltipster-'+ object.options.animation;
							
							tooltipster.removeClass('tooltipster-dying');
							
							if (transitionSupport == true) {
								tooltipster.clearQueue().addClass(animation +'-show');
							}
							
							// if we have a timer set, we need to reset it
							if (object.options.timer > 0) {
								var timer = tooltipster.data('tooltipsterTimer');
								clearTimeout(timer);
													
								timer = setTimeout(function() {
									tooltipster.data('tooltipsterTimer', undefined);
									object.hideTooltip();
								}, object.options.timer);
								
								tooltipster.data('tooltipsterTimer', timer);
							}
							
							// if this is a touch device, hide the tooltip on body touch
							if ((object.options.touchDevices == true) && (is_touch_device())) {
								$('body').bind('touchstart', function(event) {
									if (object.options.interactive == true) {
										var touchTarget = $(event.target);
										var closeTooltip = true;
										
										touchTarget.parents().each(function() {
											if ($(this).hasClass('tooltipster-base')) {
												closeTooltip = false;
											}
										});
										
										if (closeTooltip == true) {
											object.hideTooltip();
											$('body').unbind('touchstart');
										}
									}
									else {
										object.hideTooltip();
										$('body').unbind('touchstart');
									}
								});
							}
						}
					}
					
					// if the tooltip isn't already open, open that sucker up!
					else {
						// disable horizontal scrollbar to keep overflowing tooltips from jacking with it
						$('body').css('overflow-x', 'hidden');
						
						// get the content for the tooltip
						var content = $this.data('tooltipsterContent');
						
						// get some other settings related to building the tooltip
						var theme = object.options.theme;
						var themeClass = theme.replace('.', '');
						var animation = 'tooltipster-'+object.options.animation;
						var animationSpeed = '-webkit-transition-duration: '+ object.options.speed +'ms; -webkit-animation-duration: '+ object.options.speed +'ms; -moz-transition-duration: '+ object.options.speed +'ms; -moz-animation-duration: '+ object.options.speed +'ms; -o-transition-duration: '+ object.options.speed +'ms; -o-animation-duration: '+ object.options.speed +'ms; -ms-transition-duration: '+ object.options.speed +'ms; -ms-animation-duration: '+ object.options.speed +'ms; transition-duration: '+ object.options.speed +'ms; animation-duration: '+ object.options.speed +'ms;';
						var fixedWidth = object.options.fixedWidth > 0 ? 'width:'+ object.options.fixedWidth +'px;' : '';
						var maxWidth = object.options.maxWidth > 0 ? 'max-width:'+ object.options.maxWidth +'px;' : '';
						var pointerEvents = object.options.interactive == true ? 'pointer-events: auto;' : '';
											
						// build the base of our tooltip
						var tooltipster = $('<div class="tooltipster-base '+ themeClass +' '+ animation +'" style="'+ fixedWidth +' '+ maxWidth +' '+ pointerEvents +' '+ animationSpeed +'"><div class="tooltipster-content">'+content+'</div></div>');
						tooltipster.appendTo('body');
						
						// attach the tooltip to its origin
						$this.data('tooltipster', tooltipster);
						tooltipster.data('origin', $this);
						
						// find variables to determine placement
						var windowWidth = $(window).width();
						var containerWidth = $this.outerWidth(false);
						var containerHeight = $this.outerHeight(false);
						var tooltipWidth = tooltipster.outerWidth(false);
						var tooltipInnerWidth = tooltipster.innerWidth();
						var tooltipHeight = tooltipster.outerHeight(false);
						var offset = $this.offset();
						var offsetTop = offset.top;
						var offsetLeft = offset.left;
						var resetPosition = undefined;
						
						// if this is an <area> tag inside a <map>, we need to recalculate the positions in a funkytastical way
						if ($this.is('area')) {
							var areaShape = $this.attr('shape');
							var mapName = $this.parent().attr('name');
							var map = $('img[usemap="#'+ mapName +'"]');
							var mapOffsetLeft = map.offset().left;
							var mapOffsetTop = map.offset().top;
							var areaMeasurements = $this.attr('coords') !== undefined ? $this.attr('coords').split(',') : undefined;
							
							if (areaShape == 'circle') {
								var areaLeft = parseInt(areaMeasurements[0]);
								var areaTop = parseInt(areaMeasurements[1]);
								var areaWidth = parseInt(areaMeasurements[2]);
								containerHeight = areaWidth * 2;
								containerWidth = areaWidth * 2;
								offsetTop = mapOffsetTop + areaTop - areaWidth;
								offsetLeft = mapOffsetLeft + areaLeft - areaWidth;
							}
							else if (areaShape == 'rect') {
								var areaLeft = parseInt(areaMeasurements[0]);
								var areaTop = parseInt(areaMeasurements[1]);
								var areaRight = parseInt(areaMeasurements[2]);
								var areaBottom = parseInt(areaMeasurements[3]);
								containerHeight = areaBottom - areaTop;
								containerWidth = areaRight - areaLeft;
								offsetTop = mapOffsetTop + areaTop;
								offsetLeft = mapOffsetLeft + areaLeft;
							}
							else if (areaShape == 'poly') {
								var areaXs = [];
								var areaYs = [];
								var areaSmallestX = 0,
									areaSmallestY = 0,
									areaGreatestX = 0,
									areaGreatestY = 0;
								var arrayAlternate = 'even';
								
								for (i = 0; i < areaMeasurements.length; i++) {
									var areaNumber = parseInt(areaMeasurements[i]);
									
									if (arrayAlternate == 'even') {
										if (areaNumber > areaGreatestX) {
											areaGreatestX = areaNumber;
											if (i == 0) {
												areaSmallestX = areaGreatestX;
											}
										}
										
										if (areaNumber < areaSmallestX) {
											areaSmallestX = areaNumber;
										}
										
										arrayAlternate = 'odd';
									}
									else {
										if (areaNumber > areaGreatestY) {
											areaGreatestY = areaNumber;
											if (i == 1) {
												areaSmallestY = areaGreatestY;
											}
										}
										
										if (areaNumber < areaSmallestY) {
											areaSmallestY = areaNumber;
										}
										
										arrayAlternate = 'even';
									}
								}
							
								containerHeight = areaGreatestY - areaSmallestY;
								containerWidth = areaGreatestX - areaSmallestX;
								offsetTop = mapOffsetTop + areaSmallestY;
								offsetLeft = mapOffsetLeft + areaSmallestX;
							}
							else {
								containerHeight = map.outerHeight(false);
								containerWidth = map.outerWidth(false);
								offsetTop = mapOffsetTop;
								offsetLeft = mapOffsetLeft;
							}
						}
																		
						// hardcoding the width and removing the padding fixed an issue with the tooltip width collapsing when the window size is small
						if(object.options.fixedWidth == 0) {
							tooltipster.css({
								'width': (tooltipInnerWidth + 1) + 'px',
								'padding-left': '0px',
								'padding-right': '0px'
							});
						}
												
						// our function and global vars for positioning our tooltip
						var myLeft = 0,
							myTop = 0;
						var offsetY = parseInt(object.options.offsetY);
						var offsetX = parseInt(object.options.offsetX);
						var arrowConstruct = '';
						function positionTooltip() {
						
							// A function to detect if the tooltip is going off the screen horizontally. If so, rethis.options.position the crap out of it!
							function dontGoOffScreen() {
							
								var windowLeft = $(window).scrollLeft();
								
								// If the tooltip goes off the left side of the screen, line it up with the left side of the window
								if((myLeft - windowLeft) < 0) {
									var arrowReposition = myLeft - windowLeft;
									myLeft = windowLeft;
																											
									tooltipster.data('arrow-reposition', arrowReposition);
								}
								
								// If the tooltip goes off the right of the screen, line it up with the right side of the window
								if (((myLeft + tooltipWidth) - windowLeft) > windowWidth) {
									var arrowReposition = myLeft - ((windowWidth + windowLeft) - tooltipWidth);
									myLeft = (windowWidth + windowLeft) - tooltipWidth;
																															
									tooltipster.data('arrow-reposition', arrowReposition);
								}
							}
							
							// A function to detect if the tooltip is going off the screen vertically. If so, switch to the opposite!
							function dontGoOffScreenY(switchTo, resetTo) {
								if((offsetTop - $(window).scrollTop() - tooltipHeight - offsetY - 11) < 0) {
									object.options.position = switchTo;
									resetPosition = resetTo;
								}
							}
										
							if(object.options.position == 'top') {
								var leftDifference = (offsetLeft + tooltipWidth) - (offsetLeft + containerWidth);
								myLeft =  (offsetLeft + offsetX) - (leftDifference / 2);
								myTop = (offsetTop - tooltipHeight) - offsetY - 12;
								dontGoOffScreen();
								dontGoOffScreenY('bottom', 'top');
							}
							
							if(object.options.position == 'top-left') {
								myLeft = offsetLeft + offsetX;
								myTop = (offsetTop - tooltipHeight) - offsetY - 12;
								dontGoOffScreen();
								dontGoOffScreenY('bottom-left', 'top-left');
							}
							
							if(object.options.position == 'top-right') {
								myLeft = (offsetLeft + containerWidth + offsetX) - tooltipWidth;
								myTop = (offsetTop - tooltipHeight) - offsetY - 12;
								dontGoOffScreen();
								dontGoOffScreenY('bottom-right', 'top-right');
							}
							
							if(object.options.position == 'bottom') {
								var leftDifference = (offsetLeft + tooltipWidth) - (offsetLeft + containerWidth);
								myLeft =  offsetLeft - (leftDifference / 2) + offsetX;
								myTop = (offsetTop + containerHeight) + offsetY + 12;
								dontGoOffScreen();
							}
							
							if(object.options.position == 'bottom-left') {
								myLeft = offsetLeft + offsetX;
								myTop = (offsetTop + containerHeight) + offsetY + 12;
								dontGoOffScreen();
							}
							
							if(object.options.position == 'bottom-right') {
								myLeft = (offsetLeft + containerWidth + offsetX) - tooltipWidth;
								myTop = (offsetTop + containerHeight) + offsetY + 12;
								dontGoOffScreen();
							}
							
							if(object.options.position == 'left') {
								myLeft = offsetLeft - offsetX - tooltipWidth - 12;
								myLeftMirror = offsetLeft + offsetX + containerWidth + 12;
								var topDifference = (offsetTop + tooltipHeight) - (offsetTop + $this.outerHeight(false));
								myTop =  offsetTop - (topDifference / 2) - offsetY;
															
								// If the tooltip goes off boths sides of the page
								if((myLeft < 0) && ((myLeftMirror + tooltipWidth) > windowWidth)) {
									var borderWidth = parseFloat(tooltipster.css('border-width')) * 2;
									var newWidth = (tooltipWidth + myLeft) - borderWidth;
									tooltipster.css('width', newWidth + 'px');
									
									tooltipHeight = tooltipster.outerHeight(false);
									myLeft = offsetLeft - offsetX - newWidth - 12 - borderWidth;
									topDifference = (offsetTop + tooltipHeight) - (offsetTop + $this.outerHeight(false));
									myTop =  offsetTop - (topDifference / 2) - offsetY;
								}
								
								// If it only goes off one side, flip it to the other side
								else if(myLeft < 0) {
									myLeft = offsetLeft + offsetX + containerWidth + 12;
									tooltipster.data('arrow-reposition', 'left');
								}
							}
							
							if(object.options.position == 'right') {
								myLeft = offsetLeft + offsetX + containerWidth + 12;
								myLeftMirror = offsetLeft - offsetX - tooltipWidth - 12;
								var topDifference = (offsetTop + tooltipHeight) - (offsetTop + $this.outerHeight(false));
								myTop =  offsetTop - (topDifference / 2) - offsetY;
								
								// If the tooltip goes off boths sides of the page
								if(((myLeft + tooltipWidth) > windowWidth) && (myLeftMirror < 0)) {
									var borderWidth = parseFloat(tooltipster.css('border-width')) * 2;
									var newWidth = (windowWidth - myLeft) - borderWidth;
									tooltipster.css('width', newWidth + 'px');
									
									tooltipHeight = tooltipster.outerHeight(false);
									topDifference = (offsetTop + tooltipHeight) - (offsetTop + $this.outerHeight(false));
									myTop =  offsetTop - (topDifference / 2) - offsetY;
	
								}
									
								// If it only goes off one side, flip it to the other side
								else if((myLeft + tooltipWidth) > windowWidth) {
									myLeft = offsetLeft - offsetX - tooltipWidth - 12;
									tooltipster.data('arrow-reposition', 'right');
								}
							}
							
							// if arrow is set true, style it and append it
							if (object.options.arrow == true){
				
								var arrowClass = 'tooltipster-arrow-' + object.options.position;
								
								// set color of the arrow
								if(object.options.arrowColor.length < 1) {
									var arrowColor = tooltipster.css('background-color');
								}
								else {
									var arrowColor = object.options.arrowColor;
								}
								
								// if the tooltip was going off the page and had to re-adjust, we need to update the arrow's this.options.position to stay next to the mouse
								var arrowReposition = tooltipster.data('arrow-reposition');
								if (!arrowReposition) {
									arrowReposition = '';
								}
								else if (arrowReposition == 'left') {
									arrowClass = 'tooltipster-arrow-right';
									arrowReposition = '';
								}
								else if (arrowReposition == 'right') {
									arrowClass = 'tooltipster-arrow-left';
									arrowReposition = '';
								}
								else {
									arrowReposition = 'left:'+ arrowReposition +'px;';
								}
								
								// Building the logic to create the border around the arrow of the tooltip
								if ((object.options.position == 'top') || (object.options.position == 'top-left') || (object.options.position == 'top-right')) {
									var tooltipBorderWidth = parseFloat(tooltipster.css('border-bottom-width'));
									var tooltipBorderColor = tooltipster.css('border-bottom-color');
								}
								else if ((object.options.position == 'bottom') || (object.options.position == 'bottom-left') || (object.options.position == 'bottom-right')) {
									var tooltipBorderWidth = parseFloat(tooltipster.css('border-top-width'));
									var tooltipBorderColor = tooltipster.css('border-top-color');
								}
								else if (object.options.position == 'left') {
									var tooltipBorderWidth = parseFloat(tooltipster.css('border-right-width'));
									var tooltipBorderColor = tooltipster.css('border-right-color');
								}
								else if (object.options.position == 'right') {
									var tooltipBorderWidth = parseFloat(tooltipster.css('border-left-width'));
									var tooltipBorderColor = tooltipster.css('border-left-color');
								}
								else {
									var tooltipBorderWidth = parseFloat(tooltipster.css('border-bottom-width'));
									var tooltipBorderColor = tooltipster.css('border-bottom-color');
								}
								
								if (tooltipBorderWidth > 1) {
									tooltipBorderWidth++;
								}
								
								var arrowBorder = '';
								if (tooltipBorderWidth !== 0) {
									var arrowBorderSize = '';
									var arrowBorderColor = 'border-color: '+ tooltipBorderColor +';';
									if (arrowClass.indexOf('bottom') !== -1) {
										arrowBorderSize = 'margin-top: -'+ tooltipBorderWidth +'px;';
									}
									else if (arrowClass.indexOf('top') !== -1) {
										arrowBorderSize = 'margin-bottom: -'+ tooltipBorderWidth +'px;';
									}
									else if (arrowClass.indexOf('left') !== -1) {
										arrowBorderSize = 'margin-right: -'+ tooltipBorderWidth +'px;';
									}
									else if (arrowClass.indexOf('right') !== -1) {
										arrowBorderSize = 'margin-left: -'+ tooltipBorderWidth +'px;';
									}
									arrowBorder = '<span class="tooltipster-arrow-border" style="'+ arrowBorderSize +' '+ arrowBorderColor +';"></span>';
								}
																
								arrowConstruct = '<div class="'+ arrowClass +' tooltipster-arrow" style="'+ arrowReposition +'">'+ arrowBorder +'<span style="border-color:'+ arrowColor +';"></span></div>';
							}
							// position the tooltip
							tooltipster.css({'top': myTop+'px', 'left': myLeft+'px'});
						}
						
						positionTooltip();
						tooltipster.append(arrowConstruct);
												
						// animate in the tooltip
						if (transitionSupport == true) {
							tooltipster.addClass(animation + '-show');
						}
						else {
							tooltipster.css('display', 'none').removeClass(animation).fadeIn(object.options.speed);
						}
						
						// check to see if our tooltip content changes while the tooltip is alive
						var currentTooltipContent = content;
						var contentUpdateChecker = setInterval(function() {		
							var newTooltipContent = $this.data('tooltipsterContent');												
							if ((currentTooltipContent !== newTooltipContent) && (newTooltipContent !== '')) {
								currentTooltipContent = newTooltipContent;
								
								tooltipster.find('.tooltipster-content').html(newTooltipContent);
								tooltipster.css({
									'width': '',
									'-webkit-transition-duration': object.options.speed + 'ms',
									'-moz-transition-duration': object.options.speed + 'ms',
									'-o-transition-duration': object.options.speed + 'ms',
									'-ms-transition-duration': object.options.speed + 'ms',
									'transition-duration': object.options.speed + 'ms',
									'-webkit-transition-property': '-webkit-transform',
									'-moz-transition-property': '-moz-transform',
									'-o-transition-property': '-o-transform',
									'-ms-transition-property': '-ms-transform',
									'transition-property': 'transform',
								}).addClass('tooltipster-content-changing');
								
								// reset the CSS transitions and finish the change animation
								setTimeout(function() {
									tooltipster.removeClass('tooltipster-content-changing');
									// after the changing animation has completed, reset the CSS transitions
									setTimeout(function() {
										tooltipster.css({
											'-webkit-transition-property': '',
											'-moz-transition-property': '',
											'-o-transition-property': '',
											'-ms-transition-property': '',
											'transition-property': ''
										});
									}, object.options.speed);
								}, object.options.speed);
								
								tooltipWidth = tooltipster.outerWidth(false);
								tooltipInnerWidth = tooltipster.innerWidth();
								tooltipHeight = tooltipster.outerHeight(false);
								
								positionTooltip();
							}
							
							// if the tooltip is closed, stop this interval
							if ($('body').find(tooltipster).length == 0) {
								clearInterval(contentUpdateChecker);
							}
						}, 200);
						
						// if we have a timer set, let the countdown begin!
						if (object.options.timer > 0) {							
							var timer = setTimeout(function() {
								tooltipster.data('tooltipsterTimer', undefined);
								object.hideTooltip();
							}, object.options.timer + object.options.speed);
							
							tooltipster.data('tooltipsterTimer', timer);
						}
						
						// if this is a touch device, hide the tooltip on body touch
						if ((object.options.touchDevices == true) && (is_touch_device())) {
							$('body').bind('touchstart', function(event) {
								if (object.options.interactive == true) {
									
									var touchTarget = $(event.target);
									var closeTooltip = true;
																		
									touchTarget.parents().each(function() {
										if ($(this).hasClass('tooltipster-base')) {
											closeTooltip = false;
										}
									});
									
									if (closeTooltip == true) {
										object.hideTooltip();
										$('body').unbind('touchstart');
									}
								}
								else {
									object.hideTooltip();
									$('body').unbind('touchstart');
								}
							});
						}
						
						// if this is an interactive tooltip activated by a click, close the tooltip when you hover off the tooltip
						tooltipster.mouseleave(function() {
							object.hideTooltip();
						});
						
						// if we had to change the position of the tooltip so it wouldn't go off screen, reset it
						if (resetPosition !== undefined) {
							object.options.position = resetPosition;
						}
					}
				});
				
				$this.dequeue();
			});
			
		},
		
		hideTooltip: function(options) {
			
			var $this = $(this.element);
			var object = this;
			
			// detect if we're actually dealing with an icon or the origin itself
			if ($this.data('tooltipsterIcon') !== undefined) {
				$this = $this.data('tooltipsterIcon');
			}
			
			var tooltipster = $this.data('tooltipster');
			
			// clear any possible queues handling delays and such
			$this.clearQueue();
			
			if ((tooltipster !== undefined) && (tooltipster !== '')) {
				
				// detect if we need to clear a timer
				var timer = tooltipster.data('tooltipsterTimer');
				if (timer !== undefined) {
					clearTimeout(timer);
				}

				var animation = 'tooltipster-'+ object.options.animation;
				
				if (transitionSupport == true) {
					tooltipster.clearQueue().removeClass(animation +'-show').addClass('tooltipster-dying').delay(object.options.speed).queue(function() {
						tooltipster.remove();
						$this.data('tooltipster', '');
						$('body').css('verflow-x', '');
						
						// finally, call our custom callback function
						object.options.functionAfter($this);
					});
				}
				else {
					tooltipster.clearQueue().addClass('tooltipster-dying').fadeOut(object.options.speed, function() {
						tooltipster.remove();
						$this.data('tooltipster', '');
						$('body').css('verflow-x', '');
						
						// finally, call our custom callback function
						object.options.functionAfter($this);
					});
				}
			}
		}
	};
		
	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
			
			var thisOptions = $(this).data('plugin_tooltipster').options;
				
			if ((thisOptions.iconDesktop == true) && (!is_touch_device()) || ((thisOptions.iconTouch == true) && (is_touch_device()))) {
				var transferObject = $(this).data('plugin_tooltipster');
				$(this).next().data('plugin_tooltipster', transferObject);
			}	
		});
	};
	
	if (is_touch_device()) {
		window.addEventListener("orientationchange", function() {
			if ($('.tooltipster-base').length > 0) {
				$('.tooltipster-base').each(function() {
					var origin = $(this).data('origin');
					origin.data('plugin_tooltipster').hideTooltip();
				});
			}
	  	}, false);
  	}

})( jQuery, window, document );
