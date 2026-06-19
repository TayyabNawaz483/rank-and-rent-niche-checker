// Application Logic for Rank & Rent Niche Evaluator

// Application State
let nichesData = [];
let supabaseClient = null;
let currentFilters = {
    keyword: '',
    state: 'all',
    niche: 'all',
    city: 'all',
    status: 'all',
    zips: null,
    maxKd: null,
    maxVolume: null,
    maxGmbReviews: null,
    maxGmbCount: null,
    minTraffic: null,
    exactDa: null,
    exactDirectory: null,
    exactRr: null,
    minPopulation: null,
    maxPopulation: null
};



const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addModal = document.getElementById('addModal');
const saveNicheBtn = document.getElementById('saveNicheBtn');
const nicheForm = document.getElementById('nicheForm');



const searchNiche = document.getElementById('searchNiche');
const filterState = document.getElementById('filterState');
const filterNiche = document.getElementById('filterNiche');
const filterCity = document.getElementById('filterCity');
const filterZips = document.getElementById('filterZips');

const toggleAdvancedFiltersBtn = document.getElementById('toggleAdvancedFiltersBtn');
const advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
const clearAdvancedFiltersBtn = document.getElementById('clearAdvancedFiltersBtn');
const filterMaxKd = document.getElementById('filterMaxKd');
const filterMaxVolume = document.getElementById('filterMaxVolume');
const filterMaxGmbReviews = document.getElementById('filterMaxGmbReviews');
const filterMaxGmbCount = document.getElementById('filterMaxGmbCount');
const filterMinTraffic = document.getElementById('filterMinTraffic');
const filterExactDa = document.getElementById('filterExactDa');
const filterExactDirectory = document.getElementById('filterExactDirectory');
const filterExactRr = document.getElementById('filterExactRr');
const filterMinPopulation = document.getElementById('filterMinPopulation');
const filterMaxPopulation = document.getElementById('filterMaxPopulation');
const statusPills = document.querySelectorAll('.status-pill[data-status]');
const nicheGrid = document.getElementById('nicheGrid');

const statTotal = document.getElementById('statTotal');
const statPassed = document.getElementById('statPassed');
const statFailed = document.getElementById('statFailed');
const statRatio = document.getElementById('statRatio');

const accordionHeader = document.getElementById('accordionHeader');
const accordionContent = document.getElementById('accordionContent');
const accordionArrow = document.getElementById('accordionArrow');

// Form Inputs for Live Eval
const nicheInput = document.getElementById('nicheInput');
const cityInput = document.getElementById('cityInput');
const stateInput = document.getElementById('stateInput');
const populationInput = document.getElementById('populationInput');
const zipsInput = document.getElementById('zipsInput');
const keywordInput = document.getElementById('keywordInput');
const kdInput = document.getElementById('kdInput');
const volumeInput = document.getElementById('volumeInput');
const daCountInput = document.getElementById('daCountInput');
const gmbReview1 = document.getElementById('gmbReview1');
const gmbReview2 = document.getElementById('gmbReview2');
const gmbReview3 = document.getElementById('gmbReview3');
const gmbCountInput = document.getElementById('gmbCountInput');
const competitorTrafficInput = document.getElementById('competitorTrafficInput');
const directoryCountInput = document.getElementById('directoryCountInput');
const rrSiteCountInput = document.getElementById('rrSiteCountInput');
const liveStatusIndicator = document.getElementById('liveStatusIndicator');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSupabase();
    loadNiches();
    setupEventListeners();
    runLiveEvaluation(); // Initial evaluation of form defaults
});

// Theme Initialization
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    // Check local storage or default to dark
    const savedTheme = localStorage.getItem('rank_rent_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('rank_rent_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'light') {
            themeIcon.className = 'fa-solid fa-moon';
        } else {
            themeIcon.className = 'fa-solid fa-sun';
        }
    }
}

// Initialize Supabase Client
function initSupabase() {
    const url = localStorage.getItem('supabase_url') || 'https://vbxxwiqkyjijqlloyhsz.supabase.co';
    const key = localStorage.getItem('supabase_key') || 'sb_publishable_CpOBGqQsKggJ7VejenxLBw_Coy6fMgS';

    if (url && key) {
        try {
            // Using window.supabase from the loaded CDN
            if (window.supabase) {
                supabaseClient = window.supabase.createClient(url, key);
            } else {
                console.error("Supabase CDN library not loaded yet.");
                fallbackToLocal();
            }
        } catch (e) {
            console.error("Error creating Supabase client:", e);
            fallbackToLocal();
        }
    } else {
        fallbackToLocal();
    }
}

function fallbackToLocal() {
    supabaseClient = null;
}

// Load Niche Records
async function loadNiches() {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            nichesData = data || [];
        } catch (e) {
            console.error("Supabase fetch failed, falling back to LocalStorage:", e);
            loadLocalNiches();
        }
    } else {
        loadLocalNiches();
    }
    renderDashboard();
}

function loadLocalNiches() {
    const local = localStorage.getItem('rank_rent_niches');
    nichesData = local ? JSON.parse(local) : getMockData();
}

function saveLocalNiches() {
    localStorage.setItem('rank_rent_niches', JSON.stringify(nichesData));
}

