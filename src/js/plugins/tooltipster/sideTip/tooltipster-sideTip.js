// sideTip is Tooltipster's default plugin.
// This file will be UMDified by a build task.

$.tooltipster.plugin({
	name: 'tooltipster.sideTip',
	instance: {
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
				// used to accomodate the arrow of tooltip if there is one.
				// First to make sure that the arrow target is not too close
				// to the edge of the tooltip, so the arrow does not overflow
				// the tooltip. Secondly when we reposition the tooltip to
				// make sure that it's positioned in such a way that the arrow is
				// still pointing at the target (and not a few pixels beyond it).
				// It should be equal to or greater than half the width of
				// the arrow (by width we mean the size of the side which touches
				// the side of the tooltip).
				minIntersection: 16,
				minWidth: 0,
				side: 'top'
				/*
				// TODO: these rules let the user choose what to do when the tooltip content
				// overflows. Right now the order of fallbacks is fixed :
				// - we're looking for a spot where the natural size of the tooltip can fit
				//   ('window.natural')
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
					'window.natural',
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
		 * Run once: at instantiation of the plugin
		 *
		 * @param {object} instance The tooltipster object that instantiated
		 * this plugin
		 */
		_init: function(instance) {
			
			var self = this;
			
			// list of instance variables
			
			self.instance = instance;
			self.options;
			self.previousState = 'closed';
			
			// initial formatting
			self._optionsFormat();
			
			self.instance._on('state', function(event) {
				
				if (event.state == 'closed') {
					self._close();
				}
				else if (event.state == 'appearing' && self.previousState == 'closed') {
					self._create();
				}
				
				self.previousState = event.state;
			});
			
			// reformat every time the options are changed
			self.instance._on('options', function() {
				self._optionsFormat();
			});
			
			self.instance._on('reposition', function(e) {
				self._reposition(e.event, e.helper);
			});
		},
		
		_close: function() {
			
			// detach our content object first, so the next jQuery's remove()
			// call does not unbind its event handlers
			if (typeof this.instance.Content == 'object' && this.instance.Content !== null) {
				this.instance.Content.detach();
			}
			
			// remove the tooltip from the DOM
			this.instance.$tooltip.remove();
		},
		
		/**
		 * Contains the HTML markup of the tooltip.
		 *
		 * @return {object} The tooltip, as a jQuery-wrapped HTML element
		 */
		_create: function() {
			
			// note: we wrap with a .tooltipster-box div to be able to set a margin on it
			// (.tooltipster-base must not have one)
			var $html = $(
				'<div class="tooltipster-base tooltipster-sidetip">' +
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
			
			this.instance.$tooltip = $html;
			
			// tell the instance that the tooltip element has been created
			this.instance._trigger('created');
		},
		
		/**
		 * (Re)compute this.options from the options declared to the instance
		 */
		_optionsFormat: function() {
			
			var defaults = this._defaults();
			
			this.options = $.extend(true, {}, defaults, this.instance.options);
			
			// for backward compatibility, deprecated in v4.0.0
			if (this.options.position) {
				this.options.side = this.options.position;
			}
			// $.extend merges arrays, we don't want that, we only want the
			// array provided by the user
			if (typeof this.instance.options.side == 'object') {
				this.options.side = this.instance.options.side;
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
			
			// let's transform:
			// 'top' into ['top', 'bottom', 'right', 'left']
			// 'right' into ['right', 'left', 'top', 'bottom']
			// 'bottom' into ['bottom', 'top', 'right', 'left']
			// 'left' into ['left', 'right', 'top', 'bottom']
			if (typeof this.options.side == 'string') {
				
				var opposites = {
					'top': 'bottom',
					'right': 'left',
					'bottom': 'top',
					'left': 'right'
				};
				
				this.options.side = [this.options.side, opposites[this.options.side]];
				
				if (this.options.side[0] == 'left' || this.options.side[0] == 'right') {
					this.options.side.push('top', 'bottom');
				}
				else {
					this.options.side.push('right', 'left');
				}
			}
			
			// misc
			// disable the arrow in IE6 unless the arrow option was explicitly set to true
			if (	$.tooltipster.env.IE === 6
				&&	this.options.arrow !== true
			) {
				this.options.arrow = false;
			}
		},
		
		/**
		 * This method must compute and set the positioning properties of the
		 * tooltip (left, top, width, height, etc.). It must also make sure the
		 * tooltip is eventually appended to its parent (since the element may be
		 * detached from the DOM at the moment the method is called).
		 *
		 * Plugin creators will at least have to use self.instance.$tooltip
		 *
		 * @param {object} helper An object that contains variables that plugin
		 * creators may find useful (see below)
		 * @param {object} helper.geo An object with many layout properties
		 * about objects of interest (window, document, origin). This should help
		 * plugin users compute the optimal position of the tooltip
		 */
		_reposition: function(event, helper) {
			
			var self = this,
				finalResult,
				testResults = {
					document: {},
					window: {}
				};
			
			// detach the tooltip while we make tests on a clone
			self.instance.$tooltip.detach();
			
			// we could actually provide the original element to the Ruler and
			// not a clone, but it just feels right to keep it out of the
			// machinery.
			var $clone = self.instance.$tooltip.clone(),
				// start position tests session
				ruler = $.tooltipster._getRuler($clone);
			
			// find which side can contain the tooltip without overflow.
			// We'll compute things relatively to window, then document if need be.
			$.each(['window', 'document'], function(i, container) {
				
				var stop = false;
				
				for (var i=0; i < self.options.side.length; i++) {
					
					var distance = {
							horizontal: 0,
							vertical: 0
						},
						side = self.options.side[i];
					
					if (side == 'top' || side == 'bottom') {
						distance.vertical = self.options.distance[side];
					}
					else {
						distance.horizontal = self.options.distance[side];
					}
					
					testResults[container][side] = {};
					
					// this may have an effect on the size of the tooltip if there are css
					// rules for the arrow or something else
					self._sideChange($clone, side);
					
					$.each(['natural', 'constrained'], function(i, mode) {
						
						// whether the tooltip can fit without any adjustments
						var fits = false,
							// check if the origin has enough surface on screen for the tooltip to
							// aim at it without overflowing the viewport (this is due to the thickness
							// of the arrow represented by the minIntersection length).
							// If not, the tooltip will have to be partly or entirely off screen in
							// order to stay docked to the origin
							whole,
							// get the size of the tooltip with or without size constraints
							rulerConfigured = (mode == 'natural') ?
								ruler.free() :
								ruler.constrain(
									helper.geo.available[container][side].width - distance.horizontal,
									helper.geo.available[container][side].height - distance.vertical
								),
							rulerResults = rulerConfigured.measure(),
							outerSize = {
								height: rulerResults.size.height + distance.vertical,
								width: rulerResults.size.width + distance.horizontal
							};
						
						
						if (side == 'top' || side == 'bottom') {
							
							whole = (
								helper.geo.origin.windowOffset.right >= self.options.minIntersection
								&&	helper.geo.window.size.width - helper.geo.origin.windowOffset.left >= self.options.minIntersection
							);
						}
						else {
							whole = (
								helper.geo.origin.windowOffset.bottom >= self.options.minIntersection
								&&	helper.geo.window.size.height - helper.geo.origin.windowOffset.top >= self.options.minIntersection
							);
						}
						
						if (mode == 'natural') {
							
							if(		helper.geo.available[container][side].width >= outerSize.width
								&&	helper.geo.available[container][side].height >= outerSize.height
							) {
								fits = true;
								naturalFits = true;
							}
						}
						else {
							
							fits = rulerResults.fits;
							
							if (fits) {
								constrainedFits = true;
							}
						}
						
						testResults[container][side][mode] = {
							fits: fits,
							whole: whole,
							distance: distance,
							outerSize: outerSize,
							size: rulerResults.size
						};
						
						// we don't need to compute more positions if we have
						// a natural one fully on screen
						if (mode == 'natural' && fits && whole) {
							stop = true;
							return false;
						}
					});
					
					// if we don't need to compute more sides
					if (stop) {
						// break the $.each loop
						return false;
					}
				}
			});
			
			// Based on tests, pick the side we'll use.
			
			// TODO: let the user choose the order of the positioning rules.
			// These 2 loops are gross WIP, still thinking about
			// a good way to make the order of fallbacks customizable
			$.each(['window', 'document'], function(i, container) {
				
				for (var i=0; i < self.options.side.length; i++) {
					
					var side = self.options.side[i];
					
					$.each(['natural', 'constrained'], function(i, mode) {
						
						if (	testResults[container][side]
							&&	testResults[container][side][mode]
							&&	testResults[container][side][mode].fits
								// prefer whole tooltips to (partly) off screen ones
							&&	testResults[container][side][mode].whole
						) {
							finalResult = testResults[container][side][mode];
							finalResult.container = container;
							finalResult.mode = mode;
							finalResult.side = side;
							return false;
						}
					});
					
					if (finalResult) {
						return false;
					}
				}
			});
			if (!finalResult) {
				$.each(['window', 'document'], function(i, container) {
					
					for (var i=0; i < self.options.side.length; i++) {
						
						var side = self.options.side[i];
						
						$.each(['natural', 'constrained'], function(i, mode) {
							
							if (	testResults[container][side]
								&&	testResults[container][side][mode]
								&&	testResults[container][side][mode].fits
							) {
								finalResult = testResults[container][side][mode];
								finalResult.container = container;
								finalResult.mode = mode;
								finalResult.side = side;
								return false;
							}
						});
						
						if (finalResult) {
							return false;
						}
					}
				});
			}
			
			// if everything failed, this falls back on the preferred side but the
			// tooltip will overflow the document
			if (!finalResult) {
				finalResult = testResults.document[self.options.side[0]].natural;
				finalResult.container = 'overflow';
				finalResult.mode = 'natural';
				finalResult.side = self.options.side[0];
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
			
			// if the tooltip is restricted to the viewport
			if (finalResult.container == 'window') {
				
				// but if the tooltip overflows the viewport, we'll move it accordingly (it will
				// not be centered on the middle of the origin anymore). We only move horizontally
				// for top and bottom tooltips and vice versa.
				if (finalResult.side == 'top' || finalResult.side == 'bottom') {
					
					// if there is an overflow on the left
					if (finalResult.coord.left < 0) {
						
						// prevent the overflow unless the origin itself gets off screen (minus the
						// margin needed to keep the arrow pointing at the target)
						if (helper.geo.origin.windowOffset.right - this.options.minIntersection >= 0) {
							finalResult.coord.left = 0;
						}
						else {
							finalResult.coord.left = helper.geo.origin.windowOffset.right - this.options.minIntersection - 1;
						}
					}
					// or an overflow on the right
					else if (finalResult.coord.left > helper.geo.window.size.width - finalResult.size.width) {
						
						if (helper.geo.origin.windowOffset.left + this.options.minIntersection <= helper.geo.window.size.width) {
							finalResult.coord.left = helper.geo.window.size.width - finalResult.size.width;
						}
						else {
							finalResult.coord.left = helper.geo.origin.windowOffset.left + this.options.minIntersection + 1 - finalResult.size.width;
						}
					}
				}
				else {
					
					// overflow at the top
					if (finalResult.coord.top < 0) {
						
						if (helper.geo.origin.windowOffset.bottom - this.options.minIntersection >= 0) {
							finalResult.coord.top = 0;
						}
						else {
							finalResult.coord.top = helper.geo.origin.windowOffset.bottom - this.options.minIntersection - 1;
						}
					}
					// or at the bottom
					else if (finalResult.coord.top > helper.geo.window.size.height - finalResult.size.height) {
						
						if (helper.geo.origin.windowOffset.top + this.options.minIntersection <= helper.geo.window.size.height) {
							finalResult.coord.top = helper.geo.window.size.height - finalResult.size.height;
						}
						else {
							finalResult.coord.top = helper.geo.origin.windowOffset.top + this.options.minIntersection + 1 - finalResult.size.height;
						}
					}
				}
			}
			
			
			// submit the positioning proposal to the user function which may choose to change
			// the side, size and/or the coordinates
			
			// first, set the rules that corresponds to the proposed side: it may change
			// the size of the tooltip, and the custom functionPosition may want to detect the
			// size of something before making a decision. So let's make things easier for the
			// implementor
			self._sideChange($clone, finalResult.side);
			
			// now unneeded, we don't want it passed to functionPosition
			delete finalResult.fits;
			delete finalResult.outerSize;
			
			// simplify this for the functionPosition callback
			finalResult.distance = finalResult.distance.horizontal || finalResult.distance.vertical;
			
			// allow the user to easily prevent its content from overflowing
			// if he constrains the size of the tooltip
			finalResult.contentOverflow = 'initial';
			
			// add some variables to the helper for the custom function
			helper.origin = self.instance.$origin[0];
			helper.tooltip = self.instance.$tooltip[0];
			helper.tooltipClone = $clone[0];
			helper.tooltipParent = self.options.parent[0];
			
			var edit = function(result) {
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
			
			// end the positioning tests session
			ruler.destroy();
			
			
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
				maxVal = finalResult.size.width - this.options.minIntersection;
			}
			else {
				
				arrowCoord = {
					prop: 'top',
					val: finalResult.target - finalResult.coord.top
				};
				maxVal = finalResult.size.height - this.options.minIntersection;
			}
			
			// cannot lie beyond the boundaries of the tooltip, minus the
			// arrow margin
			if (arrowCoord.val < this.options.minIntersection) {
				arrowCoord.val = this.options.minIntersection;
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
				// If we ever allow other types of parent, .tooltipster-ruler
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
			
			// set position values on the original tooltip element
			
			self._sideChange(self.instance.$tooltip, finalResult.side);
			
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
			
			// append the tooltip HTML element to its parent
			self.instance.$tooltip.appendTo(self.instance.options.parent);
			
			self.instance._trigger({
				type: 'repositioned',
				event: event,
				position: finalResult
			});
		},
		
		/**
		 * Make whatever modifications are needed when the side is changed. This has
		 * been made an independant method for easy inheritance in custom plugins based
		 * on this default plugin.
		 *
		 * @param {string} side
		 */
		_sideChange: function($obj, side) {
			
			$obj
				.removeClass('tooltipster-bottom')
				.removeClass('tooltipster-left')
				.removeClass('tooltipster-right')
				.removeClass('tooltipster-top')
				.addClass('tooltipster-'+ side);
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
		_targetFind: function(helper, side) {
			
			var target,
				rects = this.instance.$origin[0].getClientRects();
			
			// these lines fix a Chrome bug (issue #491)
			if (rects.length > 1) {
				var opacity = this.instance.$origin.css('opacity');
				if(opacity == 1) {
					this.instance.$origin.css('opacity', 0.99);
					rects = this.instance.$origin[0].getClientRects();
					this.instance.$origin.css('opacity', 1);
				}
			}
			
			// by default, the target will be the middle of the origin
			if (rects.length < 2) {
				
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
		}
	}
});

/* a build task will add "return $;" here */
