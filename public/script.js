/* ===== FIREBASE IMPORTS & SETUP ===== */
import { 
    ref, 
    set, 
    onValue, 
    update, 
    get,
    remove,
    onDisconnect
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
const database = window.firebaseDatabase;

/* ===== MULTIPLAYER STATE VARIABLES ===== */
let gameMode = 'offline';
let currentRoomCode = null;
let currentUserId = null;
let isAuctioneer = false;
let myTeamId = null;
let firebaseListeners = [];
let teamIdMapping = {};

/* ===== ORIGINAL GLOBAL VARIABLES ===== */

/* Current */
const defaultPlayers = {
    "Marquee Set": ["Virat Kohli - b", "Surya Kumar Yadav - b", "Jos Buttler ✈️ - wk", "Hardik Pandya - ar", "Jasprit Bumrah - fb", "KL Rahul - wk", "Varun Chakravarthy - s", "Yuzvendra Chahal - s", "Mitchell Starc ✈️ - fb", "Ravindra Jadeja - ar", "Axar Patel - ar", "Shreyas Iyer - b"],
    "Wicket Keeper 1": ["Rishabh Pant", "Ishan Kishan", "Sanju Samson", "Dinesh Karthik", "MS Dhoni", "Heinrich Klaasen ✈️", "Nicholas Pooran ✈️", "Jitesh Sharma", "Phil Salt ✈️", "Tristan Stubbs ✈️", "Josh Inglis ✈️"],
    "Batsman 1": ["Rohit Sharma", "Shubman Gill", "Ruturaj Gaikwad", "Abhishek Sharma", "Yashasvi Jaiswal", "Travis Head ✈️", "David Miller ✈️", "Tilak Varma", "Rajat Patidar", "Sai Sudharsan"],
    "Fast Bowler 1": ["Mohammad Siraj", "Mohammed Shami", "Bhuvneshwar Kumar", "Arshdeep Singh", "Prasidh Krishna", "Josh Hazlewood ✈️", "Jofra Archer ✈️", "Kagiso Rabada ✈️", "Trent Boult ✈️", "Pat Cummins ✈️"],
    "Spinner 1": ["Kuldeep Yadav", "Ravi Bishnoi", "Rashid Khan ✈️", "Noor Ahmad ✈️", "Wanindu Hasaranga ✈️", "Digvesh Rathi", "Adam Zampa ✈️"],
    "All-rounder 1": ["Shivam Dube", "Nitish Reddy", "Harshal Patel", "Venkatesh Iyer", "Ramandeep Singh", "Rahul Tewatia", "Krunal Pandya", "Washington Sundar", "Riyan Parag", "Ravichandran Ashwin", "Sai Kishore", "Nitish Rana"],
    "Wicket Keeper 2": ["Finn Allen ✈️", "Ryan Rickelton ✈️", "KS Bharat", "Prabhsimran Singh", "Dhruv Jurel", "Abishek Porel", "Devon Conway ✈️", "Rahmanullah Gurbaz ✈️", "Quinton de Kock ✈️", "Jonny Bairstow ✈️"],
    "Batsman 2": ["Shimron Hetmyer ✈️", "Shashank Singh","Ashutosh Sharma", "Devdutt Padikkal", "Rinku Singh", "Faf Du Plessis ✈️", "Aiden Markram ✈️", "Glenn Phillips ✈️", "Nehal Wadhera", "Rovman Powell ✈️"],
    "Fast Bowler 2": [ "Lockie Ferguson ✈️", "Anrich Nortje ✈️", "Mark Wood ✈️", "Matheesha Pathirana ✈️", "Lungi Ngidi ✈️", "Harshit Rana", "Sandeep Sharma", "T Natarajan", "Shardul Thakur", "Deepak Chahar"],
    "Spinner 2": ["Adil Rashid ✈️", "Shreyas Gopal", "Harpreet Brar", "Suyash Sharma", "Allah Ghazanfar ✈️", "Mujeeb Ur Rahman ✈️", "Mayank Markande", "Rahul Chahar", "Maheesh Theekshana ✈️"],
    "All-rounder 2": ["Andre Russell ✈️", "Romario Shepherd ✈️", "Marcus Stoinis ✈️", "Sam Curran ✈️", "Marco Jansen ✈️", "Tim David ✈️", "Mitchell Marsh ✈️", "Cam Green ✈️", "Jacob Bethell ✈️", "Will Jacks ✈️", "Sunil Narine ✈️", "Mitchell Santner ✈️"],
    "Batsman 3": ["Mayank Agarwal", "Angkrish Raghuvanshi", "Sarfaraz Khan", "Ajinkya Rahane", "Ayush Mhatre", "Vaibhav Sooryavanshi", "Aniket Verma", "Priyansh Arya", "Naman Dhir", "Dewald Brevis ✈️"],
    "Fast Bowler 3": [ "Ishant Sharma", "Vyshak Vijay Kumar", "Mohit Sharma", "Mayank Yadav", "Akash Madhwal", "Anshul Kamboj", "Avesh Khan", "Akash Deep", "Jaydev Unadkat", "Khaleel Ahmed", "Mukesh Kumar", "Yash Dayal"],
    "All-rounder 3": ["Shabaz Ahmed", "Deepak Hooda", "Vipraj Nigam", "Swapnil Singh", "Ayush Badoni", "Azmatullah Omarzai ✈️", "Sherfane Rutherford ✈️", "Dasun Shanaka ✈️", "Kamindu Mendis ✈️", "Liam Livingstone ✈️", "Rachin Ravindra ✈️", "Glenn Maxwell ✈️"],
    "Batsman 4": ["Jake Fraser McGurk ✈️", "Steve Smith ✈️", "David Warner ✈️", "Kane Williamson ✈️", "Rahul Tripathi", "Karun Nair", "Prithvi Shaw", "Abdul Samad", "Shahrukh Khan", "Manish Pandey"],
    "Fast Bowler 4": ["Dushmantha Chameera ✈️", "Nuwan Thushara ✈️", "Nandre Burger ✈️", "Kyle Jamieson ✈️", "Tushar Deshpande", "Nathan Ellis ✈️", "Umran Malik", "Mohsin Khan", "Rasikh Dar", "Vaibhav Arora"],
};


/* OLD
const defaultPlayers = {
    "Wicket Keepers": ["MS Dhoni", "Rishabh Pant", "Quinton De Kock ✈️", "Jos Buttler ✈️", "Dinesh Karthik", "Robin Uthappa", "Parthiv Patel", "KL Rahul", "Wriddhiman Saha", "Sanju Samson", "Naman Ojha", "Ishan Kishan"],
    "Batsmen 1": ["Rohit Sharma", "Virat Kohli", "Shikhar Dhawan", "Gautam Gambhir", "Shreyas Iyer", "Suresh Raina", "Ambati Rayudu", "Suryakumar Yadav", "Virender Sehwag", "Ajinkya Rahane", "Manish Pandey", "Sachin Tendulkar", "Rahul Dravid", "Sourav Ganguly", "Murali Vijay"],
    "Fast Bowlers 1": ["Jasprit Bumrah", "Mohammad Shami", "Bhuvaneshwar Kumar", "Zaheer Khan", "Mohit Sharma", "Umesh Yadav", "Vinay Kumar", "Ishant Sharma", "Ashish Nehra", "Praveen Kumar", "RP Singh", "Munaf Patel", "Sidharth Kaul"],
    "Spinners": ["Yuzvendra Chahal", "Kuldeep Yadav", "Rashid Khan ✈️", "Amit Mishra", "Harbhajan Singh", "Piyush Chawla", "Karn Sharma", "Imran Tahir ✈️", "Varun Chakravarthy", "Adam Zampa ✈️", "Anil Kumble", "Pragyan Ojha", "Murali Kartik"],
    "All-rounders 1": ["Ravindra Jadeja", "Ravichandran Ashwin", "Hardik Pandya", "Krunal Pandya", "Axar Patel", "Yusuf Pathan", "Stuart Binny", "Yuvraj Singh", "Kedar Jhadav", "Harshal Patel", "Irfan Pathan", "Rishi Dhawan"],
    "Batsmen 2": ["Faf Du Plessis ✈️", "Eoin Morgan ✈️", "David Miller ✈️", "Brendon McCullum ✈️", "AB De Villiers ✈️", "Martin Guptill ✈️", "Chris Gayle ✈️", "David Warner ✈️", "Aaron Finch ✈️", "Kane Williamson ✈️"],
    "Fast Bowlers 2": ["Mitchell Starc ✈️", "Tim Southee ✈️", "Pat Cummins ✈️", "James Faulkner ✈️", "DJ Bravo ✈️", "Dale Steyn ✈️", "Mitchell Johnson ✈️", "Morne Morkel ✈️", "Lasith Malinga ✈️", "Trent Boult ✈️"],
    "All-rounders 2": ["Glenn Maxwell ✈️", "Darren Sammy ✈️", "Sunil Narine ✈️", "JP Duminy ✈️", "Andre Russell ✈️", "Shane Watson ✈️", "Carlos Braithwaite ✈️", "Ben Stokes ✈️", "Daniel Vettori ✈️", "Kieron Pollard ✈️"]
}
*/
    
let setTypeCounts = {
    "Marquee": 0,
    "Wicket Keeper": 0,
    "Batsman": 0,
    "Fast Bowler": 0,
    "Spinner": 0,
    "All-rounder": 0
};

let customPlayers = {};
let players = {};
let sets = [];
let playerMode = 'default';
let teamNames = [];
let budget = 120;
let currentSetIndex = 0;
let currentPlayerIndex = 0;
let isSetAnnounced = false;
let isSecondRound = false;
let unsoldPlayers = {};
let teamCount = 0;
let currentTeamDiv = null;
let currentPlayerData = null;
let minPlayers = 15;
let maxPlayers = 20;
let dragDropListenersAttached = false;
let currentManagedTeam = null;
let playerToMove = null;
let isAuctionStarted = false;
let allPlayersInAuction = new Set();
let draggedSet = null;
let autoScrollInterval = null;
let isAutoScrolling = false;
let autoScrollDirection = 0;
let allTeamsData = {};
let auctionStats = {
    mostExpensivePlayer: { name: '', price: 0, team: '' },
    totalPlayersSold: 0,
    totalMoneySpent: 0
};
let isEditingConfig = false;
let currentParticipants = {};
let lastCelebrationTime = 0
let playerStatsDB = {};
let playerMetaDB = {};
const IPL_2026_COMPETITION_ID = '284';
const IPL_STATS_BASE = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats';
const OFFICIAL_2026_LOCAL_FILE = 'official_ipl_2026_stats.json';
const OFFICIAL_2025_LOCAL_FILE = 'official_ipl_2025_stats.json';
const OFFICIAL_2024_LOCAL_FILE = 'official_ipl_2024_stats.json';
const OFFICIAL_CAREER_LOCAL_FILE = 'official_ipl_career_stats.json';
const IPL_2026_FEEDS = {
    batting: `${IPL_STATS_BASE}/${IPL_2026_COMPETITION_ID}-toprunsscorers.js`,
    bowling: `${IPL_STATS_BASE}/${IPL_2026_COMPETITION_ID}-mostwickets.js`
};
const STATS_SEASONS = ['2026', '2025', '2024'];
const PLAYER_PLACEHOLDER_IMAGE = 'https://scores.iplt20.com/ipl/images/default-player-statsImage.png';
let activeStatsPlayer = null;
const playerNameAliases = {
    "suryakumar yadav": "surya kumar yadav",
    "bhuvaneshwar kumar": "bhuvneshwar kumar",
    "mateesha pathirana": "matheesha pathirana",
    "cam green": "cameron green",
    "mohammad siraj": "mohammed siraj",
    "mohammed shami": "mohammad shami",
    "varun chakravarthy": "varun chakaravarthy",
    "varun charavarthy": "varun chakaravarthy",
    "nitish reddy": "nitish kumar reddy",
    "shabaz ahmed": "shahbaz ahamad",
    "vyshak vijay kumar": "vyshak vijaykumar",
    "tilak varma": "n tilak varma",
    "vaibhav sooryavanshi": "vaibhav suryavanshi",
    "lungi ngidi": "lungisani ngidi",
    "kl rahul": "k l rahul",
    "digvest rathi": "digvesh singh",
    "digvesh rathi": "digvesh singh",
    "digvesh singh rathi": "digvesh singh",
    "quinton decock": "quinton de kock",
    "rajath patidar": "rajat patidar",
    "nuwan tushara": "nuwan thushara",
    "rasik salam dar": "rasikh dar",
    "rasikh salam dar": "rasikh dar"
};

const playerImageNameAliases = {
    "travis head": ["Travis Head"],
    "yash dayal": ["Yash Dayal"],
    "pat cummins": ["Pat Cummins"],
    "kl rahul": ["KL Rahul", "K L Rahul"],
    "k l rahul": ["KL Rahul", "K L Rahul"],
    "digvest rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
    "digvesh rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
    "digvesh singh": ["Digvesh Singh", "Digvesh Singh Rathi"],
    "digvesh singh rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
    "quinton decock": ["Quinton De Kock"],
    "quinton de kock": ["Quinton De Kock"],
    "rajath patidar": ["Rajat Patidar"],
    "rajat patidar": ["Rajat Patidar"],
    "nuwan tushara": ["Nuwan Thushara"],
    "nuwan thushara": ["Nuwan Thushara"],
    "pat cummins": ["Pat Cummins"],
    "yash dayal": ["Yash Dayal"],
    "rasik salam dar": ["Rasikh Dar", "Rasikh Salam"],
    "rasikh salam dar": ["Rasikh Dar", "Rasikh Salam"],
    "rasikh dar": ["Rasikh Dar", "Rasikh Salam"]
};

const whiteBackgroundPlayers = new Set([
    'abhishek sharma'
]);

function parseStatNumber(value) {
    const cleaned = String(value || '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'no stats') return 0;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function noStatValue() {
    return 'No stats available';
}

function naValue() {
    return 'NA';
}

function cleanBestBowling(value) {
    const text = String(value || '').trim();
    if (!text || text.toLowerCase() === 'no stats' || text === '0') return '0/0';
    return text;
}

function parseBestBowling(value) {
    const cleaned = cleanBestBowling(value);
    const match = cleaned.match(/(\d+)\/(\d+)/);
    if (!match) return { wickets: 0, runs: Number.MAX_SAFE_INTEGER, raw: '0/0' };
    return {
        wickets: parseInt(match[1], 10) || 0,
        runs: parseInt(match[2], 10) || 0,
        raw: cleaned
    };
}

function normalizeCareerBestBowling(value, wickets, runsConceded) {
    const text = String(value || '').trim();
    const wkts = parseStatNumber(wickets);

    if (text && text !== '-' && text !== '0' && text !== '0/0') {
        const nums = text.match(/\d+/g) || [];
        if (nums.length >= 2) {
            const a = parseInt(nums[0], 10) || 0;
            const b = parseInt(nums[1], 10) || 0;
            const likelyWicketsFirst = a <= 10 && b > 10;
            const likelyRunsFirst = a > 10 && b <= 10;

            if (likelyRunsFirst) return `${b}/${a}`;
            if (likelyWicketsFirst) return `${a}/${b}`;

            if (wkts > 0) {
                if (a === wkts) return `${a}/${b}`;
                if (b === wkts) return `${b}/${a}`;
            }

            return `${a}/${b}`;
        }
    }

    if (wkts > 0) {
        return 'NA';
    }

    return noStatValue();
}

function formatStatValue(value, digits = 2) {
    if (value === '-' || value === null || value === undefined || value === '') return naValue();
    if (typeof value === 'string') {
        const cleaned = value.trim();
        if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'no stats') return naValue();
        return cleaned;
    }
    if (!Number.isFinite(value)) return noStatValue();
    return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function isNoStatYearData(yearData) {
    if (!yearData) return true;
    const batting = yearData.batting || {};
    const bowling = yearData.bowling || {};

    const battingHasData =
        parseStatNumber(batting.innings) > 0 ||
        parseStatNumber(batting.runs) > 0 ||
        parseStatNumber(batting.ballsFaced) > 0 ||
        parseStatNumber(batting.fours) > 0 ||
        parseStatNumber(batting.sixes) > 0 ||
        parseStatNumber(batting.fifties) > 0 ||
        parseStatNumber(batting.hundreds) > 0 ||
        parseStatNumber(batting.catches) > 0 ||
        parseStatNumber(batting.stumpings) > 0;

    const bowlingHasData =
        parseStatNumber(bowling.innings) > 0 ||
        parseStatNumber(bowling.wickets) > 0 ||
        parseStatNumber(bowling.runsConceded) > 0 ||
        parseStatNumber(bowling.ballsBowled) > 0 ||
        parseStatNumber(bowling.fourW) > 0 ||
        parseStatNumber(bowling.fiveW) > 0;

    return !(battingHasData || bowlingHasData);
}

function hasAnyYearStats(yearData) {
    if (!yearData) return false;
    const batting = yearData.batting || {};
    const bowling = yearData.bowling || {};

    const batHas =
        parseStatNumber(batting.innings) > 0 ||
        parseStatNumber(batting.runs) > 0 ||
        parseStatNumber(batting.ballsFaced) > 0 ||
        parseStatNumber(batting.fours) > 0 ||
        parseStatNumber(batting.sixes) > 0 ||
        parseStatNumber(batting.fifties) > 0 ||
        parseStatNumber(batting.hundreds) > 0 ||
        parseStatNumber(batting.catches) > 0 ||
        parseStatNumber(batting.stumpings) > 0;

    const bowlHas =
        parseStatNumber(bowling.innings) > 0 ||
        parseStatNumber(bowling.wickets) > 0 ||
        parseStatNumber(bowling.ballsBowled) > 0 ||
        parseStatNumber(bowling.runsConceded) > 0 ||
        parseStatNumber(bowling.fourW) > 0 ||
        parseStatNumber(bowling.fiveW) > 0;

    return batHas || bowlHas;
}

function sanitizeDisplayPlayerName(name) {
    return String(name || '')
        .replace(/\uFE0F/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPlayerImageUrl(playerName) {
    const cleanName = sanitizeDisplayPlayerName(playerName);
    if (!cleanName) return PLAYER_PLACEHOLDER_IMAGE;
    return `https://scores.iplt20.com/ipl/playerimages/${encodeURIComponent(cleanName)}.png?v=2026`;
}

function getPlayerHeadshotUrlsById(playerId) {
    const id = String(playerId || '').trim();
    if (!id) return [];
    return [
        `https://documents.iplt20.com/ipl/IPLHeadshot2026/${encodeURIComponent(id)}.png?v=2026`,
        `https://documents.iplt20.com/ipl/IPLHeadshot2025/${encodeURIComponent(id)}.png?v=2026`,
        `https://documents.iplt20.com/ipl/IPLHeadshot2024/${encodeURIComponent(id)}.png?v=2026`
    ];
}

function getImageNameCandidates(inputNames = []) {
    const candidates = [];
    const normalizedSeen = new Set();

    inputNames.forEach(name => {
        const normalized = normalizePlayerName(name);
        if (!normalized || normalizedSeen.has(normalized)) return;
        normalizedSeen.add(normalized);

        const forced = playerImageNameAliases[normalized] || [];
        forced.forEach(forceName => {
            const cleanForce = sanitizeDisplayPlayerName(forceName);
            if (cleanForce && !candidates.includes(cleanForce)) candidates.push(cleanForce);
        });
    });

    inputNames.forEach(name => {
        const clean = sanitizeDisplayPlayerName(name);
        if (!clean) return;
        if (!candidates.includes(clean)) candidates.push(clean);

        const normalized = normalizePlayerName(clean);
        const aliasTarget = playerNameAliases[normalized];
        if (aliasTarget) {
            const aliasDisplay = toDisplayNameFromNormalized(aliasTarget);
            if (aliasDisplay && !candidates.includes(aliasDisplay)) candidates.push(aliasDisplay);
        }

        const imageAliases = playerImageNameAliases[normalized] || [];
        imageAliases.forEach(aliasName => {
            const aliasClean = sanitizeDisplayPlayerName(aliasName);
            if (aliasClean && !candidates.includes(aliasClean)) candidates.push(aliasClean);
        });
    });
    return candidates;
}

function applyImageToneClass(element, preferredNames = []) {
    if (!element) return;
    let needsFix = false;
    preferredNames.forEach(name => {
        const normalized = normalizePlayerName(name);
        if (whiteBackgroundPlayers.has(normalized)) {
            needsFix = true;
        }
    });
    element.classList.toggle('white-bg-fix', needsFix);
}

function toDisplayNameFromNormalized(normalizedName) {
    return String(normalizedName || '')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getNormalizedNameCandidates(name) {
    const normalized = normalizePlayerName(name);
    const candidates = [normalized];

    if (playerNameAliases[normalized]) {
        candidates.push(playerNameAliases[normalized]);
    }

    const compact = normalized.replace(/\s+/g, '');
    for (const [key, value] of Object.entries(playerNameAliases)) {
        const keyCompact = key.replace(/\s+/g, '');
        const valCompact = value.replace(/\s+/g, '');
        if (keyCompact === compact) candidates.push(value);
        if (valCompact === compact) candidates.push(key);
    }

    return [...new Set(candidates.filter(Boolean))];
}

function isValidDob(dob) {
    if (!dob) return false;
    const value = String(dob).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    if (value.startsWith('0000-00-00')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime());
}

function calculateAge(dob) {
    if (!isValidDob(dob)) return null;
    const birthDate = new Date(`${dob}T00:00:00Z`);
    const now = new Date();
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
    const dayDiff = now.getUTCDate() - birthDate.getUTCDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age -= 1;
    }

    return age >= 0 ? age : null;
}

function resolvePlayerContext(name) {
    const candidates = getNormalizedNameCandidates(name);

    for (const key of candidates) {
        if (playerStatsDB[key]) {
            const meta = playerMetaDB[key] || {};
            const officialName = sanitizeDisplayPlayerName(meta.officialName || toDisplayNameFromNormalized(key) || name);
            return {
                key,
                data: playerStatsDB[key],
                officialName,
                dob: meta.dob || null,
                playerId: meta.playerId || null
            };
        }
    }

    const compact = normalizePlayerName(name).replace(/\s+/g, '');
    for (const [key, value] of Object.entries(playerStatsDB)) {
        if (key.replace(/\s+/g, '') === compact) {
            const meta = playerMetaDB[key] || {};
            const officialName = sanitizeDisplayPlayerName(meta.officialName || toDisplayNameFromNormalized(key) || name);
            return {
                key,
                data: value,
                officialName,
                dob: meta.dob || null,
                playerId: meta.playerId || null
            };
        }
    }

    return null;
}

function setPlayerImage(element, preferredNames = []) {
    if (!element) return;
    applyImageToneClass(element, preferredNames);
    const uniqueNames = getImageNameCandidates(preferredNames);
    const imageQueue = uniqueNames.map(getPlayerImageUrl);
    imageQueue.push(PLAYER_PLACEHOLDER_IMAGE);

    const verifyImage = (url) => {
        return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);
            testImg.src = url;
        });
    };

    let requestId = parseInt(element.dataset.imageRequestId || '0', 10) + 1;
    element.dataset.imageRequestId = String(requestId);

    const currentRequestId = element.dataset.imageRequestId;

    (async () => {
        for (const url of imageQueue) {
            if (element.dataset.imageRequestId !== currentRequestId) return;
            const ok = await verifyImage(url);
            if (ok) {
                element.src = url;
                return;
            }
        }
        if (element.dataset.imageRequestId === currentRequestId) {
            element.src = PLAYER_PLACEHOLDER_IMAGE;
        }
    })();

    element.onerror = function() {
        this.onerror = null;
        this.src = PLAYER_PLACEHOLDER_IMAGE;
    };
}

function setPlayerImageWithContext(element, preferredNames = [], playerContext = null) {
    if (!element) return;
    applyImageToneClass(element, preferredNames);

    const uniqueNames = getImageNameCandidates(preferredNames);
    const imageQueue = [
        ...getPlayerHeadshotUrlsById(playerContext && playerContext.playerId ? playerContext.playerId : null),
        ...uniqueNames.map(getPlayerImageUrl),
        PLAYER_PLACEHOLDER_IMAGE
    ];

    const verifyImage = (url) => {
        return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);
            testImg.src = url;
        });
    };

    let requestId = parseInt(element.dataset.imageRequestId || '0', 10) + 1;
    element.dataset.imageRequestId = String(requestId);
    const currentRequestId = element.dataset.imageRequestId;

    (async () => {
        for (const url of imageQueue) {
            if (element.dataset.imageRequestId !== currentRequestId) return;
            const ok = await verifyImage(url);
            if (ok) {
                element.src = url;
                return;
            }
        }
        if (element.dataset.imageRequestId === currentRequestId) {
            element.src = PLAYER_PLACEHOLDER_IMAGE;
        }
    })();

    element.onerror = function() {
        this.onerror = null;
        this.src = PLAYER_PLACEHOLDER_IMAGE;
    };
}

