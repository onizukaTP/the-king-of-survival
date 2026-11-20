[out:json][timeout:170];
(
  way["highway"~"^(motorway|trunk|primary|secondary)(_link)?$"](9.35,77.40,10.00,78.20);
  way["highway"="tertiary"](9.38,77.42,9.72,77.75);
  way["railway"="rail"](9.35,77.40,10.00,78.20);
);
out body; >; out skel qt;
