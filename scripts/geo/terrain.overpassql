[out:json][timeout:300][maxsize:536870912];
(
  way["landuse"~"^(forest|farmland|orchard|plantation|meadow|grass|residential|farmyard)$"](9.35,77.40,10.00,78.20);
  relation["landuse"~"^(forest|farmland|orchard|plantation|meadow|grass|residential)$"](9.35,77.40,10.00,78.20);
  way["natural"~"^(wood|scrub|grassland|heath)$"](9.35,77.40,10.00,78.20);
  relation["natural"~"^(wood|scrub|grassland|heath)$"](9.35,77.40,10.00,78.20);
  way["boundary"="protected_area"](9.35,77.40,10.00,78.20);
  relation["boundary"="protected_area"](9.35,77.40,10.00,78.20);
  way["leisure"="nature_reserve"](9.35,77.40,10.00,78.20);
  relation["leisure"="nature_reserve"](9.35,77.40,10.00,78.20);
  node["place"~"^(village|hamlet)$"](9.35,77.40,10.00,78.20);
);
out geom;