// Generate premium mock data if no items exist in local storage
function getMockData() {
    const mocks = [
        {
            id: 'mock-1',
            niche: 'plumbing',
            city: 'Dallas',
            state: 'TX',
            population: 1300000,
            zip_codes: 5,
            keyword: 'plumber dallas tx',
            kd: 5,
            volume: 250,
            da_count: 4,
            gmb_reviews: [25, 45, 12],
            gmb_count: 12,
            competitor_traffic: 75,
            directory_count: 2,
            has_rr_site: true,
            status: 'PASS',
            fail_reasons: [],
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 'mock-2',
            niche: 'pest control',
            city: 'Orlando',
            state: 'FL',
            population: 300000,
            zip_codes: 3,
            keyword: 'pest control orlando',
            kd: 12,
            volume: 450,
            da_count: 2,
            gmb_reviews: [120, 80, 200],
            gmb_count: 8,
            competitor_traffic: 45,
            directory_count: 0,
            has_rr_site: false,
            status: 'FAIL',
            fail_reasons: [
                'Keyword Difficulty is too high (12 > 10)',
                'Only 2 SERP sites with DA < 10 (needs at least 4)',
                'Map Pack has competitor GMBs with more than 100 reviews',
                'Too few GMB profiles in the area (8 < 10)',
                'Competitor traffic is too low (45 < 50)',
                'No existing Rank & Rent / EMD / Micro Site found in SERP'
            ],
            created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: 'mock-3',
            niche: 'towing',
            city: 'Miami',
            state: 'FL',
            population: 440000,
            zip_codes: 1,
            keyword: 'tow truck miami',
            kd: 18,
            volume: 90,
            da_count: 5,
            gmb_reviews: [12, 45, 30],
            gmb_count: 15,
            competitor_traffic: 85,
            directory_count: 1,
            has_rr_site: true,
            status: 'FAIL',
            fail_reasons: [
                'Search Volume is too low (90 < 100)'
            ],
            created_at: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    localStorage.setItem('rank_rent_niches', JSON.stringify(mocks));
    return mocks;
}

// Setup Event Listeners
function setupEventListeners() {
    // Accordion
    accordionHeader.addEventListener('click', () => {
        accordionContent.classList.toggle('open');
        accordionArrow.style.transform = accordionContent.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Modals visibility
    openAddModalBtn.addEventListener('click', () => {
        addModal.classList.add('open');
        runLiveEvaluation();
    });
    closeAddModalBtn.addEventListener('click', () => addModal.classList.remove('open'));
    cancelAddBtn.addEventListener('click', () => addModal.classList.remove('open'));



    // Filter controls
    searchNiche.addEventListener('input', (e) => {
        currentFilters.keyword = e.target.value.toLowerCase();
        renderNicheGrid();
    });

    filterState.addEventListener('change', (e) => {
        currentFilters.state = e.target.value;
        renderNicheGrid();
    });

    filterNiche.addEventListener('change', (e) => {
        currentFilters.niche = e.target.value;
        renderNicheGrid();
    });

    filterCity.addEventListener('change', (e) => {
        currentFilters.city = e.target.value;
        renderNicheGrid();
    });

    filterZips.addEventListener('input', (e) => {
        currentFilters.zips = e.target.value ? parseInt(e.target.value) : null;
        renderNicheGrid();
    });

    if (toggleAdvancedFiltersBtn) {
        toggleAdvancedFiltersBtn.addEventListener('click', () => {
            const isHidden = advancedFiltersPanel.style.display === 'none';
            advancedFiltersPanel.style.display = isHidden ? 'block' : 'none';
        });

        [filterMaxKd, filterMaxVolume, filterMaxGmbReviews, filterMaxGmbCount, filterMinTraffic, filterExactDa, filterExactDirectory, filterExactRr, filterMinPopulation, filterMaxPopulation].forEach(input => {
            if (input) {
                input.addEventListener('input', (e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    if (e.target.id === 'filterMaxKd') currentFilters.maxKd = val;
                    if (e.target.id === 'filterMaxVolume') currentFilters.maxVolume = val;
                    if (e.target.id === 'filterMaxGmbReviews') currentFilters.maxGmbReviews = val;
                    if (e.target.id === 'filterMaxGmbCount') currentFilters.maxGmbCount = val;
                    if (e.target.id === 'filterMinTraffic') currentFilters.minTraffic = val;
                    if (e.target.id === 'filterExactDa') currentFilters.exactDa = val;
                    if (e.target.id === 'filterExactDirectory') currentFilters.exactDirectory = val;
                    if (e.target.id === 'filterExactRr') currentFilters.exactRr = val;
                    if (e.target.id === 'filterMinPopulation') currentFilters.minPopulation = val;
                    if (e.target.id === 'filterMaxPopulation') currentFilters.maxPopulation = val;
                    renderNicheGrid();
                });
            }
        });



        clearAdvancedFiltersBtn.addEventListener('click', () => {
            filterMaxKd.value = '';
            filterMaxVolume.value = '';
            filterMaxGmbReviews.value = '';
            filterMaxGmbCount.value = '';
            filterMinTraffic.value = '';
            filterExactDa.value = '';
            filterExactDirectory.value = '';
            filterExactRr.value = '';
            if (filterMinPopulation) filterMinPopulation.value = '';
            if (filterMaxPopulation) filterMaxPopulation.value = '';

            currentFilters.maxKd = null;
            currentFilters.maxVolume = null;
            currentFilters.maxGmbReviews = null;
            currentFilters.maxGmbCount = null;
            currentFilters.minTraffic = null;
            currentFilters.exactDa = null;
            currentFilters.exactDirectory = null;
            currentFilters.exactRr = null;
            currentFilters.minPopulation = null;
            currentFilters.maxPopulation = null;
            renderNicheGrid();
        });
    }

    statusPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            statusPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentFilters.status = e.target.dataset.status;
            renderNicheGrid();
        });
    });

    // Suggestion Tags inside Add Form
    document.querySelectorAll('#nicheSuggestions .suggestion-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            nicheInput.value = tag.textContent;
            updateKeywordDefault();
            runLiveEvaluation();
        });
    });

    document.querySelectorAll('#citySuggestions .suggestion-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            cityInput.value = tag.textContent;
            updateKeywordDefault();
            runLiveEvaluation();
        });
    });

    stateInput.addEventListener('change', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });

    nicheInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });
    cityInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });
    stateInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });

    // Live validation listener bindings
    [
        kdInput, volumeInput, daCountInput,
        gmbReview1, gmbReview2, gmbReview3,
        gmbCountInput, competitorTrafficInput,
        directoryCountInput, rrSiteCountInput,
        stateInput, zipsInput
    ].forEach(input => {
        input.addEventListener('input', runLiveEvaluation);
        input.addEventListener('change', runLiveEvaluation);
    });

    // Save Data Click
    saveNicheBtn.addEventListener('click', handleSaveData);

    // Export CSV Actions
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportDataCSV(true));
    }
}

// Automatically helper to fill target keyword
function updateKeywordDefault() {
    const nicheVal = nicheInput.value.trim().toLowerCase();
    const cityVal = cityInput.value.trim();
    const stateVal = stateInput.value.trim().toUpperCase();
    if (nicheVal && cityVal) {
        keywordInput.value = stateVal ? `${nicheVal} ${cityVal} ${stateVal}` : `${nicheVal} ${cityVal}`;
    }
}