function getPlayerStatsByName(name) {
    const resolved = resolvePlayerContext(name);
    return resolved ? resolved.data : null;
}

function buildBattingRowFromYear(playerData, year) {
    const yearData = playerData.years[year];
    if (!yearData || isNoStatYearData(yearData)) {
        return { noStatsForYear: true };
    }

    return {
        innings: yearData.batting.innings,
        runs: yearData.batting.runs,
        strikeRate: formatStatValue(yearData.batting.strikeRate, 2),
        average: formatStatValue(yearData.batting.average, 2),
        fours: yearData.batting.fours,
        sixes: yearData.batting.sixes,
        highest: yearData.batting.highest,
        fifties: yearData.batting.fifties,
        hundreds: yearData.batting.hundreds,
        catches: yearData.batting.catches,
        stumpings: yearData.batting.stumpings
    };
}

function createEmptyPlayerData() {
    return {
        career: {
            batting: {
                innings: 0,
                notOuts: 0,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                fifties: 0,
                hundreds: 0,
                catches: 0,
                stumpings: 0,
                highest: '0',
                highestComputed: '',
                highestScoreNumeric: 0
            },
            bowling: {
                innings: 0,
                ballsBowled: 0,
                runsConceded: 0,
                wickets: 0,
                fourW: 0,
                fiveW: 0,
                bestBowl: '0/0',
                bestBowlComputed: '',
                bestBowlCsv: '',
                bestBowlFinal: '',
                bestBowlParsed: { wickets: 0, runs: Number.MAX_SAFE_INTEGER, raw: '0/0' }
            }
        },
        years: {}
    };
}

function ensurePlayerRecord(name) {
    const normalized = normalizePlayerName(name);
    if (!playerStatsDB[normalized]) {
        playerStatsDB[normalized] = createEmptyPlayerData();
    }
    return playerStatsDB[normalized];
}

function recomputeCareerStats(playerData) {
    const career = createEmptyPlayerData().career;

    Object.values(playerData.years).forEach(yearData => {
        if (!yearData) return;

        const bat = yearData.batting || {};
        const bowl = yearData.bowling || {};

        career.batting.innings += parseStatNumber(bat.innings);
        career.batting.notOuts += parseStatNumber(bat.notOuts);
        career.batting.runs += parseStatNumber(bat.runs);
        career.batting.ballsFaced += parseStatNumber(bat.ballsFaced);
        career.batting.fours += parseStatNumber(bat.fours);
        career.batting.sixes += parseStatNumber(bat.sixes);
        career.batting.fifties += parseStatNumber(bat.fifties);
        career.batting.hundreds += parseStatNumber(bat.hundreds);
        career.batting.catches += parseStatNumber(bat.catches);
        career.batting.stumpings += parseStatNumber(bat.stumpings);

        const highest = String(bat.highest || '0');
        const highestNum = parseInt(highest.replace('*', ''), 10) || 0;
        if (highestNum > career.batting.highestScoreNumeric) {
            career.batting.highestScoreNumeric = highestNum;
            career.batting.highest = highest;
        }

        career.bowling.innings += parseStatNumber(bowl.innings);
        career.bowling.ballsBowled += parseStatNumber(bowl.ballsBowled);
        career.bowling.runsConceded += parseStatNumber(bowl.runsConceded);
        career.bowling.wickets += parseStatNumber(bowl.wickets);
        career.bowling.fourW += parseStatNumber(bowl.fourW);
        career.bowling.fiveW += parseStatNumber(bowl.fiveW);

        const best = parseBestBowling(bowl.bestBowl || '0/0');
        if (
            best.wickets > career.bowling.bestBowlParsed.wickets ||
            (best.wickets === career.bowling.bestBowlParsed.wickets && best.runs < career.bowling.bestBowlParsed.runs)
        ) {
            career.bowling.bestBowlParsed = best;
            career.bowling.bestBowl = best.raw;
        }
    });

    playerData.career = career;
}

function buildBowlingRowFromYear(playerData, year) {
    const yearData = playerData.years[year];
    if (!yearData || isNoStatYearData(yearData)) {
        return { noStatsForYear: true };
    }

    return {
        innings: yearData.bowling.innings,
        wickets: yearData.bowling.wickets,
        runsConceded: yearData.bowling.runsConceded,
        ballsBowled: yearData.bowling.ballsBowled,
        economy: formatStatValue(yearData.bowling.economy, 2),
        average: formatStatValue(yearData.bowling.average, 2),
        fourW: yearData.bowling.fourW,
        fiveW: yearData.bowling.fiveW,
        bestBowl: yearData.bowling.bestBowl || noStatValue()
    };
}

function buildCareerBattingRow(playerData) {
    const c = playerData.career.batting;
    const dismissals = Math.max(c.innings - c.notOuts, 0);
    const average = dismissals > 0 ? c.runs / dismissals : 0;
    const strikeRate = c.ballsFaced > 0 ? (c.runs / c.ballsFaced) * 100 : 0;

    const resolvedHighest = c.highest && String(c.highest) !== '0' ? c.highest : (c.highestComputed || naValue());

    return {
        innings: c.innings,
        runs: c.runs,
        strikeRate: formatStatValue(strikeRate, 2),
        average: formatStatValue(average, 2),
        fours: c.fours,
        sixes: c.sixes,
        highest: resolvedHighest,
        fifties: c.fifties,
        hundreds: c.hundreds,
        catches: c.catches,
        stumpings: c.stumpings
    };
}

function buildCareerBowlingRow(playerData) {
    const c = playerData.career.bowling;
    const economy = c.ballsBowled > 0 ? c.runsConceded / (c.ballsBowled / 6) : 0;
    const average = c.wickets > 0 ? c.runsConceded / c.wickets : 0;
    const hasBowlingRecord = c.innings > 0 || c.wickets > 0 || c.ballsBowled > 0;
    const officialBest = normalizeCareerBestBowling(c.bestBowlFinal || c.bestBowl, c.wickets, c.runsConceded);
    const bestFigure = hasBowlingRecord
        ? (
            officialBest && officialBest !== noStatValue() && officialBest !== 'NA'
                ? officialBest
                : (normalizeCareerBestBowling(c.bestBowlComputed, c.wickets, c.runsConceded) || normalizeCareerBestBowling(c.bestBowlCsv, c.wickets, c.runsConceded) || 'NA')
          )
        : noStatValue();

    return {
        innings: c.innings,
        wickets: c.wickets,
        runsConceded: c.runsConceded,
        ballsBowled: c.ballsBowled,
        economy: formatStatValue(economy, 2),
        average: formatStatValue(average, 2),
        fourW: c.fourW,
        fiveW: c.fiveW,
        bestBowl: bestFigure
    };
}

