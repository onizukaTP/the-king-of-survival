// Builds the backbone places of the generated map (D-104, D-105, D-107): the owner's 72 places at their
// real positions, with their tiers. Run only when the list or the source data changes.
//
//   1. POST scripts/geo/places.overpassql to an Overpass API server and save the JSON response.
//   2. node scripts/geo/build-backbone.mjs <osm-places.json> [<more-places.json> ...]
//
// Writes src/content/data/backbone.json. Places OpenStreetMap doesn't have as named place points use the
// approximate positions below (the owner: "it doesn't have to be accurate").
import { readFileSync, writeFileSync } from 'node:fs';

// [our name, tier, the names OpenStreetMap may use]. Ids are loc.<slug>; Madurai and Rajapalayam keep
// the ids they already had.
const PLACES = [
  ['Chennai', 'city', ['Chennai']], ['Madurai', 'city', ['Madurai']], ['Tirunelveli', 'city', ['Tirunelveli']],
  ['Thoothukudi', 'city', ['Thoothukudi', 'Tuticorin']], ['Trichy', 'city', ['Tiruchirappalli', 'Trichy']], ['Thanjavur', 'city', ['Thanjavur']],
  ['Coimbatore', 'city', ['Coimbatore']], ['Tiruppur', 'city', ['Tiruppur']], ['Salem', 'city', ['Salem']], ['Erode', 'city', ['Erode']],
  ['Vellore', 'city', ['Vellore']], ['Dindigul', 'city', ['Dindigul']], ['Pondicherry', 'city', ['Puducherry', 'Pondicherry']],
  ['Kanyakumari', 'town', ['Kanyakumari', 'Kanniyakumari']], ['Tiruchendur', 'town', ['Tiruchendur', 'Thiruchendur']], ['Valliyur', 'town', ['Valliyur', 'Vallioor']],
  ['Tenkasi', 'town', ['Tenkasi']], ['Kovilpatti', 'town', ['Kovilpatti']], ['Sankarankovil', 'town', ['Sankarankovil', 'Sankarankoil']],
  ['Aruppukottai', 'town', ['Aruppukkottai', 'Aruppukottai']], ['Virudhunagar', 'town', ['Virudhunagar']], ['Sattur', 'town', ['Sattur']],
  ['Sivakasi', 'town', ['Sivakasi']], ['Rajapalayam', 'town', ['Rajapalayam']], ['Ramanathapuram', 'town', ['Ramanathapuram']],
  ['Rameswaram', 'town', ['Rameswaram', 'Rameshwaram']], ['Keelakarai', 'town', ['Kilakarai', 'Keelakarai']], ['Karaikudi', 'town', ['Karaikudi']],
  ['Devakottai', 'town', ['Devakottai']], ['Theni', 'town', ['Theni']], ['Thirumangalam', 'town', ['Tirumangalam']], ['Melur', 'town', ['Melur']],
  ['Manamadurai', 'town', ['Manamadurai']], ['Kodaikanal', 'town', ['Kodaikanal']], ['Pudukkottai', 'town', ['Pudukkottai', 'Pudukottai']],
  ['Kumbakonam', 'town', ['Kumbakonam']], ['Chidambaram', 'town', ['Chidambaram']], ['Nagapattinam', 'town', ['Nagapattinam']],
  ['Karaikal', 'town', ['Karaikal']], ['Cuddalore', 'town', ['Cuddalore']], ['Namakkal', 'town', ['Namakkal']], ['Karur', 'town', ['Karur']],
  ['Dharmapuri', 'town', ['Dharmapuri']], ['Krishnagiri', 'town', ['Krishnagiri']], ['Pollachi', 'town', ['Pollachi']],
  ['Ulundurpet', 'town', ['Ulundurpettai', 'Ulundurpet']], ['Tindivanam', 'town', ['Tindivanam']], ['Maduranthakam', 'town', ['Maduranthakam', 'Madurantakam']],
  ['Tiruvannamalai', 'town', ['Tiruvannamalai']], ['Tiruttani', 'town', ['Tiruttani', 'Thiruttani']], ['Tiruvallur', 'town', ['Tiruvallur', 'Thiruvallur']],
  ['Ambur', 'town', ['Ambur']], ['Arakkonam', 'town', ['Arakkonam', 'Arakonam']], ['Avadi', 'town', ['Avadi']], ['Guduvancheri', 'town', ['Guduvancheri']],
  ['Mahabalipuram', 'town', ['Mahabalipuram', 'Mamallapuram']],
  ['Koodankulam', 'village', ['Koodankulam', 'Kudankulam']], ['Manapad', 'village', ['Manapad', 'Manappad']], ['Gangaikondan', 'village', ['Gangaikondan']],
  ['Alangulam', 'village', ['Alangulam']], ['Sayalkudi', 'village', ['Sayalgudi', 'Sayalkudi']], ['Kayathar', 'village', ['Kayathar']],
  ['Vilathikulam', 'village', ['Vilattikulam', 'Vilathikulam']], ['Devipattinam', 'village', ['Devipattinam']], ['Dhanushkodi', 'village', ['Dhanushkodi']],
  ['Kamudi', 'village', ['Kamuthi', 'Kamudi']], ['Thondi', 'village', ['Thondi']], ['Aviyur', 'village', ['Aviyur']],
  ['Melmaruvattur', 'village', ['Melmaruvathur', 'Melmaruvattur']], ['Yelagiri', 'village', ['Yelagiri']], ['Adyar', 'village', ['Adyar']],
  ['Thuraipakkam', 'village', ['Thoraipakkam', 'Thuraipakkam']],
];
// Not mapped as named place points in OpenStreetMap: approximate positions.
const APPROX = { Keelakarai: [9.231, 78.785], Manapad: [8.376, 78.058], Valliyur: [8.384, 77.611], Aviyur: [9.645, 78.06], Melmaruvattur: [12.43, 79.83] };
// Several points share some names; the one wanted is the one nearest to this.
const NEAR = { Melur: [10.03, 78.34], Kovilpatti: [9.17, 77.87], Rajapalayam: [9.45, 77.55], Ramanathapuram: [9.37, 78.83], Thirumangalam: [9.82, 77.98], Karur: [10.96, 78.08], Pudukkottai: [10.38, 78.82], Dharmapuri: [12.13, 78.16], Sattur: [9.36, 77.92], Alangulam: [8.86, 77.5], Manamadurai: [9.69, 78.45], Devipattinam: [9.47, 78.9], Yelagiri: [12.58, 78.64] };
const RANK = { city: 0, town: 1, suburb: 2, village: 3, neighbourhood: 4, hamlet: 5, locality: 6, quarter: 7 };
const KEEP_IDS = { Madurai: 'loc.madurai', Rajapalayam: 'loc.rajapalayam' };

