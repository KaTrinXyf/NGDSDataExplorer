/*************************************************************************************************************************************************
/	NGDS Data Explorer
/ 
/	The National Geothermal Data System (NGDS) Data Explorer was developed to be a lightweight, open-source, publicly-accessible web mapping
/ 	application which facilitates the discovery of geothermal features without the need to switch between multiple interfaces. An integrated search
/	of the U.S. Geoscience Information Network (USGIN) Association of American State Geologists (AASG) Geothermal Data Catalog will list relevant
/	web feature services available for attribute querying and display on a map. The search can be limited to a specific geographical extent for further
/	refinement. Once added to the map, attributes for features can either be shown in a feature popup or a table. Users can also select features from
/	different data services for display in a single table. The NGDS Data Explorer is primarily for geologists and other researchers needing a
/	quick and easy way to retrieve information about U.S. geothermal features without the need for software beyond a web browser or the knowledge of
/	who hosts which services. 
/	To be accessed at http://data.geothermaldatasystem.org/
/	Developed by Jessica Good Alisdairi at the Arizona Geological Survey
/ 	
/	Utilizes OpenLayers v2.13.1, GeoExt v1.1 and ExtJs v3.4
/************************************************************************************************************************************************/

// Global Variables
var map;					// The map
var wfsLayers = [];  		// Array of WFS Layers
var l = 0;					// Variable to keep track of the number of layers added
var popup;					// The popup for the description of a feature
var showPopups = false;		// We don't want to show popups until user has clicked 'show popups' button
var activeLayer;			// Current active layer
var numOfAttributes;   		// Only needed for EXCEL - can delete
var layerAttributes;		// The attributes of the layer
var zoomBoxCtrl;
var selectCtrl; 			// Control for the selection of individual features
var selectBoxCtrl;			// Control for the selection of mulitple features by drawing a box
var selectBox = false;		// The 'select box' is not initially pressed
var searchField = "AnyText";// The field being searched in the catalog
var searchTerm = "";		// The term being searched for in the catalog
var gridPanel;				// The grid panel to display the results of the catalog search
var layersPanel;			// The panel for the layers of the map
var store;					// The store to hold the results of the catalog search
var curRow = 0;				// Currently selected row in the csw grid
var useVisibleExtent = false;// Boolean for whether Use Current Map Extent for the search is checked or not
var bounds;					// The bounds of the map
var measureCtrl;			// Control for the distance measurement tool
var hits;					// Number of features in the data service layer being requested
var maxLeftB, maxRightB;	// Maximum left and right bounds of all layers
var maxTopB, maxBottomB;	// Maximum top and bottom bounds of all layers
var layersInfo;				// Info for the layer pulled from http://schemas.usgin.org/contentmodels.json

// Projections
var wgs84 = new OpenLayers.Projection("EPSG:4326");
var googleMercator = new OpenLayers.Projection("EPSG:900913");

