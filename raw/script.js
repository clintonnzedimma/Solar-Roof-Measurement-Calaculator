const PANEL_WIDTH_FT = 3.5; // feet
const PANEL_HEIGHT_FT = 5; // feet
const PANEL_AREA_FT2 = PANEL_WIDTH_FT * PANEL_HEIGHT_FT;
const PANEL_OUTPUT_KWH = 48; // per panel

let map;
let drawingManager;
const roofs = []; // { polygon, panels: google.maps.Rectangle[] }

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 29.425319, lng: -98.492733 },
    zoom: 12,
    mapTypeId: "hybrid",
  });

  const input = document.getElementById("address");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo("bounds", map);
  autocomplete.addListener("place_changed", () => {
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
      drawingModes: ["polygon"],
    },
    polygonOptions: {
      fillColor: "#FF0000",
      fillOpacity: 0.35,
      strokeColor: "#FF0000",
      strokeWeight: 2,
      clickable: true,
      editable: false,
    },
  });
  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, "polygoncomplete", (poly) => {
    const panels = generatePanels(poly);
    roofs.push({ polygon: poly, panels });
    google.maps.event.addListener(poly, "click", () => removeRoof(poly));
    updateCalculations();
  });

  document.getElementById("clear").addEventListener("click", () => {
    roofs.forEach((r) => {
      r.polygon.setMap(null);
      r.panels.forEach((p) => p.setMap(null));
    });
    roofs.length = 0;
    updateCalculations();
  });

  document.getElementById("energy").addEventListener("input", updateCalculations);
}

function removeRoof(poly) {
  const idx = roofs.findIndex((r) => r.polygon === poly);
  if (idx >= 0) {
    roofs[idx].polygon.setMap(null);
    roofs[idx].panels.forEach((p) => p.setMap(null));
    roofs.splice(idx, 1);
    updateCalculations();
  }
}

function panelDimensionsDegrees(lat) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const widthDeg = (PANEL_WIDTH_FT * 0.3048) / metersPerDegLng;
  const heightDeg = (PANEL_HEIGHT_FT * 0.3048) / metersPerDegLat;
  return { widthDeg, heightDeg };
}

function generatePanels(polygon) {
  const path = polygon.getPath().getArray();
  let minLat = path[0].lat(),
    maxLat = path[0].lat(),
    minLng = path[0].lng(),
    maxLng = path[0].lng();
  path.forEach((pt) => {
    minLat = Math.min(minLat, pt.lat());
    maxLat = Math.max(maxLat, pt.lat());
    minLng = Math.min(minLng, pt.lng());
    maxLng = Math.max(maxLng, pt.lng());
  });

  const centroidLat = path.reduce((s, p) => s + p.lat(), 0) / path.length;
  const { widthDeg, heightDeg } = panelDimensionsDegrees(centroidLat);

  const panels = [];
  for (let lat = minLat; lat + heightDeg <= maxLat; lat += heightDeg) {
    for (let lng = minLng; lng + widthDeg <= maxLng; lng += widthDeg) {
      const corners = [
        new google.maps.LatLng(lat, lng),
        new google.maps.LatLng(lat + heightDeg, lng),
        new google.maps.LatLng(lat + heightDeg, lng + widthDeg),
        new google.maps.LatLng(lat, lng + widthDeg),
      ];
      const inside = corners.every((c) =>
        google.maps.geometry.poly.containsLocation(c, polygon)
      );
      if (inside) {
        const rect = new google.maps.Rectangle({
          map,
          bounds: {
            north: lat + heightDeg,
            south: lat,
            east: lng + widthDeg,
            west: lng,
          },
          fillColor: "#00FF00",
          fillOpacity: 0.5,
          strokeWeight: 0,
        });
        panels.push(rect);
      }
    }
  }
  return panels;
}

function updateCalculations() {
  const totalAreaMeters = roofs.reduce(
    (sum, r) => sum + google.maps.geometry.spherical.computeArea(r.polygon.getPath()),
    0
  );
  const totalAreaFeet = totalAreaMeters * 10.7639;
  const panelCount = roofs.reduce((sum, r) => sum + r.panels.length, 0);
  const energyProduction = panelCount * PANEL_OUTPUT_KWH;
  const consumption = parseFloat(document.getElementById("energy").value) || 0;
  const neededPanels = Math.ceil(consumption / PANEL_OUTPUT_KWH);

  document.getElementById("area").textContent = totalAreaFeet.toFixed(2);
  document.getElementById("panels").textContent = panelCount.toString();
  document.getElementById("production").textContent = energyProduction.toFixed(2);
  document.getElementById("needed").textContent = neededPanels.toString();
}

window.initMap = initMap;