// Evaluates the Rank & Rent Niche Criteria
function evaluateNicheCriteria(data) {
    if (!data) data = {};
    
    // Normalize properties to support database (zip_codes, has_directory, has_rr_site) vs form (zips) vs legacy records
    const zips = data.zips !== undefined ? data.zips : (data.zip_codes !== undefined ? data.zip_codes : 0);
    const kd = data.kd !== undefined ? data.kd : 0;
    const volume = data.volume !== undefined ? data.volume : 0;
    const da_count = data.da_count !== undefined ? data.da_count : 0;
    
    let gmb_reviews = data.gmb_reviews;
    if (!Array.isArray(gmb_reviews)) {
        if (typeof gmb_reviews === 'string') {
            try {
                gmb_reviews = JSON.parse(gmb_reviews);
            } catch (e) {
                gmb_reviews = [];
            }
        } else {
            gmb_reviews = [];
        }
    }
    gmb_reviews = gmb_reviews.map(r => parseInt(r) || 0);
    while (gmb_reviews.length < 3) {
        gmb_reviews.push(0);
    }

    const gmb_count = data.gmb_count !== undefined ? data.gmb_count : 0;
    
    let directory_count = 0;
    if (data.directory_count !== undefined) {
        directory_count = parseInt(data.directory_count) || 0;
    } else if (data.has_directory !== undefined) {
        directory_count = data.has_directory ? 1 : 0;
    }
    
    const competitor_traffic = data.competitor_traffic !== undefined ? data.competitor_traffic : 0;
    
    let rr_site_count = 0;
    if (data.rr_site_count !== undefined) {
        rr_site_count = parseInt(data.rr_site_count) || 0;
    } else if (data.has_rr_site !== undefined) {
        rr_site_count = data.has_rr_site ? 1 : 0;
    }

    const rules = {
        zips: {
            pass: zips >= 2,
            text: `${zips} City Zip Codes (min 2 required)`
        },
        kd: {
            pass: kd <= 10,
            text: `KD is ${kd} (must be 10 or less)`
        },
        volume: {
            pass: volume >= 100,
            text: `Search Volume is ${volume} (min 100 required)`
        },
        daCount: {
            pass: da_count >= 4,
            text: `${da_count} sites with DA < 10 (min 4 required)`
        },
        gmbReviews: {
            pass: gmb_reviews.every(reviews => reviews <= 100),
            text: `GMB map reviews: [${gmb_reviews.join(', ')}] (all must be <= 100)`
        },
        gmbCount: {
            pass: gmb_count >= 10,
            text: `${gmb_count} GMB profiles in area (min 10 required)`
        },
        directory: {
            pass: directory_count >= 1,
            text: `Directory ranks in SERP: ${directory_count} (min 1 required)`
        },
        traffic: {
            pass: competitor_traffic >= 50,
            text: `Competitor Traffic: ${competitor_traffic} (min 50 required)`
        },
        rrSite: {
            pass: rr_site_count >= 1,
            text: `Existing R&R/EMD/Micro site available in SERP: ${rr_site_count} (min 1 required)`
        }
    };

    const failReasons = [];
    if (!rules.zips.pass) failReasons.push(`City must have at least 2 zip codes (has ${zips})`);
    if (!rules.kd.pass) failReasons.push(`Keyword Difficulty is too high (${kd} > 10)`);
    if (!rules.volume.pass) failReasons.push(`Search Volume is too low (${volume} < 100)`);
    if (!rules.daCount.pass) failReasons.push(`Only ${da_count} SERP sites with DA < 10 (needs at least 4)`);
    if (!rules.gmbReviews.pass) failReasons.push(`Map Pack has competitor GMBs with more than 100 reviews`);
    if (!rules.gmbCount.pass) failReasons.push(`Too few GMB profiles in the area (${gmb_count} < 10)`);
    if (!rules.directory.pass) failReasons.push(`No major business directory rankings found in SERP (${directory_count} < 1)`);
    if (!rules.traffic.pass) failReasons.push(`Competitor traffic is too low (${competitor_traffic} < 50)`);
    if (!rules.rrSite.pass) failReasons.push(`No existing Rank & Rent / EMD / Micro Site found in SERP (${rr_site_count} < 1)`);

    const status = failReasons.length === 0 ? 'PASS' : 'FAIL';

    return {
        status,
        rules,
        failReasons
    };
}

