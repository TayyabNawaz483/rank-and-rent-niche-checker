// Admin Dashboard Logic

let dbData = [];
let selectedIds = new Set();
let adminClient = null;

// Form selectors for Niche Add Modal
let openAddModalBtn, closeAddModalBtn, cancelAddBtn, addModal, saveNicheBtn, nicheForm;
let nicheInput, cityInput, stateInput, populationInput, zipsInput, keywordInput, kdInput, volumeInput, daCountInput;
let gmbReview1, gmbReview2, gmbReview3, gmbCountInput, competitorTrafficInput, directoryCountInput, rrSiteCountInput;
let liveStatusIndicator;

document.addEventListener('DOMContentLoaded', async () => {
    // Theme toggle
    const savedTheme = localStorage.getItem('rank_rent_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    document.getElementById('themeToggleBtn').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('rank_rent_theme', newTheme);
        updateThemeIcon(newTheme);
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await window.AuthService.logout();
    });

    // Enforce Authentication
    const isAuthenticated = await window.AuthService.requireAuth();
    if (!isAuthenticated) return;
    
    adminClient = window.AuthService.getClient();

    setupAdminListeners();
    await fetchAdminData();
});

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

function setupAdminListeners() {
    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        if (e.target.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                selectedIds.add(cb.value);
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
                selectedIds.delete(cb.value);
            });
        }
        updateBulkActionsBar();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
    document.getElementById('exportCsvBtn').addEventListener('click', exportAdminCSV);

    // Initialize Add Niche form selectors
    initModalSelectors();

    // Modal visibility listeners
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            addModal.classList.add('open');
            runLiveEvaluation();
        });
    }
    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', () => addModal.classList.remove('open'));
    }
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => addModal.classList.remove('open'));
    }

    // Suggestions click bindings
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

    if (stateInput) {
        stateInput.addEventListener('change', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
        stateInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }
    if (nicheInput) {
        nicheInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }
    if (cityInput) {
        cityInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }

    // Bind event triggers for live validation
    [
        kdInput, volumeInput, daCountInput,
        gmbReview1, gmbReview2, gmbReview3,
        gmbCountInput, competitorTrafficInput,
        directoryCountInput, rrSiteCountInput,
        zipsInput
    ].forEach(input => {
        if (input) {
            input.addEventListener('input', runLiveEvaluation);
            input.addEventListener('change', runLiveEvaluation);
        }
    });

    if (saveNicheBtn) {
        saveNicheBtn.addEventListener('click', handleSaveData);
    }
}

async function fetchAdminData() {
    try {
        const { data, error } = await adminClient
            .from('niches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        dbData = data || [];
        renderTable();
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--danger); padding: 2rem;">
                    Failed to load data. Please ensure your Supabase connection is valid and RLS policies allow you to read.
                    <br><br><small>${error.message || ''}</small>
                </td>
            </tr>
        `;
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (dbData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No records found in the database.
                </td>
            </tr>
        `;
        return;
    }

    dbData.forEach(item => {
        const tr = document.createElement('tr');
        const passClass = item.status === 'PASS' ? 'pass' : 'fail';
        const dateStr = new Date(item.created_at).toLocaleDateString();

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" value="${item.id}">
            </td>
            <td><span class="status-badge ${passClass}" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;">${item.status}</span></td>
            <td style="font-weight: 600;">${escapeHtml(item.niche)}</td>
            <td>${escapeHtml(item.city)}${item.state ? ', ' + escapeHtml(item.state.toUpperCase()) : ''}</td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(item.keyword)}</code></td>
            <td style="color: var(--primary); font-weight: 600;">${item.kd}</td>
            <td style="color: var(--secondary); font-weight: 600;">${item.volume}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
            <td>
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Record">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind individual checkboxes
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedIds.add(e.target.value);
            } else {
                selectedIds.delete(e.target.value);
                document.getElementById('selectAllCheckbox').checked = false;
            }
            updateBulkActionsBar();
        });
    });

    // Bind delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            handleSingleDelete(id);
        });
    });
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');
    
    count.textContent = selectedIds.size;
    if (selectedIds.size > 0) {
        bar.classList.add('active');
    } else {
        bar.classList.remove('active');
    }
}

async function handleSingleDelete(id) {
    console.log("Single delete triggered for ID:", id);
    const confirmed = await showDeleteConfirm('Are you sure you want to delete this record forever? This action cannot be undone.');
    console.log("User confirmation:", confirmed);
    if (!confirmed) return;

    try {
        const { error } = await adminClient.from('niches').delete().eq('id', id);
        if (error) throw error;
        
        dbData = dbData.filter(item => item.id != id);
        selectedIds.delete(id);
        renderTable();
        updateBulkActionsBar();
    } catch (error) {
        alert("Failed to delete record: " + error.message);
    }
}

async function handleBulkDelete() {
    const confirmed = await showDeleteConfirm(`Are you sure you want to delete ${selectedIds.size} records forever? This action cannot be undone.`, true);
    if (!confirmed) return;

    const idsToDelete = Array.from(selectedIds);
    try {
        const { error } = await adminClient.from('niches').delete().in('id', idsToDelete);
        if (error) throw error;
        
        dbData = dbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
        selectedIds.clear();
        document.getElementById('selectAllCheckbox').checked = false;
        
        renderTable();
        updateBulkActionsBar();
    } catch (error) {
        alert("Failed to bulk delete records: " + error.message);
    }
}

