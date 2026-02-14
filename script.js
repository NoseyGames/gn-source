const BLOCKLIST = {
    ids: [],
    names: ["Soundboard", "[!] COMMENTS", "[!] SUGGEST GAMES .gg/D4c9VFYWyU"]
};

const CUSTOM_ZONES = [];

const CDN_SOURCES = [
    {
        name: "noseygames",
        zones: "https://cdn.jsdelivr.net/gh/NoseyGames/data@main/zones.json",
        covers: "https://cdn.jsdelivr.net/gh/NoseyGames/covers@latest/",
        html: "https://cdn.jsdelivr.net/gh/gn-math/html@main"
    },
    {
        name: "gn-math",
        zones: "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json",
        covers: "https://cdn.jsdelivr.net/gh/gn-math/covers@main",
        html: "https://cdn.jsdelivr.net/gh/gn-math/html@main"
    }
];

let zoneSourceMap = new Map();
let customEntries = [];
let zones = [];
let popularityData = {};

let config = {
    panicKey: localStorage.getItem('panicKey') || '1',
    panicUrl: localStorage.getItem('panicUrl') || 'https://launchpad.classlink.com/login',
    cloakTitle: localStorage.getItem('cloakTitle') || 'Number Problems',
    cloakIcon: localStorage.getItem('cloakIcon') || 'favicon.png'
};

const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = document.getElementById('zoneFrame');
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');
const customZonesURL = "/customzones.json";

const quotes = [
    { text: "Your gay.", author: "Classroomspot" },
    { text: "Umm i had some beef.", author: "Classroomspot" },
    { text: "ugh i hate working on my ui", author: "NikeGtag" },
    { text: "OMG nikehub is the most tuff site to ever exist.", author: "defo said by gn math 🙏" },
    { text: "Reality is merely an illusion, albeit a very persistent one.", author: "idk bro dont ask me" },
    { text: "PLEASEEE promote me", author: "GN-Math" },
    { text: "What kind of mango is this?", author: "Some tiktоk" },
    { text: "Dawg take a shower", author: "Unknown Hub" }
];

function updateQuote() {
    const quoteEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const quoteContainer = document.getElementById('quoteContainer');
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    quoteContainer.style.opacity = 0;
    setTimeout(() => {
        quoteEl.textContent = `"${randomQuote.text}"`;
        authorEl.textContent = `- ${randomQuote.author}`;
        quoteContainer.style.opacity = 1;
    }, 500);
}

function isBlocked(zone) {
    if (BLOCKLIST.ids.includes(zone.id)) return true;
    const zoneNameLower = zone.name.toLowerCase();
    for (let blockedName of BLOCKLIST.names) {
        if (zoneNameLower.includes(blockedName.toLowerCase())) return true;
    }
    return false;
}

function deduplicateZones(zoneList) {
    const seen = new Set();
    const uniqueZones = [];
    zoneList.forEach(item => {
        if (!seen.has(item.zone.id)) {
            seen.add(item.zone.id);
            zoneSourceMap.set(item.zone.id, item.source);
            uniqueZones.push(item.zone);
        }
    });
    return uniqueZones;
}

async function loadFromCDN(cdn) {
    try {
        const response = await fetch(cdn.zones + "?t=" + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.map(zone => ({ zone, source: cdn }));
    } catch (e) {
        return [];
    }
}

async function loadCustomZonesFile() {
    try {
        const response = await fetch(customZonesURL + "?t=" + Date.now());
        if (!response.ok) throw new Error('File not found');
        const data = await response.json();
        return data.map(zone => ({ zone, source: CDN_SOURCES[0] }));
    } catch (error) {
        return [];
    }
}

function loadHardcodedCustomZones() {
    if (CUSTOM_ZONES.length === 0) return [];
    return CUSTOM_ZONES.map(zone => ({ zone, source: CDN_SOURCES[0] }));
}

async function listZones() {
    try {
        const loadPromises = [
            loadHardcodedCustomZones(),
            loadCustomZonesFile(),
            ...CDN_SOURCES.map(cdn => loadFromCDN(cdn))
        ];
        
        const results = await Promise.all(loadPromises);
        const allZoneItems = results.flat();
        
        if (allZoneItems.length === 0) throw new Error("No zones loaded");
        
        zones = deduplicateZones(allZoneItems);
        zones = zones.filter(zone => !isBlocked(zone));
        
        await fetchPopularity();
        sortZones();
        document.getElementById('zoneCount').textContent = `${zones.length} zones available. Have fun!`;
    } catch (error) {
        container.innerHTML = `<div class="loading"><h3>Offline Mode Active</h3><p>Could not reach servers.</p></div>`;
    }
}

async function fetchPopularity() {
    try {
        for (let cdn of CDN_SOURCES) {
            const statsUrl = `https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=year`;
            const response = await fetch(statsUrl);
            if (response.ok) {
                const data = await response.json();
                data.forEach(file => {
                    const idMatch = file.name.match(/\/(\d+)\.html$/);
                    if (idMatch) popularityData[parseInt(idMatch[1])] = file.hits.total;
                });
                break;
            }
        }
    } catch (e) {}
}

function sortZones() {
    const sortBy = sortOptions.value;
    let sortedZones = [...zones];
    
    if (sortBy === 'name') sortedZones.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'id') sortedZones.sort((a, b) => a.id - b.id);
    else if (sortBy === 'popular') sortedZones.sort((a, b) => (popularityData[b.id] || 0) - (popularityData[a.id] || 0));
    
    sortedZones.sort((a, b) => (a.isExternal ? -1 : b.isExternal ? 1 : 0));
    displayZones(sortedZones);
}

