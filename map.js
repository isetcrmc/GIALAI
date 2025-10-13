// ================== Khởi tạo bản đồ ==================
const map = L.map('map', { zoomControl: false }).setView([13.97, 108.01], 10); // Pleiku, Gia Lai
L.control.zoom({ position: 'bottomright' }).addTo(map);

let baseRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" }).addTo(map);
let baseSat  = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" });

function switchBase(type) {
  if (type === 'satellite') { if (map.hasLayer(baseRoad)) map.removeLayer(baseRoad); map.addLayer(baseSat); }
  else { if (map.hasLayer(baseSat)) map.removeLayer(baseSat); map.addLayer(baseRoad); }
}

// ================== Layer registry ==================
const layerMapping = {};
window.layerMapping = layerMapping;
const promises = [];

// Helpers
const asNumber = v => {
  if (v === undefined || v === null) return null;
  const n = Number(String(v).trim());
  return (isFinite(n) && !isNaN(n)) ? n : null;
};
const fmt2 = v => {
  const n = asNumber(v);
  return n === null ? '' : n.toFixed(2);
};
const hasYearFlag = (p, year) => {
  const v = p[`VL${year}`];
  if (v === true || v === 1) return true;
  if (String(v).trim() === String(year)) return true;
  return !!v;
};

