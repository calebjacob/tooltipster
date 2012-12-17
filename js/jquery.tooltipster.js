/*

Tooltipster 2.0 | 12/08/12
A rockin' custom tooltip jQuery plugin

Developed by: Caleb Jacob - calebjacob.com
Copyright (C) 2012 Caleb Jacob

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function ($, window, document, undefined) {
	
	// setting plugin name and default options
	var pluginName = 'tooltipster',
		defaults = {
			animation: 'fade',
			arrow: true,
			arrowColor: '',
			content: '',
			delay: 200,
			eventActivator: 'mouseover',
			eventDeactivator: 'mouseout',
			fixedWidth: 0,
			followMouse: false,
			interactiveTooltip: false,
			interactiveTolerance: 500,
			interactiveDeactivator: 'mouseout',
			mobileDevices: true,
			offsetX: 0,
			offsetY: 0,
			position: 'top',
			speed: 200,
			timer: 0,
			tooltipTheme: '.tooltipster',
			beforeShow: function(origin, continueTooltip) {
				continueTooltip();
			},
			afterClose: function(origin) {}
		};
	
	function Plugin(element, options) {
		this.element = element;
		this.options = $.extend({}, defaults, options);
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}
	
	// we'll use this to detect for mobile devices
	function is_touch_device() {
		return !!('ontouchstart' in window);
  	}
	
	Plugin.prototype = {
			
		init: function() {
			
			// detect if tooltipster should run or not
			var run = true;
			if ((this.options.mobileDevices == false) && (is_touch_device())) {
				run = false;	
			}
			
			if (run == true) {
										
				var $this = $(this.element);
				
				// Create tooltipContent data to save for future reference and remove the title attr to keep the default tooltips from popping up
				if ($this.attr('title') == undefined) {
					$this.attr('title', '');
				}
				$this.data('tooltipContent', $this.attr('title'));
				$this.removeAttr('title');
							
				// this var will help us in a situation where activation and deactivation of the tooltip are both handled by the click event. without it, the hide and show functions would both fire everytime you click - cancelling eachother and killing your innocent tooltip! :'(
				var tooltipReadyToClose = false;
							
				// binding the mouseover event to show the tooltip
				if (this.options.eventActivator == 'mouseover') {
					$this.mouseover(function(element, options) {
						$this.data('plugin_tooltipster').showTooltip();
					});
				}
				
				// binding the mouseout event to close the tooltip
				if (this.options.eventDeactivator == 'mouseout') {
					
					// if we're wanting to interact with and hover onto the tooltip itself, we'll add a short delay right after hovering off the origin so they can mouse onto the tooltip and keep the tooltip alive before it hides
					$this.mouseout(function() {									
						var thisTooltip = $($this.data('plugin_tooltipster').options.tooltipTheme);
						var thisObject = $this.data('plugin_tooltipster');
						
						if ((thisObject.options.interactiveTooltip == true) && (thisObject.options.interactiveDeactivator == 'mouseout')) {
							var keepAlive = false;
							$(thisTooltip).mouseover(function() {
								keepAlive = true;
							});
							$(thisTooltip).mouseout(function() {
								keepAlive = false;
							});
	
							setTimeout(function() {
								if (keepAlive == true) {
									$(thisTooltip).mouseout(function() {
										thisObject.hideTooltip();
									});
								}
								if (keepAlive == false) {
									thisObject.hideTooltip(thisTooltip);
								}
							}, thisObject.options.interactiveTolerance);
						}
						// if we're still wanting to interact with the tooltip but allow for the tooltip to be closed by being clicked on itself
						else if ((thisObject.options.interactiveTooltip == true) && (thisObject.options.interactiveDeactivator == 'click')) {
							$(thisTooltip).click(function() {
								thisObject.hideTooltip();
							});
						}
						// if we aren't planning on interacting with the tooltip, just remove the sucker like normal
						else {
							thisObject.hideTooltip();
						}
					});
				}
				
				// binding the click event to show the tooltip
				if (this.options.eventActivator == 'click') {
					$this.click(function() {
						var thisTooltip = $($this.data('plugin_tooltipster').options.tooltipTheme);
						var thisObject = $this.data('plugin_tooltipster');
						
						if ($this.attr('title') !== '') {
							thisObject.showTooltip();
							tooltipReadyToClose = false;
						}
						else {
							tooltipReadyToClose = true;
						}
						
						// if we wanna interact with the tooltip and have it hide when we click on the tooltip
						if ((thisObject.options.interactiveTooltip == true) && (thisObject.options.interactiveDeactivator == 'click') && (thisObject.options.eventDeactivator == 'click')) {
							$(thisTooltip).live('click', function() {
								thisObject.hideTooltip();
							});
						}
						
						// if we wanna interact with the tooltip and have it hide when we hover off the tooltip
						if ((thisObject.options.interactiveTooltip == true) && (thisObject.options.interactiveDeactivator == 'mouseout') && (thisObject.options.eventDeactivator == 'click')) {
							$(thisTooltip).live('mouseleave', function() {
								thisObject.hideTooltip();
							});
						}
					});
				}
				
				// binding the click event to hide the tooltip
				if (this.options.eventDeactivator == 'click') {
					$this.click(function() {
						if ((tooltipReadyToClose == true) || ($this.data('plugin_tooltipster').options.eventActivator !== 'click')) {
							$this.data('plugin_tooltipster').hideTooltip();
						}
					});
				}
			}
		},
		
		showTooltip: function() {
			
			var $this = $(this.element);
			var thisObject = $this.data('plugin_tooltipster');
							
			// call the optional custom function before continuing and launching the tooltip
			this.options.beforeShow($this, function() {
								
				// If there's still a tooltip open, close it before initiating the next tooltip
				if ($(thisObject.options.tooltipTheme).not('.tooltip-kill').length == 1) {
					$(thisObject.options.tooltipTheme).dequeue().clearQueue();
					var origin = $(thisObject.options.tooltipTheme).not('.tooltip-kill').data('origin');
					origin.data('plugin_tooltipster').hideTooltip();
					//$(this.options.tooltipTheme).not('.tooltip-kill').addClass('tooltip-kill');
				}
							
				// Disable horizontal scrollbar to keep overflowing tooltips from creating one
				$('body').css("overflow-x", "hidden");
				
				// Get tooltip text from the data title attr
				var tooltipText = $this.data('tooltipContent');
				
				// If a text override has been set, use that instead for the tooltip text
				if($.trim(thisObject.options.content).length > 0) {
					var tooltipText = thisObject.options.content;
				}
				
				// If a fixed width has been set, set the tooltip to that width
				var fixedWidth = thisObject.options.fixedWidth > 0 ? 'width:'+ thisObject.options.fixedWidth +'px;' : '';
				
				// If we're gonna be interacting with the tooltip, set the pointer events to auto so the mouse can interact with events on the tooltip
				var pointerEvents = thisObject.options.interactiveTooltip == true ? 'pointer-events: auto;' : '';
				
				// Remove the title attribute to keep the default tooltip from popping up and append the base HTML for the tooltip
				$('<div class="'+ thisObject.options.tooltipTheme.replace('.','') +'" style="'+ fixedWidth +' '+ pointerEvents +'"><div class="tooltipster-content">'+tooltipText+'</div></div>').appendTo('body').hide();
				
				// If the tooltip doesn't follow the mouse, determine the placement
				if (thisObject.options.followMouse == false) {
					
					// Find global variables to determine placement
					var windowWidth = $(window).width();
					var containerWidth = $this.outerWidth(false);
					var containerHeight = $this.outerHeight(false);
					var tooltipWidth = $(thisObject.options.tooltipTheme).not('.tooltip-kill').outerWidth(false);
					var tooltipHeight = $(thisObject.options.tooltipTheme).not('.tooltip-kill').outerHeight(false);
					var offset = $this.offset();
					var resetPosition = undefined;
					
					// Hardcoding the width and removing the padding fixed an issue with the tooltip width collapsing when the window size is small
					if(thisObject.options.fixedWidth == 0) {
						$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
							'width': tooltipWidth + 'px',
							'padding-left': '0px',
							'padding-right': '0px'
						});
					}
					
					// A function to detect if the tooltip is going off the screen horizontally. If so, rethis.options.position the crap out of it!
					function dontGoOffScreen() {
					
						var windowLeft = $(window).scrollLeft();
						
						// If the tooltip goes off the left side of the screen, line it up with the left side of the window
						if((myLeft - windowLeft) < 0) {
							var arrowReposition = myLeft - windowLeft;
							myLeft = windowLeft;
																									
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').data('arrow-reposition', arrowReposition);
						}
						
						// If the tooltip goes off the right of the screen, line it up with the right side of the window
						if (((myLeft + tooltipWidth) - windowLeft) > windowWidth) {
							var arrowReposition = myLeft - ((windowWidth + windowLeft) - tooltipWidth);
							myLeft = (windowWidth + windowLeft) - tooltipWidth;
																													
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').data('arrow-reposition', arrowReposition);
						}
					}
					
					// A function to detect if the tooltip is going off the screen vertically. If so, switch to the opposite!
					function dontGoOffScreenY(switchTo, resetTo) {
						if((offset.top - $(window).scrollTop() - tooltipHeight - thisObject.options.offsetY - 11) < 0) {
							thisObject.options.position = switchTo;
							resetPosition = resetTo;
						}
					}
								
					if(thisObject.options.position == 'top') {
						var leftDifference = (offset.left + tooltipWidth) - (offset.left + $this.outerWidth(false));
						var myLeft =  (offset.left + thisObject.options.offsetX) - (leftDifference / 2);
						var myTop = (offset.top - tooltipHeight) - thisObject.options.offsetY - 10;
						dontGoOffScreen();
						dontGoOffScreenY('bottom', 'top');
					}
					
					if(thisObject.options.position == 'top-left') {
						var myLeft = offset.left + thisObject.options.offsetX;
						var myTop = (offset.top - tooltipHeight) - thisObject.options.offsetY - 10;
						dontGoOffScreen();
						dontGoOffScreenY('bottom-left', 'top-left');
					}
					
					if(thisObject.options.position == 'top-right') {
						var myLeft = (offset.left + containerWidth + thisObject.options.offsetX) - tooltipWidth;
						var myTop = (offset.top - tooltipHeight) - thisObject.options.offsetY - 10;
						dontGoOffScreen();
						dontGoOffScreenY('bottom-right', 'top-right');
					}
					
					if(thisObject.options.position == 'bottom') {
						var leftDifference = (offset.left + tooltipWidth + thisObject.options.offsetX) - (offset.left + $this.outerWidth(false));
						var myLeft =  offset.left - (leftDifference / 2);
						var myTop = (offset.top + containerHeight) + thisObject.options.offsetY + 10;
						dontGoOffScreen();
					}
					
					if(thisObject.options.position == 'bottom-left') {
						var myLeft = offset.left + thisObject.options.offsetX;
						var myTop = (offset.top + containerHeight) + thisObject.options.offsetY + 10;
						dontGoOffScreen();
					}
					
					if(thisObject.options.position == 'bottom-right') {
						var myLeft = (offset.left + containerWidth + thisObject.options.offsetX) - tooltipWidth;
						var myTop = (offset.top + containerHeight) + thisObject.options.offsetY + 10;
						dontGoOffScreen();
					}
					
					if(thisObject.options.position == 'left') {
						var myLeft = offset.left - thisObject.options.offsetX - tooltipWidth - 10;
						var myLeftMirror = offset.left + thisObject.options.offsetX + containerWidth + 10;
						var topDifference = (offset.top + tooltipHeight + thisObject.options.offsetY) - (offset.top + $this.outerHeight(false));
						var myTop =  offset.top - (topDifference / 2);					
						
						// If the tooltip goes off boths sides of the page
						if((myLeft < 0) && ((myLeftMirror + tooltipWidth) > windowWidth)) {
							myLeft = myLeft + tooltipWidth;
						}
						
						// If it only goes off one side, flip it to the other side
						if(myLeft < 0) {
							var myLeft = offset.left + thisObject.options.offsetX + containerWidth + 10;
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').data('arrow-reposition', 'left');
						}
					}
					
					if(thisObject.options.position == 'right') {
						var myLeft = offset.left + thisObject.options.offsetX + containerWidth + 10;
						var myLeftMirror = offset.left - thisObject.options.offsetX - tooltipWidth - 10;
						var topDifference = (offset.top + tooltipHeight + thisObject.options.offsetY) - (offset.top + $this.outerHeight(false));
						var myTop =  offset.top - (topDifference / 2);
						
						// If the tooltip goes off boths sides of the page
						if(((myLeft + tooltipWidth) > windowWidth) && (myLeftMirror < 0)) {
							myLeft = windowWidth - tooltipWidth;
						}
							
						// If it only goes off one side, flip it to the other side
						if((myLeft + tooltipWidth) > windowWidth) {
							myLeft = offset.left - thisObject.options.offsetX - tooltipWidth - 10;
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').data('arrow-reposition', 'right');
						}
					}
				}
				
				// Find variables to determine placement if set to mouse
				if (thisObject.options.followMouse == true) {
				
					var tooltipWidth = $(thisObject.options.tooltipTheme).not('.tooltip-kill').outerWidth(false);
					var tooltipHeight = $(thisObject.options.tooltipTheme).not('.tooltip-kill').outerHeight(false);
					var tooltipContent = $(thisObject.options.tooltipTheme).not('.tooltip-kill').find('.tooltipster-content').html();
					
					
					$this.mousemove(function(e){
						
						$(thisObject.options.tooltipTheme).not('.tooltip-kill').find('.tooltipster-content').html('').html(tooltipContent);
						var tooltipHeight = $(thisObject.options.tooltipTheme).not('.tooltip-kill').outerHeight(false);
						
						if(thisObject.options.position == 'top') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': ((e.pageX - 1) - (tooltipWidth / 2) + thisObject.options.offsetX) + 'px',
								'top': ((e.pageY - tooltipHeight - 2) - thisObject.options.offsetY - 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'top-right') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': e.pageX - 8 + thisObject.options.offsetX + 'px',
								'top': ((e.pageY - tooltipHeight - 2) - thisObject.options.offsetY - 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'top-left') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': (e.pageX - tooltipWidth + thisObject.options.offsetX) + 7 + 'px',
								'top': ((e.pageY - tooltipHeight - 2) - thisObject.options.offsetY - 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'bottom') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': (e.pageX - (tooltipWidth / 2) + thisObject.options.offsetX - 1) + 'px',
								'top': (e.pageY + 15 + thisObject.options.offsetY + 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'bottom-right') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': e.pageX - 2 + thisObject.options.offsetX + 'px',
								'top': (e.pageY + 15 + thisObject.options.offsetY + 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'bottom-left') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': (e.pageX - tooltipWidth + thisObject.options.offsetX) + 12 + 'px',
								'top': (e.pageY + 15 + thisObject.options.offsetY + 10) + 'px'
							});
						}
						
						if(thisObject.options.position == 'right') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': e.pageX + 20 + thisObject.options.offsetX + 'px',
								'top': ((e.pageY - (tooltipHeight / 2)) - thisObject.options.offsetY) + 'px'
							});
						}
						
						if(thisObject.options.position == 'left') {
							$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({
								'left': (e.pageX - tooltipWidth + thisObject.options.offsetX) - 15 + 'px',
								'top': ((e.pageY - (tooltipHeight / 2)) - thisObject.options.offsetY) + 'px'
							});
						}
						
	      			});
				
				}
				
				// If arrow is set true, style it and append it
				if (thisObject.options.arrow == true){
	
					var arrowClass = 'tooltip-arrow-' + thisObject.options.position;
					
					if (thisObject.options.followMouse == true) {
						if(arrowClass.search('right') > 0) {
							if (arrowClass !== 'tooltip-arrow-right') {
								var tempArrowClass = arrowClass;
								arrowClass = tempArrowClass.replace('right', 'left');
							}
						}
						else {
							if (arrowClass !== 'tooltip-arrow-left') {
								var tempArrowClass = arrowClass;
								arrowClass = tempArrowClass.replace('left', 'right');
							}
						}
					}
					
					// do some extra vertical this.options.positioning on the arrow if it is on the far right or left
					if(arrowClass == 'tooltip-arrow-right') {
						var arrowVertical = 'top:' + ((tooltipHeight / 2) - 7) + 'px';
					}
					if(arrowClass == 'tooltip-arrow-left') {
						var arrowVertical = 'top:' + ((tooltipHeight / 2) - 7) + 'px';
					}
					
					// set color of the arrow
					if(thisObject.options.arrowColor.length < 1) {
						var arrowColor = $(thisObject.options.tooltipTheme).not('.tooltip-kill').css('background-color');
					}
					else {
						var arrowColor = thisObject.options.arrowColor;
					}
					
					// If the tooltip was going off the page and had to re-adjust, we need to update the arrow's this.options.position to stay next to the mouse
					var arrowReposition = $(thisObject.options.tooltipTheme).not('.tooltip-kill').data('arrow-reposition');
					if (!arrowReposition) {
						arrowReposition = '';
					}
					else if (arrowReposition == 'left') {
						arrowClass = 'tooltip-arrow-right';
						arrowReposition = '';
					}
					else if (arrowReposition == 'right') {
						arrowClass = 'tooltip-arrow-left';
						arrowReposition = '';
					}
					else {
						arrowReposition = 'left:'+ arrowReposition +'px;';
					}
													
					var arrowConstruct = '<div class="'+ arrowClass +' tooltip-arrow" style="width:'+ tooltipWidth +'px; display:none; '+ arrowReposition +' '+ arrowVertical +'"><span style="border-color:'+ arrowColor +';"></span></div>';
					
				}
				else {
					var arrowConstruct = '';
				}
				
				// Label this tooltip's origin
				$(thisObject.options.tooltipTheme).not('.tooltip-kill').data('origin', $this);
				
				// Place tooltip
				$(thisObject.options.tooltipTheme).not('.tooltip-kill').css({'top': myTop+'px', 'left': myLeft+'px'}).append(arrowConstruct);
				
				// Determine how to animate the tooltip in
				if(thisObject.options.animation == 'slide') {
					$(thisObject.options.tooltipTheme).not('.tooltip-kill').delay(thisObject.options.delay).slideDown(thisObject.options.speed, function() { 
						$('.tooltip-arrow').fadeIn(thisObject.options.speed); 
					});
					
					// If there is a this.options.timer, slide it out once the time runs out
					if(thisObject.options.timer > 0) {
						$(thisObject.options.tooltipTheme).not('.tooltip-kill').delay(thisObject.options.timer).slideUp(thisObject.options.speed);
					}
				}
				
				else {
					$('.tooltip-arrow').show();
					$(thisObject.options.tooltipTheme).not('.tooltip-kill').delay(thisObject.options.delay).fadeIn(thisObject.options.speed);
					
					// If there is a this.options.timer, fade it out once the time runs out
					if(thisObject.options.timer > 0) {
						$(thisObject.options.tooltipTheme).not('.tooltip-kill').delay(thisObject.options.timer).fadeOut(thisObject.options.speed);
					}
				}
				
				// We need to reset the this.options.position since later on we might have changed it depending on tooltips going off the page
				if(resetPosition) {
					thisObject.options.position = resetPosition;
				}
			});
			
		},
		
		hideTooltip: function(explicitTooltipToKill) {
						
			var $this = $(this.element);
			
			// if explicitTooltipToKill is set, we'll only kill that tooltip - otherwise it will kill ALL open tooltips at the time
			var tooltipToKill = explicitTooltipToKill !== undefined ? explicitTooltipToKill : $(this.options.tooltipTheme).not('.tooltip-kill');

			tooltipToKill.clearQueue();
			tooltipToKill.addClass('tooltip-kill');			
			
			// Animate out and remove the tooltip we just sentencted to death. In this case, we'll use a slide
			if(this.options.animation == 'slide') {
				$('.tooltip-kill').slideUp(this.options.speed, function() {
					$('.tooltip-kill').remove();
					$('body').css("overflow-x", "auto");
				});
			}
			
			// If no animation is set, we'll use a simple fade
			else {
				$('.tooltip-kill').fadeOut(this.options.speed, function() {
					$('.tooltip-kill').remove();
					$('body').css("overflow-x", "auto");
				});
			}
			
			// call the optional custom callback function
			var callback = this.options.afterClose;
			setTimeout(function() {
				callback();
			}, this.options.speed);
			
		}

	};

	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
		});
	};

})( jQuery, window, document );