// Helper: Custom Delete Confirm Modal
function showDeleteConfirm(message, requiresWrittenConfirmation = false) {
    console.log("showDeleteConfirm called with:", message, "requiresWrittenConfirmation:", requiresWrittenConfirmation);
    return new Promise((resolve) => {
        const modal = document.getElementById('deleteModal');
        console.log("Modal found?", !!modal);
        if (!modal) {
            console.error("Modal not found in DOM!");
            resolve(confirm(message));
            return;
        }
        const msgEl = document.getElementById('deleteModalMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        
        const inputContainer = document.getElementById('deleteModalConfirmInputContainer');
        const confirmInput = document.getElementById('deleteConfirmInput');
        
        msgEl.textContent = message;
        
        // Reset confirmation input logic
        if (requiresWrittenConfirmation && inputContainer && confirmInput) {
            inputContainer.style.display = 'block';
            confirmInput.value = '';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            
            const handleInput = () => {
                const isMatch = confirmInput.value.trim().toUpperCase() === 'DELETE';
                confirmBtn.disabled = !isMatch;
                if (isMatch) {
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.cursor = 'pointer';
                } else {
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                }
            };
            
            confirmInput.addEventListener('input', handleInput);
            confirmInput._handleInput = handleInput; // store reference for cleanup
            
            // Focus on input
            setTimeout(() => confirmInput.focus(), 100);
        } else {
            if (inputContainer) inputContainer.style.display = 'none';
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        }
        
        // Toggle the active class first
        modal.classList.add('active');
        
        // Apply EVERY required CSS rule directly to bypass styles.css caching completely
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
            if (confirmInput && confirmInput._handleInput) {
                confirmInput.removeEventListener('input', confirmInput._handleInput);
                delete confirmInput._handleInput;
            }
            if (inputContainer) inputContainer.style.display = 'none';
            
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('pointer-events');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        
        const onConfirm = () => { console.log("CONFIRM CLICKED"); cleanup(); resolve(true); };
        const onCancel = () => { console.log("CANCEL CLICKED"); cleanup(); resolve(false); };
        
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}


function exportAdminCSV() {
    if (dbData.length === 0) {
        alert("No records to export.");
        return;
    }

    const headers = [
        "Status", "Niche", "City", "State", "Population", "Zip Codes", "Keyword", 
        "KD", "Volume", "DA < 10 Count", "GMB Reviews", "Total GMBs", 
        "Competitor Traffic", "Directory Count", "R&R Site Count", "Date Added"
    ];

    const rows = dbData.map(item => [
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
        item.directory_count !== undefined ? item.directory_count : (item.has_directory ? 1 : 0),
        item.rr_site_count !== undefined ? item.rr_site_count : (item.has_rr_site ? 1 : 0),
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
    link.setAttribute("download", `admin_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Modal inputs initialization
function initModalSelectors() {
    openAddModalBtn = document.getElementById('openAddModalBtn');
    closeAddModalBtn = document.getElementById('closeAddModalBtn');
    cancelAddBtn = document.getElementById('cancelAddBtn');
    addModal = document.getElementById('addModal');
    saveNicheBtn = document.getElementById('saveNicheBtn');
    nicheForm = document.getElementById('nicheForm');

    nicheInput = document.getElementById('nicheInput');
    cityInput = document.getElementById('cityInput');
    stateInput = document.getElementById('stateInput');
    populationInput = document.getElementById('populationInput');
    zipsInput = document.getElementById('zipsInput');
    keywordInput = document.getElementById('keywordInput');
    kdInput = document.getElementById('kdInput');
    volumeInput = document.getElementById('volumeInput');
    daCountInput = document.getElementById('daCountInput');
    gmbReview1 = document.getElementById('gmbReview1');
    gmbReview2 = document.getElementById('gmbReview2');
    gmbReview3 = document.getElementById('gmbReview3');
    gmbCountInput = document.getElementById('gmbCountInput');
    competitorTrafficInput = document.getElementById('competitorTrafficInput');
    directoryCountInput = document.getElementById('directoryCountInput');
    rrSiteCountInput = document.getElementById('rrSiteCountInput');
    liveStatusIndicator = document.getElementById('liveStatusIndicator');
}

// Automatic target keyword generator helper
function updateKeywordDefault() {
    if (!nicheInput || !cityInput || !stateInput || !keywordInput) return;
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
    if (!nicheInput) return;
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

    // Update Overall Live Badge
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

    // Duplicate Check against local dbData
    const isDuplicate = dbData.some(n => n.keyword.toLowerCase() === keyword.toLowerCase());
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

    try {
        const { error } = await adminClient
            .from('niches')
            .insert([newNiche]);

        if (error) throw error;
        showToast("Niche saved and evaluated successfully!");

        // Close Modal & Reset Form
        addModal.classList.remove('open');
        nicheForm.reset();
        updateKeywordDefault();

        // Refresh admin grid data
        await fetchAdminData();
    } catch (err) {
        console.error("Failed to insert record:", err);
        showToast("Failed to save evaluation to remote database.", "error");
    } finally {
        saveNicheBtn.disabled = false;
        saveNicheBtn.textContent = 'Save & Evaluate';
    }
}

// Simple Custom Toast Notification
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
