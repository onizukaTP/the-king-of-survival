[out:json][timeout:170];
(
  way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential)$"](9.495,77.618,9.528,77.645);
  way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential)$"](9.424,77.532,9.462,77.578);
  way["highway"~"^(trunk|primary|secondary|tertiary|aeroway)$"](9.825,78.080,9.950,78.165);
);
out geom;