function displayZones(zonesToShow) {
    container.innerHTML = "";
    zonesToShow.forEach(file => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";
        if (file.featured) zoneItem.classList.add('featured');
        zoneItem.onclick = () => openZone(file);
        
        const img = document.createElement("img");
        img.loading = "lazy";
        
        const sourceCDN = zoneSourceMap.get(file.id) || CDN_SOURCES[0];
        
        if (file.isExternal) {
            img.src = file.cover;
        } else {
            img.src = file.cover
                .replace("{COVER_URL}", sourceCDN.covers)
                .replace("{HTML_URL}", sourceCDN.html);
        }
        
        img.onerror = function() { this.src = 'https://via.placeholder.com/300x200/0f172a/94a3b8?text=' + encodeURIComponent(file.name); };
        
        const zoneInfo = document.createElement("div");
        zoneInfo.className = "zone-info";
        const zoneName = document.createElement("div");
        zoneName.className = "zone-name";
        zoneName.textContent = file.name;
        
        zoneInfo.appendChild(zoneName);
        zoneItem.appendChild(img);
        zoneItem.appendChild(zoneInfo);
        container.appendChild(zoneItem);
    });
}

function openZone(file) {
    if (file.name === "[!] SUGGEST GAMES • Tiktok") {
        window.open(file.url, "_blank");
        return;
    }

    const viewer = document.getElementById('zoneViewer');
    let oldFrame = document.getElementById('zoneFrame');
    const newFrame = document.createElement('iframe');
    newFrame.id = 'zoneFrame';
    
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);
    zoneFrame = newFrame; 

    const sourceCDN = zoneSourceMap.get(file.id) || CDN_SOURCES[0];

    if (file.isExternal) {
        zoneFrame.src = file.url;
    } else {
        const url = file.url
            .replace("{COVER_URL}", sourceCDN.covers)
            .replace("{HTML_URL}", sourceCDN.html);
            
        fetch(url).then(res => res.text()).then(html => {
            const doc = zoneFrame.contentDocument || zoneFrame.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
        });
    }

    document.getElementById('zoneName').textContent = file.name;
    document.getElementById('zoneId').textContent = file.id;
    document.getElementById('zoneAuthor').innerHTML = `<i class="fas fa-circle-check"></i> by ${file.author}`;
    zoneViewer.style.display = "flex";
    document.body.style.overflow = 'hidden';
}

function closeZone() {
    zoneViewer.style.display = "none";
    if (zoneFrame) {
        const parent = zoneFrame.parentNode;
        const newFrame = document.createElement('iframe');
        newFrame.id = 'zoneFrame';
        parent.replaceChild(newFrame, zoneFrame);
        zoneFrame = newFrame;
    }
    document.body.style.overflow = 'auto';
}

function fullscreenZone() { if (zoneFrame.requestFullscreen) zoneFrame.requestFullscreen(); }

function downloadZone() {
    const zoneId = document.getElementById('zoneId').textContent;
    const zone = zones.find(z => (z.id + '') === zoneId);
    if (zone && !zone.isExternal) {
        const sourceCDN = zoneSourceMap.get(zone.id) || CDN_SOURCES[0];
        fetch(zone.url.replace("{HTML_URL}", sourceCDN.html)).then(r => r.text()).then(t => {
            const blob = new Blob([t], {type: "text/html"});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = zone.name + ".html"; a.click();
        });
    } else alert("Download restricted.");
}

function applyCloak() {
    document.title = config.cloakTitle;
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = config.cloakIcon;
    document.getElementsByTagName('head')[0].appendChild(link);
}

function updateConfig(key, val) {
    config[key] = val;
    localStorage.setItem(key, val);
    if (key === 'cloakTitle' || key === 'cloakIcon') applyCloak();
}

function openSettings() {
    document.getElementById('popupTitle').textContent = "Settings & Config";
    document.getElementById('popupBody').innerHTML = `
    <div class="setting-item">
        <label class="setting-label">Tab Title</label>
        <input type="text" class="setting-input" value="${config.cloakTitle}" oninput="updateConfig('cloakTitle', this.value)">
    </div>
    <div class="setting-item">
        <label class="setting-label">Favicon URL</label>
        <input type="text" class="setting-input" value="${config.cloakIcon}" oninput="updateConfig('cloakIcon', this.value)">
    </div>
    <div class="setting-item">
        <label class="setting-label">Panic Switch Key</label>
        <input type="text" class="setting-input" maxlength="1" value="${config.panicKey}" oninput="updateConfig('panicKey', this.value)">
    </div>
    <div class="setting-item">
        <label class="setting-label">Panic Redirect URL</label>
        <input type="text" class="setting-input" value="${config.panicUrl}" oninput="updateConfig('panicUrl', this.value)">
    </div>
    <div class="btn-group">
        <button class="btn btn-secondary" onclick="saveData()"><i class="fas fa-download"></i> Export</button>
        <label class="btn btn-secondary" style="margin:0; cursor:pointer;"><i class="fas fa-upload"></i> Import <input type="file" style="display:none" onchange="loadData(event)"></label>
    </div>
    `;
    document.getElementById('popupOverlay').style.display = "flex";
}

document.getElementById('settings').addEventListener('click', openSettings);
document.getElementById('popupClose').addEventListener('click', () => document.getElementById('popupOverlay').style.display = "none");

searchBar.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    displayZones(zones.filter(z => z.name.toLowerCase().includes(q)));
});

sortOptions.addEventListener('change', sortZones);

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === config.panicKey.toLowerCase()) window.location.replace(config.panicUrl);
    if (e.key === 'Escape') closeZone();
});

updateQuote();
setInterval(updateQuote, 30000);
applyCloak();
listZones();