const nodes = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).elements);
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '_');
const out = [];
for (const [name, tier, aliases] of PLACES) {
  const lower = aliases.map((a) => a.toLowerCase());
  // A name OpenStreetMap only has far from the real place (Keelakarai) uses the approximate position.
  let found = APPROX[name] ? [] : nodes.filter((n) => lower.includes(n.tags.name.toLowerCase()));
  let lat, lon, approximate = false;
  if (found.length) {
    const near = NEAR[name];
    found.sort((a, b) => near
      ? Math.hypot(a.lat - near[0], a.lon - near[1]) - Math.hypot(b.lat - near[0], b.lon - near[1])
      : (RANK[a.tags.place] ?? 9) - (RANK[b.tags.place] ?? 9));
    ({ lat, lon } = found[0]);
  } else if (APPROX[name]) {
    [lat, lon] = APPROX[name];
    approximate = true;
  } else {
    throw new Error(`no position for ${name}`);
  }
  out.push({ id: KEEP_IDS[name] ?? `loc.${slug(name)}`, name, tier, lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5, ...(approximate ? { approximate } : {}) });
}
writeFileSync('src/content/data/backbone.json', JSON.stringify({ places: out }, null, 1) + '\n');
console.log(`${out.length} places:`, out.filter((p) => p.approximate).map((p) => p.name).join(', '), 'approximate');
