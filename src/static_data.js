// ---- Données statiques transcrites du document HCSP « Recommandations sanitaires aux voyageurs 2026 » ----
// Chaque bloc porte sa source (page du PDF).

const REGIONS = {
  AF_AUS: { label: "Afrique australe", fiche: "Fiche 1 – Afrique australe (p. 195)" },
  AF_CEN: { label: "Afrique centrale", fiche: "Fiche 2 – Afrique centrale (p. 199)" },
  AF_EST: { label: "Afrique de l'Est", fiche: "Fiche 3 – Afrique de l'Est (p. 202)" },
  AF_OUE: { label: "Afrique de l'Ouest", fiche: "Fiche 4 – Afrique de l'Ouest (p. 207)" },
  AF_NOR: { label: "Afrique du Nord", fiche: "Fiche 5 – Afrique du Nord (p. 210)" },
  AM_CEN: { label: "Mexique et Amérique centrale", fiche: "Fiche 6 – Mexique et Amérique centrale (p. 213)" },
  AM_NOR: { label: "Amérique du Nord", fiche: "Fiche 7 – Amérique du Nord (p. 212)" },
  AM_SUD: { label: "Amérique du Sud", fiche: "Fiche 8 – Amérique du Sud (p. 215)" },
  CARA: { label: "Caraïbes", fiche: "Fiche 9 – Caraïbes (p. 218)" },
  ASIE_SE: { label: "Asie du Sud-Est", fiche: "Fiche 10 – Asie du Sud-Est (p. 221)" },
  ASIE_SUD: { label: "Sous-continent indien", fiche: "Fiche 11 – Sous-continent indien (p. 226)" },
  OI: { label: "Océan Indien", fiche: "Fiche 12 – Océan Indien (p. 229)" },
  OCE: { label: "Océanie et Polynésie", fiche: "Fiche 13 – Océanie & Polynésie française (p. 232)" },
  ASIE_EST: { label: "Asie de l'Est", fiche: null },
  ASIE_CEN: { label: "Asie centrale et Afghanistan", fiche: null },
  CAUC: { label: "Caucase", fiche: null },
  MO: { label: "Moyen-Orient et Turquie", fiche: null },
  EU_E: { label: "Europe de l'Est", fiche: null },
  EU_S: { label: "Europe du Sud", fiche: null },
  EU_NO: { label: "Europe de l'Ouest et du Nord", fiche: null },
  ATL: { label: "Atlantique Sud", fiche: null },
};
const REGION_ORDER = ["AF_OUE","AF_CEN","AF_EST","AF_AUS","AF_NOR","OI","AM_NOR","AM_CEN","CARA","AM_SUD","ASIE_SUD","ASIE_SE","ASIE_EST","ASIE_CEN","CAUC","MO","EU_NO","EU_S","EU_E","OCE","ATL"];

