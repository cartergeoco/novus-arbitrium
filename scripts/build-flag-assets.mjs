// Builds the flag emblem library from open-licensed SVG sources.
//
//   node scripts/build-flag-assets.mjs            regenerate lib/flag/assets/generated
//   node scripts/build-flag-assets.mjs --measure  re-measure national emblem bounds with headless Chrome
//   node scripts/build-flag-assets.mjs --list mx  print the element tree of one flag-icons SVG
//
// Sources and licenses (all compatible with redistribution when credited):
//   game-icons.net via @iconify-json/game-icons  CC BY 3.0
//   Material Design Icons via @iconify-json/mdi  Apache 2.0
//   Font Awesome Free via @iconify-json/fa6-solid CC BY 4.0
//   flag-icons (lipis) national artwork           MIT
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "lib/flag/assets/generated");
const boundsFile = join(root, "scripts/flag-assets/national-bounds.json");

const sets = {
  gi: require("@iconify-json/game-icons/icons.json"),
  mdi: require("@iconify-json/mdi/icons.json"),
  fa: require("@iconify-json/fa6-solid/icons.json"),
};

/** Curated library. Each entry is "prefix:name" or "prefix:name|extra tags". */
const library = {
  mammals: `gi:lion gi:wolf-head gi:wolf-howl gi:direwolf gi:bear-head gi:bear-face gi:polar-bear gi:horse-head gi:bull gi:charging-bull gi:buffalo-head gi:bison gi:stag-head gi:deer gi:deer-head gi:boar gi:boar-ensign gi:ram gi:ram-profile gi:goat gi:fox gi:fox-head gi:elephant gi:elephant-head gi:tiger gi:tiger-head gi:camel gi:camel-head gi:kangaroo gi:gorilla gi:monkey gi:rabbit gi:rabbit-head gi:squirrel gi:beaver gi:badger gi:cat gi:sitting-dog gi:donkey gi:cow gi:pig gi:sheep gi:saber-toothed-cat-head gi:walrus-head gi:anteater mdi:koala mdi:panda mdi:horse fa:hippo fa:otter`,
  birds: `gi:eagle-emblem gi:eagle-head gi:hawk-emblem gi:condor-emblem gi:falcon-moon gi:raven gi:crow-dive gi:dove gi:peace-dove gi:freedom-dove gi:owl gi:barn-owl gi:rooster gi:swan gi:flamingo gi:heron gi:crane gi:parrot-head gi:toucan gi:hummingbird gi:kiwi-bird gi:penguin gi:ostrich gi:seagull gi:sparrow gi:swallow gi:vulture gi:egyptian-bird gi:shoebill-stork mdi:bird mdi:duck fa:crow`,
  sea_life: `gi:dolphin gi:sperm-whale gi:whale-tail gi:shark-fin gi:octopus gi:squid gi:crab gi:sea-turtle gi:turtle gi:seahorse gi:tropical-fish gi:circling-fish gi:double-fish gi:flying-trout gi:salmon gi:angler-fish gi:manta-ray gi:jellyfish gi:sea-star gi:clownfish mdi:fish`,
  insects_reptiles: `gi:bee gi:butterfly gi:scorpion gi:spider-alt gi:scarab-beetle gi:gold-scarab gi:dragonfly gi:snake gi:cobra gi:rattlesnake gi:snake-spiral gi:salamander gi:frog gi:ant gi:flying-beetle gi:praying-mantis mdi:ladybug`,
  mythical: `gi:dragon-head gi:spiked-dragon-head gi:double-dragon gi:dragon-spiral gi:wyvern gi:griffin-symbol gi:unicorn gi:pegasus gi:hydra gi:sea-dragon gi:sea-serpent gi:centaur gi:minotaur gi:mermaid gi:egyptian-sphinx gi:greek-sphinx gi:drakkar-dragon gi:batwing-emblem gi:winged-emblem gi:ouroboros fa:dragon`,
  plants: `gi:oak gi:oak-leaf gi:holy-oak gi:pine-tree gi:palm-tree gi:maple-leaf gi:wheat gi:lotus gi:lotus-flower gi:rose gi:sunflower gi:daisy gi:clover gi:shamrock gi:olive gi:grapes gi:bamboo gi:baobab gi:cactus gi:fern gi:laurels gi:linden-leaf gi:ginkgo-leaf gi:birch-trees gi:willow-tree gi:corn gi:cotton-flower gi:coffee-beans gi:acorn gi:poppy gi:cherry gi:three-leaves gi:sprout gi:seedling gi:bonsai-tree gi:monstera-leaf gi:flower-emblem gi:vine-leaf gi:chestnut-leaf gi:pineapple gi:coconuts gi:banana-bunch gi:vanilla-flower gi:dandelion-flower mdi:leaf-maple mdi:barley mdi:flower-tulip mdi:forest fa:wheat-awn fa:tree fa:leaf`,
  weapons: `gi:crossed-swords gi:broadsword gi:two-handed-sword gi:katana gi:dervish-swords gi:crossed-sabres gi:spears gi:barbed-spear gi:trident gi:flaming-trident gi:harpoon-trident gi:battle-axe gi:crossed-axes gi:war-axe gi:bow-arrow gi:crossbow gi:arrow-cluster gi:spiked-mace gi:flail gi:halberd gi:musket gi:rifle gi:winchester-rifle gi:crossed-pistols gi:cannon gi:ak47 gi:machete gi:daggers gi:broad-dagger gi:sword-in-stone gi:zeus-sword gi:winged-sword gi:tomahawk gi:battle-tank gi:bayonet gi:quiver gi:spear-feather gi:swords-emblem gi:warhammer gi:thor-hammer gi:boomerang`,
  tools: `mdi:hammer gi:sickle gi:anvil mdi:pickaxe mdi:shovel gi:gears gi:cog gi:ship-wheel gi:compass gi:key gi:scales gi:plow gi:scythe gi:pitchfork gi:torch gi:telescope gi:sextant gi:hourglass gi:quill gi:quill-ink gi:open-book gi:scroll-unfurled gi:tied-scroll gi:cornucopia gi:horseshoe mdi:wrench mdi:gavel gi:lantern gi:candle-light gi:ringing-bell gi:trumpet gi:harp gi:lyre gi:drum gi:claw-hammer gi:gear-hammer gi:breaking-chain gi:crossed-chains gi:amphora gi:coins gi:beehive mdi:tractor fa:helmet-safety fa:pen-nib fa:graduation-cap`,
  industry_science: `gi:factory gi:oil-pump gi:oil-rig gi:atom gi:steam-locomotive gi:satellite gi:rocket gi:radioactive gi:nuclear gi:biohazard gi:round-bottom-flask mdi:dna mdi:lightbulb mdi:atom-variant fa:microscope fa:flask fa:industry fa:oil-well fa:satellite fa:jet-fighter fa:plane fa:train`,
  nautical: `gi:anchor gi:caravel gi:galleon gi:drakkar gi:sailboat gi:sail gi:battleship gi:paddle-steamer gi:lighthouse mdi:sail-boat fa:ship fa:anchor`,
  crowns_regalia: `gi:crown gi:imperial-crown gi:queen-crown gi:crenel-crown gi:jewel-crown gi:laurel-crown gi:pope-crown gi:sharp-crown gi:crowned-heart gi:hedjet-white-crown gi:deshret-red-crown gi:pschent-double-crown gi:crown-of-thorns gi:throne-king gi:bird-scepter gi:winged-scepter gi:crown-coin gi:ribbon-medal gi:medal gi:star-medal gi:laurels-trophy gi:jeweled-chalice mdi:crown mdi:chess-king mdi:chess-queen mdi:chess-rook mdi:chess-knight fa:crown fa:award`,
  heraldic: `gi:shield gi:bordered-shield gi:checked-shield gi:cross-shield gi:crenulated-shield gi:griffin-shield gi:heart-shield gi:templar-shield gi:viking-shield gi:winged-shield gi:round-shield gi:roman-shield gi:tribal-shield gi:trident-shield gi:spiked-shield gi:rosa-shield gi:fleur-de-lys gi:knight-banner gi:tattered-banner gi:vertical-banner gi:wax-seal gi:heraldic-sun gi:light-thorny-triskelion gi:triquetra gi:bowen-knot gi:jerusalem-cross gi:iron-cross gi:gothic-cross gi:camargue-cross gi:split-cross gi:visored-helm gi:spartan-helmet gi:crested-helmet gi:gauntlet gi:mailed-fist mdi:fleur-de-lis mdi:shield-cross fa:shield-halved`,
  buildings: `gi:castle gi:castle-ruins gi:tower-flag gi:stone-tower gi:white-tower gi:watchtower gi:church gi:viking-church gi:saint-basil-cathedral gi:byzantin-temple gi:greek-temple gi:egyptian-temple gi:pagoda gi:samara-mosque gi:capitol gi:india-gate gi:indian-palace gi:mayan-pyramid gi:great-pyramid gi:egyptian-pyramids gi:obelisk gi:ionic-column gi:ancient-columns gi:windmill gi:arch-bridge gi:tower-bridge gi:japanese-bridge gi:village gi:huts-village gi:tipi gi:igloo gi:house gi:medieval-gate gi:hill-fort gi:military-fort gi:locked-fortress fa:torii-gate fa:landmark-dome fa:building-columns fa:monument fa:archway fa:gopuram fa:vihara fa:kaaba mdi:castle mdi:yurt mdi:temple-buddhist mdi:temple-hindu`,
  celestial: `gi:sun gi:sunrise gi:sunset gi:moon gi:eclipse gi:comet-spark gi:ringed-planet gi:galaxy gi:star-formation gi:polar-star gi:seven-pointed-star gi:heptagram gi:orbit gi:globe gi:world gi:wireframe-globe gi:earth-america gi:earth-africa-europe gi:earth-asia-oceania gi:falling-star gi:aztec-calendar-sun gi:barbed-sun gi:sun-cloud gi:star-swirl fa:earth-americas fa:earth-africa fa:earth-asia fa:earth-europe fa:earth-oceania fa:moon`,
  nature: `gi:volcano gi:smoking-volcano gi:mountains gi:mountaintop gi:waves gi:wave-crest gi:big-wave gi:snowflake-1 gi:fluffy-cloud gi:lightning-trio gi:fire gi:flame gi:campfire gi:water-drop gi:rainbow-star fa:mountain-sun fa:fire-flame-curved fa:volcano mdi:waves`,
  political: `gi:hammer-sickle mdi:hammer-sickle gi:fist fa:hand-fist mdi:peace gi:anarchy gi:liberty-wing gi:vote fa:check-to-slot gi:shaking-hands fa:handshake fa:people-group fa:scale-balanced gi:justice-star gi:star-flag gi:all-seeing-eye fa:bullhorn gi:black-flag gi:pirate-flag mdi:skull-crossbones gi:crowned-skull gi:mushroom-cloud gi:padlock-open`,
  religious: `mdi:cross fa:cross mdi:cross-celtic mdi:cross-bolnisi mdi:cross-outline mdi:star-crescent fa:star-and-crescent mdi:star-david fa:star-of-david mdi:om fa:om mdi:khanda mdi:dharmachakra fa:dharmachakra fa:ankh gi:ankh fa:menorah fa:hamsa fa:hands-praying fa:book-bible fa:book-quran fa:book-tanakh fa:place-of-worship fa:mosque fa:church fa:synagogue gi:angel-wings fa:yin-yang gi:egyptian-temple`,
  misc: `gi:heart-wings gi:hearts gi:infinity gi:eye-shield gi:death-skull gi:bowl-spiral gi:triple-gate gi:wing-cloak gi:winged-arrow gi:wingfoot gi:feather gi:spiral-shell gi:totem gi:tribal-mask gi:ceremonial-mask gi:drama-masks gi:dream-catcher fa:feather-pointed fa:dove fa:horse-head fa:fish fa:frog fa:kiwi-bird`,
};

