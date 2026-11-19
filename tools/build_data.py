"""Construit la table pays (data.json) à partir de la liste maîtresse + tableau 15 (FJ) + annexe 3 (TB).
Toute correspondance de nom est explicite ; le script échoue si un enregistrement source n'est pas rattaché."""
import json, sys, re

# (id, nom affiché, région, nom dans tableau 15 risque/obligation ou None, dans liste "sans risque ni obligation" (bool), nom annexe 3 ou None, DROM-COM)
M = [
 # Afrique australe (fiche 1)
 ('ZA','Afrique du Sud','AF_AUS','Afrique du Sud',False,'South Africa',False),
 ('AO','Angola','AF_AUS','Angola',False,'Angola',False),
 ('BW','Botswana','AF_AUS','Botswana',False,'Botswana',False),
 ('SZ','Eswatini','AF_AUS','Eswatini (ex Swaziland)',False,'Eswatini',False),
 ('LS','Lesotho','AF_AUS',None,True,'Lesotho',False),
 ('MW','Malawi','AF_AUS','Malawi',False,'Malawi',False),
 ('MZ','Mozambique','AF_AUS','Mozambique',False,'Mozambique',False),
 ('NA','Namibie','AF_AUS','Namibie',False,'Namibia',False),
 ('ZM','Zambie','AF_AUS','Zambie',False,'Zambia',False),
 ('ZW','Zimbabwe','AF_AUS','Zimbabwe',False,'Zimbabwe',False),
 # Afrique centrale (fiche 2)
 ('CM','Cameroun','AF_CEN','Cameroun',False,'Cameroon',False),
 ('GA','Gabon','AF_CEN','Gabon',False,'Gabon',False),
 ('GQ','Guinée équatoriale','AF_CEN','Guinée équatoriale',False,'Equatorial Guinea',False),
 ('CF','République centrafricaine','AF_CEN','République centrafricaine',False,'Central African Republic',False),
 ('TD','Tchad','AF_CEN','Tchad',False,'Chad',False),
 ('CD','République démocratique du Congo','AF_CEN','République démocratique du Congo',False,'Congo Dem. Rep.',False),
 ('CG','République du Congo','AF_CEN','Congo',False,'Congo Rep.',False),
 ('ST','Sao Tomé-et-Principe','AF_CEN','Sao Tomé et Principe (îles)',False,'Sao Tome and Principe',False),
 # Afrique de l'Est (fiche 3)
 ('BI','Burundi','AF_EST','Burundi',False,'Burundi',False),
 ('DJ','Djibouti','AF_EST','Djibouti',False,'Djibouti',False),
 ('ER','Érythrée','AF_EST','Erythrée',False,'Eritrea',False),
 ('ET','Éthiopie','AF_EST','Ethiopie',False,'Ethiopia',False),
 ('KE','Kenya','AF_EST','Kenya',False,'Kenya',False),
 ('UG','Ouganda','AF_EST','Ouganda',False,'Uganda',False),
 ('RW','Rwanda','AF_EST','Rwanda',False,'Rwanda',False),
 ('SO','Somalie','AF_EST','Somalie',False,'Somalia, Fed. Rep.',False),
 ('SD','Soudan','AF_EST','Soudan',False,'Sudan',False),
 ('SS','Soudan du Sud','AF_EST','Soudan du sud',False,'South Sudan',False),
 ('TZ','Tanzanie','AF_EST','Tanzanie',False,'Tanzania',False),
 # Afrique de l'Ouest (fiche 4)
 ('BJ','Bénin','AF_OUE','Bénin',False,'Benin',False),
 ('BF','Burkina Faso','AF_OUE','Burkina Faso',False,'Burkina Faso',False),
 ('CV','Cap-Vert','AF_OUE','Cap Vert (îles)',False,'Cabo Verde',False),
 ('CI',"Côte d'Ivoire",'AF_OUE','Côte d’Ivoire',False,'Cote d’Ivoire',False),
 ('GM','Gambie','AF_OUE','Gambie',False,'Gambia, The',False),
 ('GH','Ghana','AF_OUE','Ghana',False,'Ghana',False),
 ('GN','Guinée (Conakry)','AF_OUE','Guinée',False,'Guinea',False),
 ('GW','Guinée-Bissau','AF_OUE','Guinée-Bissau',False,'Guinea-Bissau',False),
 ('LR','Libéria','AF_OUE','Liberia',False,'Liberia',False),
 ('ML','Mali','AF_OUE','Mali',False,'Mali',False),
 ('MR','Mauritanie','AF_OUE','Mauritanie',False,'Mauritania',False),
 ('NE','Niger','AF_OUE','Niger',False,'Niger',False),
 ('NG','Nigéria','AF_OUE','Nigeria',False,'Nigeria',False),
 ('SN','Sénégal','AF_OUE','Sénégal',False,'Senegal',False),
 ('SL','Sierra Leone','AF_OUE','Sierra Leone',False,'Sierra Leone',False),
 ('TG','Togo','AF_OUE','Togo',False,'Togo',False),
 # Afrique du Nord (fiche 5)
 ('DZ','Algérie','AF_NOR','Algérie',False,'Algeria',False),
 ('EG','Égypte','AF_NOR','Égypte',False,None,False),
 ('LY','Libye','AF_NOR',None,True,'Libya',False),
 ('MA','Maroc','AF_NOR',None,True,'Morocco',False),
 ('EH','Sahara occidental','AF_NOR',None,False,None,False),
 ('TN','Tunisie','AF_NOR',None,True,None,False),
 # Amérique du Nord (fiche 7)
 ('US','États-Unis','AM_NOR',None,True,None,False),
 ('CA','Canada','AM_NOR',None,True,None,False),
 ('PM','Saint-Pierre-et-Miquelon','AM_NOR',None,True,None,True),
 ('GL','Groenland','EU_NO',None,True,'Greenland',False),
 # Mexique & Amérique centrale (fiche 6)
 ('MX','Mexique','AM_CEN',None,True,None,False),
 ('BZ','Belize','AM_CEN',None,True,None,False),
 ('CR','Costa Rica','AM_CEN','Costa Rica',False,None,False),
 ('GT','Guatemala','AM_CEN','Guatemala',False,None,False),
 ('HN','Honduras','AM_CEN','Honduras',False,None,False),
 ('NI','Nicaragua','AM_CEN','Nicaragua',False,'Nicaragua',False),
 ('PA','Panama','AM_CEN','Panama',False,'Panama',False),
 ('SV','Salvador','AM_CEN','Salvador (el)',False,'El Salvador',False),
 # Amérique du Sud (fiche 8)
 ('AR','Argentine','AM_SUD','Argentine',False,'Argentina',False),
 ('BO','Bolivie','AM_SUD','Bolivie',False,'Bolivia (Plurinational State of)',False),
 ('BR','Brésil','AM_SUD','Brésil',False,'Brazil',False),
 ('CL','Chili','AM_SUD',None,True,None,False),
 ('CO','Colombie','AM_SUD','Colombie',False,'Colombia',False),
 ('EC','Équateur (dont Galápagos)','AM_SUD','Équateur (dont îles Galápagos)',False,'Ecuador',False),
 ('GY','Guyana','AM_SUD','Guyana',False,'Guyana',False),
 ('GF','Guyane (France)','AM_SUD','Guyane (France)',False,None,True),
 ('PY','Paraguay','AM_SUD','Paraguay',False,'Paraguay',False),
 ('PE','Pérou','AM_SUD','Pérou',False,'Peru',False),
 ('SR','Suriname','AM_SUD','Suriname',False,None,False),
 ('UY','Uruguay','AM_SUD',None,True,'Uruguay',False),
 ('VE','Venezuela','AM_SUD','Venezuela',False,'Venezuela (Bolivarian Republic of)',False),
 # Caraïbes (fiche 9 + autres îles)
 ('BS','Bahamas','CARA','Bahamas (îles)',False,None,False),
 ('BB','Barbade','CARA','Barbade (île)',False,None,False),
 ('CU','Cuba','CARA','Cuba (île)',False,None,False),
 ('DM','Dominique','CARA','Dominique (île)',False,None,False),
 ('JM','Jamaïque','CARA','Jamaïque (île)',False,None,False),
 ('GD','Grenade','CARA','Grenade (Iles)',False,None,False),
 ('GP','Guadeloupe','CARA','Guadeloupe (île, France)',False,None,True),
 ('HT','Haïti','CARA','Haïti (île)',False,'Haiti',False),
 ('MQ','Martinique','CARA','Martinique (île, France)',False,None,True),
 ('DO','République dominicaine','CARA','République dominicaine',False,'Dominican Republic',False),
 ('BL','Saint-Barthélemy','CARA','Saint Barthélémy (île, France)',False,None,True),
 ('LC','Sainte-Lucie','CARA','Sainte Lucie (île)',False,None,False),
 ('MF','Saint-Martin (partie française)','CARA','Saint Martin (île, partie Française)',False,None,True),
 ('SX','Sint Maarten (partie néerlandaise)','CARA','Saint Martin (île, partie hollandaise)',False,None,False),
 ('AG','Antigua-et-Barbuda','CARA','Antigua-et-Barbuda',False,None,False),
 ('AW','Aruba','CARA','Aruba (Antilles néerlandaises)',False,None,False),
 ('CW','Curaçao','CARA','Curaçao (île, Pays- Bas)',False,None,False),
 ('BQ','Bonaire','CARA','Bonaire (île, Pays- Bas)',False,None,False),
 ('KN','Saint-Christophe-et-Niévès','CARA','Saint Christophe (Kitts) et Niévès (Nevis) (îles)',False,None,False),
 ('VC','Saint-Vincent-et-les-Grenadines','CARA','Saint Vincent et Les Grenadines (îles)',False,None,False),
 ('TT','Trinité-et-Tobago','CARA','Trinité et Tobago (îles)',False,None,False),
 ('MS','Montserrat','CARA','Montserrat (île)',False,None,False),
 ('PR','Porto Rico','CARA',None,True,None,False),
 ('BQE','Saint-Eustache (Sint Eustatius)','CARA','Sint Eustatius (île, Pays-Bas)',False,None,False),
 # Asie du Sud-Est (fiche 10)
 ('BN','Brunei','ASIE_SE','Brunei Darussalam',False,'Brunei Darussalam',False),
 ('KH','Cambodge','ASIE_SE','Cambodge',False,'Cambodia',False),
 ('ID','Indonésie','ASIE_SE','Indonésie (îles)',False,'Indonesia',False),
 ('LA','Laos','ASIE_SE',None,True,"Lao People's Democratic Republic",False),
 ('MY','Malaisie','ASIE_SE','Malaisie',False,'Malaysia',False),
 ('MM','Myanmar','ASIE_SE','Myanmar',False,'Myanmar',False),
 ('PH','Philippines','ASIE_SE','Philippines (iles)',False,'Philippines',False),
 ('SG','Singapour','ASIE_SE','Singapour',False,'Singapore',False),
 ('TH','Thaïlande','ASIE_SE','Thaïlande',False,'Thailand',False),
 ('TL','Timor-Leste','ASIE_SE',None,True,'Timor-Leste',False),
 ('VN','Viêt Nam','ASIE_SE',None,True,'Viet Nam',False),
 # Sous-continent indien (fiche 11)
 ('BD','Bangladesh','ASIE_SUD','Bangladesh',False,'Bangladesh',False),
 ('BT','Bhoutan','ASIE_SUD',None,True,'Bhutan',False),
 ('IN','Inde','ASIE_SUD','Inde',False,'India',False),
 ('MV','Maldives','ASIE_SUD','Maldives (îles)',False,'Maldives',False),
 ('NP','Népal','ASIE_SUD','Népal',False,'Nepal',False),
 ('PK','Pakistan','ASIE_SUD','Pakistan',False,'Pakistan',False),
 ('LK','Sri Lanka','ASIE_SUD','Sri Lanka',False,'Sri Lanka',False),
 # Océan Indien (fiche 12)
 ('KM','Comores','OI',None,True,None,False),
 ('RE','La Réunion','OI',None,True,None,True),
 ('MG','Madagascar','OI','Madagascar (île)',False,'Madagascar',False),
 ('MU','Maurice (et Rodrigues)','OI',None,True,None,False),
 ('YT','Mayotte','OI','Mayotte (île, France)',False,None,True),
 ('SC','Seychelles','OI','Seychelles (îles)',False,None,False),
 # Océanie & Polynésie (fiche 13)
 ('AU','Australie','OCE','Australie (dont île Norfolk)',False,None,False),
 ('FJ','Fidji','OCE','Fidji (Iles)',False,'Fiji',False),
 ('MH','Îles Marshall','OCE',None,True,'Marshall Islands',False),
 ('SB','Îles Salomon','OCE','Salomon (îles)',False,'Solomon Islands',False),
 ('KI','Kiribati','OCE',None,True,'Kiribati',False),
 ('FM','Micronésie','OCE',None,True,'Micronesia (Federated States of)',False),
 ('NR','Nauru','OCE',None,True,'Nauru',False),
 ('NC','Nouvelle-Calédonie','OCE','Nouvelle Calédonie (îles, France)',False,None,True),
 ('NZ','Nouvelle-Zélande','OCE',None,True,None,False),
 ('PW','Palaos','OCE',None,True,None,False),
 ('PG','Papouasie-Nouvelle-Guinée','OCE','Papouasie-Nouvelle-Guinée (îles)',False,'Papua New Guinea',False),
 ('WS','Samoa','OCE','Samoa (îles)',False,None,False),
 ('TO','Tonga','OCE',None,True,None,False),
 ('TV','Tuvalu','OCE',None,True,'Tuvalu',False),
 ('VU','Vanuatu','OCE',None,True,'Vanuatu',False),
 ('PF','Polynésie française','OCE','Polynésie Française (îles, France)',False,None,True),
 ('WF','Wallis-et-Futuna','OCE','Wallis-et-Futuna (îles, France)',False,None,True),
 ('NU','Niue','OCE','Niue (île)',False,None,False),
 ('CK','Îles Cook','OCE',None,True,None,False),
 ('GU','Guam','OCE',None,True,'Guam',False),
 ('PN','Pitcairn','OCE','Pitcairn (île)',False,None,False),
 ('CX','Île Christmas (Australie)','OCE','Christmas (île, Australie)',False,None,False),
 ('CC','Îles Cocos (Keeling) (Australie)','OCE','Cocos (Keeling) (îles, Australie)',False,None,False),
 ('SH','Sainte-Hélène','ATL','Sainte Hélène (île)',False,None,False),
 # Asie de l'Est (pas de fiche régionale)
 ('CN','Chine','ASIE_EST','Chine',False,'China',False),
 ('HK','Hong Kong','ASIE_EST',None,True,'Hong Kong SAR, China',False),
 ('MO','Macao','ASIE_EST',None,True,'Macao SAR, China',False),
 ('JP','Japon','ASIE_EST',None,True,None,False),
 ('KR','Corée du Sud','ASIE_EST',None,True,None,False),
 ('KP','Corée du Nord','ASIE_EST','Corée du Nord',False,None,False),
 ('MN','Mongolie','ASIE_EST',None,True,'Mongolia',False),
 ('TW','Taïwan','ASIE_EST',None,True,None,False),
 # Asie centrale + Afghanistan (pas de fiche)
 ('AF','Afghanistan','ASIE_CEN',None,True,'Afghanistan',False),
 ('KZ','Kazakhstan','ASIE_CEN','Kazakhstan',False,'Kazakhstan',False),
 ('KG','Kirghizistan','ASIE_CEN',None,True,'Kyrgyz Republic',False),
 ('UZ','Ouzbékistan','ASIE_CEN',None,True,'Uzbekistan',False),
 ('TJ','Tadjikistan','ASIE_CEN',None,True,'Tajikistan',False),
 ('TM','Turkménistan','ASIE_CEN',None,True,'Turkmenistan',False),
 # Caucase
 ('AM','Arménie','CAUC',None,True,None,False),
 ('AZ','Azerbaïdjan','CAUC',None,True,'Azerbaïdjan',False),
 ('GE','Géorgie','CAUC',None,True,'Georgia',False),
 # Moyen-Orient (pas de fiche)
 ('SA','Arabie saoudite','MO','Arabie Saoudite',False,None,False),
 ('BH','Bahreïn','MO','Bahreïn',False,None,False),
 ('AE','Émirats arabes unis','MO','Émirats arabes Unis',False,None,False),
 ('IQ','Irak','MO',None,True,None,False),
 ('IR','Iran','MO','Iran',False,None,False),
 ('IL','Israël','MO',None,True,None,False),
 ('JO','Jordanie','MO',None,True,None,False),
 ('KW','Koweït','MO',None,True,None,False),
 ('LB','Liban','MO',None,True,None,False),
 ('OM','Oman','MO','Oman',False,None,False),
 ('PS','Territoires palestiniens','MO',None,False,None,False),
 ('QA','Qatar','MO','Qatar',False,None,False),
 ('SY','Syrie','MO',None,True,None,False),
 ('YE','Yémen','MO',None,True,'Yemen',False),
 ('TR','Turquie','MO',None,True,None,False),
 # Europe de l'Est (géoschéma ONU)
 ('BY','Biélorussie','EU_E',None,True,None,False),
 ('BG','Bulgarie','EU_E',None,True,None,False),
 ('HU','Hongrie','EU_E',None,True,None,False),
 ('MD','Moldavie','EU_E',None,True,'Moldova',False),
 ('PL','Pologne','EU_E',None,True,None,False),
 ('RO','Roumanie','EU_E',None,True,'Romania',False),
 ('RU','Russie','EU_E',None,True,None,False),
 ('SK','Slovaquie','EU_E',None,True,None,False),
 ('CZ','République tchèque','EU_E',None,True,None,False),
 ('UA','Ukraine','EU_E',None,True,'Ukraine',False),
 # Europe du Sud
 ('AL','Albanie','EU_S','Albanie',False,None,False),
 ('AD','Andorre','EU_S',None,True,None,False),
 ('BA','Bosnie-Herzégovine','EU_S',None,True,None,False),
 ('HR','Croatie','EU_S',None,True,None,False),
 ('CY','Chypre','EU_S',None,True,None,False),
 ('ES','Espagne','EU_S',None,True,None,False),
 ('GR','Grèce','EU_S',None,True,None,False),
 ('IT','Italie','EU_S',None,True,None,False),
 ('XK','Kosovo','EU_S',None,True,None,False),
 ('MK','Macédoine du Nord','EU_S',None,True,None,False),
 ('MT','Malte','EU_S','Malte',False,None,False),
 ('ME','Monténégro','EU_S',None,True,None,False),
 ('PT','Portugal','EU_S',None,True,None,False),
 ('SM','Saint-Marin','EU_S',None,True,None,False),
 ('RS','Serbie','EU_S',None,True,None,False),
 ('SI','Slovénie','EU_S',None,True,None,False),
 # Europe de l'Ouest et du Nord
 ('DE','Allemagne','EU_NO',None,True,None,False),
 ('AT','Autriche','EU_NO',None,True,None,False),
 ('BE','Belgique','EU_NO',None,True,None,False),
 ('DK','Danemark','EU_NO',None,True,None,False),
 ('EE','Estonie','EU_NO',None,True,None,False),
 ('FI','Finlande','EU_NO',None,True,None,False),
 ('FR','France hexagonale','EU_NO',None,True,None,False),
 ('IE','Irlande','EU_NO',None,True,None,False),
 ('IS','Islande','EU_NO',None,True,None,False),
 ('LV','Lettonie','EU_NO',None,True,None,False),
 ('LI','Liechtenstein','EU_NO',None,True,None,False),
 ('LT','Lituanie','EU_NO',None,True,None,False),
 ('LU','Luxembourg','EU_NO',None,True,None,False),
 ('MC','Monaco','EU_NO',None,True,None,False),
 ('NO','Norvège','EU_NO',None,True,None,False),
 ('NL','Pays-Bas','EU_NO',None,True,None,False),
 ('GB','Royaume-Uni','EU_NO',None,True,None,False),
 ('SE','Suède','EU_NO',None,True,None,False),
 ('CH','Suisse','EU_NO',None,True,None,False),
]