// Tableau 2 – Encéphalite japonaise (p. 31-32)
const JE = {
  AU: { z: "Endémique dans les îles du détroit de Torres et les îles Tiwi, ainsi que les zones situées à proximité de la rivière Murray (sud-est). Cas décrits sur l'ensemble du territoire mais risque très faible en cas de séjour urbain strict.", s: "De novembre à mai", c: "Pour les séjours dans les zones touristiques et en zone urbaine, le risque est très faible. Depuis 2022, virus présent dans l'ensemble du pays (3 % de la population, vivant à proximité d'élevages porcins, à risque)." },
  BD: { z: "L'ensemble du pays", s: "Toute l'année, pic entre juillet et novembre", c: "Zone la plus à risque : nord-ouest du pays." },
  BT: { z: "Transmission probable dans les régions non montagneuses", s: "Inconnue", c: "Rares cas signalés, données limitées ; transmission probable dans le sud du pays." },
  BN: { z: "Probablement l'ensemble du pays", s: "Inconnue", c: "Données limitées ; épidémie signalée en 2013 ; transmission toujours possible." },
  KH: { z: "L'ensemble du pays", s: "Toute l'année, pic entre mai et octobre", c: "Cas signalés dans la plupart des provinces." },
  CN: { z: "Toutes les provinces excepté le Xinjiang et le Qinghai", s: "Pic entre juin et octobre", c: "Vaccination généralement non recommandée pour les voyages se limitant à Beijing, Shanghai, Hong Kong, Kowloon, Macao et les autres grandes villes." },
  KP: { z: "Probablement l'ensemble du pays", s: "Pic probable entre mai et novembre", c: "" },
  KR: { z: "Endémique dans l'ensemble du pays", s: "Majorité des cas entre mai et novembre", c: "Vaccination généralement non recommandée pour les voyages se limitant à Séoul et aux grandes villes." },
  IN: { z: "États d'Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Goa, Haryana, Jharkhand, Karnataka, Kerala, Maharashtra, Manipur, Meghalaya, Nagaland, Odisha, Punjab, Tamil Nadu, Telangana, Tripura, Uttar Pradesh, Uttarakhand, West Bengal", s: "Nord : pic entre mai et novembre ; Sud : toute l'année", c: "" },
  ID: { z: "L'ensemble du pays", s: "Toute l'année, pics variables d'une île à l'autre", c: "Cas signalés dans de nombreuses îles (Bali, Java, Kalimantan, Nusa Tenggara, Papouasie, Sumatra). Plusieurs cas de voyageurs signalés ces dernières années à Bali." },
  JP: { z: "Tout l'archipel", s: "De juin à octobre", c: "Rares cas sporadiques dans toutes les îles excepté Hokkaido, cycle zoonotique toujours actif. Vaccination non recommandée pour les voyages se limitant à Tokyo et aux grandes villes." },
  LA: { z: "L'ensemble du pays", s: "Toute l'année, pic entre juin et septembre", c: "" },
  MY: { z: "L'ensemble du pays", s: "Toute l'année, pic entre octobre et décembre au Sarawak", c: "Incidence beaucoup plus élevée au Sarawak que dans la péninsule. Vaccination généralement non recommandée pour les voyages se limitant à Kuala Lumpur et aux grandes villes." },
  MM: { z: "Ensemble du pays", s: "Probablement toute l'année ; majorité des cas entre mai et septembre", c: "Risque plus élevé dans les zones du delta et les basses terres." },
  NP: { z: "Basses terres du Sud (Teraï) ; cas signalés également dans des districts de montagne, dont celui de Katmandou", s: "Pic entre juin et octobre", c: "Incidence la plus élevée dans les plaines du sud (Teraï) ; vaccination généralement non recommandée pour les randonnées en haute altitude." },
  PK: { z: "Pas d'information", s: "Pas d'information", c: "Données très limitées ; rares cas dans la province du Sindh, près de Karachi." },
  PG: { z: "Probablement l'ensemble du pays", s: "Probablement toute l'année", c: "Données limitées ; cas sporadiques dans les provinces occidentales, 1 cas près de Port Moresby ; circulation probable dans l'ensemble du pays." },
  PH: { z: "Probablement l'ensemble de l'archipel", s: "Toute l'année, pic entre avril et août", c: "Transmission observée dans 32 des 80 provinces." },
  RU: { z: "Rares cas dans la Province maritime de l'Est (Kraï du Primorié)", s: "Pic entre juin et septembre", c: "Vaccination généralement non recommandée.", low: true },
  SG: { z: "Quelques foyers présumés", s: "Toute l'année", c: "Rares cas sporadiques. Vaccination généralement non recommandée.", low: true },
  LK: { z: "L'ensemble du pays, excepté les zones montagneuses", s: "Toute l'année, pic entre novembre et février", c: "" },
  TW: { z: "L'ensemble du pays", s: "Pic entre mai et octobre", c: "Rares cas sporadiques. Vaccination généralement non recommandée pour les voyages limités à Taipei et aux grandes villes." },
  TH: { z: "L'ensemble du pays", s: "Toute l'année, pic entre mai et octobre, notamment dans le nord", c: "Fréquences les plus élevées dans la vallée de Chiang Mai. Plusieurs cas chez des voyageurs ayant séjourné dans les zones côtières du sud." },
  TL: { z: "Probablement l'ensemble du pays", s: "Pas d'information, probablement toute l'année", c: "" },
  VN: { z: "L'ensemble du pays", s: "Toute l'année, pic entre mai et octobre, notamment dans le nord", c: "Incidences les plus élevées dans les provinces septentrionales autour de Hanoï et les provinces frontalières de la Chine." },
};

