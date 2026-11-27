[out:json][timeout:600][maxsize:1073741824];
(
  area["name"="Tamil Nadu"]["admin_level"="4"];
  area["name"="Puducherry"]["admin_level"="4"];
)->.s;
way["highway"~"^(motorway|trunk|primary)$"](area.s);
out geom qt;