const synonyms = {
  eagle: "raptor bird", hawk: "raptor bird", falcon: "raptor bird", condor: "raptor bird", raven: "bird", crow: "bird",
  dove: "peace bird", wolf: "canine", bear: "ursine", lion: "big cat royal", tiger: "big cat", stag: "deer antlers",
  bull: "cattle", ox: "cattle", sword: "blade weapon", sabres: "sword blade", axe: "weapon", spear: "weapon", trident: "sea poseidon",
  crown: "monarchy royal king", shield: "heraldry escutcheon", castle: "fortress tower", church: "christian", mosque: "islam muslim",
  sun: "solar", moon: "lunar crescent", hammer: "labor worker", sickle: "farm labor", gear: "industry cog", cog: "industry gear",
  wheat: "grain farm agriculture", anchor: "navy sea maritime", dragon: "wyrm", griffin: "gryphon", fist: "resistance revolution",
  "hammer-sickle": "communism socialism soviet", "star-crescent": "islam", "star-and-crescent": "islam", "star-david": "judaism jewish",
  "star-of-david": "judaism jewish", om: "hinduism", khanda: "sikhism sikh", dharmachakra: "buddhism", menorah: "judaism",
  "fleur-de-lys": "lily france heraldry", "fleur-de-lis": "lily france heraldry", "maple-leaf": "canada", "leaf-maple": "canada",
  cedar: "lebanon tree", lotus: "flower india egypt", palm: "tropical", oak: "tree strength", kangaroo: "australia", kiwi: "new zealand",
};