// Tableau 3 – Encéphalite à tiques (p. 35-36). b = zone en gras = vaccination recommandée pour les conditions de séjour du § 1.6
const TBE = {
  DE: { b: true, z: "Bavière, Bade-Wurtemberg, sud de la Hesse, sud de la Thuringe, Saxe, sud-est du Brandebourg", r: "90 % des cas déclarés : Bavière, Bade-Wurtemberg et Saxe", l: "Ensemble de la population vivant, travaillant ou voyageant dans des zones endémiques" },
  AT: { b: true, z: "Endémique dans tout le pays, particulièrement Carinthie, Styrie, Haute-Autriche, Salzbourg, Tyrol et Vorarlberg", r: "", l: "Ensemble de la population" },
  BY: { b: true, z: "Quasiment l'ensemble du pays", r: "", l: "Populations à haut risque" },
  CN: { b: false, z: "Nord-Est du pays (90 % des cas déclarés)", r: "", l: "" },
  HR: { b: false, z: "Nord-Est et Nord-Ouest du pays (comtés de Koprivnica-Križevci, Međimurje et Bjelovar-Bilogora)", r: "Cas sporadiques sur la côte adriatique", l: "Résidents et voyageurs dans les zones endémiques ; travailleurs forestiers de la région de Koprivnica-Križevci" },
  DK: { b: false, z: "Île de Bornholm", r: "Cas sporadiques dans le reste du pays", l: "Pas de recommandation" },
  EE: { b: true, z: "Ensemble du pays, l'Ouest étant la région la plus à risque", r: "Taux d'incidence parmi les plus élevés en Europe", l: "Ensemble de la population" },
  FI: { b: true, z: "Îles et côtes situées au sud du pays", r: "", l: "Voyageurs se rendant dans les zones endémiques" },
  HU: { b: false, z: "Ouest et nord du pays", r: "Cas sporadiques dans le reste du pays", l: "Ensemble de la population" },
  IT: { b: false, z: "Trentin-Haut-Adige, Vénétie et Frioul-Vénétie julienne", r: "", l: "Personnes particulièrement exposées dans le Trentin-Haut-Adige et la Vénétie" },
  KZ: { b: false, z: "Akmola, Almaty, est du pays", r: "Cas sporadiques dans le reste du pays", l: "Populations à haut risque (travailleurs forestiers, militaires)" },
  LI: { b: false, z: "Ensemble de la principauté", r: "", l: "Pas de recommandation" },
  LV: { b: true, z: "Ensemble du pays, l'Ouest et le Centre étant les régions les plus à risque", r: "Taux d'incidence parmi les plus élevés en Europe", l: "Ensemble de la population" },
  LT: { b: true, z: "Ensemble du pays, région d'Utena en particulier", r: "Taux d'incidence parmi les plus élevés en Europe", l: "Ensemble de la population" },
  MN: { b: false, z: "Nord du pays", r: "", l: "Populations à risque (résidents, voyageurs et travailleurs dans les zones endémiques)" },
  NO: { b: true, z: "Côtes du sud du pays (particulièrement Agder, Vestfold, Telemark)", r: "", l: "Pas de recommandation" },
  PL: { b: true, z: "Ensemble du pays ; 70 % des cas : provinces de Podlachie et de Varmie-Mazurie (nord-est)", r: "Foyers de transmission dans l'ensemble du pays", l: "Recommandé pour les résidents (notamment professionnels exposés) des zones endémiques" },
  CZ: { b: true, z: "Ensemble du pays ; Bohême du Sud : région la plus à risque", r: "Taux d'incidence régulièrement parmi les plus élevés en Europe", l: "Recommandé pour les résidents en zone endémique" },
  RU: { b: true, z: "48 régions endémiques ; en gras dans le tableau : Russie occidentale, Sibérie et Oural (hauts niveaux de transmission)", r: "", l: "Populations à haut risque" },
  SK: { b: true, z: "Ensemble du pays, particulièrement le Nord et le Centre", r: "", l: "Travailleurs exposés dans les zones endémiques" },
  SI: { b: true, z: "Ensemble du pays, particulièrement le Nord et le Centre", r: "Taux d'incidence parmi les plus élevés en Europe", l: "Ensemble de la population vivant ou voyageant dans des zones endémiques" },
  SE: { b: true, z: "Régions autour de Stockholm (archipel, lac Mälaren, comtés d'Uppsala et de Södermanland) et zones autour des lacs du sud", r: "Foyers de transmission dans le centre et le sud du pays", l: "Résidents du comté de Stockholm" },
  CH: { b: true, z: "Ensemble du pays, à l'exception des cantons de Genève et du Tessin", r: "Canton de Thurgovie particulièrement à risque", l: "Résidents et voyageurs dans les zones endémiques" },
  UA: { b: false, z: "Cas signalés dans l'ensemble du pays, particulièrement en Crimée et en Volhynie", r: "", l: "Sujets à risque" },
};