// Live Validation UI Renderer
function runLiveEvaluation() {
    const isFormEmpty = !nicheInput.value.trim() &&
        !cityInput.value.trim() &&
        !stateInput.value.trim() &&
        !populationInput.value &&
        !zipsInput.value &&
        !kdInput.value &&
        !volumeInput.value &&
        !daCountInput.value &&
        !gmbReview1.value &&
        !gmbReview2.value &&
        !gmbReview3.value &&
        !gmbCountInput.value &&
        !competitorTrafficInput.value &&
        !directoryCountInput.value &&
        !rrSiteCountInput.value;

    if (isFormEmpty) {
        liveStatusIndicator.className = 'live-status-indicator pending';
        liveStatusIndicator.textContent = 'PENDING';

        const pendingRules = ['evalKd', 'evalVolume', 'evalDa', 'evalGmbReviews', 'evalGmbCount', 'evalDirectory', 'evalTraffic', 'evalRrSite', 'evalZips'];
        pendingRules.forEach(id => {
            const container = document.getElementById(id);
            const valTextEl = container.querySelector('.eval-status-val');
            const icon = container.querySelector('.eval-icon');

            container.className = 'live-eval-item';
            valTextEl.textContent = '-';
            valTextEl.className = 'eval-status-val text-muted';
            valTextEl.style.color = 'var(--text-muted)';
            icon.className = 'fa-solid fa-circle-question eval-icon pending';
        });
        return;
    }

    const isFilled = (el) => el && el.value !== "";

    const filledStates = {
        zips: isFilled(zipsInput),
        kd: isFilled(kdInput),
        volume: isFilled(volumeInput),
        daCount: isFilled(daCountInput),
        gmbReviews: isFilled(gmbReview1) && isFilled(gmbReview2) && isFilled(gmbReview3),
        gmbCount: isFilled(gmbCountInput),
        directory: isFilled(directoryCountInput),
        traffic: isFilled(competitorTrafficInput),
        rrSite: isFilled(rrSiteCountInput)
    };

    const data = {
        zips: parseInt(zipsInput.value) || 0,
        kd: parseInt(kdInput.value) || 0,
        volume: parseInt(volumeInput.value) || 0,
        da_count: parseInt(daCountInput.value) || 0,
        gmb_reviews: [
            parseInt(gmbReview1.value) || 0,
            parseInt(gmbReview2.value) || 0,
            parseInt(gmbReview3.value) || 0
        ],
        gmb_count: parseInt(gmbCountInput.value) || 0,
        competitor_traffic: parseInt(competitorTrafficInput.value) || 0,
        directory_count: parseInt(directoryCountInput.value) || 0,
        rr_site_count: parseInt(rrSiteCountInput.value) || 0
    };

    const evalResult = evaluateNicheCriteria(data);

    // Update Checklist items
    updateChecklistItem('evalZips', 'evalZipsVal', evalResult.rules.zips, filledStates.zips);
    updateChecklistItem('evalKd', 'evalKdVal', evalResult.rules.kd, filledStates.kd);
    updateChecklistItem('evalVolume', 'evalVolumeVal', evalResult.rules.volume, filledStates.volume);
    updateChecklistItem('evalDa', 'evalDaVal', evalResult.rules.daCount, filledStates.daCount);
    updateChecklistItem('evalGmbReviews', 'evalGmbReviewsVal', evalResult.rules.gmbReviews, filledStates.gmbReviews);
    updateChecklistItem('evalGmbCount', 'evalGmbCountVal', evalResult.rules.gmbCount, filledStates.gmbCount);
    updateChecklistItem('evalDirectory', 'evalDirectoryVal', evalResult.rules.directory, filledStates.directory);
    updateChecklistItem('evalTraffic', 'evalTrafficVal', evalResult.rules.traffic, filledStates.traffic);
    updateChecklistItem('evalRrSite', 'evalRrSiteVal', evalResult.rules.rrSite, filledStates.rrSite);

    // Update Overall Live Badge:
    // - If any FILLED rule is FAIL, the overall status is FAIL.
    // - If ALL rules are FILLED and PASS, the overall status is PASS.
    // - Otherwise, overall status is PENDING.
    let hasFail = false;
    let allPassed = true;

    const ruleCheckers = [
        { filled: filledStates.zips, pass: evalResult.rules.zips.pass },
        { filled: filledStates.kd, pass: evalResult.rules.kd.pass },
        { filled: filledStates.volume, pass: evalResult.rules.volume.pass },
        { filled: filledStates.daCount, pass: evalResult.rules.daCount.pass },
        { filled: filledStates.gmbReviews, pass: evalResult.rules.gmbReviews.pass },
        { filled: filledStates.gmbCount, pass: evalResult.rules.gmbCount.pass },
        { filled: filledStates.directory, pass: evalResult.rules.directory.pass },
        { filled: filledStates.traffic, pass: evalResult.rules.traffic.pass },
        { filled: filledStates.rrSite, pass: evalResult.rules.rrSite.pass }
    ];

    ruleCheckers.forEach(checker => {
        if (checker.filled) {
            if (!checker.pass) {
                hasFail = true;
            }
        } else {
            allPassed = false;
        }
    });

    if (hasFail) {
        liveStatusIndicator.className = 'live-status-indicator fail';
        liveStatusIndicator.textContent = 'FAIL';
    } else if (allPassed) {
        liveStatusIndicator.className = 'live-status-indicator pass';
        liveStatusIndicator.textContent = 'PASS';
    } else {
        liveStatusIndicator.className = 'live-status-indicator pending';
        liveStatusIndicator.textContent = 'PENDING';
    }
}

function updateChecklistItem(itemId, valId, rule, isFilled) {
    const container = document.getElementById(itemId);
    const valTextEl = document.getElementById(valId);
    const icon = container.querySelector('.eval-icon');

    if (!isFilled) {
        container.className = 'live-eval-item';
        valTextEl.textContent = '-';
        valTextEl.className = 'eval-status-val text-muted';
        valTextEl.style.color = 'var(--text-muted)';
        icon.className = 'fa-solid fa-circle-question eval-icon pending';
        return;
    }

    valTextEl.textContent = rule.pass ? 'PASS' : 'FAIL';
    valTextEl.className = rule.pass ? 'eval-status-val text-success' : 'eval-status-val text-danger';

    if (rule.pass) {
        container.className = 'live-eval-item pass';
        icon.className = 'fa-solid fa-circle-check eval-icon pass';
        valTextEl.style.color = 'var(--success)';
    } else {
        container.className = 'live-eval-item fail';
        icon.className = 'fa-solid fa-circle-xmark eval-icon fail';
        valTextEl.style.color = 'var(--danger)';
    }
}

// Handle Form Submission Save Data
async function handleSaveData(e) {
    e.preventDefault();

    if (!nicheForm.checkValidity()) {
        nicheForm.reportValidity();
        return;
    }

    const niche = nicheInput.value.trim();
    const city = cityInput.value.trim();
    const state = stateInput.value.trim().toUpperCase();
    const population = parseInt(populationInput.value) || null;
    const zips = parseInt(zipsInput.value) || 0;
    const keyword = keywordInput.value.trim();
    const kd = parseInt(kdInput.value) || 0;
    const volume = parseInt(volumeInput.value) || 0;
    const da_count = parseInt(daCountInput.value) || 0;
    const gmb_reviews = [
        parseInt(gmbReview1.value) || 0,
        parseInt(gmbReview2.value) || 0,
        parseInt(gmbReview3.value) || 0
    ];
    const gmb_count = parseInt(gmbCountInput.value) || 0;
    const competitor_traffic = parseInt(competitorTrafficInput.value) || 0;
    const directory_count = parseInt(directoryCountInput.value) || 0;
    const rr_site_count = parseInt(rrSiteCountInput.value) || 0;

    // Duplicate Check
    const isDuplicate = nichesData.some(n => n.keyword.toLowerCase() === keyword.toLowerCase());
    if (isDuplicate) {
        showToast(`A niche with the keyword "${keyword}" already exists!`, "error");
        return;
    }

    const evaluation = evaluateNicheCriteria({
        kd, volume, da_count, gmb_reviews, gmb_count, competitor_traffic, directory_count, rr_site_count, zips
    });

    const newNiche = {
        niche,
        city,
        state,
        population,
        zip_codes: zips,
        keyword,
        kd,
        volume,
        da_count,
        gmb_reviews,
        gmb_count,
        competitor_traffic,
        directory_count,
        rr_site_count,
        status: evaluation.status,
        fail_reasons: evaluation.failReasons
    };

    saveNicheBtn.disabled = true;
    saveNicheBtn.textContent = 'Saving...';

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .insert([newNiche])
                .select();

            if (error) throw error;
            if (data && data[0]) {
                nichesData.unshift(data[0]);
            } else {
                // If select fails or returns empty, fetch again
                await loadNiches();
            }
        } catch (error) {
            console.error("Supabase insert error, saving to LocalStorage fallback:", error);
            newNiche.id = 'local-' + Date.now();
            newNiche.created_at = new Date().toISOString();
            nichesData.unshift(newNiche);
            saveLocalNiches();
        }
    } else {
        newNiche.id = 'local-' + Date.now();
        newNiche.created_at = new Date().toISOString();
        nichesData.unshift(newNiche);
        saveLocalNiches();
    }

    saveNicheBtn.disabled = false;
    saveNicheBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Niche Data';

    // Close Modal & Reset Form
    addModal.classList.remove('open');
    nicheForm.reset();
    updateKeywordDefault();

    renderDashboard();
}