fj = json.load(open(sys.argv[1]))
fj_by = {r['name']: r for r in fj}
used = set()
TB_ANNEX = {}
for line in open(sys.argv[2], encoding='utf-8'):
    m = re.match(r'^\s*(.+?)\s{2,}(\d+)\s*$', line)
    if m and m.group(1) not in ('Pays',):
        TB_ANNEX[m.group(1).strip()] = int(m.group(2))
tb_used = set()
out = []
ids = set()
for (cid, name, reg, fjname, norisk, tbname, dom) in M:
    assert cid not in ids, cid
    ids.add(cid)
    rec = {'id': cid, 'n': name, 'r': reg}
    if dom: rec['dom'] = 1
    if fjname:
        assert fjname in fj_by, ('FJ name not found', fjname)
        assert not norisk
        r = fj_by[fjname]
        used.add(fjname)
        rec['fj'] = {'p': r['page'], 'tous': r['cols'][0], 'prov': r['cols'][1], 'prov12': r['cols'][2], 'provAny': r['cols'][3], 'reco': r['cols'][4]}
    elif norisk:
        rec['fj'] = 'none'
    if tbname:
        assert tbname in TB_ANNEX, ('TB not found', tbname)
        tb_used.add(tbname)
        rec['tb'] = TB_ANNEX[tbname]
    out.append(rec)
missing_fj = [n for n in fj_by if n not in used]
missing_tb = [n for n in TB_ANNEX if n not in tb_used]
print('FJ records not mapped:', missing_fj)
print('TB annex entries not mapped:', missing_tb)
print('countries:', len(out))
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False)
