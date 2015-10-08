Tooltipster
===========

An extensible jQuery tooltip plugin by Caleb Jacob under MIT license.  
Compatible with Mozilla Firefox, Google Chrome, IE6+ and others. Requires jQuery 1.7+

A reminder of options/methods lies below. For detailed documentation, visit http://iamceege.github.io/tooltipster/

Standard options
-------------------------

animation  
autoClose  
closeOnClick  
content  
contentAsHTML  
contentCloning  
debug  
delay  
displayPlugin  
functionInit  
functionBefore  
functionReady  
functionAfter  
functionFormat  
interactive  
interactiveTolerance  
multiple  
onlyOne  
positionTracker  
positionTrackerCallback  
repositionOnScroll  
restoration  
speed  
timer  
theme  
touchDevices  
trigger  
updateAnimation  
zIndex  

Other options (available with the default display plugin)
-------------------------

arrow  
distance  
functionPosition  
maxWidth  
minWidth  
position  

Methods
-------------------------

$(...).tooltipster('close' [, callback])  
$(...).tooltipster('content')  
$(...).tooltipster('content', myNewContent)  
$(...).tooltipster('destroy')  
$(...).tooltipster('disable')  
$(...).tooltipster('elementOrigin')  
$(...).tooltipster('elementTooltip')  
$(...).tooltipster('enable')  
$(...).tooltipster('instance')  
$(...).tooltipster('open' [, callback])  
$(...).tooltipster('option', optionName)  
$(...).tooltipster('option', optionName, optionValue)  
$(...).tooltipster('reposition')  

$.fn.tooltipster('setDefaults', {})  
$.fn.tooltipster('instances' [, selector || element])  
$.fn.tooltipster('instancesLatest')  
$.fn.tooltipster('origins')  