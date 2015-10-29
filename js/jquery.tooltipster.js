/*! Tooltipster 4.0.0rc27 */

/**
 * Released on 2015-10-29
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
			// must be 'body' for now, or an element positioned at (0, 0)
			// in the document, typically like very top views of an app.
			parent: 'body',
			trackOrigin: false,
			repositionOnScroll: false,
			restoration: 'none',
			trackTooltip: false,
			speed: 350,
			theme: [],
			timer: 0,
			touchDevices: true,
			trackerInterval: 500,
			trigger: 'hover',
			triggerClose: {
				click: false,
				mouseleave: false,
				originClick: false,
				scroll: false
			},
			triggerOpen: {
				hover: false,
				click: false
			},
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
		this.tracker = null;
		// this will be the user content shown in the tooltip. A capital "C" is used
		// because there is also a method called content()
		this.Content;
		// to keep the tooltip from opening once it's destroyed
		this.destroyed = false;
		// an instance of the chosen display plugin
		this.displayPlugin;
		// this is the element which gets one or more tooltips, also called "origin"
		this.$el = $(element);
		// we can't emit directly on the instance because if a method with the same
		// name as the event exists, it will be called by jQuery. Se we use a plain
		// object as emitter. This emitter is for internal use by display plugins,
		// if needed.
		this.$emitter = $({});
		// this emitter is for the user to listen to events without risking to mess
		// with our internal listeners
		this.$emitterPublic = $({});
		this.enabled = true;
		this.garbageCollector;
		// various position and size data recomputed before each repositioning
		this.geometry;
		this.mouseIsOverOrigin = false;
		// a unique namespace per instance
		this.namespace = 'tooltipster-'+ Math.round(Math.random()*100000);
		this.options = $.extend(true, {}, defaults, options);
		// will be used to support origins in scrollable areas
		this.$originParents;
		// State (capital S) can be either : appearing, stable, disappearing, closed
		this.State = 'closed';
		this.timerClose = null;
		this.timerOpen = null;
		// this will be the tooltip element (jQuery wrapped HTML element)
		this.$tooltip;
		// for the size tracker
		this.contentBcr;
		// the element the tooltip will be appended to
		this.$tooltipParent;
		// the tooltip left/top coordinates, saved after each repositioning
		this.tooltipCoord;
		
		// option formatting
		
		if (this.options.trigger == 'hover') {
			
			this.options.triggerOpen = { hover: true };
			
			this.options.triggerClose = {
				mouseleave: true,
				originClick: true
			};
		}
		else if (this.options.trigger == 'click') {
			
			this.options.triggerOpen = { click: true };
			this.options.triggerClose = { click: true };
		}
		
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
				self._contentSet(self.options.content);
			}
			else {
				self._contentSet(initialTitle);
			}
			
			self.$el
				// strip the title off of the element to prevent the default tooltips
				// from popping up
				.removeAttr('title')
				// to be able to find all instances on the page later (upon window
				// events in particular)
				.addClass('tooltipstered');
			
			// for 'click' and 'hover' open triggers : bind on events to open the tooltip.
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
			if (self.options.triggerOpen.hover) {
				
				self.$el.on('mouseenter.'+ self.namespace, function(event) {
					if (!deviceIsPureTouch() || self.options.touchDevices) {
						self.mouseIsOverOrigin = true;
						self._open(event);
					}
				});
				
				// for touch interaction
				if (deviceHasTouchCapability && self.options.touchDevices) {
					
					// for touch devices, we immediately display the tooltip because we
					// cannot rely on mouseleave to handle the delay
					self.$el.on('touchstart.'+ self.namespace, function(event) {
						self._openNow(event);
					});
				}
			}
			
			if (self.options.triggerOpen.click) {
				
				// note : for touch devices, we do not bind on touchstart, we only rely
				// on the emulated clicks (triggered by taps)
				self.$el.on('click.'+ self.namespace, function(event) {
					if (!deviceIsPureTouch() || self.options.touchDevices) {
						self._openNow(event);
					}
				});
			}
			
			if (self.options.triggerClose.mouseleave) {
				
				self.$el.on('mouseleave.'+ self.namespace, function() {
					if (!deviceIsPureTouch() || self.options.touchDevices) {
						self.mouseIsOverOrigin = false;
					}
				});
			}
			
			self.garbageCollector = setInterval(function() {
				if (!bodyContains(self.$el)) {
					self.destroy();
				}
			}, 20000);
		},
		
		_close: function(event, callback) {
			
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
				$.each(self.callbacks.close, function(i,c) {
					c.call(self, self, {
						event: event,
						origin: self.$el[0]
					});
				});
				
				self.callbacks.close = [];
			};
			
			// close
			if (self.State == 'stable' || self.State == 'appearing') {
				
				self.state('disappearing');
				
				var finish = function() {
					
					// stop the tracker
					clearInterval(self.tracker);
					
					// a beforeClose option has been asked several times but would
					// probably useless since the content element is still accessible
					// via ::content(), and because people can always use listeners
					// inside their content to track what's going on. For the sake of
					// simplicity, this has been denied. Bur for the rare people who
					// really need the option (for old browsers or for the case where
					// detaching the content is actually destructive, for file or
					// password inputs for example), this event will do the work.
					self._trigger({
						type: 'beforeClose',
						event: event
					});
					
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
					
					self.state('closed');
					
					// trigger event
					self._trigger({
						type: 'after',
						event: event
					});
					
					// call our constructor custom callback function
					if (self.options.functionAfter) {
						self.options.functionAfter.call(self, self, {
							event: event,
							origin: self.$el[0]
						});
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
			// if the tooltip is already closed, we still need to trigger
			// the method custom callbacks
			else if (self.State == 'closed') {
				finishCallbacks();
			}
			
			return self;
		},
		
		_contentInsert: function() {
			
			var self = this,
				$el = self.$tooltip.find('.tooltipster-content'),
				formattedContent = self.Content,
				format = function(content){
					formattedContent = content;
				};
			
			self._trigger({
				type: 'format',
				format: format
			});
			
			if (self.options.functionFormat) {
				
				formattedContent = self.options.functionFormat.call(
					self,
					self,
					{
						origin: self.$el[0]
					},
					self.Content
				);
			}
			
			if (typeof formattedContent === 'string' && !self.options.contentAsHTML) {
				$el.text(formattedContent);
			}
			else {
				$el
					.empty()
					.append(formattedContent);
			}
		},
		
		_contentSet: function(content) {
			
			// clone if asked. Cloning the object makes sure that each instance has its
			// own version of the content (in case a same object were provided for several
			// instances)
			// reminder : typeof null === object
			if (content instanceof $ && this.options.contentCloning) {
				content = content.clone(true);
			}
			
			this.Content = content;
			
			this._trigger({
				type: 'update',
				content: content
			});
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
				
				// if the image itself is the area, nothing more to do
				if (shape != 'default') {
					
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
							
							geo.origin.offset.left += areaLeftOffset;
							geo.origin.windowOffset.left += areaLeftOffset;
							
							geo.origin.offset.top += areaTopOffset;
							geo.origin.windowOffset.top += areaTopOffset;
							
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
							
							geo.origin.offset.left += areaSmallestX;
							geo.origin.windowOffset.left += areaSmallestX;
							
							geo.origin.offset.top += areaSmallestY;
							geo.origin.windowOffset.top += areaSmallestY;
							
							break;
					}
					
					// save this before we overwrite it
					var mappedOffsetRight = geo.origin.offset.right,
						mappedOffsetBottom = geo.origin.offset.bottom;
					
					geo.origin.offset.right = geo.origin.offset.left + geo.origin.size.width;
					geo.origin.offset.bottom = geo.origin.offset.top + geo.origin.size.height;
					
					geo.origin.windowOffset.right = geo.origin.offset.right - geo.window.scroll.left;
					geo.origin.windowOffset.bottom = geo.origin.offset.bottom - geo.window.scroll.top;
				}
			}
			
			// the space that is available to display the tooltip, relatively
			// to the viewport and to the document
			geo.available = {
				window: {
					bottom: {
						height: geo.window.size.height - geo.origin.windowOffset.bottom,
						width: geo.window.size.width
					},
					left: {
						height: geo.window.size.height,
						width: geo.origin.windowOffset.left
					},
					right: {
						height: geo.window.size.height,
						width: geo.window.size.width - geo.origin.windowOffset.right
					},
					top: {
						height: geo.origin.windowOffset.top,
						width: geo.window.size.width
					}
				}
			};
			
			geo.available.document = {
				bottom: {
					height: geo.document.size.height - geo.origin.offset.bottom,
					width: geo.document.size.width
				},
				left: {
					height: geo.document.size.height,
					width: geo.origin.offset.left
				},
				right: {
					height: geo.document.size.height,
					width: geo.document.size.width - geo.origin.offset.right
				},
				top: {
					height: geo.origin.offset.top,
					width: geo.document.size.width
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
		
		/**
		 * For internal use by display plugins, if needed
		 */
		_off: function(){
			this.$emitter.off.apply(this.$emitter, Array.prototype.slice.apply(arguments));
			return this;
		},
		
		/**
		 * For internal use by display plugins, if needed
		 */
		_on: function(){
			this.$emitter.on.apply(this.$emitter, Array.prototype.slice.apply(arguments));
			return this;
		},
		
		// this function will schedule the opening of the tooltip after the delay, if
		// there is one
		_open: function(event) {
			
			var self = this;
			
			if (self.State != 'stable' && self.State != 'appearing') {
				
				self._trigger({
					type: 'initOpen',
					event: event
				});
				
				if (self.options.delay) {
					self.timerOpen = setTimeout(function() {
						
						// for the hover open trigger, we check if the mouse is still over the
						// origin, otherwise we do not open anything
						if (	!self.options.triggerOpen.hover
							||	self.mouseIsOverOrigin
						) {
							self._openNow(event);
						}
					}, self.options.delay);
				}
				else self._openNow(event);
			}
		},
		
		// this function will open the tooltip right away
		_openNow: function(event, callback) {
			
			var self = this;
			
			if (!self.destroyed) {
				
				// check that the origin is still in the DOM
				if (bodyContains(self.$el)) {
					
					var ok = true;
					
					// trigger an event. The event.stop function allows the callback
					// to prevent the opening of the tooltip
					self._trigger({
						type: 'before',
						event: event,
						stop: function(){
							ok = false;
						}
					});
					
					if (ok && self.options.functionBefore) {
						
						// call our custom function before continuing
						ok = self.options.functionBefore.call(self, self, {
							event: event,
							origin: self.$el[0]
						});
					}
					
					if (ok !== false) {
						
						// continue only if the tooltip is enabled and has any content
						if (self.enabled && self.Content !== null) {
							
							// init the display plugin if it has not been initialized yet
							if (!self.displayPlugin) {
								
								var pluginClass = $.tooltipster.displayPlugin[self.options.displayPlugin];
								
								if (pluginClass) {
									self.displayPlugin = new pluginClass(self);
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
							
							var extraTime,
								finish = function() {
									
									if (self.State != 'stable'){
										self.state('stable');
									}
									
									// trigger any open method custom callbacks and reset them
									$.each(self.callbacks.open, function(i,c) {
										c.call(self, self, {
											origin: self.$el[0],
											tooltip: self.$tooltip[0]
										});
									});
									
									self.callbacks.open = [];
								};
							
							// if the tooltip is already open
							if (self.State !== 'closed') {
								
								// the timer (if any) will start (or restart) right now
								extraTime = 0;
								
								// if it was disappearing, cancel that
								if (self.State === 'disappearing') {
									
									self.state('appearing');
									
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
								else if (self.State == 'stable') {
									finish();
								}
							}
							// if the tooltip isn't already open, open that sucker up!
							else {
								
								self.state('appearing');
								
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
								
								self.$tooltip.css({
									// must not overflow the window until the positioning method
									// is called
									height: 0,
									width: 0,
									zIndex: self.options.zIndex
								});
								
								if (self.options.interactive) {
									self.$tooltip.css('pointer-events', 'auto')
								}
								
								// insert the content
								self._contentInsert();
								
								// determine the future parent
								if (typeof self.options.parent == 'string') {
									self.$tooltipParent = $(self.options.parent);
								}
								else {
									self.$tooltipParent = self.options.parent;
								}
								
								if (supportsTransitions()) {
									
									// note: there seems to be an issue with start animations which
									// are randomly not played on fast devices in both Chrome and FF,
									// couldn't find a way to solve it yet. It seems that applying
									// the classes before appending to the DOM helps a little, but
									// that's not even sure.
									self.$tooltip
										.addClass('tooltipster-' + self.options.animation)
										.addClass('tooltipster-initial');
								}
								
								// reposition the tooltip and attach to the DOM
								self.reposition(event, true);
								
								// animate in the tooltip
								if (supportsTransitions()) {
									
									self.$tooltip.css({
										'-moz-animation-duration': self.options.speed + 'ms',
										'-ms-animation-duration': self.options.speed + 'ms',
										'-o-animation-duration': self.options.speed + 'ms',
										'-webkit-animation-duration': self.options.speed + 'ms',
										'animation-duration': self.options.speed + 'ms',
										'transition-duration': self.options.speed + 'ms'
									});
									
									setTimeout(
										function() {
											
											// a quick hover may have already triggered a mouseleave
											if (self.State != 'closed') {
												
												self.$tooltip
													.addClass('tooltipster-show')
													.removeClass('tooltipster-initial');
												
												if(self.options.speed > 0){
													self.$tooltip.delay(self.options.speed);
												}
												
												self.$tooltip.queue(finish);
											}
										},
										0
									);
								}
								else {
									self.$tooltip
										.css('display', 'none')
										.fadeIn(self.options.speed, finish);
								}
								
								// will check if our tooltip origin is removed while the tooltip is
								// shown
								self._tracker_start();
								
								$(window)
									// reposition on resize (in case position can/has to be changed)
									.on('resize.'+ self.namespace, function(e) {
										self.reposition(e);
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
								
								// in case a listener is already bound for autoclosing (mouse or
								// touch, hover or click), unbind it first
								$('body').off('.'+ self.namespace +'-autoClose');
								
								// here we'll have to set different sets of bindings for both touch
								// and mouse events
								if (self.options.triggerClose.mouseleave) {
									
									// if the user touches the body, close
									if (deviceHasTouchCapability) {
										
										// timeout 0 : to prevent immediate closing if the method was called
										// on a click event and if options.delay == 0 (because of bubbling)
										setTimeout(function() {
											
											if (self.State != 'closed') {
												
												// we don't want to bind on click here because the
												// initial touchstart event has not yet triggered its
												// click event, which is thus about to happen
												$('body').on('touchstart.' + self.namespace + '-autoClose', function(event){
													
													// if the tooltip is not interactive or if the click was made
													// outside of the tooltip
													if(!self.options.interactive || !$.contains(self.$tooltip[0], event.target)){
														self._close();
													}
												});
											}
										}, 0);
									}
									
									// if we have to allow interaction
									if (self.options.interactive) {
										
										// as for mouse interaction, we get rid of the tooltip only
										// after the mouse has spent some time out of it
										var tolerance = null;
										
										self.$el.add(self.$tooltip)
											// close after some time out of the origin and the tooltip
											.on('mouseleave.'+ self.namespace +'-autoClose', function(event) {
												
												clearTimeout(tolerance);
												
												tolerance = setTimeout(function() {
													self._close(event);
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
										self.$el.on('mouseleave.'+ self.namespace + '-autoClose', function(event) {
											self._close(event);
										});
									}
								}
								
								// close the tooltip when the origin gets a click (common behavior of
								// native tooltips)
								if (self.options.triggerClose.originClick) {
									
									self.$el.on('click.'+ self.namespace + '-autoClose', function(event) {
										self._close(event);
									});
								}
								
								// here we'll set the same bindings for both clicks and touch on the body
								// to close the tooltip
								if (self.options.triggerOpen.click) {
									
									// explanations : same as above
									setTimeout(function() {
										
										if (self.State != 'closed') {
											
											$('body').on('click.' + self.namespace + '-autoClose touchstart.' + self.namespace + '-autoClose', function(event){
												if(!self.options.interactive || !$.contains(self.$tooltip[0], event.target)){
													self._close(event);
												}
											});
										}
									}, 0);
								}
								
								self._trigger('ready');
								
								// call our custom callback
								if (self.options.functionReady) {
									self.options.functionReady.call(self, self, {
										origin: self.$el[0],
										tooltip: self.$tooltip[0]
									});
								}
							}
							
							// if we have a timer set, let the countdown begin
							if (self.options.timer > 0) {
								
								self.timerClose = setTimeout(function() {
									self.timerClose = null;
									self._close();
								}, self.options.timer + extraTime);
							}
						}
					}
				}
			}
		},
		
		/**
		 * Handles the scroll on any of the parents of the origin (when the
		 * tooltip is open)
		 * 
		 * @param {object} event
		 */
		_scrollHandler: function(event) {
			
			var self = this;
			
			if (self.options.triggerClose.scroll) {
				self._close(event);
			}
			else {
				
				// if the scroll happened on the window
				if (event.target === document) {
					
					// if the origin has a fixed lineage, window scroll will have no
					// effect on its position nor on the position of the tooltip
					if (!self.geometry.origin.fixedLineage) {
						
						// we don't need to do anything unless repositionOnScroll is true
						// because the tooltip will already have moved with the window
						// (and of course with the origin)
						if (self.options.repositionOnScroll) {
							self.reposition(event);
						}
					}
				}
				// if the scroll happened on another parent of the tooltip, it means
				// that it's in a scrollable area and now needs to have its position
				// adjusted or recomputed, depending ont the repositionOnScroll
				// option. Also, if the origin is partly hidden due to a parent that
				// hides its overflow, we'll just hide (not close) the tooltip.
				else {
					
					var g = self._geometry(),
						overflows = false;
					
					// a fixed position origin is not affected by the overflow hiding
					// of a parent
					if (self.$el.css('position') != 'fixed') {
						
						self.$originParents.each(function(i, el) {
							
							var $el = $(el),
								overflowX = $el.css('overflow-x'),
								overflowY = $el.css('overflow-y');
							
							if (overflowX != 'visible' || overflowY != 'visible') {
								
								var bcr = el.getBoundingClientRect();
								
								if (overflowX != 'visible') {
									
									if (	g.origin.windowOffset.left < bcr.left
										||	g.origin.windowOffset.right > bcr.right
									) {
										overflows = true;
										return false;
									}
								}
								
								if (overflowY != 'visible') {
									
									if (	g.origin.windowOffset.top < bcr.top
										||	g.origin.windowOffset.bottom > bcr.bottom
									) {
										overflows = true;
										return false;
									}
								}
							}
							
							// no need to go further if fixed, for the same reason as above
							if ($el.css('position') == 'fixed') {
								return false;
							}
						});
					}
					
					if (overflows) {
						self.$tooltip.css('visibility', 'hidden');
					}
					else {
						self.$tooltip.css('visibility', 'visible');
						
						// reposition
						if (self.options.repositionOnScroll) {
							self.reposition(event);
						}
						// or just adjust offset
						else {
							
							// we have to use offset and not windowOffset because this way,
							// only the scroll distance of the scrollable areas are taken into
							// account (the scrolltop value of the main window must be
							// ignored since the tooltip already moves with it)
							var offsetLeft = g.origin.offset.left - self.geometry.origin.offset.left,
								offsetTop = g.origin.offset.top - self.geometry.origin.offset.top;
							
							// add the offset to the position initially computed by the display plugin
							self.$tooltip.css({
								left: self.tooltipCoord.left + offsetLeft,
								top: self.tooltipCoord.top + offsetTop
							});
						}
					}
				}
				
				self._trigger({
					type: 'scroll',
					event: event
				});
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
			
			// we'll set a width and see what height is generated and if there
			// is horizontal overflow
			this.$tooltip.css({
				height: '',
				left: 0,
				top: 0,
				width: width
			});
			
			this._forceRedraw();
			
			// note: we used to use offsetWidth instead of boundingRectClient but
			// it returned rounded values, causing issues with sub-pixel layouts.
			
			var $content = this.$tooltip.find('.tooltipster-content'),
				newHeight = this.$tooltip.outerHeight(),
				tooltipBrc = this.$tooltip[0].getBoundingClientRect(),
				contentBrc = $content[0].getBoundingClientRect(),
				fits = {
					height: newHeight <= height,
					width: (
						// this condition accounts for min-width property that
						// may apply
							tooltipBrc.width <= width
						// the -1 is here because scrollWidth actually returns
						// a rounded value, and may be greater than brc.width if
						// it has been rounded up. This may cause an issue
						// an issue for contents which actually really overflowed
						// by 1px or so, but that should be very rare. Not sure
						// how to solve this efficiently.
						// See http://blogs.msdn.com/b/ie/archive/2012/02/17/sub-pixel-rendering-and-the-css-object-model.aspx
						&&	contentBrc.width >= $content[0].scrollWidth - 1
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
			
			// same remark as in ::_sizerConstrained()
			var tooltipBrc = this.$tooltip[0].getBoundingClientRect();
			
			return {
				height: tooltipBrc.height,
				width: tooltipBrc.width
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
		
		_tracker_start: function() {
			
			var self = this,
				$content = self.$tooltip.find('.tooltipster-content');
			
			// get the initial content size
			if (self.options.trackTooltip) {
				self.contentBcr = $content[0].getBoundingClientRect();
			}
			
			self.tracker = setInterval(function() {
				
				// if the origin has been removed, destroy the instance. Our
				// garbage collector does the same thing but at much larger
				// intervals just to prevent memory leaks. But when the
				// tooltip is open, it's important to do it more often so
				// that the tooltip does not stick on screen a long time
				// after its origin was removed
				if (!bodyContains(self.$el)) {
					self.destroy();
				}
				// if the tooltip element has somehow been removed
				else if (!bodyContains(self.namespace)) {
					self._close();
				}
				// if everything is alright
				else {
					
					// compare the former and current positions of the origin to reposition
					// the tooltip if need be
					if (self.options.trackOrigin) {
						
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
							
							// close the tooltip when using the mouseleave close trigger
							// (see https://github.com/iamceege/tooltipster/pull/253)
							if (self.options.triggerClose.mouseleave) {
								self._close();
							}
							else {
								self.reposition();
							}
						}
					}
					
					if (self.options.trackTooltip) {
						
						var currentBcr = $content[0].getBoundingClientRect();
						
						if (	currentBcr.height !== self.contentBcr.height
							||	currentBcr.width !== self.contentBcr.width
						){
							self.reposition();
							self.contentBcr = currentBcr;
						}
					}
				}
			}, self.options.trackerInterval);
		},
		
		_trigger: function(){
			
			var args = Array.prototype.slice.apply(arguments);
			
			if (typeof args[0] == 'string'){
				args[0] = { type: args[0] };
			}
			
			// add properties to the event
			args[0].instance = this;
			args[0].origin = this.$el ? this.$el[0] : null;
			
			// trigger on the private emitter first, then on the public one
			this.$emitter.trigger.apply(this.$emitter, args);
			this.$emitterPublic.trigger.apply(this.$emitterPublic, args);
			
			return this;
		},
		
		_update: function(content) {
			
			var self = this;
			
			// change the content
			self._contentSet(content);
			
			if (self.Content !== null) {
				
				// update the tooltip if it is open
				if (self.State !== 'closed') {
					
					// reset the content in the tooltip
					self._contentInsert();
					
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
								
								if (self.State != 'closed') {
									
									self.$tooltip.removeClass('tooltipster-content-changing');
									
									// after the changing animation has completed, reset the
									// CSS transitions
									setTimeout(function() {
										
										if (self.State != 'closed') {
											
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
								if (self.State != 'closed') {
									self.$tooltip.fadeTo(self.options.speed, 1);
								}
							});
						}
					}
				}
			}
			else {
				self._close();
			}
		},
		
		/**
		 * @see self::_close
		 */
		close: function(callback) {
			this._close(null, callback);
			return this;
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
			
			self.destroyed = true;
			
			self._close(null, function(){
				
				self.$el
					.removeData(self.namespace)
					.off('.'+ self.namespace);
				
				// last event
				self._trigger('destroy');
				
				// unbind private and public event listeners
				self._off();
				self.off();
				
				var ns = self.$el.data('tooltipster-ns');
				
				// if the origin has been removed from DOM, its data may
				// well have been destroyed in the process and there would
				// be nothing to clean up or restore
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
				
				// remove external references, just in case
				self.$el = null;
				self.$emitter = null;
				self.$emitterPublic = null;
				self.$tooltip = null;
				self.$tooltipParent = null;
				
				// make sure the object is no longer referenced in there to prevent
				// memory leaks
				instancesLatest = $.grep(instancesLatest, function(el, i) {
					return self !== el;
				});
				
				clearInterval(self.garbageCollector);
			});
			
			return true;
		},
		
		disable: function() {
			// close first, in case the tooltip would not disappear on
			// its own (no close trigger)
			this._close();
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
			return this._close(null, callback);
		},
		
		instance: function() {
			return this;
		},
		
		/**
		 * For public use only, not to be used by display plugins (use ::_off() instead)
		 */
		off: function(){
			this.$emitterPublic.off.apply(this.$emitterPublic, Array.prototype.slice.apply(arguments));
			return this;
		},
		
		/**
		 * For public use only, not to be used by display plugins (use ::_on() instead)
		 */
		on: function(){
			this.$emitterPublic.on.apply(this.$emitterPublic, Array.prototype.slice.apply(arguments));
			return this;
		},
		
		/**
		 * For public use only, not to be used by display plugins
		 */
		once: function(){
			this.$emitterPublic.once.apply(this.$emitterPublic, Array.prototype.slice.apply(arguments));
			return this;
		},
		
		/**
		 * The public open() method is actually an alias for the private _openNow() method
		 * 
		 * @see self::_openNow
		 */
		open: function(callback) {
			this._openNow(null, callback);
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
		 * @param {object} event For internal use only. Defined if an event such as
		 * window resizing triggered the repositioning
		 * @param {boolean} tooltipIsDetached For internal use only. Set this to true if you
		 * know that the tooltip not being in the DOM is not an issue (typically when the
		 * tooltip element has just been created but has not been added to the DOM yet).
		 */
		reposition: function(event, tooltipIsDetached) {
			
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
				var position = self.displayPlugin.reposition({
					geo: self.geometry
				});
				
				// remember the coordinates for later offset adjustment
				self.tooltipCoord = position.coord;
				
				// trigger event
				self._trigger({
					type: 'reposition',
					event: event,
					position: position
				});
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
		 * @param {string} state optional internal Use this to use the function
		 * as a setter
		 * @return {string} The state of the tooltip: stable, closed, etc.
		 */
		state: function(state) {
			
			if (state) {
				
				this.State = state;
				
				this._trigger({
					type: 'state',
					state: state
				});
				
				return this;
			}
			else {
				return this.State;
			}
		},
		
		/**
		 * For public use only, not to be used by display plugins
		 */
		triggerHandler: function(){
			this.$emitterPublic.triggerHandler.apply(this.$emitterPublic, Array.prototype.slice.apply(arguments));
			return this;
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
						
						$(selector).each(function() {
								
							var $this = $(this),
								ns = $this.data('tooltipster-ns');
							
							if (ns) {
								
								$.each(ns, function(i, namespace) {
									ret.push($this.data(namespace));
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
						
						// call our constructor custom function.
						// we do this here and not in ::init() because we wanted
						// the object to be saved in $this.data before triggering
						// it
						if (obj.options.functionInit) {
							obj.options.functionInit.call(obj, obj, {
								origin: this
							});
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
		 * @see ::_init()
		 */
		plugin = function(instance, options) {
			this._init(instance, options);
		};
	
	plugin.prototype = {
		
		/**
		 * Defaults are provided as a function for an easy override by inheritance
		 * 
		 * @return {object} An object with the defaults options
		 */
		_defaults: function() {
			
			return {
				// if the tooltip should display an arrow that points to the origin
				arrow: true,
				// the distance in pixels between the tooltip and the origin
				distance: 6,
				// allows to easily change the position of the tooltip
				functionPosition: null,
				maxWidth: null,
				minWidth: 0,
				side: ['top', 'bottom', 'right', 'left']
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
				// - and if that can't be done, we just let the tooltip on the preferred
				//   side with a natural size, overflowing the document
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
		 * Run once: at instantiation of the display plugin (when the tooltip is
		 * shown for the first time).
		 * 
		 * @param {object} instance The tooltipster object that instantiated
		 * this plugin
		 * @param {object} options Options, @see self::_defaults()
		 */
		_init: function(instance) {
			
			var $d = $('<i><!--[if IE 6]><i></i><![endif]--></i>');
			
			// list of instance variables
			
			this.instance = instance;
			this.isIE6 = $d.children().length > 0;
			this.options;
		},
		
		/**
		 * Recompute this.options from the options declared to the instance
		 */
		_optionsInit: function(){
			
			var defaults = this._defaults(),
				options = this.instance.options;
			
			// for backward compatibility, deprecated in v4.0.0
			if (options.position) {
				options.side = options.position;
			}
			
			this.options = $.extend(true, {}, defaults, options);
			
			// $.extend merges arrays, we don't want that, we only want the
			// array provided by the user
			if (typeof options.side == 'object') {
				this.options.side = options.side;
			}
			
			// options formatting
			
			// format distance as a four-cell array if it ain't one yet and then make
			// it an object with top/bottom/left/right properties
			if (typeof this.options.distance != 'object') {
				this.options.distance = [this.options.distance];
			}
			if (this.options.distance.length < 4) {
				
				if (this.options.distance[1] === undefined) this.options.distance[1] = this.options.distance[0];
				if (this.options.distance[2] === undefined) this.options.distance[2] = this.options.distance[0];
				if (this.options.distance[3] === undefined) this.options.distance[3] = this.options.distance[1];
				
				this.options.distance = {
					top: this.options.distance[0],
					right: this.options.distance[1],
					bottom: this.options.distance[2],
					left: this.options.distance[3]
				};
			}
			// edit the instance distance option so we don't have to recompute
			// it every time this method is called
			options.distance = this.options.distance;
				
			// let's transform 'top' into ['top', 'bottom', 'right', 'left'] (for example)
			if (typeof this.options.side == 'string') {
				
				this.options.side = [this.options.side];
				
				for (var i=0; i<4; i++) {
					if (this.options.side[0] != defaults.side[i]) {
						this.options.side.push(defaults.side[i]);
					}
				}
			}
			
			// misc
			
			// disable the arrow in IE6 unless the arrow option was explicitly set to true
			if (	this.isIE6
				&&	options.arrow !== true
			) {
				this.options.arrow = false;
			}
		},
		
		/**
		 * Make whatever modifications are needed when the side is changed. This has
		 * been made an independant method for easy inheritance in custom plugins based
		 * on this default plugin.
		 *
		 * @param {string} side
		 */
		_sideChange: function(side) {
			
			this.instance.$tooltip
				.removeClass('tooltipster-bottom')
				.removeClass('tooltipster-left')
				.removeClass('tooltipster-right')
				.removeClass('tooltipster-top')
				.addClass('tooltipster-' + side);
		},
		
		/**
		 * Returns the target that the tooltip should aim at for a given side.
		 * The calculated value is a distance from the edge of the window
		 * (left edge for top/bottom sides, top edge for left/right side). The
		 * tooltip will be centered on that position and the arrow will be
		 * positioned there (as much as possible).
		 * 
		 * @param {string} side
		 * @return {integer}
		 */
		_targetFind: function(helper, side){
			
			var target,
				rects = this.instance.$el[0].getClientRects();
			
			// by default, the target will be the middle of the origin
			if (rects.length < 2){
				
				switch (side) {
					
					case 'left':
					case 'right':
						target = Math.floor(helper.geo.origin.windowOffset.top + (helper.geo.origin.size.height / 2));
						break;
					
					case 'bottom':
					case 'top':
						target = Math.floor(helper.geo.origin.windowOffset.left + (helper.geo.origin.size.width / 2));
						break;
				}
			}
			// if multiple client rects exist, the element may be text split
			// up into multiple lines and the middle of the origin may not be
			// best option anymore
			else {
				
				var targetRect;
				
				// choose the best target client rect
				switch (side) {
					
					case 'top':
						
						// first
						targetRect = rects[0];
						break;
					
					case 'right':
						
						// the middle line, rounded down in case there is an even
						// number of lines (looks more centered => check out the
						// demo with 4 split lines)
						if (rects.length > 2) {
							targetRect = rects[Math.ceil(rects.length / 2) - 1];
						}
						else {
							targetRect = rects[0];
						}
						break;
					
					case 'bottom':
						
						// last
						targetRect = rects[rects.length - 1];
						break;
					
					case 'left':
						
						// the middle line, rounded up
						if (rects.length > 2) {
							targetRect = rects[Math.ceil((rects.length + 1) / 2) - 1];
						}
						else {
							targetRect = rects[rects.length - 1];
						}
						break;
				}
				
				switch (side) {
					
					case 'left':
					case 'right':
						target = Math.floor(targetRect.top + (targetRect.bottom - targetRect.top) / 2);
						
						break;
					
					case 'bottom':
					case 'top':
						target = Math.floor(targetRect.left + (targetRect.right - targetRect.left) / 2);
						break;
				}
			}
			
			return target;
		},
		
		/**
		 * Contains the HTML markup of the tooltip.
		 *
		 * @return {object} The tooltip, as a jQuery-wrapped HTML element
		 */
		build: function() {
			
			this._optionsInit();
			
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
		 * This method must compute and set the positioning properties of the tooltip
		 * (left, top, width, height, etc.). It must also make sure the
		 * tooltip is eventually appended to its parent (since the element may be
		 * detached from the DOM at the moment the method is called).
		 * 
		 * Plugin creators will at least have to use self.instance.$tooltip and
		 * self.instance.$tooltipParent. Also, some of its methods may help plugin
		 * creators, especially its _sizer internal methods that help measure the size
		 * of the tooltip in various conditions.
		 * 
		 * @param {object} helper An object that contains variables that plugin
		 * creators may find useful (see below)
		 * @param {object} helper.geo An object with many layout properties
		 * about objects of interest (window, document, origin). This should help plugin
		 * users compute the optimal position of the tooltip
		 */
		reposition: function(helper) {
			
			var self = this,
				finalResult,
				testResults = {
					document: {},
					window: {}
				};
			
			// we reinit the options at each repositioning because the user may
			// have changed them with the `option` method
			self._optionsInit();
			
			// start position tests session
			self.instance._sizerStart();
			
			// find which side can contain the tooltip without overflow.
			// We'll compute things relatively to window, then document if need be.
			$.each(['window', 'document'], function(i, container) {
				
				var fits,
					constrainedFits = false,
					distance,
					naturalSize,
					outerNaturalSize,
					side,
					sizerResult;
				
				for (var i=0; i < self.options.side.length; i++) {
					
					distance = {
						horizontal: 0,
						vertical: 0
					};
					side = self.options.side[i];
					
					// this may have an effect on the size of the tooltip if there are css
					// rules for the arrow or something else
					self._sideChange(side);
					
					// now we get the size of the tooltip when it does not have any size
					// constraints set
					naturalSize = self.instance._sizerNatural();
					
					if (side == 'top' || side == 'bottom') {
						distance.vertical = self.options.distance[side];
					}
					else {
						distance.horizontal = self.options.distance[side];
					}
					
					outerNaturalSize = {
						height: naturalSize.height + distance.vertical,
						width: naturalSize.width + distance.horizontal
					};
					
					testResults[container][side] = {};
					
					// if the tooltip can fit without any adjustment
					fits = false;
					
					if (	helper.geo.available[container][side].width >= outerNaturalSize.width
						&&	helper.geo.available[container][side].height >= outerNaturalSize.height
					) {
						fits = true;
					}
					
					testResults[container][side].natural = {
						fits: fits,
						distance: distance,
						outerSize: outerNaturalSize,
						side: side,
						size: naturalSize,
						sizeMode: 'natural'
					};
					
					if (fits) {
						
						// we don't need to compute more positions, a natural one is fine
						return false;
					}
					else {
						
						// let's try to use size constraints to fit
						sizerResult = self.instance._sizerConstrained(
							helper.geo.available[container][side].width - distance.horizontal,
							helper.geo.available[container][side].height - distance.vertical
						);
						
						testResults[container][side].constrained = {
							fits: sizerResult.fits,
							distance: distance,
							outerSize: {
								height: sizerResult.size.height + distance.vertical,
								width: sizerResult.size.width + distance.horizontal
							},
							side: side,
							size: sizerResult.size,
							sizeMode: 'constrained'
						};
						
						if (sizerResult.fits) {
							// we let tests run as we may find a fitting natural size
							// on the next sides
							constrainedFits = true;
						}
					}
				}
				
				// if a constrained size fits, don't run tests against the document
				if (constrainedFits) {
					return false;
				}
			});
			
			
			// Based on tests, pick the side we'll use.
			// TODO : let the user choose the order of the positioning rules
			$.each(['window', 'document'], function(i, container) {
				for (var i=0; i < self.options.side.length; i++) {
					
					var side = self.options.side[i];
					
					$.each(['natural', 'constrained'], function(i, mode) {
						
						if (	testResults[container][side][mode]
							&&	testResults[container][side][mode].fits
						) {
							finalResult = testResults[container][side][mode];
							finalResult.container = container;
							return false;
						}
					});
					
					if (finalResult) {
						return false;
					}
				}
			});
			// if everything failed, this falls back on the preferred side but the
			// tooltip will overflow the document
			if (!finalResult) {
				finalResult = testResults.document[self.options.side[0]].natural;
				finalResult.container = 'overflow';
			}
			
			// first, let's find the coordinates of the tooltip relatively to the
			// window.
			finalResult.coord = {};
			
			// to know where to put the tooltip, we need to know on which point
			// of the x or y axis we should center it. That coordinate is the target
			finalResult.target = self._targetFind(helper, finalResult.side);
			
			switch (finalResult.side) {
				
				case 'left':
				case 'right':
					finalResult.coord.top = Math.floor(finalResult.target - finalResult.size.height / 2);
					break;
				
				case 'bottom':
				case 'top':
					finalResult.coord.left = Math.floor(finalResult.target - finalResult.size.width / 2);
					break;
			}
			
			switch (finalResult.side) {
				
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
			if (finalResult.side == 'top' || finalResult.side == 'bottom') {
				
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
			
			// this will be used so that the final arrow target is not too close
			// from the edge of the tooltip so that the arrow does not overflow
			// the tooltip. It should be equal or greater than half the width of
			// the arrow (by width we mean the size of the side which touches the
			// side of the tooltip). 
			finalResult.arrowMargin = 10;
			
			
			// submit the positioning proposal to the user function which may choose to change
			// the side, size and/or the coordinates
			
			// first, set the rules that corresponds to the proposed side: it may change
			// the size of the tooltip, and the custom functionPosition may want to detect the
			// size of something before making a decision. So let's make things easier for the
			// implementor
			self._sideChange(finalResult.side);
			
			// now unneeded, we don't want it passed to functionPosition
			delete finalResult.fits;
			delete finalResult.outerSize;
			
			// simplify this for the functionPosition callback
			finalResult.distance = finalResult.distance.horizontal || finalResult.distance.vertical;
			
			// allow the user to easily prevent its content from overflowing
			// if he constrains the size of the tooltip
			finalResult.contentOverflow = 'initial';
			
			// add some variables to the helper for the custom function
			helper.origin = self.instance.$el[0];
			helper.tooltip = self.instance.$tooltip[0];
			helper.tooltipParent = self.instance.$tooltipParent[0];
			
			var edit = function(result){
				finalResult = result;
			};
			
			// emit event on the instance
			self.instance._trigger({
				type: 'position',
				edit: edit,
				position: finalResult
			});
			
			if (self.options.functionPosition) {
				
				var r = self.options.functionPosition.call(self, self.instance, helper, $.extend(true, {}, finalResult));
				
				if (r) finalResult = r; 
			}
			
			
			// compute the position of the target relatively to the
			// tooltip container so we can place the arrow, and make needed
			// adjustments
			var arrowCoord,
				maxVal;
			
			if (finalResult.side == 'top' || finalResult.side == 'bottom') {
				
				arrowCoord = {
					prop: 'left',
					val: finalResult.target - finalResult.coord.left
				};
				maxVal = finalResult.size.width - finalResult.arrowMargin;
			}
			else {
				
				arrowCoord = {
					prop: 'top',
					val: finalResult.target - finalResult.coord.top
				};
				maxVal = finalResult.size.height - finalResult.arrowMargin;
			}
			
			// cannot lie beyond the boundaries of the tooltip, minus the
			// arrow margin
			if (arrowCoord.val < finalResult.arrowMargin) {
				arrowCoord.val = finalResult.arrowMargin;
			}
			else if (arrowCoord.val > maxVal) {
				arrowCoord.val = maxVal;
			}
			
			var originParentOffset;
			
			// let's convert the window-relative coordinates into coordinates relative to the
			// future positioned parent that the tooltip will be appended to
			if (helper.geo.origin.fixedLineage) {
				
				// same as windowOffset when the position is fixed
				originParentOffset = helper.geo.origin.windowOffset;
			}
			else {
				
				// this assumes that the parent of the tooltip is located at
				// (0, 0) in the document, typically like when the parent is
				// <body>.
				// If we ever allow other types of parent, .tooltipster-sizer
				// will have to be appended to the parent to inherit css style
				// values that affect the display of the text and such.
				originParentOffset = {
					left: helper.geo.origin.windowOffset.left + helper.geo.window.scroll.left,
					top: helper.geo.origin.windowOffset.top + helper.geo.window.scroll.top
				};
			}
			
			finalResult.coord = {
				left: originParentOffset.left + (finalResult.coord.left - helper.geo.origin.windowOffset.left),
				top: originParentOffset.top + (finalResult.coord.top - helper.geo.origin.windowOffset.top)
			};
			
			// set position values
			
			// again, in case functionPosition changed the side
			self._sideChange(finalResult.side);
			
			if (helper.geo.origin.fixedLineage) {
				self.instance.$tooltip
					.css('position', 'fixed');
			}
			else {
				// CSS default
				self.instance.$tooltip
					.css('position', '');
			}
			
			self.instance.$tooltip
				.css({
					left: finalResult.coord.left,
					top: finalResult.coord.top
				})
				.find('.tooltipster-box')
					.css('overflow', finalResult.contentOverflow)
					.end()
				.find('.tooltipster-arrow')
					.css({
						'left': '',
						'top': ''
					})
					.css(arrowCoord.prop, arrowCoord.val);
			
			// we need to set a size even if the tooltip is in its natural size
			// because when the tooltip is positioned beyond the width of the body
			// (which is by default the width of the window; it will happen when
			// you scroll the window horizontally to get to the origin), its text
			// content will otherwise break lines at each word to keep up with the
			// body overflow strategy.
			self.instance.$tooltip
				.css({
					height: finalResult.size.height,
					width: finalResult.size.width
				});
			
			// end positioning tests session and append the tooltip HTML element
			// to its parent
			self.instance._sizerEnd();
			
			return finalResult;
		}
	};
	
	$.tooltipster.displayPlugin[pluginName] = plugin;
	
})(jQuery);