/** National artwork taken from flag-icons (4:3 files). keep: top-level element indices after background removal. */
const national = [
  ["mx", "Mexico", "Mexican eagle on a cactus", "eagle serpent cactus aztec"],
  ["es", "Spain", "Spanish coat of arms", "shield crown pillars hercules"],
  ["pt", "Portugal", "Portuguese armillary sphere and shield", "armillary sphere shield navigation"],
  ["al", "Albania", "Albanian double-headed eagle", "eagle double-headed skanderbeg"],
  ["kz", "Kazakhstan", "Kazakh sun and steppe eagle", "sun eagle steppe"],
  ["kz", "Kazakhstan", "Kazakh ornament band", "ornament pattern koshkar-muiz", "kz-ornament"],
  ["ca", "Canada", "Canadian maple leaf", "maple leaf"],
  ["lb", "Lebanon", "Lebanese cedar", "cedar tree"],
  ["ec", "Ecuador", "Ecuadorian coat of arms", "condor chimborazo arms"],
  ["cy", "Cyprus", "Cyprus island with olive branches", "island map olive"],
  ["kh", "Cambodia", "Angkor Wat", "temple angkor"],
  ["bt", "Bhutan", "Druk thunder dragon", "dragon druk"],
  ["lk", "Sri Lanka", "Sri Lankan lion with sword", "lion sword kastane"],
  ["ug", "Uganda", "Grey crowned crane", "crane bird"],
  ["zm", "Zambia", "Zambian fish eagle", "eagle"],
  ["pg", "Papua New Guinea", "Bird of paradise", "bird paradise raggiana"],
  ["ki", "Kiribati", "Frigatebird over rising sun", "frigatebird sun"],
  ["ao", "Angola", "Angolan machete, gear and star", "machete cog star socialism"],
  ["mz", "Mozambique", "Mozambican rifle, hoe and book", "ak-47 hoe book star"],
  ["ir", "Iran", "Emblem of Iran", "tulip allah"],
  ["sa", "Saudi Arabia", "Shahada and sword", "sword calligraphy"],
  ["ar", "Argentina", "Argentine Sun of May", "sun may inti"],
  ["uy", "Uruguay", "Uruguayan Sun of May", "sun may"],
  ["kg", "Kyrgyzstan", "Kyrgyz sun with tunduk", "sun yurt tunduk"],
  ["md", "Moldova", "Moldovan coat of arms", "eagle aurochs shield"],
  ["me", "Montenegro", "Montenegrin coat of arms", "double-headed eagle lion"],
  ["hr", "Croatia", "Croatian coat of arms", "checkerboard shield crown"],
  ["si", "Slovenia", "Slovenian coat of arms", "triglav mountain stars shield"],
  ["sk", "Slovakia", "Slovak coat of arms", "double cross shield hills"],
  ["mt", "Malta", "George Cross", "george cross medal"],
  ["va", "Vatican City", "Keys of Saint Peter and papal tiara", "keys tiara papal"],
  ["sm", "San Marino", "San Marino coat of arms", "three towers"],
  ["li", "Liechtenstein", "Liechtenstein prince's crown", "crown"],
  ["tm", "Turkmenistan", "Turkmen carpet guls", "carpet ornament"],
  ["tj", "Tajikistan", "Tajik crown and stars", "crown stars"],
  ["af", "Afghanistan", "Emblem of Afghanistan", "mosque wreath"],
  ["eg", "Egypt", "Eagle of Saladin", "eagle saladin"],
  ["zw", "Zimbabwe", "Zimbabwe bird", "bird star soapstone"],
  ["ke", "Kenya", "Maasai shield and spears", "shield spears maasai"],
  ["sz", "Eswatini", "Nguni shield and spears", "shield spears"],
  ["ls", "Lesotho", "Mokorotlo hat", "hat basotho"],
  ["er", "Eritrea", "Eritrean olive wreath", "olive branch wreath"],
  ["mw", "Malawi", "Malawian rising sun", "rising sun"],
  ["ad", "Andorra", "Andorran coat of arms", "shield mitre cows"],
  ["ni", "Nicaragua", "Nicaraguan coat of arms", "triangle volcanoes rainbow"],
  ["ht", "Haiti", "Haitian coat of arms", "palm cannons liberty cap"],
  ["py", "Paraguay", "Paraguayan seal", "star wreath seal"],
  ["br", "Brazil", "Brazilian celestial globe", "globe stars ordem progresso"],
  ["dm", "Dominica", "Sisserou parrot", "parrot bird stars"],
  ["gd", "Grenada", "Grenada nutmeg", "nutmeg spice"],
  ["fj", "Fiji", "Fijian shield", "shield lion"],
  ["bn", "Brunei", "Brunei crest", "crescent umbrella crest"],
  ["om", "Oman", "Khanjar and crossed swords", "dagger swords khanjar"],
  ["mn", "Mongolia", "Soyombo", "soyombo fire sun moon"],
  ["gq", "Equatorial Guinea", "Silk cotton tree arms", "tree stars shield"],
  ["tw", "Taiwan", "Blue sky with white sun", "sun white"],
  ["hk", "Hong Kong", "Bauhinia", "flower bauhinia"],
  ["mo", "Macau", "Macau lotus and bridge", "lotus bridge stars"],
  ["et", "Ethiopia", "Ethiopian star emblem", "star pentagram rays"],
  ["vu", "Vanuatu", "Boar's tusk and namele leaves", "tusk fern"],
  ["by", "Belarus", "Belarusian ornament", "ornament pattern"],
  ["gt", "Guatemala", "Guatemalan coat of arms", "quetzal rifles swords"],
  ["do", "Dominican Republic", "Dominican coat of arms", "bible cross shield"],
  ["xk", "Kosovo", "Kosovo map with stars", "map stars"],
];

