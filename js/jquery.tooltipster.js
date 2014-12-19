/*! Tooltipster 4.0.0rc7 */

/**
 * Released on 2014-11-27
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
			autoHide: true,
			content: null,
			contentAsHTML: false,
			contentCloning: false,
			debug: true,
			delay: 200,
			displayPlugin: 'default',
			functionInit: function(origin) {},
			functionBefore: function(origin) {},
			functionReady: function(origin) {},
			functionAfter: function(origin) {},
			hideOnClick: false,
			icon: '(?)',
			iconCloning: true,
			iconDesktop: false,
			iconTouch: false,
			iconTheme: 'tooltipster-icon',
			interactive: false,
			interactiveTolerance: 350,
			multiple: false,
			onlyOne: false,
			// must be 'body' for now
			parent: 'body',
			positionTracker: false,
			positionTrackerCallback: function(origin) {
				// the default tracker callback will close the tooltip when the trigger is
				// 'hover' (see https://github.com/iamceege/tooltipster/pull/253)
				if (this.option('trigger') == 'hover' && this.option('autoHide')) {
					this.hide();
				}
			},
			restoration: 'none',
			returnObjects: false,
			speed: 350,
			timer: 0,
			theme: [],
			touchDevices: true,
			trigger: 'hover',
			updateAnimation: true,
			zIndex: 9999999
		};
	
	function Plugin(element, options) {
		
		// list of instance variables
		
		// stack of custom callbacks provided as parameters to API methods
		this.callbacks = {
			hide: [],
			show: []
		};
		this.checkInterval = null;
		// this will be the user content shown in the tooltip. A capital "C" is used
		// because there is also a method called content()
		this.Content;
		// an instance of the chosen display plugin
		this.displayPlugin;
		// this is the original element which is being applied the tooltipster plugin
		this.$el = $(element);
		// this will be the element which triggers the appearance of the tooltip on
		// hover/click/custom events. It will be the same as this.$el if icons are not
		// used (see in the options), otherwise it will correspond to the created icon
		this.$elProxy;
		this.geometry;
		this.enabled = true;
		this.mouseIsOverProxy = false;
		// a unique namespace per instance, for easy selective unbinding
		this.namespace = 'tooltipster-'+ Math.round(Math.random()*100000);
		// Status (capital S) can be either : appearing, shown, disappearing, hidden
		this.options = $.extend(true, {}, defaults, options);
		// the element the tooltip will be appended to
		this.$parent;
		this.Status = 'hidden';
		this.timerHide = null;
		this.timerShow = null;
		// this will be the tooltip element (jQuery wrapped HTML element)
		this.$tooltip;
		
		// for backward compatibility
		if (this.options.autoClose !== undefined) {
			this.options.autoHide = this.options.autoClose;
		}
		this.options.iconTheme = this.options.iconTheme.replace('.', '');
		
		if (typeof this.options.theme == 'string') {
			this.options.theme = [this.options.theme];
		}
		
		// launch
		this._init();
	}
	
	Plugin.prototype = {
		
		_init: function() {
			
			var self = this;
			
			// disable the plugin on old browsers (including IE7 and lower)
			if (document.querySelector) {
				
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
				
				// If content is provided in the options, its has precedence over the
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

				// detect if we're changing the tooltip origin to an icon
				// note about this condition : if the device has touch capability and
				// self.options.iconTouch is false, you'll have no icons event though you
				// may consider your device as a desktop if it also has a mouse. Not sure
				// why someone would have this use case though.
				if ((!deviceHasTouchCapability && self.options.iconDesktop) || (deviceHasTouchCapability && self.options.iconTouch)) {
					
					// TODO : the tooltip should be automatically be given an absolute
					// position to be near the origin. Otherwise, when the origin is floating
					// or what, it's going to be nowhere near it and disturb the position
					// flow of the page elements. It will imply that the icon also detects
					// when its origin moves, to follow it : not trivial.
					// Until it's done, the icon feature does not really make sense since
					// the user still has most of the work to do by himself
					
					// if the icon provided is in the form of a string
					if (typeof self.options.icon === 'string') {
						// wrap it in a span with the icon class
						self.$elProxy = $('<span class="'+ self.options.iconTheme +'"></span>');
						self.$elProxy.text(self.options.icon);
					}
					// if it is an object (sensible choice)
					else {
						// (deep) clone the object if iconCloning == true, to make sure
						// every instance has its own proxy. We use the icon without
						// wrapping, no need to. We do not give it a class either, as the
						// user will undoubtedly style the object on his own and since our
						// css properties may conflict with his own
						if (self.options.iconCloning) self.$elProxy = self.options.icon.clone(true);
						else self.$elProxy = self.options.icon;
					}
					
					self.$elProxy.insertAfter(self.$el);
				}
				else {
					self.$elProxy = self.$el;
				}
				
				// for 'click' and 'hover' triggers : bind on events to open the tooltip.
				// Closing is now handled in _showNow() because of its bindings.
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
					self.$elProxy
						.on('mouseenter.'+ self.namespace, function() {
							if (!deviceIsPureTouch() || self.options.touchDevices) {
								self.mouseIsOverProxy = true;
								self._show();
							}
						})
						.on('mouseleave.'+ self.namespace, function() {
							if (!deviceIsPureTouch() || self.options.touchDevices) {
								self.mouseIsOverProxy = false;
							}
						});
					
					// for touch interaction only
					if (deviceHasTouchCapability && self.options.touchDevices) {
						
						// for touch devices, we immediately display the tooltip because we
						// cannot rely on mouseleave to handle the delay
						self.$elProxy.on('touchstart.'+ self.namespace, function() {
							self._showNow();
						});
					}
				}
				else if (self.options.trigger == 'click') {
					
					// note : for touch devices, we do not bind on touchstart, we only rely
					// on the emulated clicks (triggered by taps)
					self.$elProxy.on('click.'+ self.namespace, function() {
						if (!deviceIsPureTouch() || self.options.touchDevices) {
							self._show();
						}
					});
				}
			}
		},
		
		_content_set: function(content) {
			// clone if asked. Cloning the object makes sure that each instance has its
			// own version of the content (in case a same object were provided for several
			// instances)
			// reminder : typeof null === object
			if (typeof content === 'object' && content !== null && this.options.contentCloning) {
				content = content.clone(true);
			}
			this.Content = content;
		},
		
		_content_insert: function() {
			
			var self = this,
				$d = this.$tooltip.find('.tooltipster-content');
			
			if (typeof self.Content === 'string' && !self.options.contentAsHTML) {
				$d.text(self.Content);
			}
			else {
				$d
					.empty()
					.append(self.Content);
			}
		},
		
		/**
		 * Force the browser to redraw (re-render) the tooltip immediately. This is required
		 * when you changed some CSS properties and need to make something with it
		 * immediately, without waiting for the browser to redraw at the end of instructions.
		 * 
		 * @see http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
		 */
		_forceRedraw: function(){
			
			// note : this would work but for Webkit only
			//this.$tooltip.hide();
			//this.$tooltip[0].offsetHeight;
			//this.$tooltip.show();
			
			// works in FF too
			var $p = this.$tooltip.parent();
			this.$tooltip.detach();
			this.$tooltip.appendTo($p);
		},
		
		/**
		 * Gather all information about dimensions and available space
		 */
		_geometry: function() {
			
			var	bcr = this.$elProxy[0].getBoundingClientRect(),
				$document = $(document),
				$window = $(window),
				// some useful properties of important elements
				geo = {
					document: {
						size: {
							height: $document.height(),
							width: $document.width()
						}
					},
					window: {
						size: {
							height: $window.height(),
							width: $window.width()
						},
						scroll: {
							left: window.scrollX,
							top: window.scrollY
						}
					},
					origin: {
						size: {
							height: bcr.bottom - bcr.top,
							width: bcr.right - bcr.left
						},
						offset: {
							left: bcr.left + window.scrollX,
							top: bcr.top + window.scrollY
						},
						windowOffset: bcr
					}
				};
			
			// the space that is available to display the tooltip, relatively to the viewport
			// and to the document
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
			
			return geo;
		},
		
		_interval_set: function() {
			
			var self = this;
			
			self.checkInterval = setInterval(function() {
				
				// if the tooltip and/or its interval should be stopped
				if (
						// if the origin has been removed
						$('body').find(self.$el).length === 0
						// if the elProxy has been removed
					||	$('body').find(self.$elProxy).length === 0
						// if the tooltip has been closed
					||	self.Status == 'hidden'
						// if the tooltip has somehow been removed
					||	$('body').find(self.$tooltip).length === 0
				) {
					// remove the tooltip if it's still here
					if (self.Status == 'shown' || self.Status == 'appearing') self.hide();
					
					// clear this interval as it is no longer necessary
					self._interval_cancel();
				}
				// if everything is alright
				else {
					// compare the former and current positions of the elProxy to reposition
					// the tooltip if need be
					if (self.options.positionTracker) {
						
						var g = self._geometry(),
							identical = false;
						
						// compare size first (a change requires repositioning too)
						if (areEqual(g.origin.size, self.geometry.origin.size)) {
							
							// for elements with a fixed position, we track the top and left
							// properties (relative to window)
							if (self.$elProxy.css('position') === 'fixed') {
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
		
		_interval_cancel: function() {
			clearInterval(this.checkInterval);
			// clean delete
			this.checkInterval = null;
		},
		
		// this function will schedule the opening of the tooltip after the delay, if
		// there is one
		_show: function() {
			
			var self = this;
			
			if (self.Status != 'shown' && self.Status != 'appearing') {
				
				if (self.options.delay) {
					self.timerShow = setTimeout(function() {
						
						// for hover trigger, we check if the mouse is still over the
						// proxy, otherwise we do not show anything
						if (self.options.trigger == 'click' || (self.options.trigger == 'hover' && self.mouseIsOverProxy)) {
							self._showNow();
						}
					}, self.options.delay);
				}
				else self._showNow();
			}
		},
		
		// this function will open the tooltip right away
		_showNow: function(callback) {
			
			var self = this;
			
			// call our constructor custom function before continuing
			if (self.options.functionBefore.call(self, self.$el[0]) !== false) {
				
				// continue only if the tooltip is enabled and has any content
				if (self.enabled && self.Content !== null) {
					
					// init the display plugin if it has not been initiated yet
					if (!this.displayPlugin) {
						var pluginClass = $.fn.tooltipster.displayPlugin[self.options.displayPlugin];
						if (pluginClass) {
							this.displayPlugin = new pluginClass(self, self.options);
						}
						else {
							throw new Error('The "' + self.options.displayPlugin + '" plugin is not defined');
						}
					}
					
					// save the method callback and cancel hide method callbacks
					if (callback) self.callbacks.show.push(callback);
					self.callbacks.hide = [];
					
					//get rid of any appearance timer
					clearTimeout(self.timerShow);
					self.timerShow = null;
					clearTimeout(self.timerHide);
					self.timerHide = null;
					
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
									ac = instance.option('autoHide');
								
								if (s !== 'hidden' && s !== 'disappearing' && ac) {
									instance.hide();
								}
							});
						});
					}
					
					var extraTime,
						finish = function() {
							self.Status = 'shown';
							
							// trigger any show method custom callbacks and reset them
							$.each(self.callbacks.show, function(i,c) { c.call(self, self.$el[0]); });
							self.callbacks.show = [];
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
								'-webkit-transition-duration': self.options.speed + 'ms',
								'-webkit-animation-duration': self.options.speed + 'ms',
								'-moz-transition-duration': self.options.speed + 'ms',
								'-moz-animation-duration': self.options.speed + 'ms',
								'-o-transition-duration': self.options.speed + 'ms',
								'-o-animation-duration': self.options.speed + 'ms',
								'-ms-transition-duration': self.options.speed + 'ms',
								'-ms-animation-duration': self.options.speed + 'ms',
								'transition-duration': self.options.speed + 'ms',
								'animation-duration': self.options.speed + 'ms'
							});
						
						if (self.options.interactive) {
							self.$tooltip.css('pointer-events', 'auto')
						}
						
						// insert the content
						self._content_insert();
						
						// determine the future parent
						if (typeof self.options.parent == 'string') {
							if (this.$parent == 'offsetParent') {
								this.$parent = self.$el.offsetParent();
							}
							else {
								this.$parent = $(self.options.parent);
							}
						}
						else {
							this.$parent = self.options.parent;
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
						self.options.functionReady.call(self, self.$el[0]);
						
						// will check if our tooltip origin is removed while the tooltip is
						// shown
						self._interval_set();
						
						// reposition on scroll (otherwise position:fixed element's tooltips
						// will move away form their origin) and on resize (in case position
						// can/has to be changed)
						$(window).on('scroll.'+ self.namespace +' resize.'+ self.namespace, function() {
							self.reposition();
						});
						
						// autoHide bindings
						if (self.options.autoHide) {
							
							// in case a listener is already bound for autoclosing (mouse or
							// touch, hover or click), unbind it first
							$('body').off('.'+ self.namespace);
							
							// here we'll have to set different sets of bindings for both touch
							// and mouse
							if (self.options.trigger == 'hover') {
								
								// if the user touches the body, hide
								if (deviceHasTouchCapability) {
									// timeout 0 : explanation below in click section
									setTimeout(function() {
										// we don't want to bind on click here because the
										// initial touchstart event has not yet triggered its
										// click event, which is thus about to happen
										$('body').on('touchstart.'+ self.namespace, function() {
											self.hide();
										});
									}, 0);
								}
								
								// if we have to allow interaction
								if (self.options.interactive) {
									
									// touch events inside the tooltip must not close it
									if (deviceHasTouchCapability) {
										self.$tooltip.on('touchstart.'+ self.namespace, function(event) {
											event.stopPropagation();
										});
									}
									
									// as for mouse interaction, we get rid of the tooltip only
									// after the mouse has spent some time out of it
									var tolerance = null;
									
									self.$elProxy.add(self.$tooltip)
										// hide after some time out of the proxy and the tooltip
										.on('mouseleave.'+ self.namespace + '-autoHide', function() {
											clearTimeout(tolerance);
											tolerance = setTimeout(function() {
												self.hide();
											}, self.options.interactiveTolerance);
										})
										// suspend timeout when the mouse is over the proxy or
										//the tooltip
										.on('mouseenter.'+ self.namespace + '-autoHide', function() {
											clearTimeout(tolerance);
										});
								}
								// if this is a non-interactive tooltip, get rid of it if the mouse leaves
								else {
									self.$elProxy.on('mouseleave.'+ self.namespace + '-autoHide', function() {
										self.hide();
									});
								}
								
								// close the tooltip when the proxy gets a click (common behavior of
								// native tooltips)
								if (self.options.hideOnClick) {
									
									self.$elProxy.on('click.'+ self.namespace + '-autoHide', function() {
										self.hide();
									});
								}
							}
							// here we'll set the same bindings for both clicks and touch on the body
							// to hide the tooltip
							else if (self.options.trigger == 'click') {
								
								// use a timeout to prevent immediate closing if the method was called
								// on a click event and if options.delay == 0 (because of bubbling)
								setTimeout(function() {
									$('body').on('click.'+ self.namespace +' touchstart.'+ self.namespace, function() {
										self.hide();
									});
								}, 0);
								
								// if interactive, we'll stop the events that were emitted from inside
								// the tooltip to stop autoClosing
								if (self.options.interactive) {
									
									// note : the touch events will just not be used if the plugin is
									// not enabled on touch devices
									self.$tooltip.on('click.'+ self.namespace +' touchstart.'+ self.namespace, function(event) {
										event.stopPropagation();
									});
								}
							}
						}
					}
					
					// if we have a timer set, let the countdown begin
					if (self.options.timer > 0) {
						
						self.timerHide = setTimeout(function() {
							self.timerHide = null;
							self.hide();
						}, self.options.timer + extraTime);
					}
				}
			}
		},
		
		/**
		 * Append the tooltip to its parent after the size tests are over and get rid
		 * of the test container.
		 */
		_sizerEnd: function() {
			
			var $sizer = this.$tooltip.parent();
			
			this.$tooltip
				.appendTo(this.$parent)
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
				self.hide();
			}
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
			
			self.hide();
			
			// remove the icon, if any
			if (self.$el[0] !== self.$elProxy[0]) {
				self.$elProxy.remove();
			}
			
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
			
			return self;
		},
		
		disable: function() {
			// hide first, in case the tooltip would not disappear on its own (autoHide false)
			this.hide();
			this.enabled = false;
			return this;
		},
		
		elementIcon: function() {
			return (this.$el[0] !== this.$elProxy[0]) ? this.$elProxy[0] : undefined;
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
		
		hide: function(callback) {
			
			var self = this;
			
			// save the method custom callback and cancel any show method custom callbacks
			if (callback) self.callbacks.hide.push(callback);
			self.callbacks.show = [];
			
			// get rid of any appearance timeout
			clearTimeout(self.timerShow);
			self.timerShow = null;
			clearTimeout(self.timerHide);
			self.timerHide = null;
			
			var finishCallbacks = function() {
				// trigger any hide method custom callbacks and reset them
				$.each(self.callbacks.hide, function(i,c) { c.call(self, self.$el[0]); });
				self.callbacks.hide = [];
			};
			
			// hide
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
					
					// unbind any auto-closing click/touch listeners
					$('body').off('.'+ self.namespace);
					
					// unbind any auto-closing click/touch listeners
					$('body').off('.'+ self.namespace);
					
					// unbind any auto-closing hover listeners
					self.$elProxy.off('.'+ self.namespace + '-autoHide');
					
					// call our constructor custom callback function
					self.options.functionAfter.call(self, self.$el[0]);
					
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
		
		/**
		 * Get or set options. For internal use and advanced users only.
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
			
			// in case the tooltip has been removed from DOM manually
			if (tooltipIsDetached || $('body').find(self.$tooltip).length !== 0) {
				
				if (!tooltipIsDetached) {
					// detach in case the tooltip overflows the window and adds scrollbars
					// to it, so _geometry can be accurate
					self.$tooltip.detach();
				}
				
				// refresh the geometry object before passing it as a helper
				self.geometry = self._geometry();
				
				// call the display plugin
				this.displayPlugin.reposition({
					geo: self.geometry
				});
			}
			
			return self;
		},
		
		/**
		 * The public show() method is actually an alias for the private _showNow() method
		 * @see self::_showNow
		 */
		show: function(callback) {
			this._showNow(callback);
			return this;
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
			contentCloningWarning = 'You are using a single HTML element as content for several tooltips. You should probably be using the contentCloning option.';
		
		// if we are not in the context of jQuery wrapped HTML element(s) :
		// this happens when calling static methods in the form $.fn.tooltipster('methodName')
		// or when calling $(sel).tooltipster('methodName or options') where $(sel) does
		// not match anything
		if (this.length === 0) {
			
			// if the first argument is a method name
			if (typeof args[0] === 'string') {
				
				var methodIsStatic = true;
				
				// list static methods here (usable by calling $.fn.tooltipster('methodName');)
				switch (args[0]) {
					
					case 'setDefaults':
						// change default options for all future instances
						$.extend(defaults, args[1]);
						break;
					
					default:
						methodIsStatic = false;
						break;
				}
				
				// $.fn.tooltipster('methodName') calls will return true
				if (methodIsStatic) return true;
				// $(sel).tooltipster('methodName') calls will return the list of
				// objects event though it's empty because chaining should work on
				// empty lists
				else return this;
			}
			// the first argument is undefined or an object of options : we are
			// initalizing but there is no element matched by selector
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
						// itself (which implies chaining)
						if (resp !== self) {
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
				
				var objects = [],
					// is there a defined value for the multiple option in the options object ?
					multipleIsSet = args[0] && args[0].multiple !== undefined,
					// if the multiple option is set to true, or if it's not defined but
					// set to true in the defaults
					multiple = (multipleIsSet && args[0].multiple) || (!multipleIsSet && defaults.multiple),
					// same for content
					contentIsSet = args[0] && args[0].content !== undefined,
					content = (contentIsSet && args[0].content) || (!contentIsSet && defaults.content);
					// same for contentCloning
					contentCloningIsSet = args[0] && args[0].contentCloning !== undefined,
					contentCloning = (contentCloningIsSet && args[0].contentCloning) || (!contentCloningIsSet && defaults.contentCloning);
					// same for debug
					debugIsSet = args[0] && args[0].debug !== undefined,
					debug = (debugIsSet && args[0].debug) || (!debugIsSet && defaults.debug);
					// same for returnObjects
					roIsSet = args[0] && args[0].returnObjects !== undefined,
					returnObjects = (roIsSet && args[0].returnObjects) || (!roIsSet && defaults.returnObjects);
				
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
						ns = $(this).data('tooltipster-ns'),
						obj = null;
					
					if (!ns) {
						go = true;
					}
					else if (multiple) {
						go = true;
					}
					else if (debug) {
						console.log('Tooltipster: one or more tooltips are already attached to this element: ignoring. You might want to check out the "multiple" option.');
					}
					
					if (go) {
						obj = new Plugin(this, args[0]);
						
						// save the reference of the new instance
						if (!ns) ns = [];
						ns.push(obj.namespace);
						$(this).data('tooltipster-ns', ns)
						
						// save the instance itself
						$(this).data(obj.namespace, obj);
						
						// call our constructor custom function
						obj.options.functionInit.call(obj, this);
					}
					
					objects.push(obj);
				});
				
				if (multiple || returnObjects) return objects;
				else return this;
			}
		}
	};
	
	// will collect plugins
	$.fn.tooltipster.displayPlugin = {};
	
	// quick & dirty compare function, not bijective nor multidimensional
	function areEqual(a,b) {
		var same = true;
		$.each(a, function(i, el) {
			if (b[i] === undefined || a[i] !== b[i]) {
				same = false;
				return false;
			}
		});
		return same;
	}
	
	// detect if this device can trigger touch events
	var deviceHasTouchCapability = !!('ontouchstart' in window);
	
	// we'll assume the device has no mouse until we detect any mouse movement
	var deviceHasMouse = false;
	$('body').one('mousemove', function() {
		deviceHasMouse = true;
	});
	
	function deviceIsPureTouch() {
		return (!deviceHasMouse && deviceHasTouchCapability);
	}
	
	// detecting support for CSS transitions
	function supportsTransitions() {
		var b = document.body || document.documentElement,
			s = b.style,
			p = 'transition';
		
		if (typeof s[p] == 'string') {return true; }

		v = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'],
		p = p.charAt(0).toUpperCase() + p.substr(1);
		for(var i=0; i<v.length; i++) {
			if (typeof s[v[i] + p] == 'string') { return true; }
		}
		return false;
	}
})(jQuery);