// // Simple Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'var(--success)' : 'var(--danger)';
    
    toast.style.cssText = `
        background: ${bg};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Delete Data Row
async function deleteNiche(id) {
    const confirmedData = await new Promise((resolve) => {
        const modal = document.getElementById('deleteModal');
        if (!modal) {
            resolve({ confirmed: confirm('Are you sure you want to delete this niche evaluation?') });
            return;
        }
        
        const msgEl = document.getElementById('deleteModalMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        
        msgEl.textContent = 'Are you sure you want to delete this niche evaluation?';
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Delete';
        
        // Toggle the active class first
        modal.classList.add('active');
        
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('width', '100vw', 'important');
        modal.style.setProperty('height', '100vh', 'important');
        modal.style.setProperty('background', 'rgba(15, 23, 42, 0.85)', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('align-items', 'center', 'important');
        modal.style.setProperty('justify-content', 'center', 'important');
        
        const cleanup = () => {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('pointer-events');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        
        const onConfirm = () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
            resolve({ confirmed: true, cleanup });
        };
        const onCancel = () => { cleanup(); resolve({ confirmed: false }); };
        
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });

    if (!confirmedData.confirmed) return;

    if (supabaseClient && (!id || !id.toString().startsWith('local-'))) {
        try {
            const { error } = await supabaseClient
                .from('niches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            nichesData = nichesData.filter(item => item.id !== id);
            saveLocalNiches(); // keep local cache in sync
            showToast("Evaluation deleted successfully!");
        } catch (error) {
            console.error("Failed to delete from Supabase:", error);
            showToast("Failed remote delete. Deleted locally instead.", "error");
            nichesData = nichesData.filter(item => item.id !== id);
            saveLocalNiches(); // actually persist the fallback delete
        }
    } else {
        nichesData = nichesData.filter(item => item.id !== id);
        saveLocalNiches();
        showToast("Evaluation deleted locally!");
    }
    if (confirmedData.cleanup) confirmedData.cleanup();
    renderDashboard();
}

// Generate Dummy Niches based on current filters and save directly to Database
window.generateDummyNiches = async function() {
    const dummyNames = ['Plumbing', 'Roofing', 'Pest Control', 'HVAC', 'Tree Service', 'Landscaping', 'Tow Truck', 'Electrician'];
    const dummyCities = ['Austin', 'Denver', 'Mesa', 'Tampa', 'Raleigh', 'Tulsa', 'Omaha', 'Fresno'];
    const dummyStates = ['TX', 'CO', 'AZ', 'FL', 'NC', 'OK', 'NE', 'CA'];
    
    let generated = [];
    for(let i=0; i<5; i++) {
        const randIdx = Math.floor(Math.random() * dummyNames.length);
        const nName = currentFilters.niche !== 'all' ? currentFilters.niche : dummyNames[randIdx];
        const cCity = currentFilters.city !== 'all' ? currentFilters.city : dummyCities[randIdx];
        const sState = currentFilters.state !== 'all' ? currentFilters.state : dummyStates[randIdx];
        
        let key = currentFilters.keyword || `${nName} ${cCity} ${sState}`.toLowerCase();
        // Add random suffix to prevent duplicate keyword clashes during batch generation
        key = key + " " + Math.floor(Math.random() * 1000);
        
        const kd = currentFilters.maxKd !== null ? Math.floor(Math.random() * currentFilters.maxKd) : Math.floor(Math.random() * 20);
        const volume = currentFilters.maxVolume !== null ? Math.floor(Math.random() * currentFilters.maxVolume) : Math.floor(Math.random() * 1000) + 50;
        const da = currentFilters.exactDa !== null ? currentFilters.exactDa : Math.floor(Math.random() * 8);
        const revs = [Math.floor(Math.random()*150), Math.floor(Math.random()*150), Math.floor(Math.random()*150)];
        const gcount = currentFilters.maxGmbCount !== null ? Math.floor(Math.random() * currentFilters.maxGmbCount) : Math.floor(Math.random() * 20) + 5;
        const traffic = currentFilters.minTraffic !== null ? currentFilters.minTraffic + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 200);
        const dirCount = currentFilters.exactDirectory !== null ? currentFilters.exactDirectory : Math.floor(Math.random() * 3);
        const rrSite = currentFilters.exactRr !== null ? currentFilters.exactRr : Math.floor(Math.random() * 2);
        const pop = 50000 + Math.floor(Math.random() * 500000);
        const zips = currentFilters.zips !== null ? currentFilters.zips : Math.floor(Math.random() * 10) + 1;

        const evalResult = evaluateNicheCriteria({
            kd, volume, da_count: da, gmb_reviews: revs, gmb_count: gcount, 
            competitor_traffic: traffic, directory_count: dirCount, rr_site_count: rrSite, zips
        });
        
        generated.push({
            niche: nName,
            city: cCity,
            state: sState,
            population: pop,
            zip_codes: zips,
            keyword: key,
            kd,
            volume,
            da_count: da,
            gmb_reviews: revs,
            gmb_count: gcount,
            competitor_traffic: traffic,
            directory_count: dirCount,
            rr_site_count: rrSite,
            status: evalResult.status,
            fail_reasons: evalResult.failReasons
        });
    }

    if (supabaseClient) {
        showToast("Generating and saving dummy data to database...", "success");
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .insert(generated)
                .select();
            if (error) throw error;
            if (data) {
                nichesData = [...data, ...nichesData];
            } else {
                await loadNiches();
            }
            showToast("Dummy data saved successfully to database!", "success");
        } catch (e) {
            console.error("Supabase insert error:", e);
            showToast("Failed to save dummy data to database. Saving locally.", "error");
            // Fallback
            generated.forEach(g => {
                g.id = 'local-' + Math.random().toString(36).substr(2, 9);
                g.created_at = new Date().toISOString();
            });
            nichesData = [...generated, ...nichesData];
            saveLocalNiches();
        }
    } else {
        generated.forEach(g => {
            g.id = 'local-' + Math.random().toString(36).substr(2, 9);
            g.created_at = new Date().toISOString();
        });
        nichesData = [...generated, ...nichesData];
        saveLocalNiches();
        showToast("Dummy data generated locally!", "success");
    }
    
    // Refresh the view
    if (typeof renderNicheGrid === 'function') {
        renderNicheGrid();
    } else if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
};

// Render Dashboard Data & Stats
function renderDashboard() {
    updateFilterOptions();
    renderStats();
    renderNicheGrid();
}

function updateFilterOptions() {
    const states = new Set();
    const niches = new Set();
    const cities = new Set();

    nichesData.forEach(item => {
        if (item.state) states.add(item.state.trim().toUpperCase());
        if (item.niche) niches.add(item.niche.trim().toLowerCase());
        if (item.city) cities.add(item.city.trim());
    });

    // Capture currently selected value to preserve selection if possible
    const selectedState = filterState.value || 'all';
    const selectedNiche = filterNiche.value || 'all';
    const selectedCity = filterCity.value || 'all';



    // Repopulate Niche Select
    filterNiche.innerHTML = '<option value="all">All Niches</option>';
    Array.from(niches).sort().forEach(niche => {
        const option = document.createElement('option');
        option.value = niche.toLowerCase();
        option.textContent = niche.charAt(0).toUpperCase() + niche.slice(1);
        if (niche.toLowerCase() === selectedNiche.toLowerCase()) option.selected = true;
        filterNiche.appendChild(option);
    });

    // Repopulate City Select
    filterCity.innerHTML = '<option value="all">All Cities</option>';
    Array.from(cities).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city.toLowerCase();
        option.textContent = city;
        if (city.toLowerCase() === selectedCity.toLowerCase()) option.selected = true;
        filterCity.appendChild(option);
    });
}

function renderStats() {
    const total = nichesData.length;
    const passed = nichesData.filter(item => item.status === 'PASS').length;
    const failed = total - passed;
    const ratio = total > 0 ? Math.round((passed / total) * 100) : 0;

    statTotal.textContent = total;
    statPassed.textContent = passed;
    statFailed.textContent = failed;
    statRatio.textContent = `${ratio}%`;
}

function renderNicheGrid() {
    nicheGrid.innerHTML = '';

    const filtered = nichesData.filter(item => {
        const matchesSearch = !currentFilters.keyword ||
            item.niche.toLowerCase().includes(currentFilters.keyword) ||
            item.city.toLowerCase().includes(currentFilters.keyword) ||
            item.keyword.toLowerCase().includes(currentFilters.keyword) ||
            (item.state && item.state.toLowerCase().includes(currentFilters.keyword));

        const matchesState = currentFilters.state === 'all' ||
            (item.state && item.state.toLowerCase() === currentFilters.state.toLowerCase());

        const matchesNiche = currentFilters.niche === 'all' ||
            item.niche.toLowerCase() === currentFilters.niche.toLowerCase();

        const matchesCity = currentFilters.city === 'all' ||
            item.city.toLowerCase() === currentFilters.city.toLowerCase();

        const matchesStatus = currentFilters.status === 'all' ||
            item.status.toLowerCase() === currentFilters.status;

        const matchesZips = currentFilters.zips === null || item.zip_codes >= currentFilters.zips;

        const matchesAdvanced =
            (currentFilters.maxKd === null || item.kd <= currentFilters.maxKd) &&
            (currentFilters.maxVolume === null || item.volume <= currentFilters.maxVolume) &&
            (currentFilters.maxGmbCount === null || item.gmb_count <= currentFilters.maxGmbCount) &&
            (currentFilters.minTraffic === null || item.competitor_traffic >= currentFilters.minTraffic) &&
            (currentFilters.exactDa === null || item.da_count === currentFilters.exactDa) &&
            (currentFilters.maxGmbReviews === null || (item.gmb_reviews && item.gmb_reviews.every(r => r <= currentFilters.maxGmbReviews))) &&
            (currentFilters.exactDirectory === null || item.directory_count === currentFilters.exactDirectory) &&
            (currentFilters.exactRr === null || item.rr_site_count === currentFilters.exactRr) &&
            (currentFilters.minPopulation === null || item.population >= currentFilters.minPopulation) &&
            (currentFilters.maxPopulation === null || item.population <= currentFilters.maxPopulation);

        return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus && matchesZips && matchesAdvanced;
    });

    if (filtered.length === 0) {
        nicheGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>No Matching Niches Found</h3>
                <p>Try clearing your search filters or add a new niche evaluating record.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('article');
        card.className = 'niche-card';
        card.id = `card-${item.id}`;

        const evaluation = evaluateNicheCriteria(item);
        const passClass = item.status === 'PASS' ? 'pass' : 'fail';
        const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Compute average review or map pack review tags
        const reviewsStr = item.gmb_reviews ? item.gmb_reviews.join(', ') : '0';

        card.innerHTML = `
            <div class="niche-card-header">
                <div class="niche-card-title">
                    <span class="niche-name">${escapeHtml(item.niche)}</span>
                    <span class="niche-city">
                        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.city)}${item.state ? ', ' + escapeHtml(item.state.toUpperCase()) : ''}${item.population ? ' (Pop: ' + formatPopulation(item.population) + ')' : ''}
                    </span>
                </div>
                <span class="status-badge ${passClass}">${item.status}</span>
            </div>

            <div class="niche-stats-summary">
                <div class="niche-stat-box">
                    <div class="box-val" style="color: var(--primary);">${item.kd}</div>
                    <div class="box-lbl">Difficulty (KD)</div>
                </div>
                <div class="niche-stat-box">
                    <div class="box-val" style="color: var(--secondary);">${item.volume}</div>
                    <div class="box-lbl">Search Volume</div>
                </div>
                <div class="card-detail"><span>Comp. Traffic:</span> <strong>${item.competitor_traffic}</strong></div>
                <div class="card-detail"><span>Directories in SERP:</span> <strong>${item.directory_count}</strong></div>
                <div class="card-detail"><span>R&R Sites in SERP:</span> <strong>${item.rr_site_count}</strong></div>
            </div>

            <div class="niche-card-actions">
                <a href="details.html?id=${item.id}" class="details-toggle-btn" style="text-decoration: none;">
                    <span>View Evaluation Details</span>
                    <i class="fa-solid fa-arrow-right-long"></i>
                </a>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${dateStr}</span>
            </div>
        `;

        nicheGrid.appendChild(card);
    });
}


// Helper function to escape HTML string injection
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export data to CSV format
function exportDataCSV(filteredOnly = false) {
    let dataToExport = nichesData;

    if (filteredOnly) {
        dataToExport = nichesData.filter(item => {
            const matchesSearch = !currentFilters.keyword ||
                item.niche.toLowerCase().includes(currentFilters.keyword) ||
                item.city.toLowerCase().includes(currentFilters.keyword) ||
                item.keyword.toLowerCase().includes(currentFilters.keyword) ||
                (item.state && item.state.toLowerCase().includes(currentFilters.keyword));

            const matchesState = currentFilters.state === 'all' ||
                (item.state && item.state.toLowerCase() === currentFilters.state.toLowerCase());

            const matchesNiche = currentFilters.niche === 'all' ||
                item.niche.toLowerCase() === currentFilters.niche.toLowerCase();

            const matchesCity = currentFilters.city === 'all' ||
                item.city.toLowerCase() === currentFilters.city.toLowerCase();

            const matchesStatus = currentFilters.status === 'all' ||
                item.status.toLowerCase() === currentFilters.status;

            const matchesZips = currentFilters.zips === null || item.zip_codes >= currentFilters.zips;

            const matchesAdvanced =
                (currentFilters.maxKd === null || item.kd <= currentFilters.maxKd) &&
                (currentFilters.maxVolume === null || item.volume <= currentFilters.maxVolume) &&
                (currentFilters.maxGmbCount === null || item.gmb_count <= currentFilters.maxGmbCount) &&
                (currentFilters.minTraffic === null || item.competitor_traffic >= currentFilters.minTraffic) &&
                (currentFilters.exactDa === null || item.da_count === currentFilters.exactDa) &&
                (currentFilters.maxGmbReviews === null || (item.gmb_reviews && item.gmb_reviews.every(r => r <= currentFilters.maxGmbReviews))) &&
                (currentFilters.exactDirectory === null || item.directory_count === currentFilters.exactDirectory) &&
                (currentFilters.exactRr === null || item.rr_site_count === currentFilters.exactRr) &&
                (currentFilters.minPopulation === null || item.population >= currentFilters.minPopulation) &&
                (currentFilters.maxPopulation === null || item.population <= currentFilters.maxPopulation);

            return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus && matchesZips && matchesAdvanced;
        });
    }

    if (dataToExport.length === 0) {
        alert("No evaluations available to export.");
        return;
    }

    // CSV headers
    const headers = [
        "Status", "Niche", "City", "State", "Population", "Zip Codes", "Keyword",
        "KD", "Volume", "DA < 10 Count", "GMB Reviews", "Total GMBs",
        "Competitor Traffic", "Directory Count", "R&R Site Count", "Date Added"
    ];

    const rows = dataToExport.map(item => [
        item.status,
        `"${item.niche}"`,
        `"${item.city}"`,
        item.state || "",
        item.population || "",
        item.zip_codes || 0,
        `"${item.keyword}"`,
        item.kd,
        item.volume,
        item.da_count,
        `"${item.gmb_reviews ? item.gmb_reviews.join(', ') : ''}"`,
        item.gmb_count,
        item.competitor_traffic,
        item.directory_count || 0,
        item.rr_site_count || 0,
        new Date(item.created_at).toLocaleDateString()
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rank_rent_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// DEVELOPER SCRIPT: Generate Dummy Niches
// Run `generateDummyNiches()` in the console
// ==========================================
window.generateDummyNiches = async function () {
    console.log("Generating dummy data according to current filters...", currentFilters);
    
    const nichesList = ['Plumbing', 'Roofing', 'Pest Control', 'HVAC', 'Landscaping', 'Tree Service', 'Tow Truck', 'Electrician', 'Carpet Cleaning', 'Pool Cleaning'];
    const citiesList = ['Austin', 'Denver', 'Mesa', 'Tampa', 'Raleigh', 'Tulsa', 'Omaha', 'Fresno', 'Tucson', 'Miami'];
    const statesList = ['TX', 'CO', 'AZ', 'FL', 'NC', 'OK', 'NE', 'CA', 'AZ', 'FL'];

    let successCount = 0;
    const countToGenerate = 5;

    for (let i = 0; i < countToGenerate; i++) {
        // Choose base niche, city, state
        let niche = currentFilters.niche !== 'all' ? currentFilters.niche : nichesList[Math.floor(Math.random() * nichesList.length)];
        let city = currentFilters.city !== 'all' ? currentFilters.city : citiesList[Math.floor(Math.random() * citiesList.length)];
        let state = currentFilters.state !== 'all' ? currentFilters.state.toUpperCase() : statesList[Math.floor(Math.random() * statesList.length)];

        // If search keyword is active, incorporate it
        if (currentFilters.keyword) {
            const kw = currentFilters.keyword.trim();
            if (!niche.toLowerCase().includes(kw) && !city.toLowerCase().includes(kw)) {
                if (Math.random() > 0.5) {
                    niche = kw.charAt(0).toUpperCase() + kw.slice(1);
                } else {
                    city = kw.charAt(0).toUpperCase() + kw.slice(1);
                }
            }
        }

        state = state.toUpperCase();

        // Determine target status (PASS/FAIL)
        let targetStatus = currentFilters.status;
        if (targetStatus === 'all') {
            targetStatus = Math.random() > 0.4 ? 'PASS' : 'FAIL';
        } else {
            targetStatus = targetStatus.toUpperCase();
        }

        // Generate properties satisfying filter values & target status constraints
        
        // Zips (PASS: >= 2, Filter: >= currentFilters.zips)
        let zips = 5;
        let minZips = targetStatus === 'PASS' ? 2 : 0;
        if (currentFilters.zips !== null) {
            minZips = Math.max(minZips, currentFilters.zips);
        }
        zips = Math.floor(Math.random() * 5) + minZips;

        // KD (PASS: <= 10, Filter: <= currentFilters.maxKd)
        let kd = 5;
        let maxKd = targetStatus === 'PASS' ? 10 : 25;
        if (currentFilters.maxKd !== null) {
            maxKd = Math.min(maxKd, currentFilters.maxKd);
        }
        kd = Math.floor(Math.random() * (maxKd + 1));

        // Volume (PASS: >= 100, Filter: <= currentFilters.maxVolume)
        let volume = 250;
        let minVol = targetStatus === 'PASS' ? 100 : 0;
        let maxVol = 1000;
        if (currentFilters.maxVolume !== null) {
            maxVol = Math.min(maxVol, currentFilters.maxVolume);
            if (minVol > maxVol) minVol = maxVol;
        }
        volume = Math.floor(Math.random() * (maxVol - minVol + 1)) + minVol;

        // DA < 10 count (PASS: >= 4, Filter: == currentFilters.exactDa)
        let da_count = 5;
        if (currentFilters.exactDa !== null) {
            da_count = currentFilters.exactDa;
        } else {
            da_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 5) + 4 : Math.floor(Math.random() * 4);
        }

        // GMB reviews (PASS: all <= 100, Filter: all <= currentFilters.maxGmbReviews)
        let gmb_reviews = [25, 45, 12];
        let reviewsLimit = targetStatus === 'PASS' ? 100 : 250;
        if (currentFilters.maxGmbReviews !== null) {
            reviewsLimit = Math.min(reviewsLimit, currentFilters.maxGmbReviews);
        }
        if (targetStatus === 'PASS') {
            gmb_reviews = [
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * (reviewsLimit + 1))
            ];
        } else {
            gmb_reviews = [
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * 100) + 101, // force one > 100 review count to trigger FAIL status
                Math.floor(Math.random() * (reviewsLimit + 1))
            ];
        }

        // GMB Count (PASS: >= 10, Filter: <= currentFilters.maxGmbCount)
        let gmb_count = 12;
        let minGmb = targetStatus === 'PASS' ? 10 : 0;
        let maxGmb = 25;
        if (currentFilters.maxGmbCount !== null) {
            maxGmb = Math.min(maxGmb, currentFilters.maxGmbCount);
            if (minGmb > maxGmb) minGmb = maxGmb;
        }
        gmb_count = Math.floor(Math.random() * (maxGmb - minGmb + 1)) + minGmb;

        // Competitor Traffic (PASS: >= 50, Filter: >= currentFilters.minTraffic)
        let competitor_traffic = 75;
        let minTraffic = targetStatus === 'PASS' ? 50 : 0;
        if (currentFilters.minTraffic !== null) {
            minTraffic = Math.max(minTraffic, currentFilters.minTraffic);
        }
        competitor_traffic = Math.floor(Math.random() * 200) + minTraffic;

        // Directories count (PASS: >= 1, Filter: == currentFilters.exactDirectory)
        let directory_count = 2;
        if (currentFilters.exactDirectory !== null) {
            directory_count = currentFilters.exactDirectory;
        } else {
            directory_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 4) + 1 : 0;
        }

        // R&R Site count (PASS: >= 1, Filter: == currentFilters.exactRr)
        let rr_site_count = 1;
        if (currentFilters.exactRr !== null) {
            rr_site_count = currentFilters.exactRr;
        } else {
            rr_site_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 3) + 1 : 0;
        }

        // Population (Filter: between minPopulation and maxPopulation)
        let minPop = currentFilters.minPopulation !== null ? currentFilters.minPopulation : 5000;
        let maxPop = currentFilters.maxPopulation !== null ? currentFilters.maxPopulation : 1000000;
        if (minPop > maxPop) maxPop = minPop + 50000;
        let population = Math.floor(Math.random() * (maxPop - minPop + 1)) + minPop;

        const keyword = `${niche.toLowerCase()} ${city.toLowerCase()} ${state.toLowerCase()}`;

        const dummyRecord = {
            niche,
            city,
            state,
            population,
            zip_codes: zips,
            keyword,
            kd,
            volume,
            da_count,
            gmb_reviews,
            gmb_count,
            competitor_traffic,
            directory_count,
            rr_site_count
        };

        const evaluation = evaluateNicheCriteria(dummyRecord);
        const newNiche = {
            ...dummyRecord,
            status: evaluation.status,
            fail_reasons: evaluation.failReasons
        };

        if (supabaseClient) {
            try {
                const { error } = await supabaseClient.from('niches').insert([newNiche]);
                if (!error) {
                    successCount++;
                } else {
                    console.error("Supabase insert error for dummy niche:", error);
                }
            } catch (err) {
                console.error("Supabase insert exception for dummy niche:", err);
            }
        }
    }

    if (supabaseClient && successCount > 0) {
        await loadNiches();
        renderDashboard();
        console.log(`Successfully generated ${successCount} dummy niches in the database!`);
        alert(`Successfully generated ${successCount} dummy niches in the database matching current filters!`);
    } else {
        console.warn("Failed to save dummy niches to the database. Make sure your RLS policies allow insertions.");
        alert("Failed to save dummy niches to the Supabase database.\n\nReason: RLS policies might be blocking inserts, or Supabase is not initialized.\n\nPlease copy and run the SQL statements in 'seed.sql' inside your Supabase SQL Editor to populate the database and configure permissions directly.");
    }
};

// Abbreviate large numbers for UI layout
function formatPopulation(num) {
    if (!num) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num;
}