Ext.onReady(function() {
	// Initialize QuickTips for toolbar tips on mouseover
	Ext.QuickTips.init();
	
	// Set up the proxy
	OpenLayers.ProxyHost = "/proxy?url=";
	
	// Initialize the map
	map = new OpenLayers.Map('map', {
		maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
		// Add the map controls
		controls: [
			new OpenLayers.Control.Navigation(),	
			new OpenLayers.Control.PanPanel(),										// Create a control for panning the map in small steps
			new OpenLayers.Control.MousePosition({ displayProjection: wgs84 }),		// Display georgaphic coordinates of the mouse pointer
			new OpenLayers.Control.ScaleLine(),										// Create a scale line
			new OpenLayers.Control.OverviewMap({ maximized: true }) 				// Create an overview map
		]
	});
	
	// Use Google Maps as base layers
	var ghyb = new OpenLayers.Layer.Google(
		"Google Hybrid",
		{type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20, isBaseLayer:true, displayInLayerSwitcher:true}
	);
	var gter = new OpenLayers.Layer.Google(
		"Google Terrain",
		{type: google.maps.MapTypeId.TERRAIN, numZoomLevels: 20, isBaseLayer:true, displayInLayerSwitcher:true}
	);
	var gmap = new OpenLayers.Layer.Google(
		"Google Streets",
		{type: google.maps.MapTypeId.STREETS, numZoomLevels: 20, isBaseLayer:true, displayInLayerSwitcher:true}
	);

	// Create a zoom slider bound to the map
    slider = new GeoExt.ZoomSlider({
        map: map,
        aggressive: true,                                                                                                                                                   
        width: 200,
        plugins: new GeoExt.ZoomSliderTip({
            template: "<div>Zoom Level: {zoom}</div>"
        })
    });
	
	// If the set extent toggle is on, update the bounds as the map is moved
	map.events.on({
		"moveend": function() {
			if (bounds != undefined)
				SetMapExtent();
		}
	});
	
	// Create a control for distance measurement
	CreateMeasurementCtrl();
	
	// Create an empty store since a search has not been performed yet
	var noData = [ ['No search perfomed yet.'] ];
    var emptyStore = new Ext.data.ArrayStore({
        fields: [
           {name: 'title'}
        ]
    });
	emptyStore.loadData(noData);

	// The Map Panel
	var mapPanel = new GeoExt.MapPanel({
		region: "center",
		id: "mappanel",
		title: "NGDS Data Explorer",
		xtype: "gx_mappanel",
		map: map,
		layers: [ghyb, gmap, gter],
		// Transform the coordinates to Google Web Mercator to center map on US
		center: new OpenLayers.LonLat(-98.583, 39.833).transform(wgs84, googleMercator), 
		zoom: 5,
		split: true,
		margins: '2 0 0 0',
		tbar: CreateToolbar(),
		items: [{
			xtype: "gx_zoomslider",
			vertical: true,
			height: 100,
			x: 12,
			y: 80,
			plugins: new GeoExt.ZoomSliderTip()
		}]
	});	
	
	// The form to specify the search parameters
	var formPanel = new Ext.FormPanel({
		id: 'form-panel',
        region: 'north',
		height: 85,
		hideLabels: true,
		items: [SearchForm()],
		buttons: [SearchButton()],
		    keys: [
            { key: [Ext.EventObject.ENTER], handler: function() {
                    DoSearch();
                }
            }
        ]
	});

	// The grid which will contain the results of the csw search
	gridPanel = new Ext.grid.GridPanel({
		id: 'grid-panel',
		region: 'north',
        store: emptyStore,
        columns: [
            {id: 'title', header: "Title", dataIndex: "title", sortable: true}
        ],
        autoExpandColumn: 'title',
		frame: false,
		hideHeaders: true,
        height: 145,
		listeners: {
			// Set curRow to the clicked row
			rowclick: function (grid, row, e) {
				curRow = row;
			},
			rowdblclick: function (grid, row, e) {
				curRow = row;
				GetDataServices();
			},
			// Show a qtip for each row on mouseover which displays the title and abstract for the record
			mouseover: function(e, cell) {
				var rowIndex = this.getView().findRowIndex(cell);
				if(!(rowIndex === false) && !(store == undefined) && !(store.data.length == 0)) {
					var record = store.getAt(rowIndex);
					var msg = "<b>" + record.data.title + "</b><br>" + record.data.abstract;
					Ext.QuickTips.register({
						text     : msg,
						target   : e.target
					});
				};
			},
			// Close the qtip on mouseout
			mouseout: function(e, cell) {
				Ext.QuickTips.unregister(e.target);
			}
		}
	});
	
	// The search panel which contains the form and the grid
    var searchPanel = new Ext.Panel({
		id: 'search-panel',
        title: 'Search the Catalog',
        region: 'north',
		width: 200,
		height: 295,
		autoScroll: true,
		collapsible: true,
		collapsed: false,
		split: true,
		frame:true,
		items: [formPanel, gridPanel],
		bbar: CreateSearchBBar()
	});

	// The Layers Panel
	layersPanel = new Ext.tree.TreePanel({
		title: "Layers",
		region:'center',
		xtype: "treepanel",
		headerAsTest: true,
		autoScroll: true,
		split: true,
		enableDD: true,
		collapsible: true,
		rootVisible: false,
		plugins: new Ext.ux.DataTip({
            tpl: '<div class="whatever">{name}</div>'
        }),
		root: new GeoExt.tree.LayerContainer({
			text: 'Map Layers',
			expanded: true
		}),
		listeners: {
			insert: function(tree, parent, node, refNode) {
				if (node.layer.CLASS_NAME == "OpenLayers.Layer.Vector")
					ToggleLegend();
			},
			// When a layer is clicked
			click: function(node, e) {
				if (node.layer.CLASS_NAME == "OpenLayers.Layer.Vector")
					activeLayer = node.layer;
				else
					activeLayer = undefined;
			},
			// When a layer is checked or unchecked
			checkchange: function(node, e) {
				if (node.layer.CLASS_NAME == "OpenLayers.Layer.Vector") {
					ToggleLegend();
				}
			},
			// Right Click Menu
			contextmenu: function (node, e) {
				if (node.layer.isBaseLayer == false) {
					if (node.layer.CLASS_NAME == "OpenLayers.Layer.Vector")
						activeLayer = node.layer;
						node.select();
	                var c = node.getOwnerTree().contextMenu;
	                c.contextNode = node;
	                c.showAt(e.getXY());
				}
				else
					activeLayer = undefined;
            }
		},
		contextMenu: CreateContextMenu(),
		tbar: CreateDataServicesToolbar(),
		bbar: CreateStatusbar()
	});
	
	// The West Panel, composed of the Search Panel & the Tree Panel
	var westPanel = new Ext.Panel({
		region: "west",
		id: 'layout-browser',
		title: "<a target=\"_new\" href=\"http://geothermaldata.org/\"><img src=\"/static/images/75-ngds-logo.png\" width=\"190\" height=\"40\"/>",
		//title: 'NGDS Data Explorer',
		layout: 'border',
		//layout: 'anchor',
		border: false,
		split:true,
		collapsible: true,
		margins: '2 0 5 5',
		width: 200,
		items: [searchPanel, 
			layersPanel]
	});
 
	// The Legend Panel
	var legendPanel = new GeoExt.LegendPanel({		
			xtype: "gx_legendpanel",
			id: "legendPanel",
			region: "east",
			title: "Legend",
			margins: '2 0 0 0',
			width: 200,
			autoScroll: true,
			padding: 5,
			collapsed: true,
			collapsible: true
	});
 
	// Create the Viewport with a map panel, a search panel, a tree panel and a legend panel
    var app = new Ext.Viewport({
        layout: "border",
        items: [mapPanel, westPanel, legendPanel]
    });	
 });

// Show an info box
function MyInfo(text) {
    Ext.MessageBox.show({
       title: 'Result',
       msg: text,
       buttons: Ext.MessageBox.OK,
       icon: Ext.MessageBox.INFO
   });
}

// Check if the object is in the array
function IsIn(arr, obj){
	for(var i=0; i < arr.length; i++) {
		if (arr[i] == obj) 
			return true;
	}
	return false;
}