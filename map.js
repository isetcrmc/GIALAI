// ================== Khởi tạo bản đồ ==================
const map = L.map('map', { zoomControl: false }).setView([16.4637, 107.5909], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Base map Google
let baseRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" });
let baseSat  = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" });
baseRoad.addTo(map);

function switchBase(type) {
  if (type === 'satellite') {
    if (map.hasLayer(baseRoad)) map.removeLayer(baseRoad);
    map.addLayer(baseSat);
  } else {
    if (map.hasLayer(baseSat)) map.removeLayer(baseSat);
    map.addLayer(baseRoad);
  }
}

// ================== Layer registry ==================
const layerMapping = {};
window.layerMapping = layerMapping; // để HTML điều khiển add/remove
const promises = [];

// Helpers
const asNumber = v => {
  if (v === undefined || v === null) return null;
  const n = Number(String(v).trim());
  return (isFinite(n) && !isNaN(n)) ? n : null;
};
const hasYearFlag = (p, year) => {
  // chấp nhận 2020, "2020", true, 1...
  const v = p[`VL${year}`];
  if (v === true || v === 1) return true;
  if (String(v).trim() === String(year)) return true;
  // nếu chỉ cần có field (truthy)
  if (!!v) return true;
  return false;
};

// ================== 1) Ranh giới hành chính ==================

// Tỉnh
promises.push(
  fetch("Province.geojson").then(r => r.json()).then(data => {
    layerMapping["province"] = L.geoJSON(data, {
      style: { color: '#444', weight: 2, fillOpacity: 0 },
      onEachFeature: (f, layer) => {
        layer.bindTooltip(f.properties.Name || '', { direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${f.properties.Name || ''}</b>`, { autoPan: false });
      }
    });
  }).catch(err => console.warn("Province.geojson lỗi:", err))
);

// Phường/xã
promises.push(
  fetch("Ward_2025.geojson").then(r => r.json()).then(data => {
    layerMapping["ward"] = L.geoJSON(data, {
      style: { color: '#666', weight: 1, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: (f, layer) => {
        layer.bindTooltip(f.properties.Name || '', { direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${f.properties.Name || ''}</b>`, { autoPan: false });
      }
    });
  }).catch(err => console.warn("Ward_2025.geojson lỗi:", err))
);

// Cộng đồng
promises.push(
  fetch("Community.geojson").then(r => r.json()).then(data => {
    layerMapping["community"] = L.geoJSON(data, {
      style: { color: '#FF8C00', weight: 2, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: (f, layer) => {
        layer.bindTooltip(f.properties.Name || '', { direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${f.properties.Name || ''}</b>`, { autoPan: false });
      }
    });
  }).catch(err => console.warn("Community.geojson lỗi:", err))
);

// ================== 2) Trụ sở thôn / khu phố ==================
promises.push(
  fetch("Truso_PS.geojson").then(r => r.json()).then(data => {
    const iconPS = L.icon({ iconUrl: 'icons/village_office.svg', iconSize: [18,18] });
    layerMapping["Truso_PS"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: iconPS }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  }).catch(err => console.warn("Truso_PS.geojson lỗi:", err))
);

promises.push(
  fetch("Truso_NP.geojson").then(r => r.json()).then(data => {
    const iconNP = L.icon({ iconUrl: 'icons/quarter_office.svg', iconSize: [18,18] });
    layerMapping["Truso_NP"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: iconNP }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  }).catch(err => console.warn("Truso_NP.geojson lỗi:", err))
);

// ================== 3) Trạm chuyên dùng ==================
// Trạm đo mưa tự động
promises.push(
  fetch("rain.geojson").then(r => r.json()).then(data => {
    const rainIcon = L.icon({ iconUrl: 'icons/rain.svg', iconSize: [18,18] });
    layerMapping["tram_rain"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: rainIcon }),
      onEachFeature: (f, l) => {
        const p = f.properties || {};
        l.bindPopup(`<b>${p.Ten || p.Name || ''}</b>`);
      }
    });
  }).catch(err => console.warn("rain.geojson lỗi:", err))
);

// Trạm đo mực nước tự động
promises.push(
  fetch("Station.geojson").then(r => r.json()).then(data => {
    const waterIcon = L.icon({ iconUrl: 'icons/water.svg', iconSize: [18,18] });
    layerMapping["tram_water"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: waterIcon }),
      onEachFeature: (f, l) => {
        const p = f.properties || {};
        l.bindPopup(`<b>${p.Ten || p.Name || ''}</b>`);
      }
    });
  }).catch(err => console.warn("Station.geojson lỗi:", err))
);

// ================== 4) Vết lũ 2020–2021 ==================
["2020","2021"].forEach((year, idx) => {
  const colors = { "2020":"orange", "2021":"gold" };
  const idKey = `flood${year}`;

  promises.push(
    fetch("Flood_trace_all.geojson").then(r => r.json()).then(data => {
      const layer = L.geoJSON(data, {
        filter: f => {
          const p = f.properties || {};
          return hasYearFlag(p, year);
        },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 5, fillColor: colors[year], color: "#333", weight: 0.5, fillOpacity: 0.75
        }),
        onEachFeature: (f, l) => {
          const p = f.properties || {};
          let html = `<b>Tên vết lũ:</b> ${p.Name || ''}`;
          if (p.ID)   html += `<br><b>ID:</b> ${p.ID}`;
          if (p.Code) html += `<br><b>Code:</b> ${p.Code}`;
          if (p.Address || p.Ward) html += `<br><b>Địa điểm:</b> ${(p.Address || '')}${p.Ward ? ', ' + p.Ward : ''}`;
          if (p.X && p.Y) html += `<br><b>Tọa độ:</b> ${p.X}, ${p.Y}`;

          // Độ sâu T10/T11 cho từng năm (chỉ hiện khi là số)
          ["T10","T11"].forEach(m => {
            const key = `${m}_${year}`;
            const v = asNumber(p[key]);
            if (v !== null) html += `<br><b>Độ sâu ${m}/${year}:</b> ${v.toFixed(2)} m`;
          });

          l.bindPopup(html);
        }
      });
      layerMapping[idKey] = layer;
    }).catch(err => console.warn(`Flood_trace_all (${year}) lỗi:`, err))
  );
});

// ================== 5) Tháp cảnh báo lũ thông minh ==================
promises.push(
  fetch("Tower.geojson").then(r => r.json()).then(data => {
    const icon = L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [20,20] });
    layerMapping["ruler_blue"] = L.geoJSON(data, {
      // nếu file có nhiều Type, lọc đúng loại
      filter: f => {
        const p = f.properties || {};
        return (p.Type || p.Loai || '').toString().trim() === 'Trạm cảnh báo lũ thông minh';
      },
      pointToLayer: (f, latlng) => L.marker(latlng, { icon }),
      onEachFeature: (f, l) => {
        const p = f.properties || {};
        l.bindPopup(`<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type || p.Loai || ''}`);
      }
    });
  }).catch(err => console.warn("Tower.geojson lỗi:", err))
);

// ================== 6) Hoàn tất ==================
Promise.all(promises).then(() => {
  console.log("Tất cả lớp đã load xong và map với layerControl.");
});