/**
 * The default display plugin
 */
;(function($) {
	
	var pluginName = 'default',
		/** 
		 * @param {object} tooltipster The tooltipster instance that instantiated this plugin
		 * @param {object} options Options, @see self::defaults()
		 */
		plugin = function(tooltipster, options) {
			
			// list of instance variables
			
			this.options = $.extend(true, this.defaults(), options);
			this.tooltipster = tooltipster;
			
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
				arrow: true,
				distance: 6,
				functionPosition: function(){},
				minHeight: 0,
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
		 * @param {object} $tooltip The jQuery-wrapped HTML root element of the tooltip
		 * @param {object} $parent The jQuery-wrapped HTML element that tooltip must be
		 * appended to at the end of the call
		 * @param {object} helper An object that contains variables that plugin
		 * creators may find useful (see below)
		 * @param {object} helper.geo An object with many properties (size, positioning)
		 * about objects of interest (window, document, origin). This should help plugin
		 * users to compute the optimal position of the tooltip
		 * @param {object} helper.tooltipster The Tooltipster instance which calls this
		 * method. Plugin creators will at least have to use tooltipster.$tooltip and
		 * tooltipster.$parent. Also, some of its methods may help plugin creators,
		 * especially its _sizer internal methods that help measure the size of the
		 * tooltip in various conditions.
		 */
		reposition: function(helper) {
			
			var self = this;
			
			// start position tests session
			self.tooltipster._sizerStart();
			
			var finalResult,
				testResults = {
					document: {},
					window: {}
				};
			
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
			
			// include the tooltip and parent in the helper for the custom function
			helper.$tooltip = self.tooltipster.$tooltip;
			helper.$parent = self.tooltipster.$parent;
			
			var customResult = self.options.functionPosition.call(self, helper, $.extend(true, {}, finalResult));
			if (customResult) {
				finalResult = customResult;
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
			
			// let's convert the window-relative coordinates into coordinates relative to the
			// future positioned parent that the tooltip will be appended to
			
			if (self.tooltipster.$parent[0].tagName.toLowerCase() == 'body') {
				var originParentOffset = {
					left: helper.geo.origin.windowOffset.left + helper.geo.window.scroll.left,
					top: helper.geo.origin.windowOffset.top + helper.geo.window.scroll.top
				};
			}
			else {
				// TODO. right now $parent cannot be something other than <body>.
				// when we do this, .tooltipster-sizer will have to be appended to the parent
				// to inherit css style values that affect the display of the text and such
			}
			
			finalResult.coord = {
				left: originParentOffset.left + (finalResult.coord.left - helper.geo.origin.windowOffset.left),
				top: originParentOffset.top + (finalResult.coord.top - helper.geo.origin.windowOffset.top)
			};
			
			// set position values
			
			// again, in case positionFunction changed the position
			self.position_change(finalResult.position);
			
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
			if (finalResult.size.sizeMode == 'constrained') {
				
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
	
	$.fn.tooltipster.displayPlugin[pluginName] = plugin;
})(jQuery);