/**
 * Generates src/data/bancoRecomendacionesI18n.js with ES bank + EN translations.
 */
import fs from 'fs';

const BANCO_ES = JSON.parse(fs.readFileSync('scripts/_banco_es_extracted.json', 'utf8'));

const CATEGORY_LABELS_EN = {
  INCENDIO: 'FIRE',
  'ROTURA DE MAQUINARIA': 'MACHINERY BREAKDOWN',
  ALMACENAMIENTO: 'STORAGE',
  'SUSTRACCIÓN Y MANEJO': 'THEFT AND HANDLING',
  'RESPONSABILIDAD CIVIL CONTRACTUAL Y EXTRACONTRACTUAL / MEDIO AMBIENTE':
    'CIVIL LIABILITY (CONTRACTUAL AND EXTRA-CONTRACTUAL) / ENVIRONMENT',
  'INSTALACIONES ELÉCTRICAS': 'ELECTRICAL INSTALLATIONS',
  'INSTALACIONES FÍSICAS, CONSTRUCCIÓN, ORDEN, ASEO':
    'PHYSICAL FACILITIES, CONSTRUCTION, HOUSEKEEPING',
};

const BANCO_EN = {
  INCENDIO: [
    'During the policy term, the proper conditioning of the electrical installations and their maintenance must be verified at least every 6 months, including conduit for all power distribution circuits, eliminating the use of extension cords as a permanent connection method, and closing all junction boxes, power distribution panels, exposed wiring points, luminaires, switches, and outlets.',
    'During the policy term, disconnect the electrical power supply during non-working hours and days to the electrical distribution circuits of equipment or areas that are not essential for the insured\'s own activities; essential circuits are those that supply power to equipment or areas that, due to company operations, cannot be left without power. This disconnection must be evidenced through a procedure with defined responsible parties and sufficient records.',
    'During the policy term, keep installed the necessary and adequate fire extinguishers to protect all facilities. They must remain in good condition, with a valid charge (maximum 1 year), signed, and located in a visible and easily accessible place. For these purposes, sufficient extinguishers means at least one extinguisher per 200 m² of built area. Adequate extinguishers means: areas with solid combustible material (paper, wood, textiles, etc.) must be protected with type A extinguishers of at least 2 1/2 gal capacity; areas with flammable products (gasoline, solvents, etc.) and areas with machinery without electronic components must be protected with type BC extinguishers of at least 20 lb capacity; areas with both solid combustibles and flammable products and/or machinery must be protected with type ABC extinguishers of at least 20 lb capacity; areas with electronic equipment and/or machinery with electronic components must be protected with Solkaflam 123 extinguishers of at least 10 lb capacity.',
    'During the policy term, keep installed an automatic fire detector system (thermal, smoke, or flame), located on the ceiling at least 10 cm from the nearest wall, or on side walls at 10 or 30 cm from the ceiling; the vertical distance from ceiling to sensor must be at least 50 cm, with a uniform layout of maximum 9 m between detectors; these devices must be connected to an audible alarm system or automatic communication to emergency services. If other types of detectors are used, follow the manufacturer\'s installation recommendations.',
    'Automatic sprinkler systems are the most reliable and economical; it is important to note that it is easier to restore a wet document than a burned one. Gas extinguishing systems cause less damage to stored items, but their operation requires automatically isolating protected areas and has limitations because they act by smothering without cooling burning materials, which may continue to smolder or reignite; therefore, a water intervention is required for final extinguishment, with the associated water damage from hose application. NFPA 13, NFPA 15, and NFPA 16 cover the aspects to consider for automatic sprinkler systems.',
    'Smoke detectors should be located at a maximum of 60 cm from the ceiling in order to reduce possible fire spread with late detection; specifications contained in NFPA 72 E4.',
    'It is suggested to perform pressure and flow tests on the fire protection network, verifying its proper operation; this supply must be capable of providing the residual flow and pressure required within a minimum time, in accordance with NFPA 14, NFPA 20, and NFPA 25.',
    'Extinguishers have an optimal vertical reach of 2.5 m when applied by an experienced person, which means that for 8.5 m racking the extinguisher coverage is not sufficient for the storage heights handled. It is suggested to study installing a manual or automatic fire response system (administrative, storage, production, laboratory, and public service areas); this system must be connected to a monitoring center.',
    'Fuel tank level gauges should preferably be made of fire-resistant material, avoiding plastic hoses, which are immediately consumed in a fire and cause corresponding fuel spills.',
    'In warehouses where aerosols are stored, a special metal cage for their storage is recommended; likewise, the space between links should have a maximum separation of 51 mm that, in case of fire, prevents an aerosol propelled by the fire from exiting.',
    'Smoke exhaust ducts (chimneys or hoods) in restaurants should have a semiannual maintenance program to avoid accumulation of grease and materials inside that could start a fire.',
  ],
  'ROTURA DE MAQUINARIA': [
    'In accordance with machinery and equipment maintenance clauses and manufacturer recommendations, a preventive maintenance plan must be established; this maintenance must be performed by specialized personnel for all electronic equipment and must include a general review at least every six months. Likewise, records of the activities performed should be kept.',
    'In a dusty environment, equipment maintenance requires greater frequency because the equipment is exposed to damage from this cause.',
  ],
  ALMACENAMIENTO: [
    'Keep flammable products (e.g., diesel) stored in ventilated places and separated from ignition sources (e.g., electrical installations, open flame, among others).',
    'In all areas where flammable items are stored, installations and equipment must be explosion proof.',
    'Storage tanks for flammable and corrosive liquids must be and remain properly marked; likewise, each tank\'s capacity must be included on the label. For this purpose, it is advisable to follow NFPA 30.',
    'The storage area for corrosive items, flammable liquids, and any dangerous goods must be properly located, considering the chemical compatibility of all merchandise.',
    'Corrosive products and flammable liquids stored with other supplies aggravate the risk factor and must not occur under any circumstance; dangerous goods must be stored in special areas, isolated from other items and preferably separated by metal cages with proper marking labels.',
    'Gas cylinders that are not in use must be anchored to prevent one of them from falling, with the corresponding consequences.',
    'Adequate storage practices must be maintained in accordance with NFPA 23018: in storage warehouses, merchandise must not reach the roof due to the difficulty of controlling a fire; there must be at least 60 cm between stored material and the ceiling. Merchandise should be kept free of direct floor contact using racking or plastic or wooden pallets, in both cases more than 10 cm high. Merchandise must remain at least 50 cm from walls and thermal sources (e.g., lamps, switches, electrical panels, among others). In raw material and finished product warehouses, adequate storage practices are necessary because inadequate height is one of the most influential factors in fire progress, making control difficult. Unstable stacking is undesirable because it allows materials to fall into aisles; it also provides a bridge for fire to cross and hinders firefighting operations. Very high product stacks were observed creating instability and a hazardous situation; therefore, it is suggested to reduce storage height or install metal racking for support. The top rack level in some areas has higher storage density, with an approximate maximum height of 8.5 m; merchandise is handled with forklifts. Storage strategy must be changed by placing higher-density merchandise on lower rack levels to reduce breakage risk during handling, since forklifts present blind spots for the operator above 2.5 m of handling height.',
  ],
  'SUSTRACCIÓN Y MANEJO': [
    'It is suggested to install an automatic intrusion detection system in the mentioned areas, or implement a system with adhesive tags on equipment that alert security personnel when crossing detection arches, similar to systems used in stores selling discs, books, or clothing.',
    'It is advisable to keep installed an alarm system with motion sensors protecting all facilities, magnetic opening sensors, and other sensors needed to protect the different accesses to the premises. The system must be connected to a siren; in case of power failure, the alarm must have a backup battery supporting the system for at least 4 hours; likewise, the system must be monitored (with response service) by telephone with a specialized firm registered with the Superintendence of Surveillance.',
    'The alarm and surveillance system must ensure protection of specialized medical equipment (which normally have high costs) that are easy to remove.',
    'During the policy term, the insured must install or place a safe in a non-visible location, embedded in the floor or wall, to store and safeguard cash and/or negotiable instruments derived from its commercial activity.',
    'During the policy term, the insured must keep installed a closed-circuit television (CCTV) system, active 24 hours a day, 365 days a year. The system must have internal and external cameras protecting the premises (perimeters and accesses). In case of power failure, the CCTV must be backed up by a UPS, battery bank, or emergency generator.',
    'During the policy term, the insured must maintain a security guard service with dedicated personnel 24 hours a day, every day of the week; such personnel must not have keys to access doors or alarm arm/disarm codes.',
    'During the policy term, the insured must maintain a security guard service from a specialized firm registered with the Superintendence of Surveillance, 24 hours a day, every day of the week; such personnel must not have keys to access doors or alarm arm/disarm codes.',
    'During the policy term, the insured must keep installed and active an alarm system protecting the facilities and possible accesses with motion sensors, magnetic opening sensors, and wireless and/or fixed panic sensors. The system must be monitored via radio, GPRS, and/or cellular with a specialized company registered with the Superintendence of Surveillance that has response service. The alarm must have a backup battery supporting the system for at least four (4) hours.',
    'During the policy term, the insured must keep installed above the walls and/or on perimeter fences adjacent to neighboring properties an electric fencing system. The system must have a backup battery supporting the system for at least four (4) hours.',
    'During the policy term, the insured must keep installed above the walls and/or on perimeter fences adjacent to neighboring properties a concertina wire system. Concertina means coiled wire with short piercing filaments.',
  ],
  'RESPONSABILIDAD CIVIL CONTRACTUAL Y EXTRACONTRACTUAL / MEDIO AMBIENTE': [
    'Many types of buildings have interior rooms for garbage collection. Some have a garbage chute system through which waste is dropped and later stored in larger containers.',
    'Because these spaces receive all types of materials, objects with a high combustible load may be found that, when ignition sources arise, could cause a fire. Therefore, it is recommended that garbage storage areas have the following characteristics stipulated in NFPA 82 – Standard on Incinerators and Waste and Linen Handling Systems and Equipment:',
    '· The enclosure must have a self-closing door with a fire resistance rating of not less than 1 ½ hours.',
    '· Adequate maintenance and cleaning must be performed annually or as recommended by the builder.',
    '· If the storage enclosure holds more than 0.75 m³ of uncompacted garbage inside, it must be isolated from other building rooms by walls and ceilings with a fire resistance rating of not less than 2 hours.',
    '· The garbage enclosure must have an automatic sprinkler system for fire extinguishment, following NFPA 13 – Standard for the Installation of Sprinkler Systems.',
    '· Because it is an area that is unoccupied most of the time, it is recommended to install a fire detection system that is constantly monitored by security personnel.',
  ],
  'INSTALACIONES ELÉCTRICAS': [
    'During the policy term, the insured must keep all electronic equipment with grounding connection and regulation systems such as voltage regulators (stabilizers) or online UPS of sufficient capacity. Likewise, the manufacturer\'s system recommendations must be correctly followed. Perform semiannual preventive maintenance on protection equipment. Evidence maintenance activities through a documented record.',
    'During the policy term, the insured must keep all electronic equipment with telephone communication input (telephone exchanges, faxes, computers, computing equipment, among others) with surge suppressors installed at the outlet of receptacles or power strips. Verify correct operation at least every six (6) months. Evidence maintenance activities through a documented record or log.',
    'During the policy term, the insured must maintain a preventive maintenance contract with a specialized third party for all electronic equipment, including a general review at least every six (6) months. Evidence maintenance activities through a documented record or log per equipment.',
    'During the policy term, the insured must maintain a preventive maintenance contract with a specialized third party for all electronic equipment, including a maintenance process every three (3) months. Evidence maintenance activities through a documented record or log per equipment.',
    'During the policy term, the insured must ensure that all electrical distribution panels of the substation or feed lines to specialized electronic equipment have transient overvoltage protection devices, with an appropriate grounding system. For installing an appropriate grounding system, consider the Technical Regulation of Electrical Installations (RETIE).',
    'During the policy term, the insured must maintain a grounding system of sufficient capacity to protect existing electronic equipment and perform annual preventive maintenance on the system. Evidence maintenance activities through a documented record. For installing an appropriate grounding system, consider the Technical Regulation of Electrical Installations (RETIE).',
  ],
  'INSTALACIONES FÍSICAS, CONSTRUCCIÓN, ORDEN, ASEO': [
    'During the policy term, the insured must perform general maintenance on gutters and downspouts at least every six (6) months, including cleaning and replacement of defective elements (tiles, hooks, among others). Evidence maintenance activities through a documented record or log.',
    'During the policy term, the insured must perform maintenance at least every six (6) months on waterproofing, gutters, and downspouts, including cleaning and review of the membrane protecting the roof. Evidence maintenance activities through a documented record or log.',
    'During the policy term, the insured must perform maintenance at least every three (3) months on rainwater gutters and downspouts and inspection boxes, among others, including cleaning and review of rainwater drains that protect the premises from flooding. Back up drainage with a pumping system using submersible motor pumps to evacuate any fluid in case of flooding.',
  ],
};

