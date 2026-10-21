import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import fs from 'fs';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-110m.json','utf8'));
const land = feature(topo, topo.objects.land);
const out = [];
const step = 1.15; // degrees between rows
for (let lat = -58; lat <= 80; lat += step) {
  const r = Math.cos(lat*Math.PI/180);
  const n = Math.max(8, Math.round(360*r/step));
  for (let i=0;i<n;i++){
    const lon = -180 + i*360/n;
    if (geoContains(land,[lon,lat])) out.push(+lon.toFixed(2), +lat.toFixed(2));
  }
}
fs.writeFileSync('src/data/landDots.json', JSON.stringify(out));
console.log('dots', out.length/2);
