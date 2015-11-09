SVG.extend(SVG.Polyline, SVG.Polygon, SVG.Path, {
	
	screenBBox: function(){
		
		var arr = JSON.parse(JSON.stringify(this.array().valueOf()))    // path/point array
			, i = arr.length                        // length of array, we need it later
			, p = this.doc().node.createSVGPoint()  // instance of SVGPoint
			, m = this.screenCTM().native()         // matrix for transfomation
			, pos = [,0,0]                           // default position (for V and H in Path)
			, transformPoints = function(arr){      // function to transform all points in arr (returns the last)
			
			var transP
			
			// loop trough all coordinates and transform them
			for(var i = 1, len = arr.length; i < len; i+=2){
				p.x = arr[i]
				p.y = arr[i+1]
				
				transP = p.matrixTransform(m)
				
				arr[i]   = transP.x
				arr[i+1] = transP.y
			}
			
			// return last computed values
			return [transP.x, transP.y]
			
		}
		
		// in case of polygon or polyline we need to normalize it to a path
		if(this instanceof SVG.Polygon || this instanceof SVG.Polyline){
			
			// just add the L
			while(i--){
				arr[i].unshift('L')
			}
			
			// first has to be M
			arr[0][0] = 'M'
			
		}
		
		// in case of polygon close the path accordingly
		if(this instanceof SVG.Polygon){
			arr.push(['z'])
		}
		
		// loop through path array and transform all points
		for(i = 0, len = arr.length; i < len; ++i){
			
			// get path segment
			var s = arr[i][0]
			
			// coordinate list
			if (s == 'M' || s == 'L' || s == 'C' || s == 'S' || s == 'Q' || s == 'T'){
				pos = [,arr[i][1], arr[i][2]]
				transformPoints(arr[i])
				// We have to transform it to Line cause vertical and horiz0ntal lines could be rotated
			}else if (s == 'H' || s == 'V'){
				pos[s == 'H' ? 1 : 2] = arr[i][1]
				var transP = transformPoints(pos.slice())
				arr[i][0] = 'L'
				arr[i][1] = transP[0]
				arr[i][2] = transP[1]
				// position is the last one in arc
			}else if (s == 'A'){
				pos = [,arr[i][6], arr[i][7]]
				var transP = transformPoints(pos.slice())
				arr[i][6] = transP[0]
				arr[i][7] = transP[1]
			}
			
		}
		
		// return bbox of created path array
		return (new SVG.PathArray(arr)).bbox()
		
	}
	
})