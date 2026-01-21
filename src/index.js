import * as THREE from 'three'; 
import { XRButton } from 'three/addons/webxr/XRButton.js';
import * as itowns from 'itowns';


// ---- Initialize iTowns view ----
const placement = {
    coord: new itowns.Coordinates('EPSG:4326',  4.831538, 45.755876), 
    range: 10000,
    tilt: 5,
    heading: 0
};
const viewerDiv = document.getElementById('viewerDiv');
const view = new itowns.GlobeView(viewerDiv, placement, { webXR: { controllers: true, cameraOnGround: true } });

// ---- Add XR Button ----
view.renderer.xr.enabled = true;
viewerDiv.appendChild(XRButton.createButton(view.renderer, {
    referenceSpaceType: 'viewer',
}));

// ---- Add imagery and elevation layers ----
function addElevationFromConfig(config) {
    config.source = new itowns.WMTSSource(config.source);
    view.addLayer(new itowns.ElevationLayer(config.id, config));
}
itowns.Fetcher.json('./assets/Ortho.json').then(config => {
    config.source = new itowns.WMTSSource(config.source);
    view.addLayer(new itowns.ColorLayer('Ortho', config));
});
itowns.Fetcher.json('assets/IGN_MNT_HIGHRES.json').then(addElevationFromConfig);
itowns.Fetcher.json('assets/WORLD_DTM.json').then(addElevationFromConfig);

// ---- Add WFS buildings layers ----
const wfsBuildingSource = new itowns.WFSSource({
    url: 'https://data.geopf.fr/wfs/ows?',
    version: '2.0.0',
    typeName: 'BDTOPO_V3:batiment',
    crs: 'EPSG:4326',
    ipr: 'IGN',
    format: 'application/json'
});
function getBuildingColor(props) {
    const usageMap = {
        'Résidentiel': 0xFDFDFF,
        'Annexe': 0xC6C5B9,
        'Commercial et services': 0x62929E,
        'Religieux': 0x393D3F,
        'Sportif': 0x546A7B
    };
    return new THREE.Color(usageMap[props.usage_1] || 0x555555);
}
function altitudeBuildings(props) { return props.altitude_minimale_sol; }
function extrudeBuildings(props) { return props.hauteur; }
function acceptFeature(props) { return !!props.hauteur; }

// Add wireframe and filled buildings layers
const wfsFilled = new itowns.FeatureGeometryLayer('WFS Building', {
    batchId: (_, id) => id,
    filter: acceptFeature,
    source: wfsBuildingSource,
    zoom: { min: 14 },
    style: {
        fill: {
            color: getBuildingColor,
            opacity: 0.2,
            base_altitude: altitudeBuildings,
            extrusion_height: extrudeBuildings
        }
    }
});
view.addLayer(wfsFilled);