/**
 * Per-flag element selection, applied after stripe backgrounds are removed.
 * `at` walks into nested drawable children ("0/1"); keep/drop are drawable indices at that level.
 */
const rules = {
  "kz": { at: "0", keep: [0, 1] },
  "kz-ornament": { at: "0", keep: [2] },
  "mz": { at: "0", drop: [0] },
  "hr": { replace: { 0: '<path fill="red" d="M320 364.1c51.3 0 93.3-42 93.3-93.3V160H226.7v110.8c0 51.4 42 93.4 93.3 93.4z"/>' } },
  "br": { at: "0", drop: [0] },
  "fj": { keep: [0] },
  "bn": { keep: [2, 3] },
  "lk": { keep: [4] },
  "zw": { at: "0", drop: [0, 1, 2] },
  "ki": { at: "0", drop: [9, 10] },
  "dm": { at: "0", keep: [10] },
  "gq": { keep: [1] },
  "vu": { keep: [1] },
  "gd": { keep: [6, 7] },
  "tm": { drop: [0] },
  "ke": { replace: { 2: '<path fill="#b00" d="M263 168c9-24 39-72 57-72s48 48 57 72v144c-9 24-39 72-57 72s-48-48-57-72z"/>' } },
  "ca": { leaf: "M201 232" },
  "by": { shallow: true },
};

