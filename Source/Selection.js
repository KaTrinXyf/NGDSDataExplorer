// Set selected features and active layers and features

// Allow for selecting/unselecting a feature and set options	
function MakeSelectable(){
	selectCtrl = new OpenLayers.Control.SelectFeature(wfsLayers, {
		clickout: false, 
		toggle: true,
		multiple: true,
		hover: false,
		box: true
	});
	map.addControl(selectCtrl); 
	selectCtrl.activate();
	
	wfsLayers[j].events.on({
		"featureselected": function(e) {
			if (showPopups == true){
				CreatePopup(e.feature);
				}
			//console.log(e.feature);
			//console.log("selected feature "+e.feature.id+" on "+e.feature.layer.name);
			
			// Add the selected feature to the list of selected features
			selFeatures.push(e.feature);
			//console.log(selFeatures);
			
			// If an active layer has been set and if the selected feature is in the active layer add it to activeFeatures
			if (activeLayer != undefined) {
				if (e.feature.layer.name == activeLayer.name){
					// If all features of the layer had been added to activeFeatures
					// (ie. no individual features had been selected previously)
					// clear activeFeatures first
					if (activeLayer.features.length == activeFeatures.length) {
						activeFeatures = [];
					}
					activeFeatures.push(e.feature);
				}
			}
			//console.log("features:");
			//console.log(selFeatures);
			//console.log("activeFeatures:");
			//console.log(activeFeatures);
		},
		"featureunselected": function(e) {
			// If a popup has been opened, close it on unselect
			if (popup != undefined)
				popup.close();
				
			// Remove selected feature from features array
			selFeatures.splice(selFeatures.indexOf(e.feature), 1);
			//console.log(selFeatures);
			
			// If an active layer has been set and is the same layer as the layer of the feature that has just been unselected
			// Remove the feature from activeFeatures but if it was the feature in activeFeatures and activeFeatures is now empty
			// Then all features of the active layer are active features
			if (activeLayer != undefined) {
				if (e.feature.layer.name == activeLayer.name){
					activeFeatures.splice(activeFeatures.indexOf(e.feature), 1);
					if (activeFeatures.length == 0)
						activeFeatures = activeLayer.features;
				}
				//console.log(activeFeatures);
			}
		},
		"boxselectionend": function (e) {
			//console.log(e.feature);
			//console.log("selected feature "+e.feature.id+" on "+e.feature.layer.name);
			
			// Add the selected feature to the list of selected features
			selFeatures.push(e.feature);
			//console.log(selFeatures);
			
			// If an active layer has been set and is the same layer as the layer of the feature that has just been selected
			// add the feature to activeFeatures
			if (activeLayer != undefined) {
				if (e.feature.layer.name == activeLayer.name){
					// If all features of the layer had been added to activeFeatures
					// (ie. no individual features had been selected previously)
					// clear activeFeatures first
					if (activeLayer.features.length == activeFeatures.length) {
						activeFeatures = [];
					}
					activeFeatures.push(e.feature);
				}
			}
			//console.log("features:");
			//console.log(selFeatures);
			//console.log("activeFeatures:");
			//console.log(activeFeatures);
		}	
		//console.log(selFeatures);
	});
}

// Set node paramater as the active layer and set the active features for that layer
function SetActive(node){
	//console.log("activeLayer name:");
	//console.log(node.layer.name);
	//console.log("node:");
	//console.log(node);
	//console.log(selFeatures);
	
	// Don't set the active layer if baselayer or a folder clicked
	if (node.text != "Map Layer" && node.text != "Google Hybrid" && node.text != "polyLayer"){
		if (node.layer.features != undefined) {
			// Set selected layer to the layer the user clicked
			activeLayer = node.layer;
			
			// No features have been selected so set all features in active layer as the active features
			if (selFeatures.length == 0){
				activeFeatures = activeLayer.features;
			}
			else{
				// Clear activeFeatures
				activeFeatures = [];
			
				// For each selected feature add it to activeFeatures only if in the active layer
				for (var i = 0; i < selFeatures.length; i++) {
					if (activeLayer.name == selFeatures[i].layer.name)
						activeFeatures.push(selFeatures[i]);
				}
				
				// If none of the selected features are in the active layer add all features in that layer to activeFatures
				if (activeFeatures.length == 0){
					activeFeatures = activeLayer.features;				
				}					
			}
		}
	}
	else {
		activeLayer = undefined;
		activeFeatures = [];
	}
	//console.log("activeFeatures:");
	//console.log(activeFeatures);
}

// Select the features that intersect the user-drawn polygon(s)							!!!!!!!!!!!!!!!!!!!!!  Not being used  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function PolyLayerSelect(){
	polyLayer.events.on({
		"sketchcomplete": function(e) {
			wfsLayers.filter = new OpenLayers.Filter.Spatial({
				type: OpenLayers.Filter.Spatial.INTERSECTS,
				value: e.feature.geometry
			});
			//wfsLayers.filter.select();
			console.log(wfsLayers);
			console.log(wfsLayers.filter);
		}
	})
}