function createStatsSection(sectionTitle, columns, rows) {
    let html = `<div class="stats-section"><h4>${sectionTitle}</h4><div class="stats-table-container"><table class="stats-table expanded"><thead><tr><th>Season</th>`;

    columns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    rows.forEach(row => {
        const seasonClass = row.season === 'Career' ? 'career-label' : 'year-label';
        html += `<tr><td class="${seasonClass}">${row.season}</td>`;
        if (row.data && row.data.noStatsForYear) {
            html += `<td class="no-stats-cell" colspan="${columns.length}">No stats available for year ${row.season}</td></tr>`;
            return;
        }
        columns.forEach(col => {
            const value = row.data[col.key];
            html += `<td>${formatStatValue(value)}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';
    return html;
}

function buildEmptySeasonRecord() {
    return {
        batting: {
            innings: 0,
            notOuts: 0,
            runs: 0,
            ballsFaced: 0,
            strikeRate: 0,
            average: 0,
            fours: 0,
            sixes: 0,
            highest: '0',
            fifties: 0,
            hundreds: 0,
            catches: 0,
            stumpings: 0
        },
        bowling: {
            innings: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0,
            economy: 0,
            average: 0,
            fourW: 0,
            fiveW: 0,
            bestBowl: '0/0'
        }
    };
}

function ensureSeasonMeta(record, year) {
    record.seasonMeta = record.seasonMeta || {};
    record.seasonMeta[year] = record.seasonMeta[year] || { matches: 0, hasStats: false };
    return record.seasonMeta[year];
}

function mergeBowlingFromEntry(targetBowling, entry) {
    const innings = parseStatNumber(entry.Innings);
    const wickets = parseStatNumber(entry.Wickets);
    const runsConceded = parseStatNumber(entry.TotalRunsConceded || entry.InningsRuns);
    const legalBalls = parseStatNumber(entry.LegalBallsBowled);
    const overs = parseStatNumber(entry.OversBowled);
    const ballsBowled = legalBalls > 0 ? legalBalls : Math.round(overs * 6);
    const economy = parseStatNumber(entry.EconomyRate);
    const average = parseStatNumber(entry.BowlingAverage);
    const fourW = parseStatNumber(entry.FourWickets);
    const fiveW = parseStatNumber(entry.FiveWickets);

    if (innings > targetBowling.innings) targetBowling.innings = innings;
    if (wickets > targetBowling.wickets) targetBowling.wickets = wickets;
    if (runsConceded > targetBowling.runsConceded) targetBowling.runsConceded = runsConceded;
    if (ballsBowled > targetBowling.ballsBowled) targetBowling.ballsBowled = ballsBowled;
    if (economy > 0) targetBowling.economy = economy;
    if (average > 0 || wickets === 0) targetBowling.average = average;
    if (fourW > targetBowling.fourW) targetBowling.fourW = fourW;
    if (fiveW > targetBowling.fiveW) targetBowling.fiveW = fiveW;

    const rawBest = entry.BBIW || entry.BBM || targetBowling.bestBowl;
    if (rawBest && rawBest !== '-' && rawBest !== '0' && rawBest !== '0/0') {
        let normalizedBest = String(rawBest);
        if (!normalizedBest.includes('/')) {
            const w = parseStatNumber(entry.InningsWickets);
            const r = parseStatNumber(entry.InningsRuns || entry.TotalRunsConceded);
            if (w >= 0 && r >= 0) normalizedBest = `${w}/${r}`;
        }
        const candidate = parseBestBowling(normalizedBest);
        const current = parseBestBowling(targetBowling.bestBowl || '0/0');
        if (
            candidate.wickets > current.wickets ||
            (candidate.wickets === current.wickets && candidate.runs < current.runs)
        ) {
            targetBowling.bestBowl = candidate.raw;
        }
    }
}

async function fetchOfficialFeedList(compId, key) {
    const url = `${IPL_STATS_BASE}/${compId}-${key}.js`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const data = parseJsonpPayload(text);
    return data && data[key] ? data[key] : [];
}

async function patchSeasonBowlingFromOfficialFeeds(year, compId) {
    try {
        const [economyRows, figuresRows, averagesRows] = await Promise.all([
            fetchOfficialFeedList(compId, 'besteconomyrates'),
            fetchOfficialFeedList(compId, 'bestbowlingfigures'),
            fetchOfficialFeedList(compId, 'bestaverages')
        ]);

        const enrichRows = [...economyRows, ...figuresRows, ...averagesRows];
        enrichRows.forEach(row => {
            const bowlerName = row.BowlerName || row.PlayerName;
            if (!bowlerName) return;

            const record = ensurePlayerRecord(bowlerName);
            if (!record.years[year]) record.years[year] = buildEmptySeasonRecord();
            mergeBowlingFromEntry(record.years[year].bowling, row);

            const seasonMeta = ensureSeasonMeta(record, year);
            const matches = parseStatNumber(row.Matches);
            if (matches > seasonMeta.matches) seasonMeta.matches = matches;
            seasonMeta.hasStats = hasAnyYearStats(record.years[year]) || seasonMeta.matches > 0;

            const normalizedName = normalizePlayerName(bowlerName);
            playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
            playerMetaDB[normalizedName].officialName = bowlerName;
            if (row.PlayerId) {
                playerMetaDB[normalizedName].playerId = String(row.PlayerId);
            }
        });
    } catch (error) {
        console.warn(`⚠️ Could not patch bowling feeds for ${year}.`, error);
    }
}

function parseJsonpPayload(text) {
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start === -1 || end === -1 || end <= start) return null;
    const payload = text.slice(start + 1, end);
    try {
        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}

async function loadOfficialSeasonSnapshot(fileName) {
    const res = await fetch(fileName);
    if (!res.ok) return null;
    return res.json();
}

function applySeasonSnapshot(year, snapshot) {
    if (!snapshot || !snapshot.players) return;

    Object.values(snapshot.players).forEach(player => {
        if (!player || !player.name) return;
        const normalizedName = normalizePlayerName(player.name);
        const record = ensurePlayerRecord(player.name);
        playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
        playerMetaDB[normalizedName].officialName = player.name;
        if (player.playerId) {
            playerMetaDB[normalizedName].playerId = String(player.playerId);
        }

        const dobValue = player.dob || player.playerDob || player.playerDOB || null;
        if (isValidDob(dobValue)) {
            playerMetaDB[normalizedName].dob = String(dobValue);
        }
        if (!record.years[year]) {
            record.years[year] = buildEmptySeasonRecord();
        }

        const seasonMeta = ensureSeasonMeta(record, year);

        if (player.batting) {
            record.years[year].batting = {
                innings: parseStatNumber(player.batting.innings),
                notOuts: parseStatNumber(player.batting.notOuts),
                runs: parseStatNumber(player.batting.runs),
                ballsFaced: parseStatNumber(player.batting.ballsFaced),
                strikeRate: parseStatNumber(player.batting.strikeRate),
                average: parseStatNumber(player.batting.average),
                fours: parseStatNumber(player.batting.fours),
                sixes: parseStatNumber(player.batting.sixes),
                highest: String(player.batting.highest || '0'),
                fifties: parseStatNumber(player.batting.fifties),
                hundreds: parseStatNumber(player.batting.hundreds),
                catches: parseStatNumber(player.batting.catches),
                stumpings: parseStatNumber(player.batting.stumpings)
            };

            if (parseStatNumber(record.years[year].batting.innings) > seasonMeta.matches) {
                seasonMeta.matches = parseStatNumber(record.years[year].batting.innings);
            }
        }

        if (player.bowling) {
            record.years[year].bowling = {
                innings: parseStatNumber(player.bowling.innings),
                wickets: parseStatNumber(player.bowling.wickets),
                runsConceded: parseStatNumber(player.bowling.runsConceded),
                ballsBowled: parseStatNumber(player.bowling.ballsBowled),
                economy: parseStatNumber(player.bowling.economy),
                average: parseStatNumber(player.bowling.average),
                fourW: parseStatNumber(player.bowling.fourW),
                fiveW: parseStatNumber(player.bowling.fiveW),
                bestBowl: String(player.bowling.bestBowl || '0/0')
            };

            if (parseStatNumber(record.years[year].bowling.innings) > seasonMeta.matches) {
                seasonMeta.matches = parseStatNumber(record.years[year].bowling.innings);
            }
        }

        seasonMeta.hasStats = hasAnyYearStats(record.years[year]) || seasonMeta.matches > 0;

        const normalizedFromOfficial = normalizePlayerName(player.name);
        for (const [aliasFrom, aliasTo] of Object.entries(playerNameAliases)) {
            if (aliasTo === normalizedFromOfficial) {
                if (!playerStatsDB[aliasFrom]) {
                    playerStatsDB[aliasFrom] = record;
                }
                playerMetaDB[aliasFrom] = playerMetaDB[normalizedName];
            }
        }
    });
}

function applyCareerSnapshot(snapshot) {
    if (!snapshot || !snapshot.players) return;

    Object.values(snapshot.players).forEach(player => {
        if (!player || !player.name || !player.career) return;
        const battingCareer = player.career.batting || {};
        const bowlingCareer = player.career.bowling || {};
        const normalizedName = normalizePlayerName(player.name);
        const record = ensurePlayerRecord(player.name);
        playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
        playerMetaDB[normalizedName].officialName = player.name;
        if (player.playerId) {
            playerMetaDB[normalizedName].playerId = String(player.playerId);
        }

        const dobValue = player.dob || player.playerDob || player.playerDOB || null;
        if (isValidDob(dobValue)) {
            playerMetaDB[normalizedName].dob = String(dobValue);
        }
        const normalizedBest = normalizeCareerBestBowling(
            bowlingCareer.bestBowl,
            bowlingCareer.wickets,
            bowlingCareer.runsConceded
        );
        const normalizedBestComputed = normalizeCareerBestBowling(
            bowlingCareer.bestBowlComputed,
            bowlingCareer.wickets,
            bowlingCareer.runsConceded
        );
        const normalizedBestCsv = normalizeCareerBestBowling(
            bowlingCareer.bestBowlCsv,
            bowlingCareer.wickets,
            bowlingCareer.runsConceded
        );
        const normalizedBestFinal = normalizeCareerBestBowling(
            bowlingCareer.bestBowlFinal,
            bowlingCareer.wickets,
            bowlingCareer.runsConceded
        );

        record.career = {
            batting: {
                innings: parseStatNumber(battingCareer.innings),
                notOuts: parseStatNumber(battingCareer.notOuts),
                runs: parseStatNumber(battingCareer.runs),
                ballsFaced: parseStatNumber(battingCareer.ballsFaced),
                fours: parseStatNumber(battingCareer.fours),
                sixes: parseStatNumber(battingCareer.sixes),
                fifties: parseStatNumber(battingCareer.fifties),
                hundreds: parseStatNumber(battingCareer.hundreds),
                catches: parseStatNumber(battingCareer.catches),
                stumpings: parseStatNumber(battingCareer.stumpings),
                highest: String(battingCareer.highest || '0'),
                highestComputed: String(battingCareer.highestComputed || ''),
                highestScoreNumeric: parseInt(String(battingCareer.highest || '0').replace('*', ''), 10) || 0
            },
            bowling: {
                innings: parseStatNumber(bowlingCareer.innings),
                ballsBowled: parseStatNumber(bowlingCareer.ballsBowled),
                runsConceded: parseStatNumber(bowlingCareer.runsConceded),
                wickets: parseStatNumber(bowlingCareer.wickets),
                fourW: parseStatNumber(bowlingCareer.fourW),
                fiveW: parseStatNumber(bowlingCareer.fiveW),
                bestBowl: normalizedBest,
                bestBowlComputed: String(bowlingCareer.bestBowlComputed || ''),
                bestBowlCsv: String(bowlingCareer.bestBowlCsv || ''),
                bestBowlFinal: normalizedBestFinal,
                bestBowlParsed: parseBestBowling(normalizedBest)
            }
        };
    });
}

function applyOfficial2026BattingStats(entry) {
    const name = entry.StrikerName || entry.PlayerName;
    if (!name) return;
    const playerRecord = ensurePlayerRecord(name);

    playerRecord.years['2026'] = playerRecord.years['2026'] || {
        batting: {
            innings: 0,
            notOuts: 0,
            runs: 0,
            ballsFaced: 0,
            strikeRate: 0,
            average: 0,
            fours: 0,
            sixes: 0,
            highest: '0',
            fifties: 0,
            hundreds: 0,
            catches: 0,
            stumpings: 0
        },
        bowling: {
            innings: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0,
            economy: 0,
            average: 0,
            fourW: 0,
            fiveW: 0,
            bestBowl: '0/0'
        }
    };

    playerRecord.years['2026'].batting = {
        innings: parseStatNumber(entry.Innings),
        notOuts: parseStatNumber(entry.NotOuts),
        runs: parseStatNumber(entry.TotalRuns),
        ballsFaced: parseStatNumber(entry.Balls),
        strikeRate: parseStatNumber(entry.StrikeRate),
        average: parseStatNumber(entry.BattingAverage),
        fours: parseStatNumber(entry.Fours),
        sixes: parseStatNumber(entry.Sixes),
        highest: String(entry.HighestScore || '0'),
        fifties: parseStatNumber(entry.FiftyPlusRuns),
        hundreds: parseStatNumber(entry.Centuries),
        catches: parseStatNumber(entry.Catches),
        stumpings: parseStatNumber(entry.Stumpings)
    };
}

function applyOfficial2026BowlingStats(entry) {
    const name = entry.BowlerName || entry.PlayerName;
    if (!name) return;
    const playerRecord = ensurePlayerRecord(name);

    playerRecord.years['2026'] = playerRecord.years['2026'] || {
        batting: {
            innings: 0,
            notOuts: 0,
            runs: 0,
            ballsFaced: 0,
            strikeRate: 0,
            average: 0,
            fours: 0,
            sixes: 0,
            highest: '0',
            fifties: 0,
            hundreds: 0,
            catches: 0,
            stumpings: 0
        },
        bowling: {
            innings: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0,
            economy: 0,
            average: 0,
            fourW: 0,
            fiveW: 0,
            bestBowl: '0/0'
        }
    };

    const legalBalls = parseStatNumber(entry.LegalBallsBowled);
    const overs = parseStatNumber(entry.OversBowled);
    const computedBalls = legalBalls > 0 ? legalBalls : Math.round(overs * 6);
    const bestFigure = `${parseStatNumber(entry.BBIW)}/${parseStatNumber(entry.BBMW)}`;

    playerRecord.years['2026'].bowling = {
        innings: parseStatNumber(entry.Innings),
        wickets: parseStatNumber(entry.Wickets),
        runsConceded: parseStatNumber(entry.TotalRunsConceded),
        ballsBowled: computedBalls,
        economy: parseStatNumber(entry.EconomyRate),
        average: parseStatNumber(entry.BowlingAverage),
        fourW: parseStatNumber(entry.FourWickets),
        fiveW: parseStatNumber(entry.FiveWickets),
        bestBowl: bestFigure
    };
}

async function loadOfficial2026Stats() {
    try {
        let mergedFromLocal = false;
        const localRes = await fetch(OFFICIAL_2026_LOCAL_FILE);
        if (localRes.ok) {
            const localData = await localRes.json();
            const players = localData && localData.players ? Object.values(localData.players) : [];

            players.forEach(player => {
                if (player.batting) {
                    applyOfficial2026BattingStats({
                        StrikerName: player.name,
                        Innings: player.batting.innings,
                        NotOuts: player.batting.notOuts,
                        TotalRuns: player.batting.runs,
                        Balls: player.batting.ballsFaced,
                        StrikeRate: player.batting.strikeRate,
                        BattingAverage: player.batting.average,
                        Fours: player.batting.fours,
                        Sixes: player.batting.sixes,
                        HighestScore: player.batting.highest,
                        FiftyPlusRuns: player.batting.fifties,
                        Centuries: player.batting.hundreds,
                        Catches: player.batting.catches,
                        Stumpings: player.batting.stumpings
                    });
                }

                if (player.bowling) {
                    const best = String(player.bowling.bestBowl || '0/0').split('/');
                    applyOfficial2026BowlingStats({
                        BowlerName: player.name,
                        Innings: player.bowling.innings,
                        Wickets: player.bowling.wickets,
                        TotalRunsConceded: player.bowling.runsConceded,
                        LegalBallsBowled: player.bowling.ballsBowled,
                        EconomyRate: player.bowling.economy,
                        BowlingAverage: player.bowling.average,
                        FourWickets: player.bowling.fourW,
                        FiveWickets: player.bowling.fiveW,
                        BBIW: best[0] || '0',
                        BBMW: best[1] || '0'
                    });
                }
            });

            mergedFromLocal = true;
        }

        if (!mergedFromLocal) {
            const [batRes, bowlRes] = await Promise.all([
                fetch(IPL_2026_FEEDS.batting),
                fetch(IPL_2026_FEEDS.bowling)
            ]);

            if (!batRes.ok || !bowlRes.ok) {
                throw new Error('Official 2026 stats feeds unavailable');
            }

            const [batText, bowlText] = await Promise.all([batRes.text(), bowlRes.text()]);
            const batData = parseJsonpPayload(batText);
            const bowlData = parseJsonpPayload(bowlText);

            const battingList = (batData && batData.toprunsscorers) ? batData.toprunsscorers : [];
            const bowlingList = (bowlData && bowlData.mostwickets) ? bowlData.mostwickets : [];

            battingList.forEach(applyOfficial2026BattingStats);
            bowlingList.forEach(applyOfficial2026BowlingStats);
        }

        Object.values(playerStatsDB).forEach(recomputeCareerStats);
        console.log('✅ Official IPL 2026 stats merged successfully!');
    } catch (error) {
        console.warn('⚠️ Could not load official IPL 2026 feeds.', error);
    }
}

async function loadOfficialStatsBundle() {
    const [season2026, season2025, season2024, careerSnapshot] = await Promise.all([
        loadOfficialSeasonSnapshot(OFFICIAL_2026_LOCAL_FILE),
        loadOfficialSeasonSnapshot(OFFICIAL_2025_LOCAL_FILE),
        loadOfficialSeasonSnapshot(OFFICIAL_2024_LOCAL_FILE),
        loadOfficialSeasonSnapshot(OFFICIAL_CAREER_LOCAL_FILE)
    ]);

    if (season2026) {
        applySeasonSnapshot('2026', season2026);
    } else {
        await loadOfficial2026Stats();
    }

    if (season2025) {
        applySeasonSnapshot('2025', season2025);
    }

    if (season2024) {
        applySeasonSnapshot('2024', season2024);
    }

    await Promise.all([
        patchSeasonBowlingFromOfficialFeeds('2026', '284'),
        patchSeasonBowlingFromOfficialFeeds('2025', '203'),
        patchSeasonBowlingFromOfficialFeeds('2024', '148')
    ]);

    if (careerSnapshot) {
        applyCareerSnapshot(careerSnapshot);
    } else {
        Object.values(playerStatsDB).forEach(recomputeCareerStats);
    }
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

async function loadPlayerStats() {
    try {
        await loadOfficialStatsBundle();
        console.log("✅ Official Stats Engine Loaded Successfully!");
    } catch (error) {
        console.warn("⚠️ Could not load official stats snapshots.", error);
    }
}

loadPlayerStats();

function getUserId() {
    let userId = localStorage.getItem('auctionUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('auctionUserId', userId);
    }
    return userId;
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function normalizePlayerName(name) {
    return String(name || '')
        .replace(/\uFE0F/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function extractPlayerName(fullEntry) {
    const parsed = parsePlayerEntry(fullEntry);
    return parsed.name || fullEntry.split(' - ')[0].trim();
}

function tagToCategory(tag) {
    const tagMap = {
        'wk': 'Wicket Keeper',
        'b': 'Batsman',
        'fb': 'Fast Bowler',
        's': 'Spinner',
        'ar': 'All-rounder'
    };
    return tagMap[tag] || 'Batsman';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getTeamLineupKey(teamName) {
    return `teamLineup_${teamName}`;
}

function getSetTypeFromName(setName) {
    if (setName.includes("Marquee")) return "Marquee";
    if (setName.includes("Wicket Keeper")) return "Wicket Keeper";
    if (setName.includes("Batsman")) return "Batsman";
    if (setName.includes("Fast Bowler")) return "Fast Bowler";
    if (setName.includes("Spinner")) return "Spinner";
    if (setName.includes("All-rounder")) return "All-rounder";
    return "Batsman";
}

function parsePlayerEntry(entry, setType = null) {
    const trimmed = entry.trim();
    if (!trimmed) {
        return { name: "", tag: null, isValid: false, error: "Player name is empty" };
    }
    
    const dashIndex = trimmed.indexOf('-');
    if (dashIndex !== -1) {
        const beforeDash = trimmed.substring(0, dashIndex).trim();
        const afterDash = trimmed.substring(dashIndex + 1).trim();
        
        if (!afterDash) {
            return { name: beforeDash, normalizedName: normalizePlayerName(beforeDash), tag: null, isValid: false, error: "Missing tag after dash" };
        }
        if (!beforeDash) {
            return { name: "", normalizedName: "", tag: null, isValid: false, error: "Missing player name before dash" };
        }
        
        const tag = afterDash.toLowerCase();
        const validTags = ['wk', 'b', 'fb', 's', 'ar'];
        
        if (!validTags.includes(tag)) {
            return { name: beforeDash, normalizedName: normalizePlayerName(beforeDash), tag: tag, isValid: false, error: `Invalid tag "${afterDash}"` };
        }
        
        return { name: beforeDash, normalizedName: normalizePlayerName(beforeDash), tag: tag, isValid: true, error: null };
    } else {
        const name = trimmed;
        if (setType === "Marquee") {
            return { name: name, normalizedName: normalizePlayerName(name), tag: null, isValid: false, error: "Marquee set requires tags (use: Name - tag)" };
        }
        
        const setTypeToTag = {
            "Wicket Keeper": 'wk',
            "Batsman": 'b',
            "Fast Bowler": 'fb',
            "Spinner": 's',
            "All-rounder": 'ar'
        };
        
        const autoTag = setTypeToTag[setType] || 'b';
        return { name: name, normalizedName: normalizePlayerName(name), tag: autoTag, isValid: true, error: null, autoTagged: true };
    }
}

function detachAllListeners() {
    firebaseListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    firebaseListeners = [];
}

function getSectionByCategory(teamDiv, category) {
    switch(category) {
        case 'Wicket Keeper': return teamDiv.querySelector('.wicket-keepers');
        case 'Batsman': return teamDiv.querySelector('.batsmen');
        case 'Fast Bowler': return teamDiv.querySelector('.fast-bowlers');
        case 'Spinner': return teamDiv.querySelector('.spinners');
        case 'All-rounder': return teamDiv.querySelector('.all-rounders');
        default: return teamDiv.querySelector('.batsmen');
    }
}

function getCategoryFromPlayerData(playerData) {
    const setType = getSetTypeFromName(playerData.set);
    const parsed = parsePlayerEntry(playerData.fullEntry, setType);
    return tagToCategory(parsed.tag);
}

// =====================================================================
// SCREEN NAVIGATION
// =====================================================================

window.handleModeSelection = function() {
    const selectedMode = document.querySelector('input[name="game-mode"]:checked').value;
    gameMode = selectedMode;
    document.getElementById('mode-selection').style.display = 'none';
    
    if (selectedMode === 'online') {
        document.getElementById('online-choice').style.display = 'flex';
    } else {
        document.getElementById('initial-setup').style.display = 'flex';
        document.getElementById('auctioneer-name-group').style.display = 'none';
        document.getElementById('team-count').focus();
    }
}

window.backToModeSelection = function() {
    document.getElementById('online-choice').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'flex';
}

window.handleOnlineChoice = function() {
    const choice = document.querySelector('input[name="online-mode"]:checked').value;
    
    document.getElementById('online-choice').style.display = 'none';
    document.getElementById('upcoming-sets-container').style.display = 'none';
    document.getElementById('stats-panel').style.display = 'none';
    document.getElementById('auction-interface').style.display = 'none';
    document.getElementById('unsold-players-container').style.display = 'none';
    document.getElementById('reset-controls').style.display = 'none';
    document.getElementById('teams-container').style.display = 'none'; 
    
    if (choice === 'create') {
        isAuctioneer = true;
        document.getElementById('initial-setup').style.display = 'flex';
        document.getElementById('auctioneer-name-group').style.display = 'block';
        document.getElementById('auctioneer-name').focus();
    } else {
        isAuctioneer = false;
        document.getElementById('join-room-screen').style.display = 'flex';
        document.getElementById('join-room-code').focus();
    }
}

window.backToOnlineChoice = function() {
    document.getElementById('join-room-screen').style.display = 'none';
    document.getElementById('online-choice').style.display = 'flex';
}

window.backFromSetup = function() {
    // If they were just editing the config, take them back to the lobby
    if (isEditingConfig) {
        isEditingConfig = false;
        document.getElementById('initial-setup').style.display = 'none';
        document.getElementById('waiting-lobby').style.display = 'flex';
        return;
    }
    
    document.getElementById('initial-setup').style.display = 'none';
    if (gameMode === 'online') {
        document.getElementById('online-choice').style.display = 'flex';
    } else {
        document.getElementById('mode-selection').style.display = 'flex';
    }
}

// =====================================================================
// JOIN ROOM
// =====================================================================

window.handleJoinRoom = async function() {
    const roomCodeInput = document.getElementById('join-room-code');
    const teamNameInput = document.getElementById('join-team-name');
    
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    const teamName = teamNameInput.value.trim();
    
    // 1. Local Validation
    let isValid = true;
    
    if (!roomCode || roomCode.length !== 6) {
        showError('join-room-code', "Enter a valid 6-character code");
        isValid = false;
    } else {
        clearError('join-room-code');
    }
    
    if (!teamName) {
        showError('join-team-name', "Team name is required");
        isValid = false;
    } else {
        clearError('join-team-name');
    }
    
    if (!isValid) return;

    try {
        const roomRef = ref(database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            showError('join-room-code', "Room not found!");
            return;
        }
        
        const roomData = snapshot.val();
        const participants = roomData.participants || {};
        
        // --- REJOIN & DUPLICATE LOGIC ---
        let existingUserId = null;
        let isRejoining = false;
        let isCurrentlyOnline = false;

        for (const [uid, pData] of Object.entries(participants)) {
            if (pData.name.toLowerCase() === teamName.toLowerCase()) {
                existingUserId = uid;
                isRejoining = true;
                // Check if they are actively connected
                isCurrentlyOnline = pData.isOnline === true; 
                break;
            }
        }

        if (isRejoining) {
            // [NEW FIX]: Block them if the player is currently active in the room
            if (isCurrentlyOnline) {
                showError('join-team-name', "Player is currently active in the room!");
                return;
            }

            console.log("Rejoining existing session...");
            currentUserId = existingUserId;
            currentRoomCode = roomCode;
            myTeamId = existingUserId; 
            isAuctioneer = (participants[existingUserId].role === 'auctioneer');
            localStorage.setItem('auctionUserId', existingUserId);

            // Set them back to online immediately
            await update(ref(database, `rooms/${roomCode}/participants/${existingUserId}`), {
                isOnline: true
            });

        } else {
            // --- NEW JOIN FLOW ---
            const participantCount = Object.keys(participants).length;
            if (participantCount >= roomData.config.teamCount) {
                showError('join-room-code', "Room is full!"); 
                return;
            }
            if (roomData.auctionState.isAuctionStarted) {
                showError('join-room-code', "Auction has already started!");
                return;
            }

            currentUserId = getUserId();
            currentRoomCode = roomCode;
            myTeamId = currentUserId;
            isAuctioneer = false;

            const updates = {};
            updates[`participants/${currentUserId}`] = {
                name: teamName,
                role: 'player',
                joinedAt: Date.now(),
                isOnline: true // Mark as online
            };
            updates[`teams/${currentUserId}`] = {
                name: teamName,
                purse: roomData.config.budget,
                players: {},
                playingXI: [],
                bench: []
            };
            
            await update(ref(database, `rooms/${roomCode}`), updates);
        }

        // Hook up the disconnect listener (From Janitor System)
        if (typeof setupPresenceSystem === 'function') {
            setupPresenceSystem(roomCode, currentUserId);
        }

        // --- COMMON SETUP ---
        budget = roomData.config.budget;
        teamCount = roomData.config.teamCount;
        minPlayers = roomData.config.minPlayers;
        maxPlayers = roomData.config.maxPlayers;
        playerMode = roomData.config.playerMode;
        players = roomData.config.players;
        sets = roomData.config.sets;
        
        document.getElementById('join-room-screen').style.display = 'none';
        document.getElementById('waiting-lobby').style.display = 'flex';
        
        if (isAuctioneer) {
            document.getElementById('start-auction-button').style.display = 'block';
            document.getElementById('lobby-waiting-message').style.display = 'none';
        } else {
            document.getElementById('start-auction-button').style.display = 'none';
            document.getElementById('lobby-waiting-message').style.display = 'block';
        }

        setupWaitingLobby(roomCode, isAuctioneer);
        listenToRoomUpdates(roomCode);
        
        if (roomData.auctionState.isAuctionStarted) {
            transitionToAuction();
            setTimeout(() => {
                syncAuctionStateFromFirebase(roomData.auctionState);
                syncTeamsFromFirebase(roomData.teams);
            }, 500);
        }
        
    } catch (error) {
        console.error('Error joining room:', error);
        showError('join-room-code', "Connection failed. Try again.");
    }
}

// =====================================================================
// VALIDATION HELPERS
// =====================================================================

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    input.classList.add('input-error');
    
    let errorMsg = input.parentNode.querySelector('.error-message-text');
    if (!errorMsg) {
        errorMsg = document.createElement('small');
        errorMsg.className = 'error-message-text';
        input.parentNode.appendChild(errorMsg);
    }
    errorMsg.textContent = message;
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    input.classList.remove('input-error');
    const errorMsg = input.parentNode.querySelector('.error-message-text');
    if (errorMsg) {
        errorMsg.remove();
    }
}

function validateInput(inputId, nextInputId = null) {
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    const numValue = parseInt(value);
    
    let isValid = true;
    let errorText = "";

    switch(inputId) {
        case 'auctioneer-name':
            if (gameMode === 'online' && !value) {
                isValid = false;
                errorText = "Auctioneer name is required";
            }
            break;
            
        case 'team-count':
            if (!numValue || numValue < 2 || numValue > 10) {
                isValid = false;
                errorText = "Enter between 2 and 10 teams";
            }
            break;
            
        case 'team-budget':
            if (!numValue || numValue < 1) {
                isValid = false;
                errorText = "Budget must be greater than 0";
            }
            break;
            
        case 'min-players':
            if (!numValue || numValue < 12) {
                isValid = false;
                errorText = "Minimum 12 players required";
            }
            break;
            
        case 'max-players':
            const minVal = parseInt(document.getElementById('min-players').value);
            if (!numValue || numValue < minVal) {
                isValid = false;
                errorText = `Must be at least ${minVal} (Min Players)`;
            }
            break;
    }

    if (!isValid) {
        showError(inputId, errorText);
        input.focus();
        return false;
    } else {
        clearError(inputId);
        if (nextInputId) {
            document.getElementById(nextInputId).focus();
        } else {
            input.blur();
        }
        return true;
    }
}

// =====================================================================
// SETUP CONTINUE
// =====================================================================

window.openConfigEditor = function() {
    isEditingConfig = true;
    
    document.getElementById('team-count').value = teamCount;
    document.getElementById('team-budget').value = budget;
    document.getElementById('min-players').value = minPlayers;
    document.getElementById('max-players').value = maxPlayers;
    
    document.querySelector(`input[name="player-mode"][value="${playerMode}"]`).checked = true;

    document.getElementById('auctioneer-name-group').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'none';
    document.getElementById('initial-setup').style.display = 'flex';
}

async function updateOnlineRoomConfig() {
    try {
        const updates = {};
        updates[`rooms/${currentRoomCode}/config/teamCount`] = teamCount;
        updates[`rooms/${currentRoomCode}/config/budget`] = budget;
        updates[`rooms/${currentRoomCode}/config/minPlayers`] = minPlayers;
        updates[`rooms/${currentRoomCode}/config/maxPlayers`] = maxPlayers;
        updates[`rooms/${currentRoomCode}/config/playerMode`] = playerMode;
        updates[`rooms/${currentRoomCode}/config/players`] = players;
        updates[`rooms/${currentRoomCode}/config/sets`] = sets;
        
        if (currentParticipants) {
            for (const teamId of Object.keys(currentParticipants)) {
                updates[`rooms/${currentRoomCode}/teams/${teamId}/purse`] = budget;
            }
        }
        
        await update(ref(database), updates);
        
        document.getElementById('initial-setup').style.display = 'none';
        document.getElementById('custom-players-setup').style.display = 'none';
        document.getElementById('waiting-lobby').style.display = 'flex';
        
        isEditingConfig = false;
        
        document.getElementById('teams-total-count').textContent = teamCount;
        if (currentParticipants) {
            updateLobbyTeamsList(currentParticipants); 
        }

    } catch (error) {
        console.error('Error updating config:', error);
        alert('Failed to update configuration.');
    }
}

window.enableInlineNameEdit = function(btnElement) {
    const teamItem = btnElement.closest('.lobby-team-item');
    const nameSpan = teamItem.querySelector('.lobby-team-name');
    const currentName = nameSpan.textContent;

    if (teamItem.querySelector('.inline-edit-input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'inline-edit-input';
    
    input.style.background = 'rgba(0, 0, 0, 0.2)';
    input.style.border = '1px solid #3498db';
    input.style.color = '#fff';
    input.style.padding = '4px 8px';
    input.style.borderRadius = '4px';
    input.style.fontSize = '14px';
    input.style.fontFamily = 'inherit';
    input.style.outline = 'none';
    input.style.width = '150px';
    input.style.transition = 'border-color 0.2s';

    nameSpan.style.display = 'none';
    teamItem.insertBefore(input, nameSpan);
    input.focus();
    
    input.setSelectionRange(input.value.length, input.value.length);

    const saveInlineName = async () => {
        const newName = input.value.trim();
        
        if (!newName || newName === currentName) {
            input.remove();
            nameSpan.style.display = 'inline';
            return;
        }

        const isTaken = Object.values(currentParticipants).some(
            p => p.name.toLowerCase() === newName.toLowerCase() && p.name.toLowerCase() !== currentName.toLowerCase()
        );

        if (isTaken) {
            input.style.border = '1px solid #e74c3c'; 
            input.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
            setTimeout(() => {
                input.style.border = '1px solid #3498db'; 
                input.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            }, 1000);
            return; 
        }

        input.disabled = true;
        input.style.opacity = '0.5';

        try {
            const updates = {};
            updates[`rooms/${currentRoomCode}/participants/${currentUserId}/name`] = newName;
            updates[`rooms/${currentRoomCode}/teams/${currentUserId}/name`] = newName;
            
            await update(ref(database), updates);
            
            nameSpan.textContent = newName;
            input.remove();
            nameSpan.style.display = 'inline';
        } catch (error) {
            console.error("Failed to update name:", error);
            input.disabled = false;
            input.style.opacity = '1';
            input.style.border = '1px solid #e74c3c';
        }
    };

    input.addEventListener('blur', saveInlineName); 
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); 
        } else if (e.key === 'Escape') {
            input.remove();
            nameSpan.style.display = 'inline';
        }
    });
}

window.handleSetupContinue = function() {
    let v1 = true, v2 = true, v3 = true, v4 = true, v5 = true;
    
    if (gameMode === 'online' && !isEditingConfig) v1 = validateInput('auctioneer-name');
    v2 = validateInput('team-count');
    v3 = validateInput('team-budget');
    v4 = validateInput('min-players');
    if (v4) v5 = validateInput('max-players');
    
    if (!v1 || !v2 || !v3 || !v4 || !v5) return;
    
    const count = parseInt(document.getElementById('team-count').value);
    
    if (isEditingConfig && gameMode === 'online' && typeof currentParticipants === 'object') {
        const joinedCount = Object.keys(currentParticipants).length;
        if (count < joinedCount) {
            showError('team-count', `Cannot be less than ${joinedCount} (teams already joined)`);
            return;
        } else {
            clearError('team-count');
        }
    }
    
    const newBudget = parseInt(document.getElementById('team-budget').value);
    const minPlayerCount = parseInt(document.getElementById('min-players').value);
    const maxPlayerCount = parseInt(document.getElementById('max-players').value);
    
    teamCount = count;
    budget = newBudget;
    minPlayers = minPlayerCount;
    maxPlayers = maxPlayerCount;
    
    const selectedMode = document.querySelector('input[name="player-mode"]:checked');
    playerMode = selectedMode ? selectedMode.value : 'default';
    
    if (playerMode === 'custom') {
        document.getElementById('initial-setup').style.display = 'none';
        document.getElementById('custom-players-setup').style.display = 'block';
        if (!isEditingConfig) initializeCustomSets();
    } else {
        players = JSON.parse(JSON.stringify(defaultPlayers));
        sets = Object.keys(defaultPlayers);
        
        if (gameMode === 'online' && isAuctioneer) {
            if (isEditingConfig) updateOnlineRoomConfig();
            else createOnlineRoom();
        } else {
            createTeamsDirectly();
        }
    }
}

// =====================================================================
// CREATE ONLINE ROOM
// =====================================================================

/* ===== NEW PRESENCE & CLEANUP SYSTEM ===== */

function setupPresenceSystem(roomCode, userId) {
    // 1. Reference to my status
    const myStatusRef = ref(database, `rooms/${roomCode}/participants/${userId}/isOnline`);
    const lastActiveRef = ref(database, `rooms/${roomCode}/lastActive`);

    // 2. Set myself as Online
    set(myStatusRef, true);

    // 3. If I disconnect (close tab/internet loss), mark me as Offline (but don't delete data yet)
    onDisconnect(myStatusRef).set(false);

    // 4. Update Room's "Heartbeat" to show it's currently active
    set(lastActiveRef, Date.now());
}

async function cleanupOldRooms() {
    console.log("🧹 Running Janitor to clean old rooms...");
    const roomsRef = ref(database, 'rooms');
    
    try {
        const snapshot = await get(roomsRef);
        if (!snapshot.exists()) return;

        const rooms = snapshot.val();
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000; 
        const updates = {};
        let deletedCount = 0;

        for (const [code, room] of Object.entries(rooms)) {
            // Check 1: Is the room "Stale"? (No activity for 10+ mins)
            // If lastActive is missing, we check createdAt.
            const lastActive = room.lastActive || room.createdAt || 0;
            const isStale = (now - lastActive) > TEN_MINUTES;

            if (isStale) {
                // Check 2: Is anyone actually online?
                // We check if ANY participant has isOnline === true
                let anyoneOnline = false;
                if (room.participants) {
                    anyoneOnline = Object.values(room.participants).some(p => p.isOnline === true);
                }

                // If Stale AND No one is online -> DELETE
                if (!anyoneOnline) {
                    updates[code] = null; // Setting to null deletes the node
                    deletedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            await update(roomsRef, updates);
            console.log(`🧹 Janitor: Deleted ${deletedCount} inactive rooms.`);
        }
    } catch (error) {
        console.error("Janitor Error:", error);
    }
}

async function createOnlineRoom() {
    try {
        // [NEW] Run Cleanup before creating a new room
        await cleanupOldRooms();

        const roomCode = generateRoomCode();
        currentUserId = getUserId();
        currentRoomCode = roomCode;
        myTeamId = currentUserId;
        
        const auctioneerName = document.getElementById('auctioneer-name').value.trim();
        
        const roomData = {
            config: {
                auctioneerName: auctioneerName,
                teamCount: teamCount,
                budget: budget,
                minPlayers: minPlayers,
                maxPlayers: maxPlayers,
                playerMode: playerMode,
                players: players,
                sets: sets
            },
            auctionState: {
                currentSetIndex: 0,
                currentPlayerIndex: 0,
                isSetAnnounced: false,
                isSecondRound: false,
                isAuctionStarted: false
            },
            auctioneer: currentUserId,
            participants: {},
            teams: {},
            unsoldPlayers: {},
            stats: {
                mostExpensivePlayer: { name: '', price: 0, team: '' },
                totalPlayersSold: 0,
                totalMoneySpent: 0
            },
            createdAt: Date.now(),
            lastActive: Date.now() // [NEW] Initialize Heartbeat
        };
        
        roomData.participants[currentUserId] = {
            name: auctioneerName,
            role: 'auctioneer',
            joinedAt: Date.now(),
            isOnline: true // [NEW] Mark as online
        };
        
        // Initialize auctioneer's team
        roomData.teams[currentUserId] = {
            name: auctioneerName,
            purse: budget,
            players: {},
            playingXI: [],
            bench: []
        };
        
        await set(ref(database, `rooms/${roomCode}`), roomData);
        
        // [NEW] Setup Presence (Disconnect Handler)
        setupPresenceSystem(roomCode, currentUserId);

        document.getElementById('initial-setup').style.display = 'none';
        document.getElementById('custom-players-setup').style.display = 'none';
        
        document.getElementById('waiting-lobby').style.display = 'flex';
        
        setupWaitingLobby(roomCode, true);
        listenToRoomUpdates(roomCode);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room: ' + error.message);
    }
}

// =====================================================================
// WAITING LOBBY
// =====================================================================

function setupWaitingLobby(roomCode, isHost) {
    document.getElementById('display-room-code').textContent = roomCode;
    document.getElementById('teams-total-count').textContent = teamCount;
    
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    document.getElementById('room-link-input').value = roomLink;
    
    if (isHost) {
        document.getElementById('start-auction-button').style.display = 'block';
        document.getElementById('edit-config-button').style.display = 'flex'; // Show config button
    } else {
        document.getElementById('edit-config-button').style.display = 'none'; // Hide for players
    }
}

window.copyRoomCode = function() {
    const code = document.getElementById('display-room-code').textContent;
    navigator.clipboard.writeText(code);
    const btn = document.getElementById('copy-code-button');
    btn.textContent = '✓ Copied!';
    btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    setTimeout(() => {
        btn.textContent = '📋 Copy';
        btn.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
    }, 2000);
}

window.copyRoomLink = function() {
    const link = document.getElementById('room-link-input').value;
    navigator.clipboard.writeText(link);
    const btn = document.getElementById('copy-link-button');
    btn.textContent = '✓ Copied!';
    btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    setTimeout(() => {
        btn.textContent = '📋 Copy Link';
        btn.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
    }, 2000);
}

// =====================================================================
// LISTEN TO ROOM UPDATES
// =====================================================================

function listenToRoomUpdates(roomCode) {
    // 1. Listen for Participants (Lobby)
    const participantsRef = ref(database, `rooms/${roomCode}/participants`);
    const unsubParticipants = onValue(participantsRef, (snapshot) => {
        if (snapshot.exists()) {
            currentParticipants = snapshot.val(); // Save globally for edit logic
            updateLobbyTeamsList(currentParticipants);
        }
    });
    firebaseListeners.push(unsubParticipants);
    
    // 2. Listen for Global Auction State (Start, Pause, Indices)
    const auctionStateRef = ref(database, `rooms/${roomCode}/auctionState`);
    const unsubAuctionState = onValue(auctionStateRef, (snapshot) => {
        if (snapshot.exists()) {
            const state = snapshot.val();
            
            // [NEW] Fire Confetti on Player Screens!
            if (state.celebrationTime && state.celebrationTime !== lastCelebrationTime) {
                // Don't fire if they just joined the room late, only fire on new events
                if (lastCelebrationTime !== 0 && !isAuctioneer) { 
                    if (typeof triggerBlockbusterCelebration === 'function') {
                        triggerBlockbusterCelebration();
                    }
                }
                lastCelebrationTime = state.celebrationTime;
            }

            if (state.isAuctionStarted && document.getElementById('waiting-lobby').style.display !== 'none') {
                transitionToAuction();
            }
            if (!isAuctioneer && state.isAuctionStarted) {
                syncAuctionStateFromFirebase(state);
            }
        }
    });
    firebaseListeners.push(unsubAuctionState);
    
    // 3. Listen for Team Updates (Purse, Players Sold, Roles)
    const teamsRef = ref(database, `rooms/${roomCode}/teams`);
    const unsubTeams = onValue(teamsRef, (snapshot) => {
        if (snapshot.exists() && isAuctionStarted && Object.keys(teamIdMapping).length > 0) {
            syncTeamsFromFirebase(snapshot.val());
        }
    });
    firebaseListeners.push(unsubTeams); 
    
    // 4. Listen for Unsold Players
    const unsoldRef = ref(database, `rooms/${roomCode}/unsoldPlayers`);
    const unsubUnsold = onValue(unsoldRef, (snapshot) => {
        if (isAuctionStarted) {
            if (snapshot.exists()) {
                unsoldPlayers = snapshot.val();
            } else {
                unsoldPlayers = {}; 
            }
            updateUnsoldPlayersList();
            updateStatistics(); 
        }
    });
    firebaseListeners.push(unsubUnsold); 

    // 5. Listen for Config Changes (Upgraded for Edit Config support)
    const configRef = ref(database, `rooms/${roomCode}/config`);
    const unsubConfig = onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            
            // Sync global variables so everyone has the new rules
            budget = config.budget;
            teamCount = config.teamCount;
            minPlayers = config.minPlayers;
            maxPlayers = config.maxPlayers;
            playerMode = config.playerMode;
            players = config.players;
            sets = config.sets;
            
            // Instantly update Lobby Max Team Count text
            const totalCountEl = document.getElementById('teams-total-count');
            if (totalCountEl) totalCountEl.textContent = teamCount;

            // Re-evaluate if the Start button should show based on new capacity
            if (currentParticipants) {
                updateLobbyTeamsList(currentParticipants);
            }

            updateAllVisibilityPanels();
            
            if (!isAuctioneer && isAuctionStarted) {
                updateCurrentPlayerDisplay();
            }
        }
    });
    firebaseListeners.push(unsubConfig);
}

function updateLobbyTeamsList(participants) {
    const container = document.getElementById('lobby-teams-list');
    
    const participantCount = Object.keys(participants).length;
    document.getElementById('teams-joined-count').textContent = participantCount;
    
    const existingItemsMap = new Map();
    container.querySelectorAll('.lobby-team-item').forEach(item => {
        const userId = item.dataset.userId;
        if (userId) {
            existingItemsMap.set(userId, item);
        }
    });
    
    const processedUserIds = new Set();
    
    Object.entries(participants).forEach(([userId, data]) => {
        processedUserIds.add(userId);
        
        let editBtnHtml = '';
        if (userId === currentUserId) {
            // [NEW FIX] Updated onclick event to the new Inline Editor
            editBtnHtml = `<span class="edit-name-btn" onclick="enableInlineNameEdit(this)" title="Edit Name">✏️</span>`;
        }
        
        const expectedRole = data.role === 'auctioneer' ? '👑 Auctioneer' : '🎮 Player';

        if (existingItemsMap.has(userId)) {
            const existingItem = existingItemsMap.get(userId);
            const nameSpan = existingItem.querySelector('.lobby-team-name');
            const roleSpan = existingItem.querySelector('.lobby-team-role');
            
            // [NEW FIX] We check if the user is currently editing. 
            // If they are typing, we DO NOT interrupt their text box.
            if (!existingItem.querySelector('.inline-edit-input')) {
                if (nameSpan.textContent !== data.name) {
                    nameSpan.textContent = data.name;
                }
            }
            
            if (roleSpan.textContent !== expectedRole) {
                roleSpan.textContent = expectedRole;
                roleSpan.className = `lobby-team-role ${data.role}`;
            }
            
            const rightContainer = existingItem.querySelector('.role-container');
            if (rightContainer) {
                rightContainer.innerHTML = `${editBtnHtml}<span class="lobby-team-role ${data.role}">${expectedRole}</span>`;
            }
            
        } else {
            const teamItem = document.createElement('div');
            teamItem.className = 'lobby-team-item';
            teamItem.dataset.userId = userId;
            teamItem.innerHTML = `
                <span class="lobby-team-name">${data.name}</span>
                <div class="role-container" style="display: flex; align-items: center;">
                    ${editBtnHtml}
                    <span class="lobby-team-role ${data.role}">${expectedRole}</span>
                </div>
            `;
            container.appendChild(teamItem);
        }
    });
    
    existingItemsMap.forEach((item, userId) => {
        if (!processedUserIds.has(userId)) {
            item.remove();
        }
    });
    
    if (isAuctioneer && participantCount === teamCount) {
        document.getElementById('start-auction-button').style.display = 'block';
        document.getElementById('lobby-waiting-message').style.display = 'none';
    } else if (isAuctioneer) {
        document.getElementById('start-auction-button').style.display = 'none';
        document.getElementById('lobby-waiting-message').style.display = 'block';
    }
}

// =====================================================================
// START AUCTION FROM LOBBY
// =====================================================================

window.startAuctionFromLobby = async function() {
    if (!isAuctioneer) return;
    
    try {
        // Shuffle all player arrays ONCE on auctioneer side
        sets.forEach(setName => {
            if (players[setName]) {
                shuffleArray(players[setName]);
            }
        });
        
        // Save shuffled arrays to Firebase so everyone has the same order
        await update(ref(database, `rooms/${currentRoomCode}`), {
            'auctionState/isAuctionStarted': true,
            'auctionState/isSetAnnounced': true,
            'auctionState/currentSetIndex': 0,
            'auctionState/currentPlayerIndex': 0,
            'config/players': players
        });
        
        transitionToAuction();
    } catch (error) {
        console.error('Error starting auction:', error);
        alert('Failed to start auction');
    }
}

function transitionToAuction() {
    document.getElementById('waiting-lobby').style.display = 'none';
    
    document.getElementById('auction-interface').style.display = 'block';
    document.getElementById('stats-panel').style.display = 'block';
    document.getElementById('upcoming-sets-container').style.display = 'block';
    document.getElementById('reset-controls').style.display = 'block';
    
    get(ref(database, `rooms/${currentRoomCode}`)).then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            const teams = roomData.teams;
            
            players = roomData.config.players;
            sets = roomData.config.sets;
            
            teamNames = [];
            teamIdMapping = {};
            
            Object.entries(teams).forEach(([teamId, teamData]) => {
                teamNames.push(teamData.name);
                teamIdMapping[teamId] = teamData.name;
            });
            
            createTeamsDirectly();
            
            // FORCE SYNC HERE after elements are created
            syncTeamsFromFirebase(roomData.teams);
        }
    });
}

// =====================================================================
// SYNC FUNCTIONS
// =====================================================================

function syncAuctionStateFromFirebase(state) {
    if (state.isSecondRound && !isSecondRound) {
        showUnsoldRoundModal();
    }

    isAuctionStarted = state.isAuctionStarted;
    currentSetIndex = state.currentSetIndex;
    currentPlayerIndex = state.currentPlayerIndex;
    isSetAnnounced = state.isSetAnnounced;
    isSecondRound = state.isSecondRound || false;
    
    updateCurrentPlayerDisplay();
    updateAllVisibilityPanels();
}

function syncTeamsFromFirebase(teamsData) {
    allTeamsData = teamsData;

    Object.entries(teamsData).forEach(([teamId, teamData]) => {
        const teamName = teamIdMapping[teamId];
        if (!teamName) return;
        
        const teamDivs = document.querySelectorAll('.team');
        teamDivs.forEach(div => {
            const divTeamName = div.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
            if (divTeamName === teamName) {
                
                // 1. Handle Purse
                const currentPurse = (teamData.purse !== undefined && teamData.purse !== null) ? teamData.purse : budget;
                const purseSpan = div.querySelector('.purse-amount');
                purseSpan.textContent = currentPurse;
                updatePurseColor(div);
                
                // 2. Handle Dashboard Player List
                const currentPlayers = new Map();
                div.querySelectorAll('.section ul li').forEach(li => {
                    const playerId = li.dataset.playerId;
                    if (playerId) {
                        currentPlayers.set(playerId, li);
                    }
                });
                
                const firebasePlayers = new Set();
                if (teamData.players) {
                    Object.entries(teamData.players).forEach(([playerId, playerData]) => {
                        firebasePlayers.add(playerId);
                        if (!currentPlayers.has(playerId)) {
                            const category = getCategoryFromPlayerData(playerData);
                            const section = getSectionByCategory(div, category);
                            if (section) {
                                const li = document.createElement('li');
                                li.textContent = `${playerData.name} - ${playerData.price} Crores`;
                                li.dataset.playerId = playerId;
                                
                                // [NEW] Attach Right-Click Listener
                                li.addEventListener('contextmenu', (e) => 
                                    handlePlayerContextMenu(e, div, playerId, playerData.name, playerData.price)
                                );
                                
                                section.appendChild(li);
                            }
                        }
                    });
                }
                
                // Remove players that were undone/moved
                currentPlayers.forEach((li, playerId) => {
                    if (!firebasePlayers.has(playerId)) li.remove();
                });
                
                updateTeamCounts(div);
            }
        });
    });

    // SMART REFRESH
    const modal = document.getElementById('team-management-modal');
    if (modal.style.display === 'block' && currentManagedTeam) {
        const watchedTeamId = currentManagedTeam.dataset.teamId;
        
        if (watchedTeamId !== myTeamId) {
            displayTeamLineupReadOnly(currentManagedTeam);
        } else {
            const remoteTeamData = allTeamsData[watchedTeamId];
            
            if (remoteTeamData && remoteTeamData.players) {
                const firebasePlayerMap = new Map();
                Object.values(remoteTeamData.players).forEach(p => {
                    firebasePlayerMap.set(p.name, p);
                });

                const currentDomNames = new Set();
                
                document.querySelectorAll('.player-slot .player-item').forEach(item => {
                    currentDomNames.add(item.dataset.name);
                    if (!firebasePlayerMap.has(item.dataset.name)) {
                        const slot = item.parentElement;
                        slot.innerHTML = slot.dataset.slot ? `Slot ${slot.dataset.slot}` : 'Empty Slot';
                        slot.classList.remove('filled');
                        slot.dataset.filled = 'false';
                    }
                });

                if (remoteTeamData.playingXI) {
                    remoteTeamData.playingXI.forEach(p => {
                        const slot = document.querySelector(`.player-slot[data-slot="${p.slot}"]`);
                        const item = slot ? slot.querySelector('.player-item') : null;
                        
                        if (item && item.dataset.name === p.name) {
                            const r = p.roles || {};
                            if (r.c) item.dataset.c = 'true'; else delete item.dataset.c;
                            if (r.vc) item.dataset.vc = 'true'; else delete item.dataset.vc;
                            if (r.wk) item.dataset.wk = 'true'; else delete item.dataset.wk;
                            updatePlayerBadges(item);
                        }
                    });
                }
                
                document.querySelectorAll('#bench-list .player-item').forEach(item => {
                    currentDomNames.add(item.dataset.name);
                    if (!firebasePlayerMap.has(item.dataset.name)) {
                        item.remove();
                    }
                });

                const benchList = document.getElementById('bench-list');
                firebasePlayerMap.forEach((playerData, playerName) => {
                    if (!currentDomNames.has(playerName)) {
                        const newItem = createPlayerItem(playerData.name, playerData.price);
                        benchList.appendChild(newItem);
                    }
                });
                
                updateXICount();
            }
        }
    }

    recalculateAuctionStats();
    updateStatistics();
}

function syncToFirebase() {
    if (gameMode !== 'online' || !isAuctioneer || !currentRoomCode) return;
    
    const state = {
        currentSetIndex,
        currentPlayerIndex,
        isSetAnnounced,
        isSecondRound,
        isAuctionStarted
    };
    
    const updates = {};
    updates[`rooms/${currentRoomCode}/auctionState`] = state;
    // [NEW] Update Heartbeat
    updates[`rooms/${currentRoomCode}/lastActive`] = Date.now();
    
    update(ref(database), updates);
}

function syncPlayerSaleToFirebase(teamDiv, playerData, price, playerId) {
    if (gameMode !== 'online' || !isAuctioneer || !currentRoomCode) return;
    
    const teamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    let teamId = null;
    
    Object.entries(teamIdMapping).forEach(([id, name]) => {
        if (name === teamName) teamId = id;
    });
    
    if (!teamId) return;
    
    get(ref(database, `rooms/${currentRoomCode}/teams/${teamId}`)).then(snapshot => {
        if (!snapshot.exists()) return;
        
        const team = snapshot.val();
        
        const updates = {};
        updates[`teams/${teamId}/purse`] = team.purse - price;
        updates[`teams/${teamId}/players/${playerId}`] = {
            name: playerData.player,
            price: price,
            set: playerData.set,
            fullEntry: playerData.fullEntry,
            addedAt: Date.now()
        };
        
        update(ref(database, `rooms/${currentRoomCode}`), updates);
    });
}

function syncUnsoldToFirebase() {
    if (gameMode !== 'online' || !isAuctioneer || !currentRoomCode) return;
    update(ref(database, `rooms/${currentRoomCode}`), { unsoldPlayers: unsoldPlayers });
}

function renderStatsModal(playerName, tag) {
    const cleanName = sanitizeDisplayPlayerName(playerName);
    const resolved = resolvePlayerContext(cleanName);
    const statsNameEl = document.getElementById('stats-name');
    const statsRoleBadge = document.getElementById('stats-role-badge');
    const statsImg = document.getElementById('stats-player-img');
    const statsAgeEl = document.getElementById('stats-age');
    const metricsContainer = document.getElementById('stats-metrics-container');
    const playerData = resolved ? resolved.data : null;
    const resolvedName = resolved ? resolved.officialName : cleanName;

    if (statsNameEl) statsNameEl.textContent = resolvedName || cleanName || playerName;
    if (statsRoleBadge) statsRoleBadge.textContent = tagToCategory(tag);

    const ageValue = resolved && resolved.dob ? calculateAge(resolved.dob) : null;
    if (statsAgeEl) {
        if (ageValue !== null) {
            statsAgeEl.textContent = `Age: ${ageValue}`;
            statsAgeEl.style.display = 'block';
        } else {
            statsAgeEl.style.display = 'none';
            statsAgeEl.textContent = '';
        }
    }

    setPlayerImageWithContext(statsImg, [resolvedName, cleanName, playerName], resolved);

    if (!metricsContainer) return;

    if (!playerData) {
        metricsContainer.innerHTML = '<div class="stats-section"><h4>Stats</h4><p style="margin:0;color:#a0a0c0;">No official stats available for this player yet.</p></div>';
        return;
    }

    const battingColumns = [
        { key: 'innings', label: 'Innings' },
        { key: 'runs', label: 'Runs' },
        { key: 'strikeRate', label: 'SR' },
        { key: 'average', label: 'Avg' },
        { key: 'fours', label: '4s' },
        { key: 'sixes', label: '6s' },
        { key: 'highest', label: 'HS' },
        { key: 'fifties', label: '50s' },
        { key: 'hundreds', label: '100s' }
    ];

    const wicketKeeperExtraColumns = [
        { key: 'catches', label: 'Catches' },
        { key: 'stumpings', label: 'Stumpings' }
    ];

    const bowlingColumns = [
        { key: 'innings', label: 'Innings' },
        { key: 'wickets', label: 'Wkts' },
        { key: 'runsConceded', label: 'Runs Given' },
        { key: 'ballsBowled', label: 'Balls' },
        { key: 'economy', label: 'Econ' },
        { key: 'average', label: 'Bowl Avg' },
        { key: 'fourW', label: '4W' },
        { key: 'fiveW', label: '5W' },
        { key: 'bestBowl', label: 'Best Figures' }
    ];

    const battingRows = STATS_SEASONS.map(season => ({ season: season, data: buildBattingRowFromYear(playerData, season) }));
    battingRows.push({ season: 'Career', data: buildCareerBattingRow(playerData) });

    const bowlingRows = STATS_SEASONS.map(season => ({ season: season, data: buildBowlingRowFromYear(playerData, season) }));
    bowlingRows.push({ season: 'Career', data: buildCareerBowlingRow(playerData) });

    let statsHtml = '';
    if (tag === 'fb' || tag === 's') {
        statsHtml = createStatsSection('Bowling', bowlingColumns, bowlingRows);
    } else if (tag === 'wk') {
        statsHtml = createStatsSection('Batting + Keeping', [...battingColumns, ...wicketKeeperExtraColumns], battingRows);
    } else if (tag === 'ar') {
        statsHtml = createStatsSection('Batting', battingColumns, battingRows);
        statsHtml += createStatsSection('Bowling', bowlingColumns, bowlingRows);
    } else {
        statsHtml = createStatsSection('Batting', battingColumns, battingRows);
    }

    metricsContainer.innerHTML = statsHtml;
}

function openPlayerStatsModal() {
    if (!activeStatsPlayer) return;
    renderStatsModal(activeStatsPlayer.name, activeStatsPlayer.tag);
    const modal = document.getElementById('player-stats-modal');
    if (modal) modal.style.display = 'block';
}

function closePlayerStatsModal() {
    const modal = document.getElementById('player-stats-modal');
    if (modal) modal.style.display = 'none';
}

// =====================================================================
// CURRENT PLAYER DISPLAY
// =====================================================================

function updateCurrentPlayerDisplay() {
    const playerButton = document.getElementById('current-player-name');
    const undoButton = document.getElementById('global-undo-button');
    const nextButton = document.getElementById('next-player-button');
    const viewStatsButton = document.getElementById('view-stats-button');
    const currentSet = sets[currentSetIndex];
    const heroImg = document.getElementById('current-player-hero-img');
    const heroWrap = document.getElementById('current-player-hero');
    
    // Safety check
    if (!currentSet || !players[currentSet]) {
        if (viewStatsButton) {
            viewStatsButton.style.display = 'none';
            viewStatsButton.disabled = true;
        }
        activeStatsPlayer = null;
        if (heroImg) {
            heroImg.src = PLAYER_PLACEHOLDER_IMAGE;
        }
        if (heroWrap) {
            heroWrap.style.display = 'none';
        }
        return;
    }

    // --- VISIBILITY LOGIC ---
    const canControl = (gameMode === 'offline' || (gameMode === 'online' && isAuctioneer));
    const hasHistory = (currentSetIndex > 0) || (currentPlayerIndex > 0);

    // 1. SHOW/HIDE UNDO BUTTON
    if (canControl && hasHistory) {
        undoButton.style.display = 'flex'; 
    } else {
        undoButton.style.display = 'none'; 
    }

    // 2. SHOW/HIDE NEXT BUTTON
    if (canControl) {
        nextButton.style.display = isSetAnnounced ? 'none' : 'block';
    } else {
        nextButton.style.display = 'none';
    }
    
    // --- CONTENT RENDER LOGIC ---
    if (isSetAnnounced) {
        // --- FRONT PAGE (Waiting to Start) ---
        document.getElementById('current-set').textContent = currentSet;
        
        if (canControl) {
            playerButton.textContent = "Click to Start";
            playerButton.style.cursor = 'pointer'; 
        } else {
            playerButton.textContent = "Auction will start soon...";
            playerButton.style.cursor = 'default'; 
        }
        
        playerButton.draggable = false; 
        document.getElementById('remaining-in-set').style.display = 'none';
        
        activeStatsPlayer = null;
        if (viewStatsButton) {
            viewStatsButton.style.display = 'none';
            viewStatsButton.disabled = true;
        }
        if (heroImg) {
            heroImg.src = PLAYER_PLACEHOLDER_IMAGE;
        }
        if (heroWrap) {
            heroWrap.style.display = 'none';
        }
        
    } else {
        // --- PLAYER ON BLOCK ---
        let playerList = isSecondRound ? unsoldPlayers[currentSet] : players[currentSet];
        
        if (playerList && playerList.length > 0 && currentPlayerIndex < playerList.length) {
            const currentPlayer = playerList[currentPlayerIndex];
            const displayName = extractPlayerName(currentPlayer);
            
            // Needed to get the role tag for the stats engine
            const parsed = parsePlayerEntry(currentPlayer, getSetTypeFromName(currentSet));
            const cleanedPlayerName = sanitizeDisplayPlayerName(parsed && parsed.name ? parsed.name : displayName);
            const resolved = resolvePlayerContext(cleanedPlayerName);
            const normalizedDisplay = normalizePlayerName(cleanedPlayerName);
            const displayOverride = normalizedDisplay === 'digvesh singh' ? 'Digvesh Rathi' : cleanedPlayerName;
            const displayResolvedName = resolved ? resolved.officialName : displayOverride;
            activeStatsPlayer = parsed && parsed.name ? { name: cleanedPlayerName, tag: parsed.tag } : null;
            
            playerButton.textContent = displayOverride || cleanedPlayerName || displayName;
            
            if (canControl) {
                playerButton.draggable = true; 
                playerButton.style.cursor = 'grab';
            } else {
                playerButton.draggable = false;
                playerButton.style.cursor = 'default';
            }
            
            document.getElementById('current-set').textContent = currentSet;
            
            // Remaining Players Text
            const remainingPlayers = playerList.slice(currentPlayerIndex + 1).map(p => extractPlayerName(p));
            const remainingDiv = document.getElementById('remaining-in-set');
            if (remainingPlayers.length > 0) {
                remainingDiv.innerHTML = `<strong>Remaining in this set:</strong> ${remainingPlayers.join(', ')}`;
                remainingDiv.style.display = 'block';
            } else {
                remainingDiv.style.display = 'none';
            }

            if (viewStatsButton) {
                viewStatsButton.style.display = 'inline-flex';
                viewStatsButton.disabled = !activeStatsPlayer;
            }

            if (heroImg) {
                setPlayerImageWithContext(heroImg, [displayResolvedName, displayOverride, cleanedPlayerName, displayName], resolved);
            }
            if (heroWrap) {
                heroWrap.style.display = 'flex';
            }
        } else {
            activeStatsPlayer = null;
            if (viewStatsButton) {
                viewStatsButton.style.display = 'none';
                viewStatsButton.disabled = true;
            }
            if (heroImg) {
                heroImg.src = PLAYER_PLACEHOLDER_IMAGE;
            }
            if (heroWrap) {
                heroWrap.style.display = 'none';
            }
        }
    }
}

function recalculateAuctionStats() {
    auctionStats = {
        mostExpensivePlayer: { name: '', price: 0, team: '' },
        totalPlayersSold: 0,
        totalMoneySpent: 0
    };

    const teams = document.querySelectorAll('.team');
    teams.forEach(team => {
        const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        
        team.querySelectorAll('ul li').forEach(li => {
            const text = li.textContent;
            const undoButtonIndex = text.indexOf('Undo');
            const priceIndex = text.lastIndexOf(' - ');
            
            if (priceIndex !== -1) {
                const playerName = text.substring(0, priceIndex).trim();
                const endPos = undoButtonIndex !== -1 ? undoButtonIndex : text.length;
                const priceText = text.substring(priceIndex + 3, endPos).replace(' Crores', '').trim();
                const price = parseFloat(priceText);
                
                if (!isNaN(price)) {
                    auctionStats.totalPlayersSold++;
                    auctionStats.totalMoneySpent += price;
                    
                    if (price > auctionStats.mostExpensivePlayer.price) {
                        auctionStats.mostExpensivePlayer = {
                            name: playerName,
                            price: price,
                            team: teamName
                        };
                    }
                }
            }
        });
    });
}

// =====================================================================
// CUSTOM SETS FUNCTIONS
// =====================================================================

function initializeCustomSets() {
    customPlayers = {};
    setCounter = 0;
    allPlayersInAuction.clear();
    setTypeCounts = {
        "Marquee": 0, "Wicket Keeper": 0, "Batsman": 0,
        "Fast Bowler": 0, "Spinner": 0, "All-rounder": 0
    };
    document.getElementById('sets-container').innerHTML = '';
}

window.loadDefaultSets = function() {
    const setsContainer = document.getElementById('sets-container');
    setsContainer.innerHTML = '';
    setCounter = 0;
    allPlayersInAuction.clear();
    setTypeCounts = {
        "Marquee": 0, "Wicket Keeper": 0, "Batsman": 0,
        "Fast Bowler": 0, "Spinner": 0, "All-rounder": 0
    };
    
    const defaultSetOrder = [
        "Marquee Set", 
        "Wicket Keeper 1", "Batsman 1", "Fast Bowler 1", "Spinner 1", "All-rounder 1",
        "Wicket Keeper 2", "Batsman 2", "Fast Bowler 2", "Spinner 2", "All-rounder 2",
        "Batsman 3", "Fast Bowler 3", "All-rounder 3", 
        "Batsman 4", "Fast Bowler 4"
    ];
    
    defaultSetOrder.forEach(setName => {
        if (defaultPlayers[setName]) {
            const setType = getSetTypeFromName(setName);
            setTypeCounts[setType]++;
            
            let placeholder = setType === "Marquee" 
                ? "Enter player names with tags (required):\nFormat: Player Name - tag\nExample: MS Dhoni - wk, Virat Kohli - b, Jasprit Bumrah - fb"
                : `Enter ${setType} names (no tags needed):\nExample: Player 1, Player 2, Player 3`;
            
            const setCard = document.createElement('div');
            setCard.className = 'set-card';
            setCard.id = `set-${Date.now()}-${setType}`;
            setCard.dataset.setType = setType;
            setCard.dataset.originalName = setName;
            setCard.draggable = true;
            setCard.innerHTML = `
                <div class="drag-handle">☰</div>
                <div class="set-header">
                    <span class="set-name-display">${setName}</span>
                    <button class="delete-set-btn" onclick="deleteSet('${setCard.id}')">🗑️</button>
                </div>
                <textarea class="player-list-input" placeholder="${placeholder}">${defaultPlayers[setName].join(', ')}</textarea>
                <div class="set-stats">
                    <span class="player-count-badge">${defaultPlayers[setName].length} players</span>
                    <span class="tag-info" ${setType === "Marquee" ? "" : "style='display: none;'"}>${setType === "Marquee" ? "(tags required)" : ""}</span>
                </div>
            `;
            setsContainer.appendChild(setCard);
            setupSetDragAndDrop(setCard);
            
            const textarea = setCard.querySelector('.player-list-input');
            textarea.addEventListener('input', function() { updatePlayerCount(setCard.id); });
        }
    });
    setupSetsContainerDragAndDrop();
}

window.addNewSet = function() {
    const setTypeSelect = document.getElementById('set-type-select');
    const selectedType = setTypeSelect.value;
    
    if (!selectedType) {
        alert('Please select a set type first!');
        return;
    }
    if (selectedType === "Marquee" && setTypeCounts["Marquee"] > 0) {
        alert('Only one Marquee set is allowed!');
        return;
    }
    
    setTypeCounts[selectedType]++;
    const setNumber = setTypeCounts[selectedType];
    const displayName = selectedType === "Marquee" ? "Marquee Set" : `${selectedType} ${setNumber}`;
    const setId = `set-${Date.now()}-${selectedType}`;
    
    let placeholder = selectedType === "Marquee"
        ? "Enter player names with tags (required):\nFormat: Player Name - tag\nTags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)\nExample: MS Dhoni - wk, Virat Kohli - b, Jasprit Bumrah - fb"
        : `Enter ${selectedType} names (no tags needed):\nExample: Player 1, Player 2, Player 3\nPlayers will be auto-tagged as ${selectedType === "Wicket Keeper" ? "Wicket Keeper" : selectedType}`;
    
    const setCard = document.createElement('div');
    setCard.className = 'set-card';
    setCard.id = setId;
    setCard.dataset.setType = selectedType;
    setCard.dataset.originalName = displayName;
    setCard.draggable = true;
    setCard.innerHTML = `
        <div class="drag-handle">☰</div>
        <div class="set-header">
            <span class="set-name-display">${displayName}</span>
            <button class="delete-set-btn" onclick="deleteSet('${setId}')">🗑️</button>
        </div>
        <textarea class="player-list-input" placeholder="${placeholder}"></textarea>
        <div class="set-stats">
            <span class="player-count-badge">0 players</span>
            <span class="tag-info" ${selectedType === "Marquee" ? "" : "style='display: none;'"}>${selectedType === "Marquee" ? "(tags required)" : ""}</span>
        </div>
    `;
    
    document.getElementById('sets-container').appendChild(setCard);
    setupSetDragAndDrop(setCard);
    
    const textarea = setCard.querySelector('.player-list-input');
    textarea.addEventListener('input', function() { updatePlayerCount(setId); });
    
    setTypeSelect.value = "";
    updatePlayerCount(setId);
}

function updatePlayerCount(setId) {
    const setCard = document.getElementById(setId);
    const textarea = setCard.querySelector('.player-list-input');
    const badge = setCard.querySelector('.player-count-badge');
    const entries = textarea.value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    badge.textContent = `${entries.length} player${entries.length !== 1 ? 's' : ''}`;
}

window.deleteSet = function(setId) {
    if (confirm('Are you sure you want to delete this set?')) {
        document.getElementById(setId).remove();
        updateSetNumbersAfterDrag();
    }
}

function setupSetDragAndDrop(setCard) {
    setCard.addEventListener('dragstart', function(e) {
        draggedSet = this;
        setTimeout(() => this.classList.add('dragging'), 0);
        e.dataTransfer.setData('text/plain', this.id);
        startAutoScrollCheck();
    });
    setCard.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        draggedSet = null;
        document.querySelectorAll('.set-card').forEach(card => card.classList.remove('drag-over'));
        stopAutoScrollCheck();
    });
}

function setupSetsContainerDragAndDrop() {
    const setsContainer = document.getElementById('sets-container');
    
    setsContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(setsContainer, e.clientY);
        const draggable = document.querySelector('.set-card.dragging');
        
        if (draggable) {
            document.querySelectorAll('.set-card').forEach(card => card.classList.remove('drag-over'));
            if (afterElement) afterElement.classList.add('drag-over');
        }
        checkAutoScroll(e.clientY, setsContainer);
    });
    
    setsContainer.addEventListener('dragenter', e => e.preventDefault());
    setsContainer.addEventListener('dragleave', function(e) {
        if (!isMouseInContainer(e, setsContainer)) stopAutoScrollCheck();
    });
    
    setsContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(setsContainer, e.clientY);
        const draggable = document.querySelector('.set-card.dragging');
        
        if (draggable && setsContainer) {
            if (afterElement == null) {
                setsContainer.appendChild(draggable);
            } else {
                setsContainer.insertBefore(draggable, afterElement);
            }
        }
        document.querySelectorAll('.set-card').forEach(card => card.classList.remove('drag-over'));
        stopAutoScrollCheck();
        updateSetNumbersAfterDrag();
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.set-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function isMouseInContainer(e, container) {
    const rect = container.getBoundingClientRect();
    return (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
}

function updateSetNumbersAfterDrag() {
    setTypeCounts = {
        "Marquee": 0, "Wicket Keeper": 0, "Batsman": 0,
        "Fast Bowler": 0, "Spinner": 0, "All-rounder": 0
    };
    
    document.querySelectorAll('.set-card').forEach(card => {
        const setType = card.dataset.setType;
        setTypeCounts[setType]++;
        const newNumber = setTypeCounts[setType];
        card.querySelector('.set-name-display').textContent = setType === "Marquee" ? "Marquee Set" : `${setType} ${newNumber}`;
    });
}

function startAutoScrollCheck() {
    if (autoScrollInterval) clearInterval(autoScrollInterval);
    autoScrollInterval = setInterval(() => {
        if (draggedSet && isAutoScrolling) {
            document.getElementById('sets-container').scrollTop += autoScrollDirection;
        }
    }, 20);
}

function stopAutoScrollCheck() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    isAutoScrolling = false;
}

function checkAutoScroll(mouseY, container) {
    const containerRect = container.getBoundingClientRect();
    const scrollThreshold = 50;
    const scrollSpeed = 20;
    const distanceFromTop = mouseY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - mouseY;
    
    if (distanceFromTop < scrollThreshold) {
        isAutoScrolling = true;
        autoScrollDirection = -scrollSpeed;
    } else if (distanceFromBottom < scrollThreshold) {
        isAutoScrolling = true;
        autoScrollDirection = scrollSpeed;
    } else {
        isAutoScrolling = false;
        autoScrollDirection = 0;
    }
}

window.confirmCustomPlayers = function() {
    const setCards = document.querySelectorAll('.set-card');
    if (setCards.length === 0) {
        alert('Please add at least one player set!');
        return;
    }
    
    customPlayers = {};
    allPlayersInAuction.clear();
    
    const sortedCards = Array.from(setCards).sort((a, b) => {
        if (a.dataset.setType === "Marquee") return -1;
        if (b.dataset.setType === "Marquee") return 1;
        return 0;
    });
    
    const playerOccurrences = new Map();
    let allValidationErrors = [];
    const alreadyReportedDuplicates = new Set();
    
    for (const card of sortedCards) {
        const setType = card.dataset.setType;
        const displayName = card.querySelector('.set-name-display').textContent;
        const playerListText = card.querySelector('.player-list-input').value.trim();
        
        if (!playerListText) {
            alert(`Set "${displayName}" has no players!`);
            return;
        }
        
        const entries = playerListText.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (entries.length === 0) {
            alert(`Set "${displayName}" has no valid players!`);
            return;
        }
        
        for (const entry of entries) {
            const parsed = parsePlayerEntry(entry, setType);
            if (parsed.isValid && parsed.normalizedName) {
                if (!playerOccurrences.has(parsed.normalizedName)) {
                    playerOccurrences.set(parsed.normalizedName, []);
                }
                playerOccurrences.get(parsed.normalizedName).push({
                    setName: displayName,
                    originalName: parsed.name,
                    setType: setType
                });
            }
        }
    }
    
    const duplicatePlayers = new Map();
    for (const [normalizedName, occurrences] of playerOccurrences.entries()) {
        if (occurrences.length > 1) {
            const setNames = [...new Set(occurrences.map(occ => occ.setName))];
            duplicatePlayers.set(normalizedName, {
                setNames: setNames,
                originalName: occurrences[0].originalName
            });
        }
    }
    
    for (const card of sortedCards) {
        const setType = card.dataset.setType;
        const displayName = card.querySelector('.set-name-display').textContent;
        const playerListText = card.querySelector('.player-list-input').value.trim();
        const entries = playerListText.split(',').map(p => p.trim()).filter(p => p.length > 0);
        const parsedPlayers = [];
        const setErrors = [];
        
        for (const entry of entries) {
            const parsed = parsePlayerEntry(entry, setType);
            
            if (!parsed.isValid) {
                let displayEntry = entry;
                if (parsed.name) {
                    displayEntry = parsed.name + (entry.includes('-') ? ` - ${entry.split('-')[1]?.trim() || ''}` : '');
                }
                setErrors.push(`${displayEntry} - ${parsed.error}`);
            } else if (parsed.normalizedName) {
                const duplicateInfo = duplicatePlayers.get(parsed.normalizedName);
                
                if (duplicateInfo) {
                    if (!alreadyReportedDuplicates.has(parsed.normalizedName)) {
                        alreadyReportedDuplicates.add(parsed.normalizedName);
                        allValidationErrors.push(`${parsed.name} - repeated in ${duplicateInfo.setNames.join(', ')}`);
                        allValidationErrors.push(``);
                    }
                } else {
                    parsedPlayers.push(`${parsed.name} - ${parsed.tag}`);
                }
            }
        }
        
        if (setErrors.length > 0) {
            if (setType === "Marquee" && setErrors.length > 0) {
                if (!allValidationErrors.includes('=== Marquee Set ===')) {
                    allValidationErrors.push('=== Marquee Set ===');
                }
            }
            allValidationErrors.push(...setErrors);
        }
        
        if (parsedPlayers.length === 0 && setErrors.length === 0) {
            alert(`Set "${displayName}" has no valid players after parsing!`);
            return;
        }
        
        if (setErrors.length === 0 && parsedPlayers.length > 0) {
            customPlayers[displayName] = parsedPlayers;
        }
    }
    
if (allValidationErrors.length > 0) {
        const errorMessage = `Validation Errors:\n\n${allValidationErrors.join('\n')}\n\nValid tags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)\nFormat: Player Name - tag (for Marquee sets)\nNote: Each player can only appear in one set.`;
        alert(errorMessage);
        return;
    }
    
    if (Object.keys(customPlayers).length === 0) {
        alert('No valid player sets found!');
        return;
    }
    
    players = JSON.parse(JSON.stringify(customPlayers));
    sets = Object.keys(customPlayers);
    
    if (gameMode === 'online' && isAuctioneer) {
        if (isEditingConfig) updateOnlineRoomConfig();
        else createOnlineRoom();
    } else {
        createTeamsDirectly();
    }
}

window.backToInitialSetup = function() {
    document.getElementById('custom-players-setup').style.display = 'none';
    document.getElementById('initial-setup').style.display = 'flex';
}

// =====================================================================
// TEAM CREATION
// =====================================================================

function createTeamsDirectly() {
    if (gameMode === 'online') {
        const teamsContainer = document.getElementById('teams-container');
        teamsContainer.innerHTML = '';
        teamsContainer.style.display = 'flex'; 
        
        Object.entries(teamIdMapping).forEach(([teamId, teamName]) => {
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team';
            teamDiv.dataset.teamId = teamId;
            teamDiv.dataset.maxReached = 'false';
            teamDiv.dataset.disqualified = 'false';
            
            let teamHTML = '';
            if (teamId === myTeamId) {
                teamDiv.style.position = 'relative';
                teamHTML += '<div class="my-team-indicator">MY TEAM</div>';
            }
            
            teamHTML += `
                <div class="team-header-editable">
                    <h3><span class="team-name-text">${teamName}</span></h3>
                </div>
                <p>Purse Remaining: <span class="purse-amount">${budget}</span> Crores</p>
                <p class="player-count">Players: 0 / ${minPlayers}</p>
                <p class="player-composition">🇮🇳 0 | ✈️ 0</p>
                
                <div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div>
                <div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div>
                <div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div>
                <div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div>
                <div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>
            `;
            teamDiv.innerHTML = teamHTML;
            teamsContainer.appendChild(teamDiv);
        });
    } else {
        teamNames = Array.from({ length: teamCount }, (_, i) => `Team ${i + 1}`);
        editableTeams = new Set(teamNames);
        const teamsContainer = document.getElementById('teams-container');
        teamsContainer.innerHTML = '';
        teamsContainer.style.display = 'flex';

        teamNames.forEach(name => {
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team';
            teamDiv.dataset.maxReached = 'false';
            teamDiv.dataset.disqualified = 'false';
            teamDiv.innerHTML = `
                <div class="team-header-editable">
                    <h3><span class="team-name-text" contenteditable="true" onclick="makeTeamNameEditable(this)" onblur="saveTeamName(this)" onkeydown="handleTeamNameKey(event, this)">${name}</span></h3>
                </div>
                <p>Purse Remaining: <span class="purse-amount">${budget}</span> Crores</p>
                <p class="player-count">Players: 0 / ${minPlayers}</p>
                <p class="player-composition">🇮🇳 0 | ✈️ 0</p>

                <div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div>
                <div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div>
                <div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div>
                <div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div>
                <div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>
            `;
            teamsContainer.appendChild(teamDiv);
        });
    }

    setupTeamManagement();
    
    if (isAuctionStarted) {
        document.getElementById('auction-interface').style.display = 'block';
        document.getElementById('stats-panel').style.display = 'block';
        document.getElementById('upcoming-sets-container').style.display = 'block';
    }
    
    document.getElementById('unsold-players-container').style.display = 'none';
    
    // UNIFIED BUTTON STYLING
    const playerButton = document.getElementById('current-player-name');
    playerButton.style.pointerEvents = 'auto'; 
    playerButton.style.opacity = '1';
    playerButton.style.cursor = 'pointer'; 

    if (gameMode === 'offline' || isAuctioneer) {
        playerButton.addEventListener('dragstart', dragStart);
        playerButton.addEventListener('click', startSetAuction);
    } else {
        document.getElementById('next-player-button').style.display = 'none';
    }

    if (gameMode === 'online' && !isAuctioneer) {
        document.getElementById('reset-controls').style.display = 'none';
        document.getElementById('restart-auction-button').style.display = 'none';
        document.getElementById('reset-auction-button').style.display = 'none';
    } else {
        document.getElementById('reset-controls').style.display = 'block';
    }

    updateStatistics();
    updateAllVisibilityPanels();
    announceSet();
}

// =====================================================================
// AUCTION FUNCTIONS
// =====================================================================

function updatePurseColor(teamDiv) {
    const purseSpan = teamDiv.querySelector('.purse-amount');
    const purseValue = parseFloat(purseSpan.textContent);
    const percentRemaining = (purseValue / budget) * 100;
    
    if (percentRemaining <= 10) {
        purseSpan.style.color = '#e74c3c';
        purseSpan.style.fontWeight = 'bold';
    } else if (percentRemaining <= 20) {
        purseSpan.style.color = '#e67e22';
        purseSpan.style.fontWeight = 'bold';
    } else if (percentRemaining <= 40) {
        purseSpan.style.color = '#f39c12';
        purseSpan.style.fontWeight = 'bold';
    } else {
        purseSpan.style.color = '#27ae60';
        purseSpan.style.fontWeight = 'bold';
    }
}

function announceSet() {
    const currentSet = sets[currentSetIndex];
    document.getElementById('current-set').textContent = currentSet;
    const playerButton = document.getElementById('current-player-name');
    playerButton.textContent = "Click to Start";
    playerButton.draggable = false;
    
    if (gameMode === 'offline' || isAuctioneer) {
        document.getElementById('next-player-button').style.display = 'none';
    }
    document.getElementById('remaining-in-set').style.display = 'none';
    
    isSetAnnounced = true;

    if (isSecondRound) {
        if (unsoldPlayers[currentSet] && unsoldPlayers[currentSet].length > 0) {
            if ((gameMode === 'offline' || isAuctioneer) && currentPlayerIndex === 0) {
                shuffleArray(unsoldPlayers[currentSet]);
            }
        } else {
            currentSetIndex++;
            if (currentSetIndex >= sets.length) {
                alert("Auction is over! All unsold players have been processed.");
                return;
            }
            announceSet();
            return;
        }
    }
    
    syncToFirebase();
    updateAllVisibilityPanels();
    updateCurrentPlayerDisplay();
}

window.startSetAuction = function() {
    if (gameMode === 'online' && !isAuctioneer) return;
    isAuctionStarted = true;
    
    document.querySelectorAll('.team-name-text').forEach(element => {
        element.contenteditable = 'false';
        element.style.cursor = 'default';
        element.style.pointerEvents = 'none';
        element.onclick = null;
    });
    
    if (isSetAnnounced) {
        isSetAnnounced = false;
        loadNextPlayer();
    }
    
    syncToFirebase();
    updateAllVisibilityPanels();
}

function loadNextPlayer() {
    const currentSet = sets[currentSetIndex];
    let playerList = isSecondRound ? unsoldPlayers[currentSet] : players[currentSet];
    
    if (!playerList || playerList.length === 0) {
        nextPlayer();
        return;
    }
    
    const currentPlayer = playerList[currentPlayerIndex];
    const displayName = extractPlayerName(currentPlayer);
    const cleanName = sanitizeDisplayPlayerName(displayName);
    
    const playerButton = document.getElementById('current-player-name');
    playerButton.textContent = cleanName || displayName;
    
    if (gameMode === 'offline' || isAuctioneer) {
        playerButton.draggable = true;
        document.getElementById('next-player-button').style.display = 'inline-block';
    }
    document.getElementById('current-set').textContent = currentSet;

    const remainingPlayers = playerList.slice(currentPlayerIndex + 1).map(p => extractPlayerName(p));
    const remainingDiv = document.getElementById('remaining-in-set');
    if (remainingPlayers.length > 0) {
        remainingDiv.innerHTML = `<strong>Remaining in this set:</strong> ${remainingPlayers.join(', ')}`;
        remainingDiv.style.display = 'block';
    } else {
        remainingDiv.style.display = 'none';
    }
    
    syncToFirebase();
    updateAllVisibilityPanels();
    updateCurrentPlayerDisplay();
}

window.nextPlayer = function() {
    if (gameMode === 'online' && !isAuctioneer) return;
    
    const currentSet = sets[currentSetIndex];
    let playerList = isSecondRound ? unsoldPlayers[currentSet] : players[currentSet];
    
    if (playerList && playerList.length > 0 && currentPlayerIndex < playerList.length) {
        const currentPlayerEntry = playerList[currentPlayerIndex];
        const currentPlayerName = extractPlayerName(currentPlayerEntry);
        
        let playerWasSold = false;
        document.querySelectorAll('.team ul li').forEach(li => {
            const text = li.textContent;
            const priceIndex = text.lastIndexOf(' - ');
            if (priceIndex !== -1) {
                const soldPlayerName = text.substring(0, priceIndex).trim();
                if (normalizePlayerName(soldPlayerName) === normalizePlayerName(currentPlayerName)) {
                    playerWasSold = true;
                }
            }
        });
        
        if (!playerWasSold) {
            if (!isSecondRound) {
                if (!unsoldPlayers[currentSet]) {
                    unsoldPlayers[currentSet] = [];
                }
                const alreadyUnsold = unsoldPlayers[currentSet].some(entry => {
                    const parsed = parsePlayerEntry(entry, getSetTypeFromName(currentSet));
                    return normalizePlayerName(parsed.name) === normalizePlayerName(currentPlayerName);
                });
                if (!alreadyUnsold) {
                    unsoldPlayers[currentSet].push(currentPlayerEntry);
                }
            }
        }
    }
    
    currentPlayerIndex++;
    
    if (!playerList || playerList.length === 0) {
        currentPlayerIndex = 0;
        currentSetIndex++;
        if (currentSetIndex >= sets.length) {
            handleEndOfSets();
            return;
        }
        announceSet();
        return;
    }

    if (currentPlayerIndex >= playerList.length) {
        currentPlayerIndex = 0;
        currentSetIndex++;
        if (currentSetIndex >= sets.length) {
            handleEndOfSets();
            return;
        } else {
            announceSet();
        }
    } else {
        loadNextPlayer();
    }
    
    syncToFirebase();
    syncUnsoldToFirebase();
    updateAllVisibilityPanels();
}

function handleEndOfSets() {
    if (!isSecondRound) {
        collectAllUnsoldPlayers();
        isSecondRound = true;
        currentSetIndex = 0;
        
        let hasUnsoldPlayers = false;
        for (const set in unsoldPlayers) {
            if (unsoldPlayers[set] && unsoldPlayers[set].length > 0) {
                hasUnsoldPlayers = true;
                break;
            }
        }
        
        if (!hasUnsoldPlayers) {
            checkTeamQualification();
            return;
        }
        
        showUnsoldRoundModal();         
        syncToFirebase();
        syncUnsoldToFirebase();
        announceSet();
    } else {
        checkTeamQualification();
    }
    updateAllVisibilityPanels();
}

function checkTeamQualification() {
    const teams = document.querySelectorAll('.team');
    let disqualifiedTeams = [];
    
    teams.forEach(team => {
        const totalPlayers = team.querySelectorAll('ul li').length;
        const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        
        let indianCount = 0;
        team.querySelectorAll('ul li').forEach(li => {
            if (!li.textContent.includes('✈️')) {
                indianCount++;
            }
        });

        let reason = "";
        if (totalPlayers < minPlayers) {
            reason = "Minimum players not reached";
        } else if (indianCount < 8) {
            reason = "Need 8 Indians";
        }

        if (reason) {
            disqualifiedTeams.push(`${teamName}: ${reason}`);
            // End of game: Force the lock
            disqualifyTeam(team); 
        } else {
            // Ensure valid teams are unlocked if they fixed issues last second
            liftDisqualification(team);
        }
    });
    
    document.getElementById('current-set').parentElement.textContent = '';
    document.getElementById('current-player-name').textContent = 'Auction Completed';
    document.getElementById('current-player-name').style.backgroundColor = '#27ae60';
    document.getElementById('current-player-name').style.cursor = 'default';
    document.getElementById('current-player-name').draggable = false;
    const viewStatsButton = document.getElementById('view-stats-button');
    if (viewStatsButton) {
        viewStatsButton.style.display = 'none';
        viewStatsButton.disabled = true;
    }
    activeStatsPlayer = null;
    closePlayerStatsModal();
    const heroWrap = document.getElementById('current-player-hero');
    if (heroWrap) {
        heroWrap.style.display = 'none';
    }
    const heroImg = document.getElementById('current-player-hero-img');
    if (heroImg) {
        heroImg.src = PLAYER_PLACEHOLDER_IMAGE;
    }
    
    if (gameMode === 'offline' || isAuctioneer) {
        document.getElementById('next-player-button').style.display = 'none';
    }
    document.getElementById('remaining-players').innerHTML = '';
    
    if (disqualifiedTeams.length > 0) {
        alert(`Auction over!\n\nDisqualified teams:\n${disqualifiedTeams.join('\n')}`);
    } else {
        alert("Auction is over! All teams qualified.");
    }
}

function handlePlayerContextMenu(e, teamDiv, playerId, playerName, price) {
    // Only Auctioneer (or offline mode) can move players
    if (gameMode === 'online' && !isAuctioneer) return;

    e.preventDefault(); // Stop default browser menu

    const currentTeamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    
    // Store data for the move
    playerToMove = {
        id: playerId,
        name: playerName,
        oldPrice: parseFloat(price),
        oldTeamId: teamDiv.dataset.teamId,
        oldTeamDiv: teamDiv
    };

    // Populate Modal
    document.getElementById('move-player-name').textContent = playerName;
    document.getElementById('move-current-team').textContent = currentTeamName;
    document.getElementById('move-player-price').value = price;
    
    // Populate Team Selector (Exclude current team)
    const select = document.getElementById('move-target-team');
    select.innerHTML = '<option value="">Select Target Team</option>';
    
    document.querySelectorAll('.team').forEach(t => {
        const tName = t.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        const tId = t.dataset.teamId || tName; // Fallback for offline
        
        if (tName !== currentTeamName) {
            const option = document.createElement('option');
            option.value = tId; // Store ID (online) or Name (offline)
            option.textContent = tName;
            select.appendChild(option);
        }
    });

    document.getElementById('move-player-modal').style.display = 'block';
}

function confirmPlayerMove() {
    if (!playerToMove) return;

    const newPrice = parseFloat(document.getElementById('move-player-price').value);
    const targetTeamValue = document.getElementById('move-target-team').value; 

    if (!targetTeamValue) {
        alert("Please select a team to move to.");
        return;
    }
    if (isNaN(newPrice) || newPrice < 0) {
        alert("Please enter a valid price.");
        return;
    }

    // 1. Find Target Team Div
    let targetTeamDiv = null;
    if (gameMode === 'online') {
        targetTeamDiv = document.querySelector(`.team[data-team-id="${targetTeamValue}"]`);
    } else {
        document.querySelectorAll('.team').forEach(t => {
            if (t.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '') === targetTeamValue) {
                targetTeamDiv = t;
            }
        });
    }

    if (!targetTeamDiv) return;

    // 2. Remove from Old Team (Refund Money, Remove LI)
    const oldPurseSpan = playerToMove.oldTeamDiv.querySelector('.purse-amount');
    const oldBudget = parseFloat(oldPurseSpan.textContent);
    oldPurseSpan.textContent = oldBudget + playerToMove.oldPrice;
    
    const oldLi = playerToMove.oldTeamDiv.querySelector(`li[data-player-id="${playerToMove.id}"]`);
    if (oldLi) oldLi.remove();
    
    // [FIX] Reset status for Old Team & Recalculate
    playerToMove.oldTeamDiv.dataset.manualDisq = 'false'; 
    updateTeamCounts(playerToMove.oldTeamDiv);
    updatePurseColor(playerToMove.oldTeamDiv);

    // 3. Add to New Team (Deduct Money, Add LI)
    const newPurseSpan = targetTeamDiv.querySelector('.purse-amount');
    const newBudget = parseFloat(newPurseSpan.textContent);
    const finalBudget = newBudget - newPrice;
    newPurseSpan.textContent = finalBudget;
    
    let fullEntry = "";
    for (const set in players) {
        const found = players[set].find(p => extractPlayerName(p) === playerToMove.name);
        if (found) { fullEntry = found; break; }
    }
    if (!fullEntry) {
         for (const set in unsoldPlayers) {
            const found = unsoldPlayers[set].find(p => extractPlayerName(p) === playerToMove.name);
            if (found) { fullEntry = found; break; }
        }
    }

    const setType = getSetTypeFromName(fullEntry ? fullEntry : "Batsman");
    const parsed = parsePlayerEntry(fullEntry || playerToMove.name, setType);
    const category = tagToCategory(parsed.tag);
    const section = getSectionByCategory(targetTeamDiv, category);
    
    if (section) {
        const newLi = document.createElement('li');
        newLi.dataset.playerId = playerToMove.id;
        newLi.textContent = `${playerToMove.name} - ${newPrice} Crores`;
        
        const frozenName = playerToMove.name;
        const frozenId = playerToMove.id;
        const frozenPrice = newPrice;

        newLi.addEventListener('contextmenu', (e) => 
            handlePlayerContextMenu(e, targetTeamDiv, frozenId, frozenName, frozenPrice)
        );
        section.appendChild(newLi);
    }
    
    // [FIX] Reset status for New Team & Recalculate
    targetTeamDiv.dataset.manualDisq = 'false';
    updateTeamCounts(targetTeamDiv);
    updatePurseColor(targetTeamDiv);

    // 4. Firebase Sync (If Online)
    if (gameMode === 'online' && isAuctioneer) {
        const updates = {};
        updates[`rooms/${currentRoomCode}/teams/${playerToMove.oldTeamId}/purse`] = oldBudget + playerToMove.oldPrice;
        updates[`rooms/${currentRoomCode}/teams/${playerToMove.oldTeamId}/players/${playerToMove.id}`] = null;
        
        const targetId = targetTeamDiv.dataset.teamId;
        updates[`rooms/${currentRoomCode}/teams/${targetId}/purse`] = finalBudget;
        updates[`rooms/${currentRoomCode}/teams/${targetId}/players/${playerToMove.id}`] = {
            name: playerToMove.name,
            price: newPrice,
            set: setType, 
            fullEntry: fullEntry || playerToMove.name,
            addedAt: Date.now()
        };
        
        update(ref(database), updates);
    }

    updateStatistics();
    recalculateAuctionStats();
    
    document.getElementById('move-player-modal').style.display = 'none';
    playerToMove = null;
}

// Add Event Listeners for the new modal buttons
document.getElementById('cancel-move-player').addEventListener('click', () => {
    document.getElementById('move-player-modal').style.display = 'none';
});
document.getElementById('confirm-move-player').addEventListener('click', confirmPlayerMove);

function collectAllUnsoldPlayers() {
    sets.forEach(set => {
        const soldPlayers = new Set();
        document.querySelectorAll('.team ul li').forEach(li => {
            const playerName = li.textContent.split(' - ')[0].trim();
            const playerList = players[set] || [];
            const isSold = playerList.some(playerEntry => {
                const entryName = extractPlayerName(playerEntry);
                return entryName === playerName;
            });
            if (isSold) {
                soldPlayers.add(playerName);
            }
        });
        
        if (!unsoldPlayers[set]) {
            unsoldPlayers[set] = [];
        }
        
        if (players[set]) {
            const unsoldPlayersInSet = players[set].filter(playerEntry => {
                const playerName = extractPlayerName(playerEntry);
                return !soldPlayers.has(playerName);
            });
            unsoldPlayers[set] = unsoldPlayersInSet;
        }
    });
    updateAllVisibilityPanels();
    updateUnsoldPlayersList();
}

function dragStart(event) {
    if (gameMode === 'online' && !isAuctioneer) {
        event.preventDefault();
        return;
    }
    
    const playerData = {
        player: event.target.textContent,
        set: sets[currentSetIndex],
        fullEntry: (isSecondRound ? unsoldPlayers : players)[sets[currentSetIndex]][currentPlayerIndex]
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(playerData));
}

function confirmPrice() {
    const cost = parseFloat(document.getElementById('price-input').value);
    
    if (cost && !isNaN(cost)) {
        const purseSpan = currentTeamDiv.querySelector('.purse-amount');
        const currentBudget = parseFloat(purseSpan.textContent);
        const newBudget = currentBudget - cost;
        
        if (newBudget >= 0) {
            const playerId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            purseSpan.textContent = newBudget;
            updatePurseColor(currentTeamDiv);
            
            auctionStats.totalPlayersSold++;
            auctionStats.totalMoneySpent += cost;
            if (cost > auctionStats.mostExpensivePlayer.price) {
                const teamName = currentTeamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
                auctionStats.mostExpensivePlayer = {
                    name: currentPlayerData.player,
                    price: cost,
                    team: teamName
                };
            }
            
            const fullEntry = currentPlayerData.fullEntry;
            const currentSet = sets[currentSetIndex];
            const setType = getSetTypeFromName(currentSet);
            const parsed = parsePlayerEntry(fullEntry, setType);
            const category = tagToCategory(parsed.tag);
            const section = getSectionByCategory(currentTeamDiv, category);

            // [NEW] Celebration Logic
            const currentTotalPlayers = currentTeamDiv.querySelectorAll('ul li').length + 1; // +1 for the player being added
            const shouldCelebrate = cost >= 18 || currentTotalPlayers === minPlayers;

            if (section) {
                const playerItem = document.createElement('li');
                playerItem.dataset.playerId = playerId;
                playerItem.textContent = `${currentPlayerData.player} - ${cost} Crores`;
                
                const frozenName = currentPlayerData.player;
                const frozenId = playerId;
                const frozenPrice = cost;
                
                playerItem.addEventListener('contextmenu', (e) => 
                    handlePlayerContextMenu(e, currentTeamDiv, frozenId, frozenName, frozenPrice)
                );
                
                section.appendChild(playerItem);
                updateTeamCounts(currentTeamDiv);
                
                // Fire locally for Auctioneer/Offline mode
                if (shouldCelebrate && typeof triggerBlockbusterCelebration === 'function') {
                    triggerBlockbusterCelebration();
                }
            }
            
            if (gameMode === 'online' && isAuctioneer) {
                syncPlayerSaleToFirebase(currentTeamDiv, currentPlayerData, cost, playerId);
                
                // [NEW] Send Celebration Signal to all other players
                if (shouldCelebrate) {
                    const updates = {};
                    updates[`rooms/${currentRoomCode}/auctionState/celebrationTime`] = Date.now();
                    update(ref(database), updates);
                }
            }
            
            updateStatistics();
            nextPlayer();
        } else {
            alert('Not enough budget!');
        }
    }
    document.getElementById('price-modal').style.display = 'none';
}

function disqualifyTeam(teamDiv) {
    teamDiv.dataset.manualDisq = 'true'; // Set manual flag
    updateTeamCounts(teamDiv); // Update visuals
}

function liftDisqualification(teamDiv) {
    teamDiv.dataset.manualDisq = 'false'; // Remove manual flag
    updateTeamCounts(teamDiv); // Recalculate state
}

function updateTeamCounts(teamDiv) {
    const playerCount = teamDiv.querySelector('.player-count');
    const composition = teamDiv.querySelector('.player-composition'); 
    const totalPlayers = teamDiv.querySelectorAll('ul li').length;
    const nameText = teamDiv.querySelector('.team-name-text');
    const headerDiv = teamDiv.querySelector('.team-header-editable');
    
    // 1. Calculate Indians vs Overseas
    let overseasCount = 0;
    let indianCount = 0;
    
    teamDiv.querySelectorAll('ul li').forEach(li => {
        if (li.textContent.includes('✈️')) {
            overseasCount++;
        } else {
            indianCount++;
        }
    });

    // 2. Update the composition text line
    if (composition) {
        composition.textContent = `🇮🇳 ${indianCount} | ✈️ ${overseasCount}`;
    } else {
        const p = document.createElement('p');
        p.className = 'player-composition';
        p.textContent = `🇮🇳 ${indianCount} | ✈️ ${overseasCount}`;
        playerCount.after(p);
    }

    const purseRemaining = parseFloat(teamDiv.querySelector('.purse-amount').textContent);
    
    // 3. Determine Status
    // "Finished" means you effectively cannot buy more (Budget 0 OR Max Players hit)
    const isFinished = purseRemaining <= 0 || totalPlayers >= maxPlayers;
    const isManualDisq = teamDiv.dataset.manualDisq === 'true';

    // Clear ANY existing warnings first
    const oldWarning = teamDiv.querySelector('.team-warning-text');
    if(oldWarning) oldWarning.remove();

    // Helper to add the standardized warning style UNDER THE NAME
    const addWarning = (text) => {
        const warning = document.createElement('div');
        warning.className = 'team-warning-text'; 
        warning.style.color = '#e74c3c';
        warning.style.fontSize = '11px'; 
        warning.style.fontWeight = 'bold';
        warning.style.marginTop = '4px';
        warning.style.marginBottom = '8px';
        warning.textContent = text;
        headerDiv.after(warning); 
    };

    // --- EVALUATE STATE ---
    let errorReason = null;

    if (isManualDisq) {
        errorReason = "⚠️ Disqualified";
    } else if (isFinished) {
        // If finished buying, check strict requirements
        if (totalPlayers < minPlayers) {
            errorReason = "⚠️ Minimum players not reached"; //
        } else if (indianCount < 8) {
            errorReason = "⚠️ Need 8 Indians"; //
        }
    }

    // --- APPLY VISUALS & LOCKS ---
    
    // Get clean name
    const cleanName = nameText.textContent.replace(' - DISQUALIFIED', '');

    if (errorReason) {
        // === BAD STATE (Disqualified) ===
        teamDiv.dataset.disqualified = 'true'; // MASTER LOCK (Prevents adding players)
        teamDiv.dataset.maxReached = 'false';
        
        teamDiv.style.border = '3px solid #e74c3c'; // Red Border
        teamDiv.style.cursor = 'not-allowed';
        
        // Add Suffix to Name if not there
        nameText.textContent = `${cleanName} - DISQUALIFIED`;
        
        // Add Warning Text under name
        addWarning(errorReason);
        
        // Update Count Text (Keep Color Neutral)
        if (totalPlayers < minPlayers) {
            playerCount.textContent = `Players: ${totalPlayers} / ${minPlayers}`;
        } else {
            playerCount.textContent = `Players: ${totalPlayers} / ${maxPlayers}`;
        }
        playerCount.style.color = '#a0a0c0'; // Neutral color
        playerCount.title = errorReason;
        
        // Purse is red if 0 or negative
        if (purseRemaining <= 0) {
            teamDiv.querySelector('.purse-amount').style.color = '#e74c3c';
        }

    } else {
        // === GOOD / NEUTRAL STATE ===
        teamDiv.dataset.disqualified = 'false'; // UNLOCK
        teamDiv.style.cursor = 'pointer';

        // Restore Name
        nameText.textContent = cleanName;
        
        // Update Count Text
        if (totalPlayers < minPlayers) {
            playerCount.textContent = `Players: ${totalPlayers} / ${minPlayers}`;
        } else {
            playerCount.textContent = `Players: ${totalPlayers} / ${maxPlayers}`;
        }
        playerCount.style.color = '#a0a0c0';
        playerCount.title = '';

        // Check for Green Qualification (Max Reached + Valid Rules)
        if (isFinished) {
            teamDiv.dataset.maxReached = 'true';
            teamDiv.style.border = '3px solid #27ae60'; // Green Border
        } else {
            teamDiv.dataset.maxReached = 'false';
            teamDiv.style.border = 'none'; // Neutral (Still buying)
        }
        
        // Restore purse color logic
        updatePurseColor(teamDiv);
    }

    // 4. Update Category Section Counts
    const categories = ['wicket-keepers', 'batsmen', 'fast-bowlers', 'spinners', 'all-rounders'];
    const titles = ['Wicket Keepers', 'Batsmen', 'Fast Bowlers', 'Spinners', 'All-rounders'];
    
    categories.forEach((cls, idx) => {
        const count = teamDiv.querySelector(`.${cls}`).querySelectorAll('li').length;
        teamDiv.querySelectorAll('.section h4')[idx].textContent = `${titles[idx]} (${count})`;
    });
}

function updateStatistics() {
    const teams = document.querySelectorAll('.team');
    let teamStats = [];
    
    // 1. Calculate Team Stats
    teams.forEach(team => {
        const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        const purseSpan = team.querySelector('.purse-amount');
        const purseRemaining = parseFloat(purseSpan.textContent);
        const totalPlayers = team.querySelectorAll('ul li').length;
        const spent = budget - purseRemaining;
        
        teamStats.push({
            name: teamName,
            spent: spent,
            remaining: purseRemaining,
            players: totalPlayers,
            avgCost: totalPlayers > 0 ? (spent / totalPlayers).toFixed(2) : 0
        });
    });
    
    teamStats.sort((a, b) => b.spent - a.spent);

    // 2. Calculate Total Unsold Players
    let totalUnsoldCount = 0;
    if (unsoldPlayers) {
        Object.values(unsoldPlayers).forEach(list => {
            if (Array.isArray(list)) {
                totalUnsoldCount += list.length;
            }
        });
    }
    
    // 3. Build HTML
    let statsHTML = '<div class="stats-grid">';
    
    // Box 1: Most Expensive
    statsHTML += `<div class="stat-item">
        <span class="stat-label">Most Expensive:</span>
        <span class="stat-value">${auctionStats.mostExpensivePlayer.name || 'N/A'} - ${auctionStats.mostExpensivePlayer.price} Cr</span>
        <span class="stat-subvalue">${auctionStats.mostExpensivePlayer.team || ''}</span>
    </div>`;
    
    // Box 2: Total Sold
    statsHTML += `<div class="stat-item">
        <span class="stat-label">Total Sold:</span>
        <span class="stat-value">${auctionStats.totalPlayersSold} Players</span>
    </div>`;

    // [NEW] Box 3: Total Unsold (Now GREEN)
    statsHTML += `<div class="stat-item">
        <span class="stat-label">Total Unsold:</span>
        <span class="stat-value" style="color: #27ae60;">${totalUnsoldCount} Players</span>
    </div>`;
    
    // Box 4: Avg Cost
    const avgCost = auctionStats.totalPlayersSold > 0 ? (auctionStats.totalMoneySpent / auctionStats.totalPlayersSold).toFixed(2) : 0;
    statsHTML += `<div class="stat-item">
        <span class="stat-label">Avg Cost:</span>
        <span class="stat-value">${avgCost} Cr</span>
    </div>`;
    
    // Box 5 & 6: High/Low Spenders
    if (teamStats.length > 0) {
        statsHTML += `<div class="stat-item">
            <span class="stat-label">Highest Spender:</span>
            <span class="stat-value">${teamStats[0].name}</span>
            <span class="stat-subvalue">${teamStats[0].spent} Cr (${teamStats[0].players} players)</span>
        </div>`;
        
        statsHTML += `<div class="stat-item">
            <span class="stat-label">Lowest Spender:</span>
            <span class="stat-value">${teamStats[teamStats.length - 1].name}</span>
            <span class="stat-subvalue">${teamStats[teamStats.length - 1].spent} Cr (${teamStats[teamStats.length - 1].players} players)</span>
        </div>`;
    }
    
    statsHTML += '</div>';
    document.getElementById('stats-content').innerHTML = statsHTML;
}

function updateUpcomingSetsList() {
    if (!isAuctionStarted) {
        const container = document.getElementById('upcoming-sets-container');
        if (container) container.style.display = 'none';
        return;
    }

    const upcomingList = document.getElementById('upcoming-sets-list');
    
    // Hide entirely during Second Round
    if (!upcomingList || isSecondRound) {
        if (upcomingList) upcomingList.innerHTML = '';
        const container = document.getElementById('upcoming-sets-container');
        if (container) container.style.display = 'none';
        return;
    }
    
    let html = '';
    
    // [SMART LOGIC] If waiting to start, show the current set. If actively auctioning, skip it (+1).
    let startIndex = isSetAnnounced ? currentSetIndex : currentSetIndex + 1;
    
    for (let i = startIndex; i < sets.length; i++) {
        const setName = sets[i];
        const playerList = players[setName] || [];
        
        // Skip empty sets
        if (playerList.length === 0) continue;
        
        const displayPlayers = playerList.map(playerEntry => extractPlayerName(playerEntry));
        
        html += `
            <div class="set-entry">
                <div class="set-entry-header">
                    <span>${setName}</span>
                    <span class="player-count">${playerList.length} players</span>
                </div>
                <div class="set-entry-players">
                    ${displayPlayers.map(player => `<span class="player-name-item">${player}</span>`).join(' ')}
                </div>
            </div>
        `;
    }
    
    upcomingList.innerHTML = html || '<p style="text-align: center; color: #a0a0c0; padding: 10px;">No upcoming sets</p>';
    
    const container = document.getElementById('upcoming-sets-container');
    container.style.display = html ? 'block' : 'none';
}

function updateUnsoldPlayersList() {
    const unsoldList = document.getElementById('unsold-players-list');
    const container = document.getElementById('unsold-players-container');
    if (!unsoldList) return;
    
    let html = '';
    let hasUnsoldPlayers = false;
    const setsWithUnsold = [];
    
    if (isSecondRound) {
        // [SMART LOGIC APPLIED HERE FOR UNSOLD ROUND]
        let startIndex = isSetAnnounced ? currentSetIndex : currentSetIndex + 1;
        
        for (let i = startIndex; i < sets.length; i++) {
            const setName = sets[i];
            if (unsoldPlayers[setName] && unsoldPlayers[setName].length > 0) {
                setsWithUnsold.push(setName);
            }
        }
    } else {
        // Round 1: Just show whatever has gone unsold so far
        Object.keys(unsoldPlayers).forEach(setName => {
            if (unsoldPlayers[setName] && unsoldPlayers[setName].length > 0) {
                setsWithUnsold.push(setName);
            }
        });
    }
    
    setsWithUnsold.forEach(setName => {
        const playerEntries = unsoldPlayers[setName] || [];
        const displayPlayers = playerEntries.map(playerEntry => extractPlayerName(playerEntry));
        
        if (displayPlayers.length > 0) {
            hasUnsoldPlayers = true;
            html += `
                <div class="set-entry">
                    <div class="set-entry-header">
                        <span>${setName}</span>
                        <span class="player-count">${displayPlayers.length} players</span>
                    </div>
                    <div class="set-entry-players">
                        ${displayPlayers.map(player => `<span class="player-name-item">${player}</span>`).join(' ')}
                    </div>
                </div>
            `;
        }
    });
    
    unsoldList.innerHTML = html || '<p style="text-align: center; color: #a0a0c0; padding: 10px;">No unsold players</p>';
    
    const title = container.querySelector('h3');
    if (isSecondRound) {
        title.textContent = '🔄 Unsold Round';
        title.style.color = '#f39c12';
        container.style.borderLeftColor = '#f39c12';
    } else {
        title.textContent = '⏳ Unsold Players';
        title.style.color = '#e74c3c';
        container.style.borderLeftColor = '#e74c3c';
    }
    
    container.style.display = hasUnsoldPlayers ? 'block' : 'none';
}

function updateAllVisibilityPanels() {
    updateUpcomingSetsList();
    updateUnsoldPlayersList();
    updateStatistics();
}

// =====================================================================
// TEAM MANAGEMENT
// =====================================================================

function setupTeamManagement() {
    const teams = document.querySelectorAll('.team');
    teams.forEach(team => {
        const newTeam = team.cloneNode(true);
        team.parentNode.replaceChild(newTeam, team);
    });
    
    const refreshedTeams = document.querySelectorAll('.team');
    refreshedTeams.forEach(team => {
        team.addEventListener('click', function(e) {
            if (!e.target.closest('.team-name-text')) {
                openTeamManagementModal(this);
            }
        });
    });
    
    if (!dragDropListenersAttached) {
        document.getElementById('close-management-modal').addEventListener('click', closeTeamManagementModal);
        document.getElementById('copy-lineup-button').addEventListener('click', copyLineupToClipboard);
        setupPlayerDragAndDrop();
        dragDropListenersAttached = true;
    }
}

function openTeamManagementModal(teamDiv) {
    if (teamDiv.dataset.disqualified === 'true') return;
    
    if (gameMode === 'online') {
        const teamId = teamDiv.dataset.teamId;
        if (teamId !== myTeamId) {
            // Show lineup in READ-ONLY mode
            currentManagedTeam = teamDiv;
            displayTeamLineupReadOnly(teamDiv);
            return;
        }
    }
    
    currentManagedTeam = teamDiv;
    const teamName = teamDiv.querySelector('.team-name-text').textContent;
    document.getElementById('management-team-name').textContent = teamName;
    
    // 1. Reset Slots state
    const slots = document.querySelectorAll('.player-slot');
    slots.forEach(slot => {
        slot.innerHTML = slot.dataset.slot ? `Slot ${slot.dataset.slot}` : 'Empty Slot';
        slot.className = 'player-slot';
        slot.dataset.filled = 'false';
        slot.style.pointerEvents = 'auto'; 
        slot.style.opacity = '1';
    });
    
    // 2. Reset Bench list state
    const benchList = document.getElementById('bench-list');
    benchList.innerHTML = '';
    benchList.style.pointerEvents = 'auto'; 
    benchList.style.opacity = '1';
    
    // 3. Ensure Copy button is visible
    const copyBtn = document.getElementById('copy-lineup-button');
    copyBtn.style.display = 'block';
    
    // Gather all players currently in the team div (DOM Source of Truth for ownership)
    const allPlayers = [];
    teamDiv.querySelectorAll('ul li').forEach(li => {
        const text = li.textContent;
        const undoButtonIndex = text.indexOf('Undo');
        const priceIndex = text.lastIndexOf(' - ');
        
        if (priceIndex !== -1) {
            const name = text.substring(0, priceIndex).trim();
            const endPos = undoButtonIndex !== -1 ? undoButtonIndex : text.length;
            const price = text.substring(priceIndex + 3, endPos).replace(' Crores', '').trim();
            allPlayers.push({ name: name, price: price });
        }
    });
    
    // Load Saved Lineup from Session Storage
    const savedLineup = JSON.parse(sessionStorage.getItem(getTeamLineupKey(teamName)));
    
    if (savedLineup) {
        // A. Restore Playing XI
        savedLineup.playingXI.forEach(player => {
            const slot = document.querySelector(`.player-slot[data-slot="${player.slot}"]`);
            // Verify player is still owned by team
            if (slot && allPlayers.some(p => p.name === player.name)) {
                
                // [FIX IS HERE] Pass 'player.roles' as the 3rd argument
                const playerItem = createPlayerItem(player.name, player.price, player.roles); 
                
                slot.innerHTML = '';
                slot.appendChild(playerItem);
                slot.classList.add('filled');
                slot.dataset.filled = 'true';
            }
        });
        
        // B. Restore Bench
        const playingXINames = savedLineup.playingXI.map(p => p.name);
        const savedBenchNames = savedLineup.bench.map(p => p.name);
        
        savedLineup.bench.forEach(player => {
            if (allPlayers.some(p => p.name === player.name)) {
                const playerItem = createPlayerItem(player.name, player.price);
                benchList.appendChild(playerItem);
            }
        });
        
        // C. Add any NEW players to bench (that weren't in saved lineup)
        allPlayers.forEach(player => {
            if (!playingXINames.includes(player.name) && !savedBenchNames.includes(player.name)) {
                const playerItem = createPlayerItem(player.name, player.price);
                benchList.appendChild(playerItem);
            }
        });
    } else {
        // No save found? Put everyone on bench
        allPlayers.forEach(player => {
            const playerItem = createPlayerItem(player.name, player.price);
            benchList.appendChild(playerItem);
        });
    }
    
    updateXICount();
    document.getElementById('team-management-modal').style.display = 'block';
    document.querySelector('.team-management-content').classList.add('show');
}

function displayTeamLineupReadOnly(teamDiv) {
    const teamName = teamDiv.querySelector('.team-name-text').textContent;
    const teamId = teamDiv.dataset.teamId;
    
    document.getElementById('management-team-name').textContent = teamName;
    
    const slots = document.querySelectorAll('.player-slot');
    slots.forEach(slot => {
        slot.innerHTML = slot.dataset.slot ? `Slot ${slot.dataset.slot}` : 'Empty Slot';
        slot.className = 'player-slot';
        slot.dataset.filled = 'false';
        slot.style.pointerEvents = 'none';
    });
    
    const benchList = document.getElementById('bench-list');
    benchList.innerHTML = '';
    benchList.style.pointerEvents = 'none';

    const remoteTeamData = allTeamsData[teamId];
    
    const createReadOnlyItem = (name, price, roles) => {
        const item = createPlayerItem(name, price, roles);
        item.draggable = false;
        item.style.cursor = 'default';
        item.classList.add('read-only-item');
        return item;
    };

    if (remoteTeamData) {
        const allOwnedPlayers = [];
        if (remoteTeamData.players) {
            Object.values(remoteTeamData.players).forEach(player => {
                allOwnedPlayers.push({ name: player.name, price: player.price });
            });
        }

        const playersInXI = new Set();

        if (remoteTeamData.playingXI) {
            remoteTeamData.playingXI.forEach(player => {
                const slot = document.querySelector(`.player-slot[data-slot="${player.slot}"]`);
                if (slot) {
                    slot.innerHTML = '';
                    slot.appendChild(createReadOnlyItem(player.name, player.price, player.roles));
                    slot.classList.add('filled');
                    slot.dataset.filled = 'true';
                    
                    playersInXI.add(player.name);
                }
            });
        }

        const calculatedBench = allOwnedPlayers.filter(p => !playersInXI.has(p.name));
        
        calculatedBench.forEach(player => {
            benchList.appendChild(createReadOnlyItem(player.name, player.price));
        });
    }

    updateXICount();
    
    const copyBtn = document.getElementById('copy-lineup-button');
    copyBtn.style.display = 'block';
    copyBtn.style.pointerEvents = 'auto'; 
    
    document.getElementById('team-management-modal').style.display = 'block';
    document.querySelector('.team-management-content').classList.add('show');
}

function createPlayerItem(name, price, roles = {}) {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    playerItem.draggable = true;
    playerItem.dataset.name = name;
    playerItem.dataset.price = price;
    
    if (roles.c) playerItem.dataset.c = 'true';
    if (roles.vc) playerItem.dataset.vc = 'true';
    if (roles.wk) playerItem.dataset.wk = 'true';

    playerItem.innerHTML = `
        <span>${name}</span>
        <span class="player-price">${price} Cr</span>
    `;

    updatePlayerBadges(playerItem);
    
    playerItem.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({
            name: e.target.dataset.name,
            price: e.target.dataset.price,
            source: e.target.parentElement.id,
            slot: e.target.closest('.player-slot')?.dataset.slot,
            roles: {
                c: e.target.dataset.c === 'true',
                vc: e.target.dataset.vc === 'true',
                wk: e.target.dataset.wk === 'true'
            }
        }));
    });
    
    playerItem.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });

    playerItem.addEventListener('contextmenu', (e) => {
        if (gameMode === 'online' && currentManagedTeam && currentManagedTeam.dataset.teamId !== myTeamId) return;
        
        showContextMenu(e, playerItem, {
            c: playerItem.dataset.c === 'true',
            vc: playerItem.dataset.vc === 'true',
            wk: playerItem.dataset.wk === 'true'
        });
    });
    
    return playerItem;
}

function closeTeamManagementModal() {
    document.querySelector('.team-management-content').classList.remove('show');
    setTimeout(() => {
        document.getElementById('team-management-modal').style.display = 'none';
    }, 300);
}

window.copyLineupToClipboard = function() {
    const teamName = document.getElementById('management-team-name').textContent.replace(' (Read-Only)', '');
    let lineupText = `${teamName}\n\nPlaying XII:\n`;
    
    const slots = document.querySelectorAll('.player-slot.filled');
    slots.forEach((slot, index) => {
        const playerItem = slot.querySelector('.player-item');
        if (playerItem) {
            let suffixes = [];
            if (playerItem.dataset.c === 'true') suffixes.push('(C)');
            if (playerItem.dataset.vc === 'true') suffixes.push('(VC)');
            if (playerItem.dataset.wk === 'true') suffixes.push('(WK)');
            
            const suffixStr = suffixes.length > 0 ? ` ${suffixes.join(' ')}` : '';
            lineupText += `${index + 1}. ${playerItem.dataset.name}${suffixStr}\n`;
        }
    });
    
    lineupText += `\nBench:\n`;
    const benchPlayers = document.querySelectorAll('#bench-list .player-item');
    benchPlayers.forEach((player, index) => {
        lineupText += `${index + 1}. ${player.dataset.name}\n`;
    });
    
    navigator.clipboard.writeText(lineupText).then(() => {
        const button = document.getElementById('copy-lineup-button');
        button.textContent = '✓ Copied!';
        button.style.backgroundColor = '#27ae60';
        setTimeout(() => {
            button.textContent = '📋 Copy Lineup';
            button.style.backgroundColor = '#3498db';
        }, 2000);
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
}

function setupPlayerDragAndDrop() {
    document.querySelectorAll('.player-slot').forEach(slot => {
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            slot.classList.add('highlight');
        });

        slot.addEventListener('dragleave', () => {
            slot.classList.remove('highlight');
        });

        slot.addEventListener('drop', e => {
            e.preventDefault();
            slot.classList.remove('highlight');
            
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const draggingItem = document.querySelector('.dragging');
            
            if (!draggingItem) return;
            
            // CASE 1: SWAP - Bench Player -> Filled Slot
            // (Moves bench player to slot, sends slot player to bench)
            if (slot.dataset.filled === 'true' && data.source === 'bench-list') {
                const existingPlayer = slot.querySelector('.player-item');
                const benchList = document.getElementById('bench-list');
                
                // Existing player goes to bench (keeping their existing attributes/badges)
                benchList.appendChild(existingPlayer);
                draggingItem.remove();
                
                slot.innerHTML = '';
                // Create new player using data from drag (Bench players usually have no roles, but we pass empty object or data.roles just in case)
                const newPlayerItem = createPlayerItem(data.name, data.price, data.roles || {});                
                slot.appendChild(newPlayerItem);
                slot.classList.add('filled');
                slot.dataset.filled = 'true';
                
                updateXICount();
                saveTeamLineup();
                return;
            }

            // CASE 2: SWAP - Slot A -> Filled Slot B (FIXED)
            // (Swaps the two players between their slots, preserving roles)
            if (slot.dataset.filled === 'true' && data.slot) {
                const sourceSlot = document.querySelector(`.player-slot[data-slot="${data.slot}"]`);
                
                // Ensure we aren't dropping on the same slot
                if (sourceSlot && sourceSlot !== slot) {
                    // 1. Get info of player currently in target slot (Player B)
                    const targetPlayerItem = slot.querySelector('.player-item');
                    const playerBName = targetPlayerItem.dataset.name;
                    const playerBPrice = targetPlayerItem.dataset.price;
                    
                    // [FIX] Capture Player B's roles before destroying the element
                    const playerBRoles = {
                        c: targetPlayerItem.dataset.c === 'true',
                        vc: targetPlayerItem.dataset.vc === 'true',
                        wk: targetPlayerItem.dataset.wk === 'true'
                    };
                    
                    // 2. Clear target slot and add Player A (Dragged Player)
                    // [FIX] Pass data.roles (Player A's roles)
                    slot.innerHTML = '';
                    const newPlayerA = createPlayerItem(data.name, data.price, data.roles);
                    slot.appendChild(newPlayerA);
                    
                    // 3. Clear source slot and add Player B (Target Player)
                    sourceSlot.innerHTML = '';
                    const newPlayerB = createPlayerItem(playerBName, playerBPrice, playerBRoles);
                    sourceSlot.appendChild(newPlayerB);
                    
                    // 4. Remove original dragging item
                    draggingItem.remove();
                    
                    // 5. Update statuses
                    slot.classList.add('filled');
                    slot.dataset.filled = 'true';
                    sourceSlot.classList.add('filled');
                    sourceSlot.dataset.filled = 'true';
                    
                    updateXICount();
                    saveTeamLineup();
                }
                return;
            }
            
            // CASE 3: STANDARD DROP -> Empty Slot (FIXED)
            if (slot.dataset.filled === 'true') return;
            
            // If coming from another slot, clear that source slot
            if (data.slot) {
                const sourceSlot = document.querySelector(`.player-slot[data-slot="${data.slot}"]`);
                if (sourceSlot) {
                    sourceSlot.innerHTML = `Slot ${sourceSlot.dataset.slot}`;
                    sourceSlot.classList.remove('filled');
                    sourceSlot.dataset.filled = 'false';
                }
            } else if (data.source === 'bench-list') {
                draggingItem.remove();
            }
            
            // Add player to the new slot
            slot.innerHTML = '';
            // [FIX] Pass data.roles so they don't lose badges when moving to empty slot
            const playerItem = createPlayerItem(data.name, data.price, data.roles);
            slot.appendChild(playerItem);
            slot.classList.add('filled');
            slot.dataset.filled = 'true';
            
            updateXICount();
            saveTeamLineup();
        });
    });

    // Bench Listeners (No changes, but included for completeness)
    const benchList = document.getElementById('bench-list');
    benchList.addEventListener('dragover', e => {
        e.preventDefault();
    });

    benchList.addEventListener('drop', e => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const draggingItem = document.querySelector('.dragging');
        
        if (!draggingItem) return;
        
        if (data.slot) {
            const sourceSlot = document.querySelector(`.player-slot[data-slot="${data.slot}"]`);
            if (sourceSlot) {
                sourceSlot.innerHTML = `Slot ${sourceSlot.dataset.slot}`;
                sourceSlot.classList.remove('filled');
                sourceSlot.dataset.filled = 'false';
            }
            benchList.appendChild(draggingItem);
        } else if (data.source === 'bench-list') {
            benchList.appendChild(draggingItem);
        }
        
        updateXICount();
        saveTeamLineup();
    });
}

function updateXICount() {
    const filledSlots = document.querySelectorAll('.player-slot[data-filled="true"]').length;
    document.getElementById('xi-count').textContent = `(${filledSlots}/12)`;
}

function saveTeamLineup() {
    if (!currentManagedTeam) return;
    
    const teamName = currentManagedTeam.querySelector('.team-name-text').textContent;
    const lineup = {
        playingXI: [],
        bench: []
    };
    
    document.querySelectorAll('.player-slot.filled').forEach(slot => {
        const playerItem = slot.querySelector('.player-item');
        if (playerItem) {
            lineup.playingXI.push({
                name: playerItem.dataset.name,
                price: playerItem.dataset.price,
                slot: slot.dataset.slot,
                roles: {
                    c: playerItem.dataset.c === 'true',
                    vc: playerItem.dataset.vc === 'true',
                    wk: playerItem.dataset.wk === 'true'
                }
            });
        }
    });
    
    document.querySelectorAll('#bench-list .player-item').forEach(item => {
        lineup.bench.push({
            name: item.dataset.name,
            price: item.dataset.price
        });
    });
    
    sessionStorage.setItem(getTeamLineupKey(teamName), JSON.stringify(lineup));
    
    if (gameMode === 'online') {
        syncLineupUpdate(lineup);
    }
}

function syncLineupUpdate(lineup) {
    if (!currentRoomCode || !myTeamId) return;
    
    const updates = {};
    updates[`rooms/${currentRoomCode}/teams/${myTeamId}/playingXI`] = lineup.playingXI;
    updates[`rooms/${currentRoomCode}/teams/${myTeamId}/bench`] = lineup.bench;
    update(ref(database), updates);
}

// =====================================================================
// GLOBAL UNDO FUNCTION
// =====================================================================

function triggerGlobalUndo() {
    if (gameMode === 'online' && !isAuctioneer) return;

    // 1. Calculate the Previous State Indices
    let prevSetIndex = currentSetIndex;
    let prevPlayerIndex = currentPlayerIndex - 1;

    // Handle crossing back to previous set
    if (prevPlayerIndex < 0) {
        prevSetIndex--;
        if (prevSetIndex < 0) {
            alert("This is the start of the auction. Cannot undo further.");
            return;
        }
        const prevSetName = sets[prevSetIndex];
        const prevList = isSecondRound ? unsoldPlayers[prevSetName] : players[prevSetName];
        
        if (!prevList || prevList.length === 0) {
            prevPlayerIndex = 0; 
        } else {
            prevPlayerIndex = prevList.length - 1;
        }
    }

    // 2. Identify the Player we are undoing
    const targetSet = sets[prevSetIndex];
    const targetList = isSecondRound ? unsoldPlayers[targetSet] : players[targetSet];
    
    if (!targetList || !targetList[prevPlayerIndex]) {
        currentSetIndex = prevSetIndex;
        currentPlayerIndex = 0;
        loadNextPlayer();
        return;
    }

    const playerEntry = targetList[prevPlayerIndex];
    const playerName = extractPlayerName(playerEntry);

    // 3. Determine what happened to this player (Sold or Unsold?) and Reverse it
    let actionReversed = false;

    if (!isSecondRound && unsoldPlayers[targetSet]) {
        const foundIndex = unsoldPlayers[targetSet].findIndex(entry => 
            extractPlayerName(entry) === playerName
        );

        if (foundIndex !== -1) {
            unsoldPlayers[targetSet].splice(foundIndex, 1);
            actionReversed = true;
        }
    }

    if (!actionReversed) {
        const teams = document.querySelectorAll('.team');
        for (const teamDiv of teams) {
            let foundPlayerId = null;
            let foundPrice = 0;

            teamDiv.querySelectorAll('ul li').forEach(li => {
                const text = li.textContent;
                if (text.includes(playerName)) {
                    const namePart = text.split(' - ')[0].trim();
                    if (normalizePlayerName(namePart) === normalizePlayerName(playerName)) {
                        foundPlayerId = li.dataset.playerId;
                        const pricePart = text.split(' - ')[1].replace(' Crores', '').trim();
                        foundPrice = parseFloat(pricePart);
                    }
                }
            });

            if (foundPlayerId) {
                undoPlayerSale(teamDiv, foundPlayerId, foundPrice, playerName);
                actionReversed = true;
                break;
            }
        }
    }

    // 4. Update Indices to point to this player again
    currentSetIndex = prevSetIndex;
    currentPlayerIndex = prevPlayerIndex;
    isSetAnnounced = false;

    // 5. Sync and Render
    syncToFirebase();
    syncUnsoldToFirebase();
    loadNextPlayer();
    updateAllVisibilityPanels();
    updateStatistics();
}
window.triggerGlobalUndo = triggerGlobalUndo;

function undoPlayerSale(teamDiv, playerId, cost, playerName) {
    const li = teamDiv.querySelector(`li[data-player-id="${playerId}"]`);
    if (li) li.remove();

    const slotItem = document.querySelector(`.player-item[data-name="${playerName}"]`);
    if (slotItem) {
        const slot = slotItem.parentElement;
        if (slot.classList.contains('player-slot')) {
            slot.innerHTML = slot.dataset.slot ? `Slot ${slot.dataset.slot}` : 'Empty Slot';
            slot.classList.remove('filled');
            slot.dataset.filled = 'false';
        } else {
            slotItem.remove();
        }
        updateXICount();
    }

    const purseSpan = teamDiv.querySelector('.purse-amount');
    const currentBudget = parseFloat(purseSpan.textContent);
    const newBudget = currentBudget + cost;
    purseSpan.textContent = newBudget;
    
    updatePurseColor(teamDiv);
    recalculateAuctionStats(); 
    
    // [FIX] Always reset manual disqualification on Undo to allow recovery
    teamDiv.dataset.manualDisq = 'false';
    
    // [FIX] Force update to re-evaluate rules (Budget/Players)
    updateTeamCounts(teamDiv);

    if (gameMode === 'online' && isAuctioneer && playerId) {
        const teamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        let teamId = null;
        Object.entries(teamIdMapping).forEach(([id, name]) => {
            if (name === teamName) teamId = id;
        });

        if (teamId) {
            const updates = {};
            updates[`rooms/${currentRoomCode}/teams/${teamId}/purse`] = newBudget;
            updates[`rooms/${currentRoomCode}/teams/${teamId}/players/${playerId}`] = null;
            update(ref(database), updates);
        }
    }
}

// =====================================================================
// ROLE & CONTEXT MENU UTILITIES
// =====================================================================

function isPlayerWicketKeeper(playerName) {
    for (const [setName, list] of Object.entries(defaultPlayers)) {
        if (setName.includes("Wicket Keeper")) {
            const match = list.some(entry => entry.toLowerCase().includes(playerName.toLowerCase()));
            if (match) return true;
        }
        if (setName.includes("Marquee")) {
            const match = list.some(entry => {
                const parsed = parsePlayerEntry(entry, "Marquee");
                return parsed.name.toLowerCase() === playerName.toLowerCase() && parsed.tag === 'wk';
            });
            if (match) return true;
        }
    }
    
    for (const [setName, list] of Object.entries(players)) {
        if (setName.includes("Wicket Keeper")) {
             const match = list.some(entry => {
                const name = extractPlayerName(entry);
                return name.toLowerCase() === playerName.toLowerCase();
             });
             if (match) return true;
        }
    }
    return false;
}

document.addEventListener('click', () => {
    const menu = document.getElementById('custom-context-menu');
    if (menu) menu.remove();
});

function showContextMenu(e, playerItem, roles) {
    e.preventDefault();
    
    if (!playerItem.closest('.player-slot')) return;

    const existingMenu = document.getElementById('custom-context-menu');
    if (existingMenu) existingMenu.remove();

    const playerName = playerItem.dataset.name;
    const canBeWK = isPlayerWicketKeeper(playerName);

    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    menu.className = 'custom-context-menu';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;

    // Option: Captain
    const capOption = document.createElement('div');
    capOption.className = `menu-option ${roles.c ? 'active-role' : ''}`;
    capOption.innerHTML = `<span>👑</span> Captain`;
    capOption.onclick = (ev) => {
        ev.stopPropagation();
        setPlayerRole(playerItem, 'c');
        menu.remove();
    };

    // Option: Vice-Captain
    const vcOption = document.createElement('div');
    vcOption.className = `menu-option ${roles.vc ? 'active-role' : ''}`;
    vcOption.innerHTML = `<span>🛡️</span> Vice-Captain`;
    vcOption.onclick = (ev) => {
        ev.stopPropagation();
        setPlayerRole(playerItem, 'vc');
        menu.remove();
    };

    menu.appendChild(capOption);
    menu.appendChild(vcOption);

    // Option: Wicket Keeper (Only if valid)
    if (canBeWK) {
        const wkOption = document.createElement('div');
        wkOption.className = `menu-option ${roles.wk ? 'active-role' : ''}`;
        wkOption.innerHTML = `<span>🧤</span> Wicket Keeper`;
        wkOption.onclick = (ev) => {
            ev.stopPropagation();
            setPlayerRole(playerItem, 'wk');
            menu.remove();
        };
        menu.appendChild(wkOption);
    }

    document.body.appendChild(menu);
}

function setPlayerRole(targetPlayerItem, role) {
    const isAdding = !targetPlayerItem.dataset[role];
    const allSlotItems = document.querySelectorAll('.player-slot .player-item');

    // CONSTRAINT LOGIC
    if (role === 'c' && isAdding) {
        allSlotItems.forEach(item => {
            delete item.dataset.c; 
            updatePlayerBadges(item);
        });
        delete targetPlayerItem.dataset.vc;
    } 
    else if (role === 'vc' && isAdding) {
        allSlotItems.forEach(item => {
            delete item.dataset.vc;
            updatePlayerBadges(item);
        });
        delete targetPlayerItem.dataset.c;
    }
    
    // Apply new state
    if (isAdding) {
        targetPlayerItem.dataset[role] = 'true';
    } else {
        delete targetPlayerItem.dataset[role];
    }

    updatePlayerBadges(targetPlayerItem);
    saveTeamLineup();
}

function updatePlayerBadges(playerItem) {
    playerItem.querySelectorAll('.role-badge').forEach(b => b.remove());
    
    const nameSpan = playerItem.querySelector('span:first-child');
    
    if (playerItem.dataset.c) {
        const badge = document.createElement('span');
        badge.className = 'role-badge role-c';
        badge.textContent = 'C';
        nameSpan.appendChild(badge);
    }
    if (playerItem.dataset.vc) {
        const badge = document.createElement('span');
        badge.className = 'role-badge role-vc';
        badge.textContent = 'VC';
        nameSpan.appendChild(badge);
    }
    if (playerItem.dataset.wk) {
        const badge = document.createElement('span');
        badge.className = 'role-badge role-wk';
        badge.textContent = 'WK';
        nameSpan.appendChild(badge);
    }
}

function showUnsoldRoundModal() {
    const modal = document.getElementById('unsold-round-modal');
    if (modal) {
        modal.style.display = 'block';
        // Auto-focus the button so hitting Enter closes it naturally
        setTimeout(() => document.getElementById('close-unsold-modal-btn').focus(), 100);
    }
}

window.closeUnsoldRoundModal = function() {
    const modal = document.getElementById('unsold-round-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// =====================================================================
// TEAM NAME EDITING
// =====================================================================

window.makeTeamNameEditable = function(element) {
    if (isAuctionStarted || gameMode === 'online') return;
    
    element.contenteditable = 'true';
    element.focus();
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.2)';
    element.style.padding = '2px 6px';
    element.style.borderRadius = '4px';
    element.style.cursor = 'text';
}

window.saveTeamName = function(element) {
    const newName = element.textContent.trim();
    const teamDiv = element.closest('.team');
    const oldName = teamNames.find(name => 
        teamDiv.querySelector('.team-name-text').textContent.includes(name)
    );
    
    if (newName && newName !== oldName) {
        const index = teamNames.indexOf(oldName);
        if (index !== -1) {
            teamNames[index] = newName;
        }
    }
    
    if (isAuctionStarted || gameMode === 'online') {
        element.contenteditable = 'false';
        element.style.cursor = 'default';
        element.style.pointerEvents = 'none';
        element.onclick = null;
    } else {
        element.contenteditable = 'true';
        element.style.cursor = 'text';
        element.style.pointerEvents = 'auto';
    }
    
    element.style.backgroundColor = '';
    element.style.padding = '';
}

window.handleTeamNameKey = function(event, element) {
    if (event.key === 'Enter') {
        event.preventDefault();
        element.blur();
    }
}

// =====================================================================
// RESET FUNCTIONS
// =====================================================================

window.restartAuction = function() {
    if (gameMode === 'online' && !isAuctioneer) {
        alert('Only the auctioneer can restart the auction!');
        return;
    }
    
    if (!confirm('Are you sure you want to restart the auction? All player assignments will be cleared but teams will remain.')) {
        return;
    }
    
    const teams = document.querySelectorAll('.team');
    const savedTeamNames = [];
    
    teams.forEach(team => {
        const teamNameElement = team.querySelector('.team-name-text');
        if (teamNameElement) {
            const cleanName = teamNameElement.textContent.replace(' - DISQUALIFIED', '');
            savedTeamNames.push(cleanName);
        }
    });
    
    currentSetIndex = 0;
    currentPlayerIndex = 0;
    isSetAnnounced = false;
    isSecondRound = false;
    unsoldPlayers = {};
    isAuctionStarted = false;
    
    auctionStats = {
        mostExpensivePlayer: { name: '', price: 0, team: '' },
        totalPlayersSold: 0,
        totalMoneySpent: 0
    };
    
    sessionStorage.clear();
    
    const teamsContainer = document.getElementById('teams-container');
    teamsContainer.innerHTML = '';

    savedTeamNames.forEach(name => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team';
        teamDiv.dataset.maxReached = 'false';
        teamDiv.dataset.disqualified = 'false';
        
        teamDiv.innerHTML = `
            <div class="team-header-editable">
                <h3>
                    <span class="team-name-text" contenteditable="true" 
                          onclick="makeTeamNameEditable(this)" 
                          onblur="saveTeamName(this)"
                          onkeydown="handleTeamNameKey(event, this)"
                          style="cursor: text;">${name}</span>
                </h3>
            </div>
            <p>Purse Remaining: <span class="purse-amount">${budget}</span> Crores</p>
            <p class="player-count">Players: 0 / ${minPlayers}</p>
            <div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div>
            <div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div>
            <div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div>
            <div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div>
            <div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>
        `;
        teamsContainer.appendChild(teamDiv);
    });

    dragDropListenersAttached = false;
    setupTeamManagement();
    
    const playerButton = document.getElementById('current-player-name');
    playerButton.textContent = 'Click to Start';
    playerButton.style.backgroundColor = '#27ae60';
    playerButton.style.cursor = 'pointer';
    playerButton.draggable = false;
    
    document.getElementById('unsold-players-container').style.display = 'none';
    updateStatistics();
    updateAllVisibilityPanels();
    announceSet();
}

window.resetAuction = function() {
    if (gameMode === 'online' && !isAuctioneer) {
        alert('Only the auctioneer can reset the auction!');
        return;
    }
    
    if (!confirm('Are you sure you want to reset the entire auction? All progress will be lost.')) {
        return;
    }
    
    if (gameMode === 'online') {
        if (!isAuctioneer) {
            alert('Only the auctioneer can reset the auction');
            return;
        }
        if (currentRoomCode) {
            remove(ref(database, `rooms/${currentRoomCode}`));
        }
    }
    
    currentSetIndex = 0;
    currentPlayerIndex = 0;
    isSetAnnounced = false;
    isSecondRound = false;
    unsoldPlayers = {};
    dragDropListenersAttached = false;
    playerMode = 'default';
    customPlayers = {};
    teamNames = [];
    editableTeams = new Set();
    isAuctionStarted = false;
    allPlayersInAuction.clear();
    gameMode = 'offline';
    currentRoomCode = null;
    isAuctioneer = false;
    myTeamId = null;
    
    auctionStats = {
        mostExpensivePlayer: { name: '', price: 0, team: '' },
        totalPlayersSold: 0,
        totalMoneySpent: 0
    };
    
    setTypeCounts = {
        "Marquee": 0, "Wicket Keeper": 0, "Batsman": 0,
        "Fast Bowler": 0, "Spinner": 0, "All-rounder": 0
    };
    
    players = {};
    sets = [];
    
    detachAllListeners();
    sessionStorage.clear();
    
    document.getElementById('auction-interface').style.display = 'none';
    document.getElementById('stats-panel').style.display = 'none';
    document.getElementById('upcoming-sets-container').style.display = 'none';
    document.getElementById('unsold-players-container').style.display = 'none';
    document.getElementById('teams-container').innerHTML = '';
    document.getElementById('reset-controls').style.display = 'none';
    document.getElementById('custom-players-setup').style.display = 'none';
    document.getElementById('initial-setup').style.display = 'none';
    document.getElementById('online-choice').style.display = 'none';
    document.getElementById('join-room-screen').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'none';
    
    document.getElementById('mode-selection').style.display = 'flex';
    
    document.getElementById('team-count').value = '';
    document.getElementById('team-budget').value = '';
    document.getElementById('min-players').value = '';
    document.getElementById('max-players').value = '';
    document.getElementById('auctioneer-name').value = '';
    document.getElementById('join-room-code').value = '';
    document.getElementById('join-team-name').value = '';
    document.querySelector('input[name="player-mode"][value="default"]').checked = true;
    document.querySelector('input[name="game-mode"][value="online"]').checked = true;
    
    const setsContainer = document.getElementById('sets-container');
    if (setsContainer) {
        setsContainer.innerHTML = '';
    }
}

// =====================================================================
// EVENT LISTENERS
// =====================================================================

window.addEventListener('beforeunload', function() {
    const teams = document.querySelectorAll('.team h3 .team-name-text');
    teams.forEach(team => {
        const teamName = team.textContent.replace(' - DISQUALIFIED', '');
        sessionStorage.removeItem(getTeamLineupKey(teamName));
    });
});

document.addEventListener('dragover', event => {
    event.preventDefault();
});

document.addEventListener('drop', async event => {
    event.preventDefault();
    
    if (gameMode === 'online' && !isAuctioneer) return;
    
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    currentPlayerData = data;
    currentTeamDiv = event.target.closest('.team');
    
    if (currentTeamDiv) {
        if (currentTeamDiv.dataset.disqualified === 'true') return;
        if (currentTeamDiv.dataset.maxReached === 'true') return;
        
        document.getElementById('modal-player-name').textContent = `Enter price for ${data.player}`;
        const teamName = currentTeamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        document.getElementById('modal-team-name').textContent = `Selling to: ${teamName}`;
        document.getElementById('price-input').value = '';
        document.getElementById('price-modal').style.display = 'block';
        document.getElementById('price-input').focus();
    }
});

document.getElementById('cancel-price').onclick = function() {
    document.getElementById('price-modal').style.display = 'none';
};

document.getElementById('confirm-price').onclick = function() {
    confirmPrice();
};

document.getElementById('price-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        confirmPrice();
    }
});

// 1. Auctioneer Name -> Team Count
document.getElementById('auctioneer-name').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        validateInput('auctioneer-name', 'team-count');
    }
});

// 2. Team Count -> Budget
document.getElementById('team-count').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        validateInput('team-count', 'team-budget');
    }
});

// 3. Budget -> Min Players
document.getElementById('team-budget').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        validateInput('team-budget', 'min-players');
    }
});

// 4. Min Players -> Max Players
document.getElementById('min-players').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        validateInput('min-players', 'max-players');
    }
});

// 5. Max Players -> Focus Player Mode Selector
document.getElementById('max-players').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Trigger validation (showing red error if wrong, or moving on if right)
        if (validateInput('max-players', null)) {
            const checkedRadio = document.querySelector('input[name="player-mode"]:checked');
            if (checkedRadio) {
                checkedRadio.focus();
            }
        }
    }
});

// 6. Player Mode Radios -> ENTER -> Continue
// (Note: Use Arrow Keys to toggle between them, Enter to submit)
document.querySelectorAll('input[name="player-mode"]').forEach(radio => {
    radio.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSetupContinue();
        }
    });
});

// =====================================================================
// JOIN ROOM NAVIGATION
// =====================================================================

// 1. Room Code -> Jumps to Team Name
document.getElementById('join-room-code').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const code = this.value.trim();
        if (code.length !== 6) {
            showError('join-room-code', "Code must be 6 characters");
        } else {
            clearError('join-room-code');
            document.getElementById('join-team-name').focus();
        }
    }
});

// 2. Team Name -> Tries to Join
document.getElementById('join-team-name').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleJoinRoom();
    }
});

document.getElementById('current-player-name').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') startSetAuction();
});

document.getElementById('next-player-button').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') nextPlayer();
});

// =====================================================================
// AUTO-JOIN FROM URL
// =====================================================================

window.addEventListener('DOMContentLoaded', function() {
    // 1. Check for Room Code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        // Auto-switch to Online Join Mode
        gameMode = 'online';
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('join-room-screen').style.display = 'flex';
        
        // Pre-fill Code
        document.getElementById('join-room-code').value = roomCode.toUpperCase();
        
        // [FIX] Auto-focus the NAME field since code is already there
        document.getElementById('join-team-name').focus();
    } else {
        // 2. No Link? Ensure we start fresh
        // (Optional safety: clear inputs)
        document.getElementById('join-room-code').value = '';
        document.getElementById('join-team-name').value = '';
    }

    // Hide panels (standard init)
    document.getElementById('auction-interface').style.display = 'none';
    document.getElementById('stats-panel').style.display = 'none';
    document.getElementById('upcoming-sets-container').style.display = 'none';
    document.getElementById('unsold-players-container').style.display = 'none';
    document.getElementById('reset-controls').style.display = 'none';
    document.getElementById('teams-container').style.display = 'none';
});

// =====================================================================
// CLOSE MODAL ON ESCAPE KEY
// =====================================================================

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // [NEW] Close Move Player Modal
        const moveModal = document.getElementById('move-player-modal');
        if (moveModal && moveModal.style.display === 'block') {
            moveModal.style.display = 'none';
            return;
        }

        const unsoldModal = document.getElementById('unsold-round-modal');
        if (unsoldModal && unsoldModal.style.display === 'block') {
            closeUnsoldRoundModal();
            return; 
        }

        const priceModal = document.getElementById('price-modal');
        if (priceModal.style.display === 'block') {
            priceModal.style.display = 'none';
            return;
        }

        const teamModal = document.getElementById('team-management-modal');
        if (teamModal && teamModal.style.display === 'block') {
            closeTeamManagementModal();
            return;
        }

        const statsModal = document.getElementById('player-stats-modal');
        if (statsModal && statsModal.style.display === 'block') {
            closePlayerStatsModal();
        }
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        // 1. Check Mode Selection Screen
        const modeSelection = document.getElementById('mode-selection');
        if (modeSelection && modeSelection.style.display !== 'none') {
            event.preventDefault();
            handleModeSelection();
            return;
        }

        // 2. Check Online Choice Screen (Create/Join)
        const onlineChoice = document.getElementById('online-choice');
        if (onlineChoice && onlineChoice.style.display !== 'none') {
            event.preventDefault();
            handleOnlineChoice();
            return;
        }
    }
});

document.getElementById('team-management-modal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeTeamManagementModal();
    }
});

document.getElementById('view-stats-button').addEventListener('click', openPlayerStatsModal);
document.getElementById('close-player-stats').addEventListener('click', closePlayerStatsModal);
document.getElementById('player-stats-modal').addEventListener('click', function(event) {
    if (event.target === this) {
        closePlayerStatsModal();
    }
});

document.getElementById('price-modal').addEventListener('click', function(event) {
    if (event.target === this) {
        this.style.display = 'none';
    }
});

// Attach event listeners after DOM loads
document.getElementById('mode-continue-button').addEventListener('click', handleModeSelection);
document.getElementById('online-choice-button').addEventListener('click', handleOnlineChoice);
document.getElementById('setup-button').addEventListener('click', handleSetupContinue);
document.getElementById('join-room-button').addEventListener('click', handleJoinRoom);
document.getElementById('start-auction-button').addEventListener('click', startAuctionFromLobby);

// Initialize - hide all auction panels on page load
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('auction-interface').style.display = 'none';
    document.getElementById('stats-panel').style.display = 'none';
    document.getElementById('upcoming-sets-container').style.display = 'none';
    document.getElementById('unsold-players-container').style.display = 'none';
    document.getElementById('reset-controls').style.display = 'none';
    document.getElementById('teams-container').style.display = 'none';
});

/* ===== GLOBAL PLAYER SEARCH ENGINE ===== */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('global-player-search');
    const dropdown = document.getElementById('search-results-dropdown');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length < 2) {
                dropdown.style.display = 'none';
                return;
            }

            let results = [];

            // [NEW] Smart matching function: Matches start of first name OR start of any word (last name)
            const matchesSearch = (name, q) => {
                const lowerName = name.toLowerCase();
                return lowerName.startsWith(q) || lowerName.includes(' ' + q);
            };

            // 1. Check SOLD Players (Read directly from the UI team boxes)
            document.querySelectorAll('.team').forEach(team => {
                const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
                team.querySelectorAll('ul li').forEach(li => {
                    const text = li.textContent;
                    const priceIndex = text.lastIndexOf(' - ');
                    if (priceIndex !== -1) {
                        const playerName = text.substring(0, priceIndex).trim();
                        // [FIX] Use the new smart match
                        if (matchesSearch(playerName, query)) {
                            const price = text.substring(priceIndex + 3).replace(' Crores', '').trim();
                            results.push({ name: playerName, status: teamName, price: `${price} Cr`, type: 'sold' });
                        }
                    }
                });
            });

            // 2. Check UNSOLD Players (Adapts based on the current round)
            for (const [setName, playerList] of Object.entries(unsoldPlayers)) {
                if (playerList) {
                    playerList.forEach(entry => {
                        const playerName = extractPlayerName(entry);
                        // [FIX] Use the new smart match
                        if (matchesSearch(playerName, query)) {
                            if (!results.some(r => r.name === playerName)) {
                                const currentBtn = document.getElementById('current-player-name');
                                
                                // Check if they are literally on the block right now
                                if (currentBtn && currentBtn.textContent === playerName) {
                                    results.push({ name: playerName, status: 'On The Block', price: 'BID NOW', type: 'current' });
                                } 
                                // If Round 2 has started, they are now "Upcoming" in orange
                                else if (isSecondRound) {
                                    results.push({ name: playerName, status: `Upcoming (${setName})`, price: '-', type: 'unsold-upcoming' });
                                } 
                                // If still in Round 1, they remain "Unsold" in red
                                else {
                                    results.push({ name: playerName, status: 'Unsold', price: '-', type: 'unsold' });
                                }
                            }
                        }
                    });
                }
            }

            // 3. Check Base UPCOMING Players (Only relevant during Round 1)
            for (const [setName, playerList] of Object.entries(players)) {
                if (playerList) {
                    playerList.forEach(entry => {
                        const playerName = extractPlayerName(entry);
                        // [FIX] Use the new smart match
                        if (matchesSearch(playerName, query)) {
                            if (!results.some(r => r.name === playerName)) {
                                const currentBtn = document.getElementById('current-player-name');
                                
                                if (currentBtn && currentBtn.textContent === playerName) {
                                    results.push({ name: playerName, status: 'On The Block', price: 'BID NOW', type: 'current' });
                                } else if (!isSecondRound) {
                                    // Only show standard blue Upcoming if we are still in Round 1
                                    results.push({ name: playerName, status: `Upcoming (${setName})`, price: '-', type: 'upcoming' });
                                }
                            }
                        }
                    });
                }
            }

            // Render Results
            if (results.length > 0) {
                dropdown.innerHTML = results.map(r => `
                    <div class="search-result-item">
                        <div class="result-name">${r.name}</div>
                        <div class="result-status">
                            <span class="status-badge ${r.type}">${r.status}</span>
                            ${r.price !== '-' ? `<span class="result-price">${r.price}</span>` : ''}
                        </div>
                    </div>
                `).join('');
                dropdown.style.display = 'block';
            } else {
                dropdown.innerHTML = `<div class="search-result-item" style="justify-content: center; color: #a0a0c0;">No players found</div>`;
                dropdown.style.display = 'block';
            }
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search-container')) {
                dropdown.style.display = 'none';
            }
        });
    }
});

/* ===== CELEBRATION ===== */
window.triggerBlockbusterCelebration = function() {
    // Safety check in case the library didn't load
    if (typeof confetti !== 'function') return;

    const duration = 1 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Fire from left side
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        
        // Fire from right side
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}