// Validate lengths
for (const cat of Object.keys(BANCO_ES)) {
  if (!BANCO_EN[cat]) throw new Error('Missing EN category: ' + cat);
  if (BANCO_EN[cat].length !== BANCO_ES[cat].length) {
    throw new Error(
      `Length mismatch ${cat}: ES=${BANCO_ES[cat].length} EN=${BANCO_EN[cat].length}`
    );
  }
}

function esc(s) {
  return JSON.stringify(s);
}

const lines = [];
lines.push('/** Auto-generated bilingual recommendation bank. Canonical storage keys/texts remain Spanish. */');
lines.push('');
lines.push(`export const CATEGORY_LABELS_EN = ${JSON.stringify(CATEGORY_LABELS_EN, null, 2)};`);
lines.push('');
lines.push(`export const BANCO_RECOMENDACIONES_ES = ${JSON.stringify(BANCO_ES, null, 2)};`);
lines.push('');
lines.push(`export const BANCO_RECOMENDACIONES_EN = ${JSON.stringify(BANCO_EN, null, 2)};`);
lines.push('');
lines.push(`export function normalizeRecText(text) {
  return String(text || '').replace(/\\s+/g, ' ').trim();
}

const esToEnMap = (() => {
  const map = new Map();
  for (const cat of Object.keys(BANCO_RECOMENDACIONES_ES)) {
    const esItems = BANCO_RECOMENDACIONES_ES[cat] || [];
    const enItems = BANCO_RECOMENDACIONES_EN[cat] || [];
    esItems.forEach((esText, idx) => {
      map.set(normalizeRecText(esText), enItems[idx] || esText);
    });
  }
  return map;
})();

export function isEnglishLanguage(language) {
  return String(language || 'es').toLowerCase().startsWith('en');
}

export function translateCategoryLabel(categoryKey, language) {
  if (!categoryKey) return categoryKey;
  if (isEnglishLanguage(language)) {
    return CATEGORY_LABELS_EN[categoryKey] || categoryKey;
  }
  return categoryKey;
}

export function translateRecommendationText(text, language) {
  if (!text || !isEnglishLanguage(language)) return text;
  return esToEnMap.get(normalizeRecText(text)) || text;
}

export function displayRecommendationPreview(text, language, maxLen = 100) {
  const translated = translateRecommendationText(text, language) || '';
  if (translated.length <= maxLen) return translated;
  return translated.slice(0, maxLen) + '...';
}
`);

fs.writeFileSync('src/data/bancoRecomendacionesI18n.js', lines.join('\n'));
console.log('wrote src/data/bancoRecomendacionesI18n.js');
console.log('categories', Object.keys(BANCO_ES).length);
console.log(
  'texts',
  Object.values(BANCO_ES).reduce((a, b) => a + b.length, 0)
);
