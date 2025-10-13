// Khởi tạo bản đồ
const map = L.map('map', { zoomControl: false }).setView([16.4637, 107.5909], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Bản đồ nền
let baseRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: "Google" });
let baseSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: "Google" });
baseRoad.addTo(map);

function switchBase(type) {
  if (type === 'satellite') {
    map.removeLayer(baseRoad);
    map.addLayer(baseSat);
  } else {
    map.removeLayer(baseSat);
    map.addLayer(baseRoad);
  }
}

// Lưu trữ các lớp
const layerMapping = {};
window.layerMapping = layerMapping;

const promises = [];

// Ranh giới hành chính (tỉnh)
promises.push(
  fetch("Province.geojson").then(res => res.json()).then(data => {
    layerMapping["ward"] = L.geoJSON(data, {
      style: { color: '#666', weight: 1, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          Object.values(layerMapping).forEach(l => {
            if (l.setStyle) l.setStyle({ weight: 1, color: '#666' });
          });
          layer.setStyle({ weight: 3, color: '#0077ff' });
        });
        layer.bindTooltip(feature.properties.Name || '', { permanent: false, direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${feature.properties.Name || ''}</b>`, { autoPan: false });
      }
    }); // ✅ thiếu dòng này
  }) // ✅ thiếu dòng này
);

// Ranh giới hành chính (phường)
promises.push(
  fetch("Ward_2025.geojson").then(res => res.json()).then(data => {
    layerMapping["ward"] = L.geoJSON(data, {
      style: { color: '#666', weight: 1, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          Object.values(layerMapping).forEach(l => {
            if (l.setStyle) l.setStyle({ weight: 1, color: '#666' });
          });
          layer.setStyle({ weight: 3, color: '#0077ff' });
        });
        layer.bindTooltip(feature.properties.Name || '', { permanent: false, direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${feature.properties.Name || ''}</b>`, { autoPan: false });
      }
    }); // ✅ thiếu dòng này
  }) // ✅ thiếu dòng này
);

// Ranh giới cộng đồng
promises.push(
  fetch("Community.geojson").then(res => res.json()).then(data => {
    layerMapping["community"] = L.geoJSON(data, {
      style: { color: '#FF8C00', weight: 2, fillOpacity: 0, dashArray: '4,4' },
      onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          Object.values(layerMapping).forEach(l => {
            if (l.setStyle) l.setStyle({ weight: 2, color: '#FF8C00' });
          });
          layer.setStyle({ weight: 3, color: '#ff6600' });
        });
        layer.bindTooltip(feature.properties.Name || '', { permanent: false, direction: 'center', className: 'label-tooltip' });
        layer.bindPopup(`<b>${feature.properties.Name || ''}</b>`, { autoPan: false });
      }
    }); // ✅ thiếu dòng này
  }) // ✅ thiếu dòng này
);

// Trụ sở thôn, khu phố
promises.push(
  fetch("Truso_PS.geojson").then(res => res.json()).then(data => {
    
);



// Trạm đo chuyên dùng
promises.push(
  fetch("rain.geojson").then(res => res.json()).then(data => {
    const smallIcon = L.icon({ iconUrl: 'icons/rain.svg', iconSize: [18, 18] });
    layerMapping["tram_vrain"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: smallIcon }),
      onEachFeature: (f, l) => {
        l.bindPopup(`<b>${f.properties.Ten || ''}</b><br><b>Địa điểm:</b> ${f.properties.Dia_diem || ''}<br><b>Năm:</b> ${f.properties.Năm || ''}`);
      }
    });
  })
);

  promises.push(
  fetch("Station.geojson").then(res => res.json()).then(data => {
    const smallIcon = L.icon({ iconUrl: 'icons/rain.svg', iconSize: [18, 18] });
    layerMapping["tram_vrain"] = L.geoJSON(data, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: smallIcon }),
      onEachFeature: (f, l) => {
        l.bindPopup(`<b>${f.properties.Ten || ''}</b><br><b>Địa điểm:</b> ${f.properties.Dia_diem || ''}<br><b>Năm:</b> ${f.properties.Năm || ''}`);
      }
    });
  })
);
    
// Vết lũ
["2020", "2021"].forEach((year, idx) => {
  const colors = ["orange", "gold", "limegreen"];
  const idKey = `flood${year}`;
  promises.push(
    fetch("Flood_trace_all.geojson").then(res => res.json()).then(data => {
      const layer = L.geoJSON(data, {
        filter: f => f.properties[`VL${year}`],
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 5,
          fillColor: colors[idx],
          color: "#333",
          weight: 0.5,
          fillOpacity: 0.75
        }),
        onEachFeature: (f, l) => {
          let p = f.properties;
          let popup = `<b>Tên vết lũ:</b> ${p.Name || ''}<br><b>ID:</b> ${p.ID || ''}<br><b>Code:</b> ${p.Code || ''}`;
          if (p.Address || p.Ward) popup += `<br><b>Địa điểm:</b> ${(p.Address || '') + (p.Ward ? ', ' + p.Ward : '')}`;
          popup += `<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`;
         ["2020", "2021"].forEach(y => {
  ["T10", "T11"].forEach(m => {
    const key = `${m}_${y}`;
    const val = p[key];

    // Chỉ hiển thị nếu val là số thực sự (dạng string hoặc number)
    if (val !== undefined && val !== null) {
      const cleaned = String(val).trim();  // chuyển thành chuỗi và loại khoảng trắng
      const num = Number(cleaned);

      if (!isNaN(num) && isFinite(num)) {
        popup += `<br><b>Độ sâu ${m}/${y}:</b> ${num.toFixed(2)} m`;
      }
    }
  });
});
          l.bindPopup(popup);
        }
      });
      layerMapping[idKey] = layer;
    })
  );
});

// Trạm đo các loại
const stationIcons = {
   "Trạm cảnh báo lũ thông minh": L.icon({ iconUrl: 'icons/ruler_blue.svg', iconSize: [20, 20] })
};

promises.push(
  fetch("Tower.geojson").then(res => res.json()).then(data => {
    Object.entries(stationIcons).forEach(([type, icon]) => {
      const layer = L.geoJSON(data, {
        filter: f => f.properties.Type === type,
        pointToLayer: (f, latlng) => L.marker(latlng, { icon }),
        onEachFeature: (f, l) => {
          const p = f.properties;
          l.bindPopup(`<b>${p.Name2 || p.Name || ''}</b><br><b>Loại:</b> ${p.Type}<br><b>Tọa độ:</b> ${p.X || ''}, ${p.Y || ''}`);
        }
      });
      const key = icon.options.iconUrl.split('/').pop().replace('.svg', '');
      layerMapping[key] = layer;
    });
  })
);

Promise.all(promises).then(() => {
  console.log("Tất cả lớp đã load xong.");
});
