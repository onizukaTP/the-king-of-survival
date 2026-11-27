[out:json][timeout:600][maxsize:1073741824];
(
  area["name"="Tamil Nadu"]["admin_level"="4"];
  area["name"="Puducherry"]["admin_level"="4"];
)->.s;
(
  way["natural"="water"]["water"="reservoir"](area.s);
  way["landuse"="reservoir"](area.s);
);
out geom qt;