// ---- Minimal XML tree for well-formed SVG ---------------------------------------------------
function parse(xml) {
  const rootNode = { tag: "#root", attrs: {}, children: [] };
  const stack = [rootNode];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1]) stack.pop();
    else if (m[2]) {
      const attrs = {};
      for (const a of m[3].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1]] = a[3] ?? a[4];
      const node = { tag: m[2], attrs, children: [] };
      stack.at(-1).children.push(node);
      if (!m[4]) stack.push(node);
    } else if (m[5] && m[5].trim()) stack.at(-1).children.push({ tag: "#text", text: m[5] });
  }
  return rootNode;
}
function serialize(node) {
  if (node.tag === "#text") return node.text;
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k === "xlink:href" ? "href" : k}="${v.replace(/"/g, "&quot;")}"`).join("");
  const inner = node.children.map(serialize).join("");
  return inner ? `<${node.tag}${attrs}>${inner}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}
const drawable = (node) => !["defs", "#text", "title", "desc", "metadata", "clipPath", "mask", "linearGradient", "radialGradient", "pattern", "symbol"].includes(node.tag);
const rectOnly = (d) => /^[Mm][\d.\s,eE+-]+(?:[HhVvZzMm][\d.\s,eE+-]*)+$/.test(d.trim()) && !/[LlCcSsQqTtAa]/.test(d);
function isBackground(node) {
  if (node.tag === "rect") return true;
  if (node.tag === "path") return rectOnly(node.attrs.d || "");
  if (node.tag === "g") {
    const parts = node.children.filter(drawable);
    return parts.length > 0 && parts.every(isBackground);
  }
  return false;
}
/** Remove stripe backgrounds, descending into lone wrapper groups (clip groups, transforms). */
function stripBackground(node) {
  node.children = node.children.filter((child) => !drawable(child) || !isBackground(child));
  const parts = node.children.filter(drawable);
  if (parts.length === 1 && parts[0].tag === "g") stripBackground(parts[0]);
  return node;
}

function extractNational([iso, , , , variant]) {
  const svg = parse(readFileSync(require.resolve(`flag-icons/flags/4x3/${iso}.svg`), "utf8")).children.find((c) => c.tag === "svg");
  const rule = rules[variant || iso] || {};
  if (rule.leaf) {
    const leaf = svg.children.find((c) => c.tag === "path" && (c.attrs.d || "").includes(rule.leaf));
    return `<path fill="${leaf.attrs.fill}" d="${leaf.attrs.d.slice(leaf.attrs.d.indexOf(rule.leaf))}"/>`;
  }
  if (rule.shallow) svg.children = svg.children.filter((child) => !drawable(child) || child.tag === "g" || !isBackground(child));
  else stripBackground(svg);
  let node = svg;
  for (const i of (rule.at || "").split("/").filter(Boolean)) node = node.children.filter(drawable)[Number(i)];
  const parts = node.children.filter(drawable);
  for (const [i, markup] of Object.entries(rule.replace || {})) {
    parts[i].tag = "#text";
    parts[i].text = markup;
  }
  const chosen = new Set(rule.keep ? rule.keep.map((i) => parts[i]) : parts.filter((_, i) => !(rule.drop || []).includes(i)));
  node.children = node.children.filter((c) => !drawable(c) || chosen.has(c));
  return svg.children.map(serialize).join("");
}

// ---- Bounds measured in a real browser -----------------------------------------------------
function chromePath() {
  const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  return candidates.find((c) => c && existsSync(c));
}
function measure(entries) {
  const chrome = chromePath();
  if (!chrome) throw Error("Chrome not found; set CHROME_PATH to measure national emblem bounds.");
  const page = join(tmpdir(), "flag-emblem-measure.html");
  const svgs = entries.map(([key, body]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480"><g data-key="${key}">${body}</g></svg>`).join("");
  writeFileSync(page, `<!doctype html><body>${svgs}<pre id="out"></pre><script>
    const result = {};
    for (const g of document.querySelectorAll("g[data-key]")) { const b = g.getBBox(); result[g.dataset.key] = [b.x, b.y, b.width, b.height].map(v => Math.round(v * 100) / 100); }
    document.getElementById("out").textContent = "BOUNDS" + JSON.stringify(result) + "END";
  </script></body>`);
  const html = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--dump-dom", pathToFileURL(page).href], { encoding: "utf8", maxBuffer: 1 << 28 });
  rmSync(page);
  return JSON.parse(html.slice(html.indexOf("BOUNDS") + 6, html.indexOf("END", html.indexOf("BOUNDS"))));
}