// ================== 1) Ranh giới ==================
promises.push(
  fetch("Province.geojson").then(r => r.json()).then(data => {
    const layer = L.geoJSON(data, {
      style: { color: '#444', weight: 2, fillOpacity: 0 },
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
    layerMapping["province"] = layer;

    // nếu trong file có tỉnh "Gia Lai" thì fitBounds luôn
    try {
      let target = null;
      layer.eachLayer(l => {
        const name = (l.feature.properties.Name || '').toString().toLowerCase();
        if (name.includes('gia lai')) target = l;
      });
      if (target) map.fitBounds(target.getBounds().pad(0.05));
    } catch(_) {}
  }).catch(e => console.warn("Province.geojson lỗi:", e))
);

promises.push(
  fetch("Ward_2025.geojson").then(r => r.json()).then(data => {
    layerMapping["ward"] = L.geoJSON(data, {
      style: { color: '#666', weight: 1, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: (f, l) => l.bindTooltip(f.properties.Name || '', {direction:'center', className:'label-tooltip'})
    });
  }).catch(e => console.warn("Ward_2025.geojson lỗi:", e))
);

promises.push(
  fetch("Community.geojson").then(r => r.json()).then(data => {
    layerMapping["community"] = L.geoJSON(data, {
      style: { color: '#FF8C00', weight: 2, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: (f, l) => l.bindTooltip(f.properties.Name || '', {direction:'center', className:'label-tooltip'})
    });
  }).catch(e => console.warn("Community.geojson lỗi:", e))
);

// ================== 2) Trụ sở thôn / khu phố ==================
// icon trụ sở thôn (nhỏ, xanh đậm)
const iconPS = L.divIcon({
  className: 'ps-dot',
  html: '<div style="width:7px;height:7px;border-radius:50%;background:#0b6;box-shadow:0 0 0 2px #fff,0 0 0 3px #0b6"></div>',
  iconSize: [7,7],
  iconAnchor: [4,4]
});

promises.push(
  fetch("Truso_PS.geojson").then(r => r.json()).then(data => {
    layerMapping["Truso_PS"] = L.geoJSON(data, {
      pointToLayer: (f, ll) => L.marker(ll, { icon: iconPS }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  }).catch(e => console.warn("Truso_PS.geojson lỗi:", e))
);

// icon trụ sở khu phố (dễ nhìn: tím)
const iconNP = L.divIcon({
  className: 'np-dot',
  html: '<div style="width:7px;height:7px;border-radius:4px;background:#7e3ff2;box-shadow:0 0 0 2px #fff,0 0 0 3px #7e3ff2"></div>',
  iconSize: [7,7],
  iconAnchor: [4,4]
});

promises.push(
  fetch("Truso_NP.geojson").then(r => r.json()).then(data => {
    layerMapping["Truso_NP"] = L.geoJSON(data, {
      pointToLayer: (f, ll) => L.marker(ll, { icon: iconNP }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.Name || ''}</b>`)
    });
  }).catch(e => console.warn("Truso_NP.geojson lỗi:", e))
);

// ================== 3) Trạm chuyên dùng ==================
// Trạm đo mưa tự động
promises.push(
  fetch("rain.geojson").then(r => r.json()).then(data => {
    const rainIcon = L.icon({ iconUrl: 'icons/rain.svg', iconSize: [18,18] });
    layerMapping["tram_rain"] = L.geoJSON(data, {
      pointToLayer: (f, ll) => L.marker(ll, { icon: rainIcon }),
      onEachFeature: (f, l) => l.bindPopup(`<b>${(f.properties?.Ten || f.properties?.Name) ?? ''}</b>`)
    });
  }).catch(e => console.warn("rain.geojson lỗi:", e))
);

// ==== TRẠM ĐO MỰC NƯỚC TỰ ĐỘNG (Station.geojson) ====
// ================== Trạm đo mực nước tự động ==================
promises.push(
  fetch("./Station.geojson?v=5")
    .then(r => r.json())
    .then(data => {
      const icon = L.icon({ iconUrl: 'icons/ruler_black.svg', iconSize: [20,20] });

      // Tạo layer đơn giản như tháp (không auto-add/fit)
      layerMapping["tram_water"] = L.geoJSON(data, {
        pointToLayer: (f, ll) => L.marker(ll, { icon }),
        onEachFeature: (f, l) => {
          const p = f.properties || {};
          const name = p.Name2 || p.TENHIENTHI || p.Name || p.Tentram || '';
          const c = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
          const lat = c ? Number(c[1]) : null, lon = c ? Number(c[0]) : null;
          l.bindPopup(
            `<b>${name}</b>` + (lat!=null && lon!=null ? `<br><b>Tọa độ:</b> ${lat.toFixed(2)}, ${lon.toFixed(2)}` : '')
          );
        }
      });
    })
    .catch(e => console.warn("Station.geojson lỗi:", e))
);



// ================== 4) Vết lũ 2020–2021 ==================
["2020","2021"].forEach((year) => {
  const color = year === "2020" ? "orange" : "gold";
  const idKey = `flood${year}`;

  promises.push(
    fetch("Flood_trace_all.geojson").then(r => r.json()).then(data => {
      const layer = L.geoJSON(data, {
        filter: f => hasYearFlag(f.properties || {}, year),
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 5, fillColor: color, color: "#333", weight: .5, fillOpacity: .75
        }),
        onEachFeature: (f, l) => {
          const p = f.properties || {};
          let html = `<b>Tên vết lũ:</b> ${p.Name || ''}`;
          if (p.ID) html += `<br><b>ID:</b> ${p.ID}`;
          if (p.Code) html += `<br><b>Code:</b> ${p.Code}`;
          if (p.Address || p.Ward) html += `<br><b>Địa điểm:</b> ${(p.Address || '')}${p.Ward ? ', ' + p.Ward : ''}`;

          // Tọa độ chỉ 2 số thập phân
          const x = fmt2(p.X), y = fmt2(p.Y);
          if (x && y) html += `<br><b>Tọa độ:</b> ${x}, ${y}`;

          ["T10","T11"].forEach(m => {
            const k = `${m}_${year}`;
            const v = asNumber(p[k]);
            if (v !== null) html += `<br><b>Độ sâu ${m}/${year}:</b> ${v.toFixed(2)} m`;
          });
          l.bindPopup(html);
        }
      });
      layerMapping[idKey] = layer;
    }).catch(e => console.warn(`Flood_trace_all (${year}) lỗi:`, e))
  );
});

// ================== 5) Tháp cảnh báo lũ thông minh ==================
promises.push(
  fetch("Tower.geojson").then(r => r.json()).then(data => {
    const icon = L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [20,20] });
    layerMapping["ruler_blue"] = L.geoJSON(data, {
      // vẫn giữ lọc mềm theo 'cảnh báo'
      filter: f => {
        const p = f.properties || {};
        const t = (p.Type || p.Loai || '').toString().toLowerCase();
        return t ? t.includes('cảnh báo') : true;
      },
      pointToLayer: (f, ll) => L.marker(ll, { icon }),
      onEachFeature: (f, l) => {
        const p = f.properties || {};
        const name = p.Name2 || p.Name || '';
        const loc  = p.Location || '';          // chỉ 2 trường Name + Location
        l.bindPopup(`<b>${name}</b>${loc ? `<br><b>Địa điểm:</b> ${loc}` : ''}`);
      }
    });
  }).catch(e => console.warn("Tower.geojson lỗi:", e))
);

Promise.all(promises).then(() => console.log("Các lớp đã sẵn sàng."));