// Exceptions de provenance explicitement listées au tableau 15 (p. 236-246)
const FJ_PROV_OVERRIDE = {
  CO: { list: ["AO", "BR", "CD", "UG"], note: "Colombie : obligation uniquement pour les voyageurs en provenance d'Angola, du Brésil, de RDC et d'Ouganda." },
  EC: { list: ["BR", "CD", "UG"], note: "Équateur : obligation uniquement pour les voyageurs en provenance du Brésil, de RDC et d'Ouganda." },
  PY: { list: ["BR", "BO", "PE", "VE"], note: "Paraguay : obligation pour les voyageurs en provenance du Brésil, de Bolivie, du Pérou, du Venezuela, et ceux ayant transité plus de 24 h dans ces pays." },
  VE: { list: ["BR"], note: "Venezuela : obligation pour les voyageurs en provenance du Brésil." },
  DO: { list: ["BR"], note: "République dominicaine : obligation pour les voyageurs en provenance des États brésiliens de Minas Gerais, Espírito Santo, São Paulo et Rio de Janeiro (à vérifier selon l'État visité au Brésil)." },
  CR: { exclude: ["AR", "PA"], add: ["TZ", "ZM"], note: "Costa Rica : non exigée en provenance d'Argentine et du Panama ; exigée en provenance de Tanzanie et de Zambie ; exceptions de zones pour la Colombie, l'Équateur, le Paraguay, le Pérou et Trinité-et-Tobago (voir détail)." },
  BB: { exclude: ["GY", "TT"], note: "Barbade : sauf provenance du Guyana et de Trinité-et-Tobago, à moins d'une épidémie en cours." },
  OM: { add: ["RW", "TZ"], note: "Oman : exigée également pour les voyageurs en provenance du Rwanda et de Tanzanie." },
  IN: { list: ["AO","BJ","BF","BI","CM","CF","CG","CI","ET","GA","GM","GH","GN","GQ","GW","KE","LR","ML","MR","NE","NG","UG","CD","RW","SN","SL","SD","SS","TD","TG","AR","BO","BR","CO","EC","GY","GF","PA","PY","PE","SR","TT","VE"], note: "Inde : liste propre de pays concernés, passage dans les 6 jours précédant l'arrivée, règles spécifiques pour les arrivées en bateau (voir détail)." },
};

// § 1.17 : pays cités dans la description régionale des pays à forte incidence mais absents de l'annexe 3 (OMS 2024)
const TB_TEXT_ONLY = {
  KP: "Asie (§ 1.17) – absent de l'annexe 3",
  TW: "Asie (§ 1.17) – absent de l'annexe 3",
  LB: "Proche/Moyen-Orient non exclu au § 1.17 – absent de l'annexe 3",
  QA: "Moyen-Orient non exclu au § 1.17 – absent de l'annexe 3",
  BH: "Moyen-Orient non exclu au § 1.17 – absent de l'annexe 3",
  PS: "Proche-Orient non exclu au § 1.17 – absent de l'annexe 3",
  KM: "Continent africain (§ 1.17) – absent de l'annexe 3",
  MU: "Continent africain (§ 1.17) – absent de l'annexe 3",
  SC: "Continent africain (§ 1.17) – absent de l'annexe 3",
  EH: "Continent africain (§ 1.17) – absent de l'annexe 3",
  EG: "Contradiction : continent africain inclus sauf Tunisie, mais l'Égypte figure parmi les exclusions Moyen-Orient (§ 1.17) ; absente de l'annexe 3",
};

// Défauts proposés pour le contexte épidémiologique par étape (modifiables par le praticien)
const POLIO_DEFAULT = { AF: "wpv", PK: "wpv", AO: "?", TD: "?", NG: "?", SO: "?" };
const MPOX_HINT = ["CD", "MG"]; // cités dans le document (épidémie clade Ib RDC, épidémie en cours à Madagascar)
