const solarPanelWidth = 3.5; // feet
const solarPanelHeight = 5; // feet
const solarPanelArea = solarPanelWidth * solarPanelHeight; // square feet
const solarPanelEnergyOutput = 48; // kWh

let map;
let drawingManager;
let polygons = [];

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 29.425319, lng: -98.492733 },
    zoom: 12,
    mapTypeId: 'hybrid'
  });

  const input = document.getElementById('address');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(20);
    }
  });

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: ['polygon']
    },
    polygonOptions: {
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      strokeColor: '#FF0000',
      strokeWeight: 2,
      clickable: true,
      editable: false
    }
  });
  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, 'polygoncomplete', polygon => {
    polygons.push(polygon);
    updateCalculations();
    google.maps.event.addListener(polygon, 'click', () => {
      polygon.setMap(null);
      polygons = polygons.filter(p => p !== polygon);
      updateCalculations();
    });
  });

  document.getElementById('clear').addEventListener('click', () => {
    polygons.forEach(p => p.setMap(null));
    polygons = [];
    updateCalculations();
  });

  document.getElementById('energy').addEventListener('input', updateCalculations);
}

function updateCalculations() {
  const totalAreaMeters = polygons.reduce((sum, poly) =>
    sum + google.maps.geometry.spherical.computeArea(poly.getPath()), 0);
  const totalAreaFeet = totalAreaMeters * 10.7639; // convert m^2 to ft^2
  const energyConsumption = parseFloat(document.getElementById('energy').value) || 0;
  const panelCount = Math.floor(totalAreaFeet / solarPanelArea);
  const energyProduction = panelCount * solarPanelEnergyOutput;

  document.getElementById('area').textContent = totalAreaFeet.toFixed(2);
  document.getElementById('panels').textContent = panelCount.toString();
  document.getElementById('production').textContent = energyProduction.toFixed(2);
}

window.initMap = initMap;