// ---- Icon sets ------------------------------------------------------------------------------
function icon(prefix, name) {
  const set = sets[prefix];
  const data = set.icons[name];
  if (!data) return undefined;
  const w = data.width ?? set.width ?? 16, h = data.height ?? set.height ?? 16;
  return { body: data.body.replace(/\s+/g, " "), viewBox: [data.left ?? 0, data.top ?? 0, w, h] };
}
const title = (name) => name.replace(/[-_]+/g, " ").replace(/\b(\d+)\b/g, "").trim().replace(/^./, (c) => c.toUpperCase());
function tagsFor(name, category, extra = "") {
  const words = name.split(/[-_]/);
  const syn = [synonyms[name], ...words.map((w) => synonyms[w])].filter(Boolean).join(" ");
  return [...new Set(`${words.join(" ")} ${category.replace(/_/g, " ")} ${syn} ${extra}`.split(/\s+/).filter(Boolean))];
}

// ---- Main ---------------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args[0] === "--list") {
  let node = parse(readFileSync(require.resolve(`flag-icons/flags/4x3/${args[1]}.svg`), "utf8")).children.find((c) => c.tag === "svg");
  stripBackground(node);
  for (const i of (args[2] || "").split("/").filter(Boolean)) node = node.children.filter(drawable)[Number(i)];
  node.children.filter(drawable).forEach((c, i) => console.log(i, c.tag, JSON.stringify(c.attrs).slice(0, 140), c.children.length));
  process.exit(0);
}

