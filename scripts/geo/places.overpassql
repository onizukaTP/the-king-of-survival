[out:json][timeout:300];
(
  area["name"="Tamil Nadu"]["admin_level"="4"];
  area["name"="Puducherry"]["admin_level"="4"];
)->.s;
node["place"~"^(city|town|village|suburb|hamlet|neighbourhood|locality|quarter)$"]["name"~"^(Chennai|Kanyakumari|Kanniyakumari|Kudankulam|Koodankulam|Manapad|Tiruchendur|Thiruchendur|Valliyur|Vallioor|Tirunelveli|Thoothukudi|Tuticorin|Gangaikondan|Alangulam|Sayalkudi|Aruppukottai|Virudhunagar|Sattur|Tenkasi|Kayathar|Kovilpatti|Sankarankovil|Sankarankoil|Vilathikulam|Kilakarai|Keelakarai|Ramanathapuram|Devipattinam|Rameswaram|Rameshwaram|Dhanushkodi|Sivakasi|Rajapalayam|Kamudi|Manamadurai|Madurai|Thirumangalam|Tirumangalam|Karaikudi|Devakottai|Thondi|Theni|Aviyur|Melur|Dindigul|Kodaikanal|Pudukkottai|Pudukottai|Tiruchirappalli|Trichy|Thanjavur|Cuddalore|Puducherry|Pondicherry|Dharmapuri|Pollachi|Coimbatore|Tiruppur|Kumbakonam|Chidambaram|Nagapattinam|Karaikal|Salem|Namakkal|Erode|Karur|Ulundurpettai|Ulundurpet|Tindivanam|Madurantakam|Maduranthakam|Melmaruvathur|Melmaruvattur|Guduvancheri|Vellore|Krishnagiri|Tiruttani|Thiruttani|Tiruvallur|Thiruvallur|Ambur|Yelagiri|Tiruvannamalai|Thiruvannamalai|Thoraipakkam|Thuraipakkam|Adyar|Avadi|Arakkonam|Arakonam|Mamallapuram|Mahabalipuram)$",i](area.s);
out;
