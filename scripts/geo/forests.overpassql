[out:json][timeout:600][maxsize:1073741824];
(
  area["name"="Tamil Nadu"]["admin_level"="4"];
  area["name"="Puducherry"]["admin_level"="4"];
)->.s;
relation["boundary"="protected_area"](area.s);
out geom qt;
