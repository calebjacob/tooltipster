/*! Tooltipster 4.0.0rc14 */

/**
 * Released on 2015-10-08
 * 
 * A rockin' custom tooltip jQuery plugin
 * Developed by Caleb Jacob under the MIT license http://opensource.org/licenses/MIT
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

;(function($) {
	
	var defaults = {
			animation: 'fade',
			autoClose: true,
			closeOnClick: false,
			content: null,
			contentAsHTML: false,
			contentCloning: false,
			debug: true,
			delay: 200,
			displayPlugin: 'default',
			functionInit: null,
			functionBefore: null,
			functionReady: null,
			functionAfter: null,
			functionFormat: null,
			interactive: false,
			interactiveTolerance: 350,
			multiple: false,
			onlyOne: false,
			// must be 'body' for now
			parent: 'body',
			positionTracker: false,
			positionTrackerCallback: function(origin) {
				// the default tracker callback will close the tooltip when the trigger
				// is 'hover' (see https://github.com/iamceege/tooltipster/pull/253)
				if (this.option('trigger') == 'hover' && this.option('autoClose')) {
					this.close();
				}
			},
			repositionOnScroll: false,
			restoration: 'none',
			speed: 350,
			theme: [],
			timer: 0,
			touchDevices: true,
			trigger: 'hover',
			updateAnimation: true,
			zIndex: 9999999
		},
		instancesLatest = [];
	
	// the Tooltipster class
	$.tooltipster = function(element, options) {
		
		// list of instance variables
		
		// stack of custom callbacks provided as parameters to API methods
		this.callbacks = {
			close: [],
			open: []
		};
		this.checkInterval = null;
		// this will be the user content shown in the tooltip. A capital "C" is used
		// because there is also a method called content()
		this.Content;
		// an instance of the chosen display plugin
		this.displayPlugin;
		// this is the element which gets one or more tooltips, also called "origin"
		this.$el = $(element);
		// various position and size data recomputed before each repositioning
		this.geometry;
		this.enabled = true;
		this.mouseIsOverOrigin = false;
		// a unique namespace per instance
		this.namespace = 'tooltipster-'+ Math.round(Math.random()*100000);
		this.options = $.extend(true, {}, defaults, options);
		// will be used to support origins in scrollable areas
		this.$originParents;
		// Status (capital S) can be either : appearing, shown, disappearing, hidden
		this.Status = 'hidden';
		this.timerClose = null;
		this.timerOpen = null;
		// this will be the tooltip element (jQuery wrapped HTML element)
		this.$tooltip;
		// the element the tooltip will be appended to
		this.$tooltipParent;
		// the tooltip left/top coordinates, saved after each repositioning
		this.tooltipPosition;
		
		// for backward compatibility. Deprecated in 4.0.0
		if (this.options.hideOnClick !== undefined) {
			this.options.closeOnClick = this.options.hideOnClick;
		}
		
		// option formatting
		if (typeof this.options.theme == 'string') {
			this.options.theme = [this.options.theme];
		}
		
		// launch
		this._init();
	};
	
	$.tooltipster.prototype = {
		
		_init: function() {
			
			var self = this;
			
			// note : the content is null (empty) by default and can stay that
			// way if the plugin remains initialized but not fed any content. The
			// tooltip will just not appear.
			
			// let's save the initial value of the title attribute for later
			// restoration if need be.
			var initialTitle = null;
			// it will already have been saved in case of multiple tooltips
			if (self.$el.data('tooltipster-initialTitle') === undefined) {
				
				initialTitle = self.$el.attr('title');
				
				// we do not want initialTitle to have the value "undefined" because
				// of how jQuery's .data() method works
				if (initialTitle === undefined) initialTitle = null;
				
				self.$el.data('tooltipster-initialTitle', initialTitle);
			}
			
			// If content is provided in the options, it has precedence over the
			// title attribute.
			// Note : an empty string is considered content, only 'null' represents
			// the absence of content.
			// Also, an existing title="" attribute will result in an empty string
			// content
			if (self.options.content !== null) {
				self._content_set(self.options.content);
			}
			else {
				self._content_set(initialTitle);
			}
			
			self.$el
				// strip the title off of the element to prevent the default tooltips
				// from popping up
				.removeAttr('title')
				// to be able to find all instances on the page later (upon window
				// events in particular)
				.addClass('tooltipstered');
			
			// for 'click' and 'hover' triggers : bind on events to open the tooltip.
			// Closing is now handled in _openNow() because of its bindings.
			// Notes about touch events :
				// - mouseenter, mouseleave and clicks happen even on pure touch devices
				//   because they are emulated. deviceIsPureTouch() is a simple attempt
				//   to detect them.
				// - on hybrid devices, we do not prevent touch gesture from opening
				//   tooltips. It would be too complex to differentiate real mouse events
				//   from emulated ones.
				// - we check deviceIsPureTouch() at each event rather than prior to
				//   binding because the situation may change during browsing
			if (self.options.trigger == 'hover') {
				
				// these binding are for mouse interaction only
				self.$el
					.on('mouseenter.'+ self.namespace, function() {
						if (!deviceIsPureTouch() || self.options.touchDevices) {
							self.mouseIsOverOrigin = true;
							self._open();
						}
					})
					.on('mouseleave.'+ self.namespace, function() {
						if (!deviceIsPureTouch() || self.options.touchDevices) {
							self.mouseIsOverOrigin = false;
						}
					});
				
				// for touch interaction only
				if (deviceHasTouchCapability && self.options.touchDevices) {
					
					// for touch devices, we immediately display the tooltip because we
					// cannot rely on mouseleave to handle the delay
					self.$el.on('touchstart.'+ self.namespace, function() {
						self._openNow();
					});
				}
			}
			else if (self.options.trigger == 'click') {
				
				// note : for touch devices, we do not bind on touchstart, we only rely
				// on the emulated clicks (triggered by taps)
				self.$el.on('click.'+ self.namespace, function() {
					if (!deviceIsPureTouch() || self.options.touchDevices) {
						self._open();
					}
				});
			}
		},
		
		_content_insert: function() {
			
			var self = this,
				$el = self.$tooltip.find('.tooltipster-content'),
				formattedContent =
					self.options.functionFormat ?
					self.options.functionFormat(self.Content) :
						self.Content;
			
			if (typeof formattedContent === 'string' && !self.options.contentAsHTML) {
				$el.text(formattedContent);
			}
			else {
				$el
					.empty()
					.append(formattedContent);
			}
		},
		
		_content_set: function(content) {
			
			// clone if asked. Cloning the object makes sure that each instance has its
			// own version of the content (in case a same object were provided for several
			// instances)
			// reminder : typeof null === object
			if (content instanceof $ && this.options.contentCloning) {
				content = content.clone(true);
			}
			
			this.Content = content;
		},
		
		/**
		 * Force the browser to redraw (re-render) the tooltip immediately. This is required
		 * when you changed some CSS properties and need to make something with it
		 * immediately, without waiting for the browser to redraw at the end of instructions.
		 * 
		 * @see http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
		 */
		_forceRedraw: function() {
			
			// note : this would work but for Webkit only
			//this.$tooltip.close();
			//this.$tooltip[0].offsetHeight;
			//this.$tooltip.open();
			
			// works in FF too
			var $p = this.$tooltip.parent();
			this.$tooltip.detach();
			this.$tooltip.appendTo($p);
		},
		
		/**
		 * Gather all information about dimensions and available space
		 */
		_geometry: function() {
			
			var	self = this,
				$target = self.$el,
				originIsArea = self.$el.is('area');
			
			// if this.$el is a map area, the target we'll need
			// the dimensions of is actually the image using the map,
			// not the area itself
			if (originIsArea) {
				
				var mapName = self.$el.parent().attr('name');
				
				$target = $('img[usemap="#'+ mapName +'"]');
			}
			
			var bcr = $target[0].getBoundingClientRect(),
				$document = $(document),
				$window = $(window),
				$parent = $target,
				// some useful properties of important elements
				geo = {
					document: {
						size: {
							height: $document.height(),
							width: $document.width()
						}
					},
					window: {
						scroll: {
							// the second ones are for IE compatibility
							left: window.scrollX || document.documentElement.scrollLeft,
							top: window.scrollY || document.documentElement.scrollTop
						},
						size: {
							height: $window.height(),
							width: $window.width()
						}
					},
					origin: {
						// the origin has a fixed lineage if itself or one of its
						// ancestors has a fixed position
						fixedLineage: false,
						offset: {
							left: bcr.left + window.scrollX,
							top: bcr.top + window.scrollY
						},
						size: {
							height: bcr.bottom - bcr.top,
							width: bcr.right - bcr.left
						},
						usemapImage: originIsArea ? $target[0] : null,
						windowOffset: {
							bottom: bcr.bottom,
							left: bcr.left,
							right: bcr.right,
							top: bcr.top
						}
					}
				};
			
			// if the element is a map area, some properties may need
			// to be recalculated
			if (originIsArea) {
				
				var shape = self.$el.attr('shape'),
					coords = self.$el.attr('coords');
				
				if (coords) {
					
					coords = coords.split(',');
					
					$.map(coords, function(val, i) {
						coords[i] = parseInt(val);
					});
				}
				
				switch(shape) {
					
					case 'circle':
						
						var areaLeft = coords[0],
							areaTop = coords[1],
							areaWidth = coords[2],
							areaTopOffset = areaTop - areaWidth,
							areaLeftOffset = areaLeft - areaWidth;
						
						geo.origin.size.height = areaWidth * 2;
						geo.origin.size.width = geo.origin.size.height;
						
						geo.origin.offset.left += areaLeftOffset;
						geo.origin.windowOffset.left += areaLeftOffset;
						
						geo.origin.offset.top += areaTopOffset;
						geo.origin.windowOffset.top += areaTopOffset;
						
						break;
					
					case 'rect':
						
						var areaLeft = coords[0],
							areaTop = coords[1],
							areaRight = coords[2],
							areaBottom = coords[3],
							areaTopOffset = areaBottom - areaTop,
							areaLeftOffset = areaRight - areaLeft;
						
						geo.origin.size.height = areaBottom - areaTop;
						geo.origin.size.width = areaRight - areaLeft;
						
						geo.origin.offset.top += areaTopOffset;
						geo.origin.windowOffset.top += areaTopOffset;
						
						geo.origin.offset.left += areaLeftOffset;
						geo.origin.windowOffset.left += areaLeftOffset;
						
						break;
					
					case 'poly':
						
						var areaSmallestX = 0,
							areaSmallestY = 0,
							areaGreatestX = 0,
							areaGreatestY = 0,
							arrayAlternate = 'even';
						
						for (var i = 0; i < coords.length; i++) {
							
							var areaNumber = coords[i];
							
							if (arrayAlternate == 'even') {
								
								if (areaNumber > areaGreatestX) {
									
									areaGreatestX = areaNumber;
									
									if (i === 0) {
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
						
						geo.origin.size.height = areaGreatestY - areaSmallestY;
						geo.origin.size.width = areaGreatestX - areaSmallestX;
						
						geo.origin.offset.top += areaSmallestY;
						geo.origin.windowOffset.top += areaSmallestY;
						
						geo.origin.offset.left += areaSmallestX;
						geo.origin.windowOffset.left += areaSmallestX;
						
						break;
					
					case 'default':
						
						// the image itself is the area, nothing more to do
						break;
				}
			}
			
			// the space that is available to display the tooltip, relatively
			// to the viewport and to the document
			geo.available = {
				window: {
					bottom: {
						height: geo.window.size.height - bcr.bottom,
						width: geo.window.size.width
					},
					left: {
						height: geo.window.size.height,
						width: bcr.left
					},
					right: {
						height: geo.window.size.height,
						width: geo.window.size.width - bcr.right
					},
					top: {
						height: bcr.top,
						width:  geo.window.size.width
					}
				},
				document: {
					bottom: {
						height: geo.document.size.height - geo.window.scroll.top - bcr.bottom,
						width: geo.document.size.width
					},
					left: {
						height: geo.document.size.height,
						width: bcr.left + geo.window.scroll.left
					},
					right: {
						height: geo.document.size.height,
						width: geo.document.size.width - geo.window.scroll.left - bcr.right
					},
					top: {
						height: bcr.top + geo.window.scroll.top,
						width: geo.document.size.width
					}
				}
			};
			
			while ($parent[0].tagName.toLowerCase() != 'html') {
				
				if ($parent.css('position') == 'fixed') {
					geo.origin.fixedLineage = true;
					break;
				}
				
				$parent = $parent.parent();
			}
			
			return geo;
		},
		
		_interval_cancel: function() {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		},
		
		_interval_set: function() {
			
			var self = this;
			
			self.checkInterval = setInterval(function() {
				
				// if the tooltip and/or its interval should be stopped
				if (
						// if the origin has been removed
						!bodyContains(self.$el)
						// if the tooltip has been closed
					||	self.Status == 'hidden'
						// if the tooltip has somehow been removed
					||	!bodyContains(self.namespace)
				) {
					// remove the tooltip if it's still here
					if (self.Status == 'shown' || self.Status == 'appearing') {
						self.close();
					}
					
					// clear this interval as it is no longer necessary
					self._interval_cancel();
				}
				// if everything is alright
				else {
					// compare the former and current positions of the origin to reposition
					// the tooltip if need be
					if (self.options.positionTracker) {
						
						var g = self._geometry(),
							identical = false;
						
						// compare size first (a change requires repositioning too)
						if (areEqual(g.origin.size, self.geometry.origin.size)) {
							
							// for elements that have a fixed lineage (see self::_geometry), we track the
							// top and left properties (relative to window)
							if (self.geometry.origin.fixedLineage) {
								if (areEqual(g.origin.windowOffset, self.geometry.origin.windowOffset)) {
									identical = true;
								}
							}
							// otherwise, track total offset (relative to document)
							else {
								if (areEqual(g.origin.offset, self.geometry.origin.offset)) {
									identical = true;
								}
							}
						}
						
						if (!identical) {
							self.reposition();
							self.options.positionTrackerCallback.call(self, self.$el[0]);
						}
					}
				}
			}, 200);
		},
		
		// this function will schedule the opening of the tooltip after the delay, if
		// there is one
		_open: function() {
			
			var self = this;
			
			if (self.Status != 'shown' && self.Status != 'appearing') {
				
				if (self.options.delay) {
					self.timerOpen = setTimeout(function() {
						
						// for hover trigger, we check if the mouse is still over the
						// origin, otherwise we do not open anything
						if (	self.options.trigger == 'click'
							||	(self.options.trigger == 'hover' && self.mouseIsOverOrigin)
						) {
							self._openNow();
						}
					}, self.options.delay);
				}
				else self._openNow();
			}
		},
		
		// this function will open the tooltip right away
		_openNow: function(callback) {
			
			var self = this;
			
			// check that the origin is still in the DOM
			if (bodyContains(self.$el)) {
				
				// call our constructor custom function before continuing
				if (!self.options.functionBefore || self.options.functionBefore.call(self, self.$el[0]) !== false) {
					
					// continue only if the tooltip is enabled and has any content
					if (self.enabled && self.Content !== null) {
						
						// init the display plugin if it has not been initiated yet
						if (!this.displayPlugin) {
							
							var pluginClass = $.tooltipster.displayPlugin[self.options.displayPlugin];
							
							if (pluginClass) {
								this.displayPlugin = new pluginClass(self, self.options);
							}
							else {
								throw new Error('The "' + self.options.displayPlugin + '" plugin is not defined');
							}
						}
						
						// save the method callback and cancel close method callbacks
						if (callback) {
							self.callbacks.open.push(callback);
						}
						self.callbacks.close = [];
						
						//get rid of any appearance timer
						clearTimeout(self.timerOpen);
						self.timerOpen = null;
						clearTimeout(self.timerClose);
						self.timerClose = null;
						
						// if we only want one tooltip open at a time, close all auto-closing
						// tooltips currently open and not already disappearing
						if (self.options.onlyOne) {
							
							$('.tooltipstered').not(self.$el).each(function(i,el) {
								
								var $el = $(el),
									nss = $el.data('tooltipster-ns');
								
								// iterate on all tooltips of the element
								$.each(nss, function(i, ns) {
									
									var instance = $el.data(ns),
										// we have to use the public methods here
										s = instance.status(),
										ac = instance.option('autoClose');
									
									if (s !== 'hidden' && s !== 'disappearing' && ac) {
										instance.close();
									}
								});
							});
						}
						
						var extraTime,
							finish = function() {
								self.Status = 'shown';
								
								// trigger any open method custom callbacks and reset them
								$.each(self.callbacks.open, function(i,c) { c.call(self, self.$el[0]); });
								self.callbacks.open = [];
							};
						
						// if this origin already has its tooltip open
						if (self.Status !== 'hidden') {
							
							// the timer (if any) will start (or restart) right now
							extraTime = 0;
							
							// if it was disappearing, cancel that
							if (self.Status === 'disappearing') {
								
								self.Status = 'appearing';
								
								if (supportsTransitions()) {
									
									self.$tooltip
										.clearQueue()
										.removeClass('tooltipster-dying')
										.addClass('tooltipster-show');
									
									if (self.options.speed > 0) {
										self.$tooltip.delay(self.options.speed);
									}
									
									self.$tooltip.queue(finish);
								}
								else {
									// in case the tooltip was currently fading out, bring it back
									// to life
									self.$tooltip
										.stop()
										.fadeIn(finish);
								}
							}
							// if the tooltip is already open, we still need to trigger the method
							// custom callback
							else if (self.Status === 'shown') {
								finish();
							}
						}
						// if the tooltip isn't already open, open that sucker up!
						else {
							
							self.Status = 'appearing';
							
							// the timer (if any) will start when the tooltip has fully appeared
							// after its transition
							extraTime = self.options.speed;
							
							// build the base of our tooltip
							self.$tooltip = self.displayPlugin.build();
							
							// this will be useful to know quickly if the tooltip is in
							// the DOM or not 
							self.$tooltip.attr('id', self.namespace);
							
							for (var i=0; i < self.options.theme.length; i++) {
								self.$tooltip.addClass(self.options.theme[i]);
							}
							
							self.$tooltip
								.css({
									// must not overflow the window until the positioning method
									// is called
									height: 0,
									width: 0,
									zIndex: self.options.zIndex,
									'-moz-animation-duration': self.options.speed + 'ms',
									'-ms-animation-duration': self.options.speed + 'ms',
									'-o-animation-duration': self.options.speed + 'ms',
									'-webkit-animation-duration': self.options.speed + 'ms',
									'animation-duration': self.options.speed + 'ms',
									'transition-duration': self.options.speed + 'ms'
								});
							
							if (self.options.interactive) {
								self.$tooltip.css('pointer-events', 'auto')
							}
							
							// insert the content
							self._content_insert();
							
							// determine the future parent
							if (typeof self.options.parent == 'string') {
								if (self.$tooltipParent == 'offsetParent') {
									self.$tooltipParent = self.$el.offsetParent();
								}
								else {
									self.$tooltipParent = $(self.options.parent);
								}
							}
							else {
								self.$tooltipParent = self.options.parent;
							}
							
							// reposition the tooltip and attach to the DOM
							self.reposition(true);
							
							// animate in the tooltip
							if (supportsTransitions()) {
								
								self.$tooltip
									.addClass('tooltipster-' + self.options.animation)
									.addClass('tooltipster-initial');
									
								setTimeout(
									function() {
										
										self.$tooltip
											.addClass('tooltipster-show')
											.removeClass('tooltipster-initial');
										
										if (self.options.speed > 0) {
											self.$tooltip.delay(self.options.speed);
										}
										
										self.$tooltip.queue(finish);
									},
									0
								);
							}
							else {
								self.$tooltip
									.css('display', 'none')
									.fadeIn(self.options.speed, finish);
							}
							
							// call our custom callback since the content of the tooltip is now
							// part of the DOM
							if (self.options.functionReady) {
								self.options.functionReady.call(self, self.$el[0]);
							}
							
							// will check if our tooltip origin is removed while the tooltip is
							// shown
							self._interval_set();
							
							$(window)
								// reposition on resize (in case position can/has to be changed)
								.on('resize.'+ self.namespace, function() {
									self.reposition();
								})
								// same as below for parents
								.on('scroll.'+ self.namespace, function(e) {
									self._scrollHandler(e);
								});
							
							self.$originParents = self.$el.parents();
							
							// scrolling may require the tooltip to be moved or even
							// repositioned in some cases
							self.$originParents.each(function(i, el){
								
								$(el).on('scroll.'+ self.namespace, function(e) {
									self._scrollHandler(e);
								});
							});
							
							
							// autoClose bindings
							if (self.options.autoClose) {
								
								// in case a listener is already bound for autoclosing (mouse or
								// touch, hover or click), unbind it first
								$('body').off('.'+ self.namespace +'-autoClose');
								
								// here we'll have to set different sets of bindings for both touch
								// and mouse
								if (self.options.trigger == 'hover') {
									
									// if the user touches the body, close
									if (deviceHasTouchCapability) {
										
										// timeout 0 : to prevent immediate closing if the method was called
										// on a click event and if options.delay == 0 (because of bubbling)
										setTimeout(function() {
											
											// we don't want to bind on click here because the
											// initial touchstart event has not yet triggered its
											// click event, which is thus about to happen
											$('body').on('touchstart.'+ self.namespace +'-autoClose', function(event) {
												
												// if the tooltip is not interactive or if the click was made
												// outside of the tooltip
												if (!self.options.interactive || !$.contains(self.$tooltip[0], event.target)) {
													self.close();
												}
											});
										}, 0);
									}
									
									// if we have to allow interaction
									if (self.options.interactive) {
										
										// as for mouse interaction, we get rid of the tooltip only
										// after the mouse has spent some time out of it
										var tolerance = null;
										
										self.$el.add(self.$tooltip)
											// close after some time out of the origin and the tooltip
											.on('mouseleave.'+ self.namespace +'-autoClose', function() {
												
												clearTimeout(tolerance);
												
												tolerance = setTimeout(function() {
													self.close();
												}, self.options.interactiveTolerance);
											})
											// suspend timeout when the mouse is over the origin or
											// the tooltip
											.on('mouseenter.'+ self.namespace + '-autoClose', function() {
												clearTimeout(tolerance);
											});
									}
									// if this is a non-interactive tooltip, get rid of it if the mouse leaves
									else {
										self.$el.on('mouseleave.'+ self.namespace + '-autoClose', function() {
											self.close();
										});
									}
									
									// close the tooltip when the origin gets a click (common behavior of
									// native tooltips)
									if (self.options.closeOnClick) {
										
										self.$el.on('click.'+ self.namespace + '-autoClose', function() {
											self.close();
										});
									}
								}
								// here we'll set the same bindings for both clicks and touch on the body
								// to close the tooltip
								else if (self.options.trigger == 'click') {
									
									// explanations : same as above
									setTimeout(function() {
										$('body').on('click.'+ self.namespace +'-autoClose touchstart.'+ self.namespace +'-autoClose', function(event) {
											if (!self.options.interactive || !$.contains(self.$tooltip[0], event.target)) {
												self.close();
											}
										});
									}, 0);
								}
							}
						}
						
						// if we have a timer set, let the countdown begin
						if (self.options.timer > 0) {
							
							self.timerClose = setTimeout(function() {
								self.timerClose = null;
								self.close();
							}, self.options.timer + extraTime);
						}
					}
				}
			}
		},
		
		/**
		 * A function that may adjust the left/top offset of the tooltip when a scroll
		 * event is caught but that it should not trigger a complete repositioning.
		 */
		_scrollFixer: function() {
			
			var self = this,
				g = self._geometry(),
				offsetLeft = g.origin.windowOffset.left - self.geometry.origin.windowOffset.left,
				offsetTop = g.origin.windowOffset.top - self.geometry.origin.windowOffset.top;
			
			// add the offset to the position initially computed by the display plugin
			self.$tooltip.css({
				left: self.tooltipPosition.left + offsetLeft,
				top: self.tooltipPosition.top + offsetTop
			});
		},
		
		/**
		 * Handles the scroll on any of the parents of the origin (when the
		 * tooltip is open)
		 * 
		 * @param {object} event
		 */
		_scrollHandler: function(event) {
			
			var self = this;
			
			// if the scroll happened on the window
			if (event.target === document.body) {
				
				// if the origin has a fixed lineage, window scroll will have no
				// effect on its position nor on the position of the tooltip
				if (!self.geometry.origin.fixedLineage) {
					
					// we don't need to do anything unless repositionOnScroll is true
					// because the tooltip will already have moved with the window
					// (and of course with the origin)
					if (self.options.repositionOnScroll) {
						self.reposition();
					}
				}
				
			}
			// if the scroll happened on another parent of the tooltip, it means
			// that it's in a scrollable area and now needs to have its position
			// adjusted or recomputed, depending ont the repositionOnScroll
			// option
			else {
				
				if (self.options.repositionOnScroll) {
					self.reposition();
				}
				else {
					self._scrollFixer();
				}
			}
		},
		
		/**
		 * Check if a tooltip can fit in the provided dimensions when we restrain its width.
		 * The idea is to see if the new height is small enough and if the content does not
		 * overflow horizontally.
		 * This method does not reset the position values to what they were when the
		 * test is over, do it yourself if need be.
		 * 
		 * @param {int} width
		 * @param {int} height
		 * @return {object} An object with `height` and `width` properties. Either of these
		 * will be true if the content overflows in that dimension, false if it fits.
		 */
		_sizerConstrained: function(width, height) {
			
			this.$tooltip.css({
				left: 0,
				top: 0,
				width: width
			});
			
			this._forceRedraw();
			
			var $content = this.$tooltip.find('.tooltipster-content'),
				newHeight = this.$tooltip.outerHeight(),
				fits = {
					height: newHeight <= height,
					width: (
						// this condition accounts for a min-width property that could apply
					this.$tooltip[0].offsetWidth <= width
					&&	$content[0].offsetWidth >= $content[0].scrollWidth
					)
				};
			
			return {
				fits: fits.height && fits.width,
				size: {
					height: newHeight,
					width: $content[0].offsetWidth
				}
			};
		},
		
		/**
		 * Append the tooltip to its parent after the size tests are over and get rid
		 * of the test container.
		 */
		_sizerEnd: function() {
			
			var $sizer = this.$tooltip.parent();
			
			this.$tooltip
				.appendTo(this.$tooltipParent)
				.find('.tooltipster-content')
					.css('overflow', '');
			
			$sizer.remove();
		},
		
		/**
		 * Get the size of a tooltip when we do not set any specific height or width.
		 * This method does not reset the position values to what they were when the
		 * test is over, do it yourself if need be.
		 */
		_sizerNatural: function() {
			
			// reset to natural size
			this.$tooltip.css({
				height: '',
				left: 0,
				top: 0,
				width: ''
			});
			
			this._forceRedraw();
			
			// note : the tooltip must not have margins, it would screw things up
			return {
				height: this.$tooltip.outerHeight(),
				// an unknown bug in Chrome and FF forces us to count 1 more pixel, otherwise
				// the text can be broken to a new line after being appended back to the parent
				// (whereas it's just fine at the time of this test)
				width: this.$tooltip.outerWidth() + 1
			};
		},
		
		/**
		 * Move the tooltip into an invisible div that does not allow overflow to make
		 * size tests. Note : the tooltip may or may not be attached to the DOM at the
		 * moment this method is called, it does not matter.
		 */
		_sizerStart: function() {
			
			$('<div class="tooltipster-sizer"></div>')
				.append(this.$tooltip)
				.appendTo('body');
			
			// overflow must be auto during the test
			this.$tooltip.find('.tooltipster-content')
				.css('overflow', 'auto');
		},
		
		_update: function(content) {
			
			var self = this;
			
			// change the content
			self._content_set(content);
			
			if (self.Content !== null) {
				
				// update the tooltip if it is open
				if (self.Status !== 'hidden') {
					
					// reset the content in the tooltip
					self._content_insert();
					
					// reposition and resize the tooltip
					self.reposition();
					
					// if we want to play a little animation showing the content changed
					if (self.options.updateAnimation) {
						
						if (supportsTransitions()) {
							
							self.$tooltip
								.css({
									'width': '',
									'-webkit-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
									'-moz-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
									'-o-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
									'-ms-transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms',
									'transition': 'all ' + self.options.speed + 'ms, width 0ms, height 0ms, left 0ms, top 0ms'
								})
								.addClass('tooltipster-content-changing');
							
							// reset the CSS transitions and finish the change animation
							setTimeout(function() {
								
								if (self.Status != 'hidden') {
									
									self.$tooltip.removeClass('tooltipster-content-changing');
									
									// after the changing animation has completed, reset the
									// CSS transitions
									setTimeout(function() {
										
										if (self.Status !== 'hidden') {
											self.$tooltip.css({
												'-webkit-transition': self.options.speed + 'ms',
												'-moz-transition': self.options.speed + 'ms',
												'-o-transition': self.options.speed + 'ms',
												'-ms-transition': self.options.speed + 'ms',
												'transition': self.options.speed + 'ms'
											});
										}
									}, self.options.speed);
								}
							}, self.options.speed);
						}
						else {
							self.$tooltip.fadeTo(self.options.speed, 0.5, function() {
								if (self.Status != 'hidden') {
									self.$tooltip.fadeTo(self.options.speed, 1);
								}
							});
						}
					}
				}
			}
			else {
				self.close();
			}
		},
		
		close: function(callback) {
			
			var self = this;
			
			// save the method custom callback and cancel any open method custom callbacks
			if (callback) self.callbacks.close.push(callback);
			self.callbacks.open = [];
			
			// get rid of any appearance timeout
			clearTimeout(self.timerOpen);
			self.timerOpen = null;
			clearTimeout(self.timerClose);
			self.timerClose = null;
			
			var finishCallbacks = function() {
				// trigger any close method custom callbacks and reset them
				$.each(self.callbacks.close, function(i,c) { c.call(self, self.$el[0]); });
				self.callbacks.close = [];
			};
			
			// close
			if (self.Status == 'shown' || self.Status == 'appearing') {
				
				self.Status = 'disappearing';
				
				var finish = function() {
					
					self.Status = 'hidden';
					
					// detach our content object first, so the next jQuery's remove()
					// call does not unbind its event handlers
					if (typeof self.Content == 'object' && self.Content !== null) {
						self.Content.detach();
					}
					
					self.$tooltip.remove();
					self.$tooltip = null;
					
					// unbind orientationchange, scroll and resize listeners
					$(window).off('.'+ self.namespace);
					
					// unbind scroll listeners
					self.$originParents.each(function(i, el){
						$(el).off('scroll.'+ self.namespace);
					});
					// clear the array to prevent memory leaks
					self.$originParents = null;
					
					// unbind any auto-closing click/touch listeners
					$('body').off('.'+ self.namespace +'-autoClose');
					
					// unbind any auto-closing hover listeners
					self.$el.off('.'+ self.namespace +'-autoClose');
					
					// call our constructor custom callback function
					if (self.options.functionAfter) {
						self.options.functionAfter.call(self, self.$el[0]);
					}
					
					// call our method custom callbacks functions
					finishCallbacks();
				};
				
				if (supportsTransitions()) {
					
					self.$tooltip
						.clearQueue()
						.removeClass('tooltipster-show')
						// for transitions only
						.addClass('tooltipster-dying');
					
					if (self.options.speed > 0) self.$tooltip.delay(self.options.speed);
					
					self.$tooltip.queue(finish);
				}
				else {
					self.$tooltip
						.stop()
						.fadeOut(self.options.speed, finish);
				}
			}
			// if the tooltip is already hidden, we still need to trigger
			// the method custom callback
			else if (self.Status == 'hidden') {
				finishCallbacks();
			}
			
			return self;
		},
		
		content: function(c) {
			// getter method
			if (c === undefined) {
				return this.Content;
			}
			// setter method
			else {
				this._update(c);
				return this;
			}
		},
		
		destroy: function() {
			
			var self = this;
			
			self.close();
			
			self.$el
				.removeData(self.namespace)
				.off('.'+ self.namespace);
			
			var ns = self.$el.data('tooltipster-ns');
			
			// if the origin has been removed from DOM, we can't get its data
			// and there is nothing to clean up
			if (ns) {
				
				// if there are no more tooltips on this element
				if (ns.length === 1) {
					
					// optional restoration of a title attribute
					var title = null;
					if (self.options.restoration === 'previous') {
						title = self.$el.data('tooltipster-initialTitle');
					}
					else if (self.options.restoration === 'current') {
						
						// old school technique to stringify when outerHTML is not supported
						title =
							(typeof self.Content === 'string') ?
							self.Content :
							$('<div></div>').append(self.Content).html();
					}
					
					if (title) {
						self.$el.attr('title', title);
					}
					
					// final cleaning
					self.$el
						.removeClass('tooltipstered')
						.removeData('tooltipster-ns')
						.removeData('tooltipster-initialTitle');
				}
				else {
					// remove the instance namespace from the list of namespaces of
					// tooltips present on the element
					ns = $.grep(ns, function(el, i) {
						return el !== self.namespace;
					});
					self.$el.data('tooltipster-ns', ns);
				}
			}
			
			// make sure the object is no longer referenced in there to prevent
			// memory leaks
			instancesLatest = $.grep(instancesLatest, function(el, i) {
				return self !== el;
			});
			
			return self;
		},
		
		disable: function() {
			// close first, in case the tooltip would not disappear on
			// its own (autoClose false)
			this.close();
			this.enabled = false;
			return this;
		},
		
		elementOrigin: function() {
			return this.$el[0];
		},
		
		elementTooltip: function() {
			return this.$tooltip ? this.$tooltip[0] : undefined;
		},
		
		enable: function() {
			this.enabled = true;
			return this;
		},
		
		/**
		 * Alias, deprecated in 4.0.0
		 * 
		 * @param callback
		 */
		hide: function(callback) {
			return this.close(callback);
		},
		
		instance: function() {
			return this;
		},
		
		/**
		 * The public open() method is actually an alias for the private _openNow() method
		 * 
		 * @see self::_openNow
		 */
		open: function(callback) {
			this._openNow(callback);
			return this;
		},
		
		/**
		 * Get or set options. For internal use and advanced users only.
		 * 
		 * @param {string} o Option name
		 * @param {mixed} val optional A new value for the option
		 * @return {mixed} If val is omitted, the value of the option is returned, otherwise
		 * the instance itself is returned
		 */ 
		option: function(o, val) {
			if (val === undefined) return this.options[o];
			else {
				this.options[o] = val;
				return this;
			}
		},
		
		/**
		 * This method is in charge of setting the position and size properties of the tooltip.
		 * All the hard work is delegated to the display plugin.
		 * Note: The tooltip may be detached from the DOM at the moment the method is called 
		 * but must be attached by the end of the method call.
		 * 
		 * @param {boolean} tooltipIsDetached For internal use only. Set this to true if you
		 * know that the tooltip not being in the DOM is not an issue (typically when the
		 * tooltip element has just been created but has not been added to the DOM yet).
		 */
		reposition: function(tooltipIsDetached) {
			
			var self = this;
			
			// if the tooltip has not been removed from DOM manually (or if it
			// has been detached on purpose)
			if (tooltipIsDetached || bodyContains(self.namespace)) {
				
				if (!tooltipIsDetached) {
					// detach in case the tooltip overflows the window and adds scrollbars
					// to it, so _geometry can be accurate
					self.$tooltip.detach();
				}
				
				// refresh the geometry object before passing it as a helper
				self.geometry = self._geometry();
				
				// call the display plugin
				self.displayPlugin.reposition({
					geo: self.geometry
				});
				
				// remember the position for later offset adjustment
				self.tooltipPosition = {
					left: parseInt(self.$tooltip.css('left')),
					top: parseInt(self.$tooltip.css('top'))
				};
			}
			
			return self;
		},
		
		/**
		 * Alias, deprecated in 4.0.0
		 *
		 * @param callback
		 */
		show: function(callback) {
			return this.open(callback);
		},
		
		/**
		 * Public method but reserved to internal use
		 * @return {string} The status of the tooltip: shown, hidden, etc.
		 */
		status: function() {
			return this.Status;
		}
	};
	
	$.fn.tooltipster = function() {
		
		// for using in closures
		var args = arguments,
			// common mistake : an HTML element can't be in several tooltips at the same time
			contentCloningWarning = 'You are using a single HTML element as content for several tooltips. You probably want to set the contentCloning option to TRUE.';
		
		// if we are not in the context of jQuery wrapped HTML element(s) :
		// this happens when calling static methods in the form $.fn.tooltipster('methodName')
		// or when calling $(sel).tooltipster('methodName or options') where $(sel) does
		// not match anything
		if (this.length === 0) {
			
			// if the first argument is a method name
			if (typeof args[0] === 'string') {
				
				var methodIsStatic = true,
					ret;
				
				// list static methods here, usable by calling $.fn.tooltipster('methodName')
				switch (args[0]) {
					
					case 'origins':
						
						ret = $('.tooltipstered').toArray();
						
						break;
					
					// return instances of all tooltips in the page or an a given element
					case 'instances':
						
						ret = [];
						
						var selector = args[1] || '.tooltipstered';
						
						$(selector).each(function(i) {
								
							var ns = $(this).data('tooltipster-ns');
							
							if (ns) {
								
								$.each(ns, function(i, namespace) {
									ret.push($el.data(namespace));
								})
							}
						});
						
						break;
					
					// return an array that contains the last Tooltipster objects
					// generated by the last initializing call
					case 'instancesLatest':
						
						ret = instancesLatest;
						
						break;
					
					// change default options for all future instances
					case 'setDefaults':
						
						$.extend(defaults, args[1]);
						
						ret = true;
						
						break;
					
					default:
						
						methodIsStatic = false;
						
						break;
				}
				
				// $.fn.tooltipster('methodName') calls will return true
				if (methodIsStatic) return ret;
				// $(sel).tooltipster('methodName') calls will return the collection
				// of objects event though it's empty because chaining is sometimes
				// expected when working on empty collections.
				else return this;
			}
			// the first argument is undefined or an object of options : we are
			// initializing but there are no elements matched by selector
			else {
				// still chainable : same as above
				return this;
			}
		}
		// this happens when calling $(sel).tooltipster('methodName or options')
		// where $(sel) matches one or more elements
		else {
			
			// method calls
			if (typeof args[0] === 'string') {
				
				var v = '#*$~&';
				
				this.each(function() {
					
					// retrieve the namepaces of the tooltip(s) that exist on that element.
					// We will interact with the first tooltip only.
					var ns = $(this).data('tooltipster-ns'),
						// self represents the instance of the first tooltipster plugin
						// associated to the current HTML object of the loop
						self = ns ? $(this).data(ns[0]) : null;
					
					// if the current element holds a tooltipster instance
					if (self) {
						
						if (typeof self[args[0]] === 'function') {
							
							if (	this.length > 1
								&&	args[0] == 'content'
								&&	typeof args[1] == 'object'
								&&	args[1] !== null
								&&	!self.options.contentCloning
								&&	debug
							) {
								console.log(contentCloningWarning);
							}
							
							// note : args[1] and args[2] may not be defined
							var resp = self[args[0]](args[1], args[2]);
						}
						else {
							throw new Error('Unknown method .tooltipster("' + args[0] + '")');
						}
						
						// if the function returned anything other than the instance
						// itself (which implies chaining, except for the `instance` method)
						if (resp !== self || args[0] === 'instance') {
							
							v = resp;
							
							// return false to stop .each iteration on the first element
							// matched by the selector
							return false;
						}
					}
					else {
						throw new Error('You called Tooltipster\'s "' + args[0] + '" method on an uninitialized element');
					}
				});
				
				return (v !== '#*$~&') ? v : this;
			}
			// first argument is undefined or an object : the tooltip is initializing
			else {
				
				// reset the array of last initialized objects
				instancesLatest = [];
				
				// is there a defined value for the multiple option in the options object ?
				var	multipleIsSet = args[0] && args[0].multiple !== undefined,
					// if the multiple option is set to true, or if it's not defined but
					// set to true in the defaults
					multiple = (multipleIsSet && args[0].multiple) || (!multipleIsSet && defaults.multiple),
					// same for content
					contentIsSet = args[0] && args[0].content !== undefined,
					content = (contentIsSet && args[0].content) || (!contentIsSet && defaults.content),
					// same for contentCloning
					contentCloningIsSet = args[0] && args[0].contentCloning !== undefined,
					contentCloning =
							(contentCloningIsSet && args[0].contentCloning)
						||	(!contentCloningIsSet && defaults.contentCloning),
					// same for debug
					debugIsSet = args[0] && args[0].debug !== undefined,
					debug = (debugIsSet && args[0].debug) || (!debugIsSet && defaults.debug);
				
				if (	this.length > 1
					&&	typeof content == 'object'
					&&	content !== null
					&&	!contentCloning
					&&	debug
				) {
					console.log(contentCloningWarning);
				}
				
				// create a tooltipster instance for each element if it doesn't
				// already have one or if the multiple option is set, and attach the
				// object to it
				this.each(function() {
					
					var go = false,
						$this = $(this),
						ns = $this.data('tooltipster-ns'),
						obj = null;
					
					if (!ns) {
						go = true;
					}
					else if (multiple) {
						go = true;
					}
					else if (debug) {
						console.log('Tooltipster: one or more tooltips are already attached to the element below. Ignoring.');
						console.log(this);
					}
					
					if (go) {
						obj = new $.tooltipster(this, args[0]);
						
						// save the reference of the new instance
						if (!ns) ns = [];
						ns.push(obj.namespace);
						$this.data('tooltipster-ns', ns);
						
						// save the instance itself
						$this.data(obj.namespace, obj);
						
						// call our constructor custom function
						if (obj.options.functionInit) {
							obj.options.functionInit.call(obj, this);
						}
					}
					
					instancesLatest.push(obj);
				});
				
				return this;
			}
		}
	};
	
	// will collect plugins
	$.tooltipster.displayPlugin = {};
	
	// quick & dirty compare function, not bijective nor multidimensional
	function areEqual(a,b) {
		var same = true;
		$.each(a, function(i, _) {
			if (b[i] === undefined || a[i] !== b[i]) {
				same = false;
				return false;
			}
		});
		return same;
	}
	
	// we'll assume the device has no mouse until we detect any mouse movement
	var deviceHasMouse = false;
	$('body').one('mousemove', function() {
		deviceHasMouse = true;
	});
	
	// detect if this device can trigger touch events
	var deviceHasTouchCapability = !!('ontouchstart' in window);
	
	function deviceIsPureTouch() {
		return (!deviceHasMouse && deviceHasTouchCapability);
	}
	
	// detecting support for CSS transitions
	function supportsTransitions() {
		var b = document.body || document.documentElement,
			s = b.style,
			p = 'transition',
			v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'];
		
		if (typeof s[p] == 'string') { return true; }
		
		p = p.charAt(0).toUpperCase() + p.substr(1);
		for (var i=0; i<v.length; i++) {
			if (typeof s[v[i] + p] == 'string') { return true; }
		}
		return false;
	}
	
	/**
	 * A fast function to check if an element is still in the DOM. It
	 * tries to use an id as ids are indexed by the browser, or falls
	 * back to jQuery's `contains` method.
	 * 
	 * @param {string|object} ref An id or a jQuery-wrapped HTML element
	 * @return {boolean}
 	 */
	function bodyContains(ref) {
		
		var id = (typeof ref === 'string') ? ref : ref.attr('id');
		
		return id ? !!document.getElementById(id) : $.contains(document.body, ref[0]);
	}
})(jQuery);


/**
 * The default display plugin
 */
(function($) {
	
	var pluginName = 'default',
		/** 
		 * @param {object} tooltipster The tooltipster instance that instantiated this plugin
		 * @param {object} options Options, @see self::defaults()
		 */
		plugin = function(tooltipster, options) {
			
			// list of instance variables
			
			this.options = $.extend(true, this.defaults(), options);
			this.tooltipster = tooltipster;
			
			// disable the arrow in IE6 unless the arrow option was explicitly set to true
			var $d = $('<i><!--[if IE 6]><i></i><![endif]--></i>');
			if (	$d.children().length > 0
				&&	options.arrow !== true
			) {
				this.options.arrow = false;
			}
			
			// initialize
			this.init(tooltipster, options);
		};
	
	plugin.prototype = {
		
		/**
		 * Defaults are provided as a function for an easy override by inheritance
		 * 
		 * @return {object} An object with the defaults options
		 */
		defaults: function() {
			
			return {
				// if the tooltip should display an arrow that points to the origin
				arrow: true,
				// the distance in pixels between the tooltip and the origin
				distance: 6,
				// allows to easily change the position of the tooltip
				functionPosition: null,
				maxWidth: null,
				minWidth: 0,
				position: ['top', 'bottom', 'right', 'left']
				/*
				// TODO: these rules let the user choose what to do when the tooltip content
				// overflows. Right now the order of fallbacks is fixed :
				// - we're looking for a spot where the natural size of the tooltip can fit
				//   ('window.switch')
				// - if can't find one, we check if setting a constrained width on the
				//   tooltip could solve the problem without having the content overflowing
				//   ('window.constrain')
				// - if it does not work, we let the tooltip overflow the window in its
				//   natural size, in the limits of the document ('document.switch')
				// - if it does not work, we see if a constrained width could make the
				//   tooltip fit in the document without its content overflowing
				//   ('document.constrain')
				// - and if that can't be done, we just let the tooltip in the preferred
				//   position with a natural size, overflowing the document
				//   ('document.overflow')
				positioningRules: [
					'window.switch',
					// or try to see if the tooltip could be displayed somewhere with a
					// constrained width without its content overflowing
					'window.constrain',
					// TODO : window.scroll should be a possible rule, rather than fall
					// back to overflowing in the rest of the document. The content would
					// have horizontal and/or vertical scrollbars but the tooltip would not
					// overflow the window. It would require to set a max-height on the
					// content div, etc.
					//'window.scroll',
					'document.switch',
					'document.constrain',
					// TODO - similar to 'window.scroll'
					//'document.scroll'
					'document.overflow'
				]
				*/
			};
		},
		
		/**
		 * Run once: at instantiation of the display plugin (when the tooltip is shown for
		 * the first time).
		 */
		init: function() {
			
			var defaults = this.defaults();
			
			// option formatting
			
			// format position as a four-cell array if it ain't one yet and then make it
			// an object with top/bottom/left/right properties
			if (typeof this.options.distance != 'object') {
				this.options.distance = [this.options.distance];
			}
			if (this.options.distance[1] === undefined) this.options.distance[1] = this.options.distance[0];
			if (this.options.distance[2] === undefined) this.options.distance[2] = this.options.distance[0];
			if (this.options.distance[3] === undefined) this.options.distance[3] = this.options.distance[1];
			this.options.distance = {
				top: this.options.distance[0],
				right: this.options.distance[1],
				bottom: this.options.distance[2],
				left: this.options.distance[3]
			};
			
			// let's transform 'top' into ['top', 'bottom', 'right', 'left'] (for example)
			if (typeof this.options.position == 'string') {
				this.options.position = [this.options.position];
				for (var i=0; i<4; i++) {
					if (this.options.position[0] != defaults.position[i]) {
						this.options.position.push(defaults.position[i]);
					}
				}
			}
		},
		
		/**
		 * Contains the HTML markup of the tooltip.
		 *
		 * @return {object} The tooltip, as a jQuery-wrapped HTML element
		 */
		build: function() {
			
			// note: we wrap with a .tooltipster-box div to be able to set a margin on it
			// (.tooltipster-base must not have one)
			var $html = $(
				'<div class="tooltipster-base">' +
					'<div class="tooltipster-box">' +
						'<div class="tooltipster-content"></div>' +
					'</div>' +
					'<div class="tooltipster-arrow">' +
						'<div class="tooltipster-arrow-uncropped">' +
							'<div class="tooltipster-arrow-border"></div>' +
							'<div class="tooltipster-arrow-background"></div>' +
						'</div>' +
					'</div>' +
				'</div>'
			);
			
			// hide arrow if asked
			if (!this.options.arrow) {
				$html
					.find('.tooltipster-box')
						.css('margin', 0)
						.end()
					.find('.tooltipster-arrow')
						.hide();
			}
			
			// apply min/max width if asked
			if (this.options.minWidth) {
				$html.css('min-width', this.options.minWidth + 'px');
			}
			if (this.options.maxWidth) {
				$html.css('max-width', this.options.maxWidth + 'px');
			}
			
			return $html;
		},
		
		/**
		 * Get or set options. Provided for advanced users.
		 * 
		 * @param {string} o Option name
		 * @param {mixed} val optional A new value for the option
		 * @return {mixed} If val is omitted, the value of the option is returned, otherwise
		 * the instance itself is returned
		 */
		option: function(o, val) {
			if (val === undefined) return this.options[o];
			else {
				this.options[o] = val;
				return this;
			}
		},
		
		/**
		 * Make whatever modifications are needed when the position is changed. This has
		 * been made an independant method for easy inheritance in custom plugins based
		 * on this default plugin.
		 */
		position_change: function(position) {
			
			this.tooltipster.$tooltip
				.removeClass('tooltipster-bottom')
				.removeClass('tooltipster-left')
				.removeClass('tooltipster-right')
				.removeClass('tooltipster-top')
				.addClass('tooltipster-' + position);
		},
		
		/**
		 * This method must compute and set the positioning properties of the tooltip
		 * (might be left, top, width, height, etc.). It must also make sure the
		 * tooltip is eventually appended to its parent (since the element may be
		 * detached from the DOM at the moment the method is called).
		 * 
		 * @param {object} helper An object that contains variables that plugin
		 * creators may find useful (see below)
		 * @param {object} helper.geo An object with many properties (size, positioning)
		 * about objects of interest (window, document, origin). This should help plugin
		 * users compute the optimal position of the tooltip
		 * @param {object} helper.tooltipster The Tooltipster instance which calls this
		 * method. Plugin creators will at least have to use tooltipster.$tooltip and
		 * tooltipster.$tooltipParent. Also, some of its methods may help plugin creators,
		 * especially its _sizer internal methods that help measure the size of the
		 * tooltip in various conditions.
		 */
		reposition: function(helper) {
			
			var self = this,
				finalResult,
				testResults = {
					document: {},
					window: {}
				};
			
			// start position tests session
			self.tooltipster._sizerStart();
			
			// find which position can contain the tooltip without overflow.
			// We'll compute things relatively to window, then document if need be.
			$.each(['window', 'document'], function(i, container) {
				
				var fits,
					constrainedFits = false,
					distance,
					naturalSize,
					outerNaturalSize,
					pos,
					sizerResult;
				
				for (var i=0; i < self.options.position.length; i++) {
					
					distance = {
						horizontal: 0,
						vertical: 0
					};
					pos = self.options.position[i];
					
					// this may have an effect on the size of the tooltip if there are css
					// rules for the arrow or something else
					self.position_change(pos);
					
					// now we get the size of the tooltip when it does not have any size
					// constraints set
					naturalSize = self.tooltipster._sizerNatural();
					
					if (pos == 'top' || pos == 'bottom') {
						distance.vertical = self.options.distance[pos];
					}
					else {
						distance.horizontal = self.options.distance[pos];
					}
					
					outerNaturalSize = {
						height: naturalSize.height + distance.vertical,
						width: naturalSize.width + distance.horizontal
					};
					
					testResults[container][pos] = {};
					
					// if the tooltip can fit without any adjustment
					fits = false;
					
					if (	helper.geo.available[container][pos].width >= outerNaturalSize.width
						&&	helper.geo.available[container][pos].height >= outerNaturalSize.height
					) {
						fits = true;
					}
					
					testResults[container][pos].natural = {
						fits: fits,
						distance: distance,
						outerSize: outerNaturalSize,
						position: pos,
						size: naturalSize,
						sizeMode: 'natural'
					};
					
					if (fits) {
						
						// we don't need to compute more positions, a natural one is fine
						return false;
					}
					else {
						
						// let's try to use size constraints to fit
						sizerResult = self.tooltipster._sizerConstrained(
							helper.geo.available[container][pos].width - distance.horizontal,
							helper.geo.available[container][pos].height - distance.vertical
						);
						
						testResults[container][pos].constrained = {
							fits: sizerResult.fits,
							distance: distance,
							outerSize: {
								height: sizerResult.size.height + distance.vertical,
								width: sizerResult.size.width + distance.horizontal
							},
							position: pos,
							size: sizerResult.size,
							sizeMode: 'constrained'
						};
						
						if (sizerResult.fits) {
							constrainedFits = true;
						}
					}
				}
				
				// if a constrained size fits, don't run tests against the document
				if (constrainedFits) {
					return false;
				}
			});
			
			
			// Based on test, pick the position we'll use.
			// TODO : let the user choose the order of the positioning rules
			$.each(['window', 'document'], function(i, container) {
				for (var i=0; i < self.options.position.length; i++) {
					
					var pos = self.options.position[i];
					
					$.each(['natural', 'constrained'], function(i, mode) {
						
						if (	testResults[container][pos][mode]
							&&	testResults[container][pos][mode].fits
						) {
							finalResult = testResults[container][pos][mode];
							return false;
						}
					});
					
					if (finalResult) {
						return false;
					}
				}
			});
			// if everything failed, this falls back on the preferred position but the
			// tooltip will overflow the document
			if (!finalResult) {
				finalResult = testResults.document[self.options.position[0]].natural;
			}
			
			// first, let's find the coordinates of the tooltip relatively to the window,
			// centering it on the middle of the origin
			finalResult.coord = {};
			
			switch (finalResult.position) {
				
				case 'left':
				case 'right':
					finalResult.coord.top = Math.floor(helper.geo.origin.windowOffset.top - (finalResult.size.height / 2) + (helper.geo.origin.size.height / 2));
					break;
				
				case 'bottom':
				case 'top':
					finalResult.coord.left = Math.floor(helper.geo.origin.windowOffset.left - (finalResult.size.width / 2) + (helper.geo.origin.size.width / 2));
					break;
			}
			
			switch (finalResult.position) {
				
				case 'left':
					finalResult.coord.left = helper.geo.origin.windowOffset.left - finalResult.outerSize.width;
					break;
				
				case 'right':
					finalResult.coord.left = helper.geo.origin.windowOffset.left + helper.geo.origin.size.width + finalResult.distance.horizontal;
					break;
				
				case 'top':
					finalResult.coord.top = helper.geo.origin.windowOffset.top - finalResult.outerSize.height;
					break;
				
				case 'bottom':
					finalResult.coord.top = helper.geo.origin.windowOffset.top + helper.geo.origin.size.height + finalResult.distance.vertical;
					break;
			}
			
			// then if the tooltip overflows the viewport, we'll move it accordingly (it will
			// not be centered on the middle of the origin anymore). We only move horizontally
			// for top and bottom tooltips and vice versa.
			if (finalResult.position == 'top' || finalResult.position == 'bottom') {
				
				// if there is an overflow on the left
				if (finalResult.coord.left < 0) {
					finalResult.coord.left = 0;
				}
				// or an overflow on the right
				else if (finalResult.coord.left + finalResult.size.width > helper.geo.window.size.width) {
					finalResult.coord.left += helper.geo.window.size.width - (finalResult.coord.left + finalResult.size.width);
				}
			}
			else {
				
				// overflow on top
				if (finalResult.coord.top < 0) {
					finalResult.coord.top = 0;
				}
				// or at bottom
				else if (finalResult.coord.top + finalResult.size.height > helper.geo.window.size.height) {
					finalResult.coord.top += helper.geo.window.size.height - (finalResult.coord.top + finalResult.size.height);
				}
			}
			
			// submit the positioning proposal to the user function which may choose to change
			// the position, size and/or the coordinates
			
			// first, set the rules that corresponds to the proposed position : it may change
			// the size of the tooltip, and the custom functionPosition may want to detect the
			// size of something before making a decision. So let's make things easier for the
			// implementor
			self.position_change(finalResult.position);
			
			// include the tooltip and parent into the helper for the custom function
			helper.$tooltip = self.tooltipster.$tooltip;
			helper.$tooltipParent = self.tooltipster.$tooltipParent;
			
			if (self.options.functionPosition) {
				finalResult = self.options.functionPosition.call(self, helper, $.extend(true, {}, finalResult));
			}
			
			// now let's compute the position of the arrow
			if (finalResult.position == 'top' || finalResult.position == 'bottom') {
				
				var arrowCoord = {
					prop: 'left',
					val: helper.geo.origin.windowOffset.left + Math.floor(helper.geo.origin.size.width / 2) - finalResult.coord.left
				};
				
				if (arrowCoord.val < 0) {
					arrowCoord.val = 0;
				}
				else if (arrowCoord.val > finalResult.size.width) {
					arrowCoord.val = finalResult.size.width;
				}
			}
			else {
				
				var arrowCoord = {
					prop: 'top',
					val: helper.geo.origin.windowOffset.top + Math.floor(helper.geo.origin.size.height / 2) - finalResult.coord.top
				};
				
				if (arrowCoord.val < 0) {
					arrowCoord.val = 0;
				}
				else if (arrowCoord.val > finalResult.size.height) {
					arrowCoord.val = finalResult.size.height;
				}
			}
			
			var originParentOffset;
			
			// let's convert the window-relative coordinates into coordinates relative to the
			// future positioned parent that the tooltip will be appended to
			if (helper.geo.origin.fixedLineage) {
				
				// same as windowOffset when the position is fixed
				originParentOffset = helper.geo.origin.windowOffset;
			}
			else {
				
				if (self.tooltipster.$tooltipParent[0].tagName.toLowerCase() == 'body') {
					
					originParentOffset = {
						left: helper.geo.origin.windowOffset.left + helper.geo.window.scroll.left,
						top: helper.geo.origin.windowOffset.top + helper.geo.window.scroll.top
					};
				}
				else {
					// TODO. right now $tooltipParent cannot be something other than <body>.
					// when we do this, .tooltipster-sizer will have to be appended to the parent
					// to inherit css style values that affect the display of the text and such
				}
			}
			
			finalResult.coord = {
				left: originParentOffset.left + (finalResult.coord.left - helper.geo.origin.windowOffset.left),
				top: originParentOffset.top + (finalResult.coord.top - helper.geo.origin.windowOffset.top)
			};
			
			// set position values
			
			// again, in case functionPosition changed the position (left/right etc)
			self.position_change(finalResult.position);
			
			if (helper.geo.origin.fixedLineage) {
				self.tooltipster.$tooltip
					.css('position', 'fixed');
			}
			else {
				// CSS default
				self.tooltipster.$tooltip
					.css('position', '');
			}
			
			self.tooltipster.$tooltip
				.css({
					left: finalResult.coord.left,
					top: finalResult.coord.top
				})
				.find('.tooltipster-arrow')
					.css({
						'left': '',
						'top': ''
					})
					.css(arrowCoord.prop, arrowCoord.val);
			
			// we don't need to set a size if the size is natural. It would be harmless in Chrome
			// but it creates a bug in Firefox, so we just don't do it
			if (finalResult.sizeMode == 'constrained') {
				
				self.tooltipster.$tooltip
					.css({
						height: finalResult.size.height,
						width: finalResult.size.width
					});
			}
			else {
			
				self.tooltipster.$tooltip
					.css({
						height: '',
						width: ''
					});
			}
			
			// end position tests session and append the tooltip HTML element to its parent
			self.tooltipster._sizerEnd();
		}
	};
	
	$.tooltipster.displayPlugin[pluginName] = plugin;
	
})(jQuery);