const meta = [];
const chunks = {};
const seen = new Set();
const missing = [];
for (const [category, text] of Object.entries(library)) {
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const [ref, extra = ""] = token.split("|");
    const [prefix, name] = ref.split(":");
    const id = `${prefix}:${name}`;
    if (seen.has(id)) continue;
    const found = icon(prefix, name);
    if (!found) { missing.push(id); continue; }
    seen.add(id);
    (chunks[category] ||= {})[id] = { ...found, multicolor: false };
    meta.push({ id, name: title(name), category, tags: tagsFor(name, category, extra), source: prefix, multicolor: false, chunk: category });
  }
}

const bounds = existsSync(boundsFile) ? JSON.parse(readFileSync(boundsFile, "utf8")) : {};
const nationalBodies = national.map((entry) => [entry[4] || entry[0], extractNational(entry)]);
const unmeasured = nationalBodies.filter(([key]) => !bounds[key]);
if (args.includes("--measure") || unmeasured.length) {
  Object.assign(bounds, measure(args.includes("--measure") ? nationalBodies : unmeasured));
  mkdirSync(dirname(boundsFile), { recursive: true });
  writeFileSync(boundsFile, JSON.stringify(bounds, null, 1) + "\n");
}
for (const [index, entry] of national.entries()) {
  const [iso, country, name, extra, variant] = entry;
  const key = variant || iso;
  const [x, y, w, h] = bounds[key];
  const pad = Math.max(w, h) * 0.02;
  const id = `nat:${key}`;
  const body = nationalBodies[index][1];
  (chunks[`nat-${key}`] ||= {})[id] = { body, viewBox: [x - pad, y - pad, w + pad * 2, h + pad * 2].map((v) => Math.round(v * 100) / 100), multicolor: true };
  meta.push({ id, name, category: "national", tags: [...new Set(`${country.toLowerCase()} ${iso} national arms emblem ${extra}`.split(/\s+/))], source: "flag-icons", multicolor: true, chunk: `nat-${key}` });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "chunks"), { recursive: true });
const banner = "// Generated by scripts/build-flag-assets.mjs. Do not edit.\n";
for (const [chunk, assets] of Object.entries(chunks)) {
  writeFileSync(join(out, "chunks", `${chunk}.ts`), `${banner}import type { AssetBody } from "../../../types";\n\nconst assets: Record<string, AssetBody> = ${JSON.stringify(assets)};\nexport default assets;\n`);
}
const loaders = Object.keys(chunks).map((c) => `  ${JSON.stringify(c)}: () => import("./chunks/${c}"),`).join("\n");
writeFileSync(join(out, "index.ts"), `${banner}import type { AssetBody } from "../../types";

export type AssetMeta = { id: string; name: string; category: string; tags: string[]; source: string; multicolor: boolean; chunk: string };

export const assetIndex: AssetMeta[] = ${JSON.stringify(meta)};

export const chunkLoaders: Record<string, () => Promise<{ default: Record<string, AssetBody> }>> = {
${loaders}
};
`);
const size = Object.values(chunks).reduce((sum, c) => sum + JSON.stringify(c).length, 0);
console.log(`${meta.length} emblems in ${Object.keys(chunks).length} chunks (${Math.round(size / 1024)} KB).`);
if (missing.length) console.log("Missing icons:", missing.join(", "));
