/*

Tooltipster 1.0 | 8/2/12
A rockin' custom tooltip jQuery plugin

Developed by: Caleb Jacob - calebjacob.com
Copyright (C) 2012 Caleb Jacob

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/



(function( $ ) {

	$.fn.tooltipster = function( options ) {
		
		// Default settings
		var settings = $.extend({
			animation: 'fade',
			arrow: true,
			arrowColor: '',
			delay: 200,
			fixedWidth: 0,
			followMouse: false,
			offsetX: 0,
			offsetY: 0,
			overrideText: '',
			position: 'top',
			speed: 200,
			timer: 0,
			tooltipTheme: '.tooltip-message'
		}, options);
		
		return this.hover(function() {
		
			// Disable horizontal scrollbar to keep overflowing tooltips from creating one
			$("body").css("overflow-x", "hidden");
			
			// Get tooltip text from the title attr
			var tooltip_text = $(this).attr('title');
			//$('body').prepend('<div id="tooltip-text-saver">'+ $(this).attr('title') +'</div>');
			$(this).attr('title', '');
			
			
			// If a text override has been set, use that instead for the tooltip text
			if($.trim(settings.overrideText).length > 0) {
				var tooltip_text = settings.overrideText;
			}
			
			// If a fixed width has been set, set the tooltip to that width
			if(settings.fixedWidth > 0) {
				var fixedWidth = ' style="width:'+ settings.fixedWidth +'px;"';
			}
			else {
				var fixedWidth = '';
			}
			
			// Remove the title attribute to keep the default tooltip from popping up and append the base HTML for the tooltip
			$('<div class="'+ settings.tooltipTheme.replace('.','') +'"'+ fixedWidth +'><div class="tooltip-message-content">'+tooltip_text+'</div></div>').appendTo('body').hide();
			
			// If the tooltip doesn't follow the mouse, determine the placement
			if (settings.followMouse == false) {
				
				// Find global variables to determine placement
				var container_width = $(this).outerWidth(false);
				var container_height = $(this).outerHeight(false);
				var tooltip_width = $(settings.tooltipTheme).not('.tooltip-kill').outerWidth(false);
				var tooltip_height = $(settings.tooltipTheme).not('.tooltip-kill').outerHeight(false);
				var offset = $(this).offset();
			
				if(settings.position == 'top') {
					var left_difference = (offset.left + tooltip_width) - (offset.left + $(this).outerWidth(false));
					var me_left =  (offset.left + settings.offsetX) - (left_difference / 2);
					var me_top = (offset.top - tooltip_height) - settings.offsetY - 10;
				}
				
				if(settings.position == 'top-left') {
					var me_left = offset.left + settings.offsetX;
					var me_top = (offset.top - tooltip_height) - settings.offsetY - 10;
				}
				
				if(settings.position == 'top-right') {
					var me_left = (offset.left + container_width + settings.offsetX) - tooltip_width;
					var me_top = (offset.top - tooltip_height) - settings.offsetY - 10;
				}
				
				if(settings.position == 'bottom') {
					var left_difference = (offset.left + tooltip_width + settings.offsetX) - (offset.left + $(this).outerWidth(false));
					var me_left =  offset.left - (left_difference / 2);
					var me_top = (offset.top + container_height) + settings.offsetY + 10;
				}
				
				if(settings.position == 'bottom-left') {
					var me_left = offset.left + settings.offsetX;
					var me_top = (offset.top + container_height) + settings.offsetY + 10;
				}
				
				if(settings.position == 'bottom-right') {
					var me_left = (offset.left + container_width + settings.offsetX) - tooltip_width;
					var me_top = (offset.top + container_height) + settings.offsetY + 10;
				}
				
				if(settings.position == 'left') {
					var me_left = offset.left - settings.offsetX - tooltip_width - 10;
					var top_difference = (offset.top + tooltip_height + settings.offsetY) - (offset.top + $(this).outerHeight(false));
					var me_top =  offset.top - (top_difference / 2);
				}
				
				if(settings.position == 'right') {
					var me_left = offset.left + settings.offsetX + container_width + 10;
					var top_difference = (offset.top + tooltip_height + settings.offsetY) - (offset.top + $(this).outerHeight(false));
					var me_top =  offset.top - (top_difference / 2);
				}
			}
			
			// Find variables to determine placement if set to mouse
			if (settings.followMouse == true) {
			
				var tooltip_width = $(settings.tooltipTheme).not('.tooltip-kill').outerWidth(false);
				var tooltip_height = $(settings.tooltipTheme).not('.tooltip-kill').outerHeight(false);
				var tooltip_content = $(settings.tooltipTheme).not('.tooltip-kill').find('.tooltip-message-content').html();
				
				
				$(this).mousemove(function(e){
					
					$(settings.tooltipTheme).not('.tooltip-kill').find('.tooltip-message-content').html('').html(tooltip_content);
					var tooltip_height = $(settings.tooltipTheme).not('.tooltip-kill').outerHeight(false);
					
					if(settings.position == 'top') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': ((e.pageX - 1) - (tooltip_width / 2) + settings.offsetX) + 'px',
							'top': ((e.pageY - tooltip_height - 2) - settings.offsetY - 10) + 'px'
						});
					}
					
					if(settings.position == 'top-right') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': e.pageX - 8 + settings.offsetX + 'px',
							'top': ((e.pageY - tooltip_height - 2) - settings.offsetY - 10) + 'px'
						});
					}
					
					if(settings.position == 'top-left') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': (e.pageX - tooltip_width + settings.offsetX) + 7 + 'px',
							'top': ((e.pageY - tooltip_height - 2) - settings.offsetY - 10) + 'px'
						});
					}
					
					if(settings.position == 'bottom') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': (e.pageX - (tooltip_width / 2) + settings.offsetX - 1) + 'px',
							'top': (e.pageY + 15 + settings.offsetY + 10) + 'px'
						});
					}
					
					if(settings.position == 'bottom-right') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': e.pageX - 2 + settings.offsetX + 'px',
							'top': (e.pageY + 15 + settings.offsetY + 10) + 'px'
						});
					}
					
					if(settings.position == 'bottom-left') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': (e.pageX - tooltip_width + settings.offsetX) + 12 + 'px',
							'top': (e.pageY + 15 + settings.offsetY + 10) + 'px'
						});
					}
					
					if(settings.position == 'bottom-left') {
						$(settings.tooltipTheme).not('.tooltip-kill').css({
							'left': (e.pageX - tooltip_width + settings.offsetX) + 12 + 'px',
							'top': (e.pageY + 15 + settings.offsetY + 10) + 'px'
						});
					}
					
      			});
			
			}
			
			// If arrow is set true, style it and append it
			if (settings.arrow == true){
				
				var arrow_class = 'tooltip-arrow-' + settings.position;
				
				if (settings.followMouse == true) {
					if(arrow_class.search('right') > 0) {
						var temp_arrow_class = arrow_class;
						arrow_class = temp_arrow_class.replace('right', 'left');
					}
					else {
						var temp_arrow_class = arrow_class;
						arrow_class = temp_arrow_class.replace('left', 'right');
					}
					
				}
				
				if(arrow_class == 'tooltip-arrow-right') {
					var arrow_type = '◀';
					var arrow_vertical = 'top:' + ((tooltip_height / 2) - 5) + 'px';
				}
				if(arrow_class == 'tooltip-arrow-left') {
					var arrow_type = '▶';
					var arrow_vertical = 'top:' + ((tooltip_height / 2) - 4) + 'px';
				}
				if(arrow_class.search('top') > 0) {
					var arrow_type = '▼';
				}
				if(arrow_class.search('bottom') > 0) {
					var arrow_type = '▲';
				}
				
				if(settings.arrowColor.length < 1) {
					var arrow_color = $(settings.tooltipTheme).not('.tooltip-kill').css('background-color');
				}
				else {
					var arrow_color = settings.arrowColor;
				}
												
				var arrow = '<div class="'+ arrow_class +' tooltip-arrow" style="color:'+ arrow_color +'; width:'+ tooltip_width +'px; display:none; '+ arrow_vertical +'">'+ arrow_type +'</div>';
				
			}
			else {
				var arrow = '';
			}
			
			// Place tooltip
			$(settings.tooltipTheme).not('.tooltip-kill').css({'top': me_top+'px', 'left': me_left+'px'}).append(arrow);
			
			// Determine how to animate the tooltip in
			if(settings.animation == 'slide') {
				
				$(settings.tooltipTheme).not('.tooltip-kill').delay(settings.delay).slideDown(settings.speed, function() { 
					$('.tooltip-arrow').fadeIn(settings.speed); 
				});
				
				// If there is a timer, slide it out once the time runs out
				if(settings.timer > 0) {
					$(settings.tooltipTheme).not('.tooltip-kill').delay(settings.timer).slideUp(settings.speed);
				}
				
			}
			
			else {
				
				$('.tooltip-arrow').show();
				$(settings.tooltipTheme).not('.tooltip-kill').delay(settings.delay).fadeIn(settings.speed);
				
				// If there is a timer, fade it out once the time runs out
				if(settings.timer > 0) {
					$(settings.tooltipTheme).not('.tooltip-kill').delay(settings.timer).fadeOut(settings.speed);
				}
				
			}
			
			
			
	
		}, function() {
		
			$(settings.tooltipTheme).not('.tooltip-kill').clearQueue();
						
			var tooltip_text = $(settings.tooltipTheme).not('.tooltip-kill').find('.tooltip-message-content').html();
			$(this).attr('title', tooltip_text);
			
			
			$(settings.tooltipTheme).addClass('tooltip-kill');
			
			$('.tooltip-message').remove();
			
			if(settings.animation == 'slide') {
			
				$('.tooltip-kill').slideUp(settings.speed, function() {
					$('.tooltip-kill').remove();
					$('.tooltip-kill .tooltip-arrow').remove();
					$("body").css("overflow-x", "auto");
				});
			}
			
			else {
				
				$('.tooltip-kill').fadeOut(settings.speed, function() {
					$('.tooltip-kill').remove();
					$('.tooltip-kill .tooltip-arrow').remove();
					$("body").css("overflow-x", "auto");
				});
			}
			

			
		});
	
	}
	
})( jQuery );