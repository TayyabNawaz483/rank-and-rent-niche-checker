/**
 * Funnel Pipeline — Core Logic
 * 4-stage keyword research pipeline system
 */

(function () {
    'use strict';

    // ─── Supabase Setup ───
    const SUPABASE_URL = localStorage.getItem('supabase_url') || 'https://vbxxwiqkyjijqlloyhsz.supabase.co';
    const SUPABASE_KEY = localStorage.getItem('supabase_key') || 'sb_publishable_CpOBGqQsKggJ7VejenxLBw_Coy6fMgS';

    let supabase = null;
    let currentUserRole = 'admin'; // default to admin for now — will be set by auth
    let currentUserEmail = 'system@rankrent.com';
    let allPipelineData = [];
    let failedNichesForCheck = [];
    let passedNichesForCheck = [];

    // ─── Initialization ───
    document.addEventListener('DOMContentLoaded', async () => {
        initTheme();

        // Enforce funnel-specific login check using the auth service
        let hasSession = false;
        let session = null;
        if (window.AuthService && window.AuthService.getClient()) {
            try {
                const res = await window.AuthService.getClient().auth.getSession();
                if (res && res.data && res.data.session) {
                    session = res.data.session;
                    hasSession = true;
                }
            } catch (e) {
                console.error("Auth check failed:", e);
            }
        }

        if (!hasSession) {
            // Save current path to redirect back after login
            const intendedPath = window.location.pathname;
            if (intendedPath && intendedPath !== '/funnel-login') {
                sessionStorage.setItem('funnel_login_redirect', intendedPath);
            }
            window.location.href = '/funnel-login';
            return;
        }

        // 1. Get role & assigned stage
        const user = session.user;
        currentUserEmail = user.email || 'system@rankrent.com';
        const userRole = window.AuthService.getUserRole(user);
        
        let assignedStage = null;
        if (userRole === 'stage_1') assignedStage = 1;
        else if (userRole === 'stage_2') assignedStage = 2;
        else if (userRole === 'stage_3') assignedStage = 3;
        else if (userRole === 'stage_4') assignedStage = 4;
        else if (userRole === 'stage_5') assignedStage = 5;
        else if (userRole === 'admin') assignedStage = 'admin';
 
        // 2. Get requested stage from URL path
        const path = window.location.pathname;
        let requestedStage = null;
        if (path.includes('/stage1') || path.endsWith('stage1')) requestedStage = 1;
        else if (path.includes('/stage2') || path.endsWith('stage2')) requestedStage = 2;
        else if (path.includes('/stage3') || path.endsWith('stage3')) requestedStage = 3;
        else if (path.includes('/stage4') || path.endsWith('stage4')) requestedStage = 4;
        else if (path.includes('/stage5') || path.endsWith('stage5')) requestedStage = 5;
 
        // 3. Verify access and redirect if necessary
        if (assignedStage !== 'admin') {
            // Workers cannot access main /funnel page or wrong stage page
            if (requestedStage === null || requestedStage !== assignedStage) {
                window.location.replace('/stage' + assignedStage);
                return;
            }
        }
 
        initSupabase();
 
        // 4. Update Navbar User Profile Badge
        const emailSpan = document.getElementById('userBadgeEmail');
        const roleSpan = document.getElementById('userBadgeRole');
        const badgeContainer = document.getElementById('userBadgeContainer');
        if (emailSpan && roleSpan && badgeContainer) {
            emailSpan.textContent = user.email;
            if (assignedStage === 'admin') {
                roleSpan.textContent = 'Admin';
                roleSpan.style.background = 'var(--primary)';
                roleSpan.style.borderColor = 'transparent';
                roleSpan.style.color = 'white';
 
                const adminDashboardBtn = document.getElementById('adminDashboardBtn');
                if (adminDashboardBtn) adminDashboardBtn.style.display = 'inline-block';
            } else {
                roleSpan.textContent = `Stage ${assignedStage}`;
                let stageColor = 'var(--stage-1)';
                if (assignedStage === 2) stageColor = 'var(--stage-2)';
                else if (assignedStage === 3) stageColor = 'var(--stage-3)';
                else if (assignedStage === 4) stageColor = 'var(--stage-4)';
                else if (assignedStage === 5) stageColor = 'var(--stage-5)';
                roleSpan.style.background = stageColor;
                roleSpan.style.borderColor = 'transparent';
                roleSpan.style.color = 'black';
            }
            badgeContainer.style.display = 'flex';
        }
 
        // 5. Apply DOM Isolation and layout updates
        if (assignedStage !== 'admin') {
            // Remove other stage panels and tabs
            for (let i = 1; i <= 5; i++) {
                if (i !== assignedStage) {
                    const p = document.getElementById(`panel${i}`);
                    if (p) p.remove();
                    const t = document.querySelector(`.funnel-tab[data-stage="${i}"]`);
                    if (t) t.remove();
                }
            }
 
            // Hide overall tabs bar and pipeline bar
            const tabsBar = document.getElementById('funnelTabs');
            if (tabsBar) tabsBar.style.display = 'none';
            const pipelineBar = document.getElementById('pipelineBar');
            if (pipelineBar) pipelineBar.style.display = 'none';
 
            // Show worker header banner
            const banner = document.getElementById('workerHeaderBanner');
            const icon = document.getElementById('workerHeaderIcon');
            const title = document.getElementById('workerHeaderTitle');
            const subtitle = document.getElementById('workerHeaderSubtitle');
            const meta = document.getElementById('workerHeaderMeta');
 
            if (banner && icon && title && subtitle && meta) {
                let color = 'var(--stage-1)';
                let titleText = 'Stage 1 — Keywords Generator';
                let subText = 'Paste new keywords and auto-detect niches for the pipeline.';
                
                if (assignedStage === 2) {
                    color = 'var(--stage-2)';
                    titleText = 'Stage 2 — Keyword Difficulty (KD) Check';
                    subText = 'Check KD in Moz (target ≤ 10) and submit passing keywords.';
                } else if (assignedStage === 3) {
                    color = 'var(--stage-3)';
                    titleText = 'Stage 3 — Google Maps/GMB Check';
                    subText = 'Verify city GMB density (10-15+) and reviews (top 3 ≤ 100).';
                } else if (assignedStage === 4) {
                    color = 'var(--stage-4)';
                    titleText = 'Stage 4 — DA & Traffic Check';
                    subText = 'Check for low DA sites (DA < 10 ≥ 4) and traffic distribution.';
                } else if (assignedStage === 5) {
                    color = 'var(--stage-5)';
                    titleText = 'Stage 5 — Directories & R&R Check';
                    subText = 'Check directories and Rank & Rent sites presence.';
                }
 
                icon.style.background = color;
                icon.textContent = assignedStage;
                title.textContent = titleText;
                subtitle.textContent = subText;
                meta.textContent = 'Worker Session';
                banner.style.display = 'flex';
            }
 
            // Ensure our assigned panel is active
            const activePanel = document.getElementById(`panel${assignedStage}`);
            if (activePanel) {
                activePanel.classList.add('active');
            }
        } else {
            // Admin can see requested stage, default to 1 if none
            initTabs();
            const startStage = requestedStage || 1;
            activateTab(startStage);
        }
 
        initStage1();
        initStage2();
        initStage3();
        initStage4();
        initStage5();
        await loadAllPipelineData();
        await loadFailedNichesForDuplicateCheck();
        await loadPassedNichesForDuplicateCheck();
    });

    // ─── Supabase Init ───
    function initSupabase() {
        try {
            if (window.AuthService && window.AuthService.getClient()) {
                supabase = window.AuthService.getClient();
            } else if (window.supabase && window.supabase.createClient) {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            }
        } catch (e) {
            console.warn('Supabase init failed, using localStorage fallback:', e);
        }
    }

    // ─── Theme ───
    function initTheme() {
        const savedTheme = localStorage.getItem('rank_rent_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('rank_rent_theme', next);
                updateThemeIcon(next);
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (window.AuthService && window.AuthService.getClient()) {
                    await window.AuthService.getClient().auth.signOut();
                }
                window.location.href = '/funnel-login';
            });
        }
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    }

    // ─── Tab System ───
    function initTabs() {
        const tabs = document.querySelectorAll('.funnel-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const stage = tab.dataset.stage;
                activateTab(stage);
            });
        });
    }

    function activateTab(stage) {
        // Update tabs
        document.querySelectorAll('.funnel-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.funnel-tab[data-stage="${stage}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Update panels
        document.querySelectorAll('.funnel-panel').forEach(p => {
            p.classList.remove('active');
            p.style.animation = 'none';
        });
        const activePanel = document.getElementById(`panel${stage}`);
        if (activePanel) {
            activePanel.classList.add('active');
            // Re-trigger animation
            void activePanel.offsetWidth;
            activePanel.style.animation = '';
        }
    }

    // ─── Data Layer (localStorage fallback) ───
    function getPipelineData() {
        try {
            return JSON.parse(localStorage.getItem('funnel_pipeline_data') || '[]');
        } catch { return []; }
    }

    function savePipelineData(data) {
        localStorage.setItem('funnel_pipeline_data', JSON.stringify(data));
        allPipelineData = data;
    }

    async function loadAllPipelineData() {
        // Try Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('pipeline_keywords')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // Merge Supabase data with local data to prevent losing local-only edits/adds
                    const localData = getPipelineData();
                    const dbIds = new Set(data.map(r => r.id));
                    const localOnly = localData.filter(r => !dbIds.has(r.id));
                    
                    allPipelineData = [...data, ...localOnly];
                    savePipelineData(allPipelineData);
                    await loadFailedNichesForDuplicateCheck();
                    updateAllViews();
                    return;
                }
            } catch (e) {
                console.warn('Supabase fetch failed, using localStorage:', e);
            }
        }

        // Fallback to localStorage
        allPipelineData = getPipelineData();
        await loadFailedNichesForDuplicateCheck();
        updateAllViews();
    }

    async function loadFailedNichesForDuplicateCheck() {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('failed_niches')
                    .select('*');
                if (!error && data) {
                    failedNichesForCheck = data || [];
                    return;
                }
            } catch (e) {
                console.warn('Supabase failed niches fetch failed for check, using localStorage:', e);
            }
        }
        try {
            const local = localStorage.getItem('rank_rent_failed_niches');
            failedNichesForCheck = local ? JSON.parse(local) : [];
        } catch {
            failedNichesForCheck = [];
        }
    }

    async function loadPassedNichesForDuplicateCheck() {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('niches')
                    .select('keyword, state');
                if (!error && data) {
                    passedNichesForCheck = data || [];
                    return;
                }
            } catch (e) {
                console.warn('Supabase niches fetch failed for check, using localStorage:', e);
            }
        }
        try {
            const local = localStorage.getItem('rank_rent_niches');
            passedNichesForCheck = local ? JSON.parse(local) : [];
        } catch {
            passedNichesForCheck = [];
        }
    }

    async function insertPipelineRows(rows) {
        // Save to localStorage
        const existing = getPipelineData();
        const updated = [...rows, ...existing];
        savePipelineData(updated);

        // Try Supabase
        if (supabase) {
            try {
                const { error } = await supabase.from('pipeline_keywords').insert(rows);
                if (error) {
                    console.error('Supabase insert failed:', error);
                    showToast('Database insert failed: ' + error.message, 'error');
                }
            } catch (e) {
                console.warn('Supabase insert failed:', e);
            }
        }

        allPipelineData = updated;
    }

    async function updatePipelineRows(batchId, updates) {
        // Update localStorage
        const data = getPipelineData();
        data.forEach(row => {
            if (row.batch_id === batchId) {
                Object.assign(row, updates);
            }
        });
        savePipelineData(data);

        // Try Supabase
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('pipeline_keywords')
                    .update(updates)
                    .eq('batch_id', batchId);
                if (error) {
                    console.error('Supabase update failed:', error);
                    showToast('Database update failed: ' + error.message, 'error');
                }
            } catch (e) {
                console.warn('Supabase update failed:', e);
            }
        }

        allPipelineData = data;
    }

    // ─── Update All Views ───
    function updateAllViews() {
        updatePipelineStats();
        updateStage1History();
        updateStageView(2);
        updateStageView(3);
        updateStageView(4);
        updateStageView(5);
    }

    function updatePipelineStats() {
        for (let s = 1; s <= 5; s++) {
            const pending = s === 1 ? [] : allPipelineData.filter(r => r.stage === (s - 1) && r.status === 'pending');
            const dot = document.getElementById(`pipelineDot${s}`);
            const count = document.getElementById(`pipelineCount${s}`);
            const tabCount = document.getElementById(`tabCount${s}`);
            const stageEl = dot?.closest('.pipeline-stage');

            if (dot) dot.textContent = pending.length;
            if (count) count.textContent = `${pending.length} pending`;
            if (tabCount) tabCount.textContent = pending.length;
            if (stageEl) {
                stageEl.classList.toggle('has-pending', pending.length > 0);
            }
        }
    }

    // ─── STAGE 1 LOGIC ───
    function initStage1() {
        const textarea = document.getElementById('stage1Textarea');
        if (!textarea) return;
        const submitBtn = document.getElementById('stage1SubmitBtn');
        const nicheInput = document.getElementById('stage1Niche');
        const stateSelect = document.getElementById('stage1State');

        let debounceTimer = null;
        const triggerPreview = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(parseStage1Preview, 250);
        };

        textarea.addEventListener('input', triggerPreview);

        // Re-render preview when state or niche changes
        stateSelect.addEventListener('change', triggerPreview);
        nicheInput.addEventListener('input', triggerPreview);

        submitBtn.addEventListener('click', () => {
            submitStage1();
        });
    }

    function parseStage1Preview() {
        const textarea = document.getElementById('stage1Textarea');
        const raw = textarea.value.trim();
        const previewContainer = document.getElementById('stage1Preview');
        const previewBody = document.getElementById('stage1PreviewBody');
        const kwCount = document.getElementById('stage1KwCount');
        const nicheLabel = document.getElementById('stage1NicheLabel');
        const nicheInput = document.getElementById('stage1Niche');
        const submitBtn = document.getElementById('stage1SubmitBtn');

        const newKeywords = [];
        const duplicateKeywords = [];

        if (!raw) {
            previewContainer.style.display = 'none';
            submitBtn.disabled = true;
            return;
        }

        const lines = raw.split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            previewContainer.style.display = 'none';
            submitBtn.disabled = true;
            return;
        }

        // Parse each line: keyword [TAB] volume
        let parsed = lines.map(line => {
            const parts = line.split('\t');
            const keyword = parts[0].trim();
            const volume = parts.length > 1 ? parseInt(parts[parts.length - 1].trim()) : null;
            return { keyword, volume: isNaN(volume) ? null : volume };
        }).filter(p => p.keyword);

        // Remove duplicates (case-insensitive, keep first occurrence)
        const seen = new Set();
        const beforeCount = parsed.length;
        parsed = parsed.filter(p => {
            const key = p.keyword.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const dupsRemoved = beforeCount - parsed.length;
        if (dupsRemoved > 0) {
            showToast(`⚠️ ${dupsRemoved} duplicate keyword(s) removed`, 'warning');
        }

        // Auto-detect niche (common prefix) — always update on new paste
        const detectedNiche = autoDetectNiche(parsed.map(p => p.keyword));
        if (detectedNiche) {
            nicheInput.value = detectedNiche;
        }

        const niche = nicheInput.value || detectedNiche || '';
        const state = document.getElementById('stage1State').value;

        if (state) {
            const existingKeywords = new Map();
            allPipelineData.forEach(row => {
                const key = `${row.keyword.toLowerCase()}|${(row.state || '').toLowerCase()}`;
                if (!existingKeywords.has(key) || row.stage > existingKeywords.get(key).stage) {
                    existingKeywords.set(key, { stage: row.stage, status: row.status });
                }
            });

            const failedKeys = new Set(
                failedNichesForCheck.map(row => `${(row.keyword || '').toLowerCase()}|${(row.state || '').toLowerCase()}`)
            );
            const passedKeys = new Set(
                passedNichesForCheck.map(row => `${(row.keyword || '').toLowerCase()}|${(row.state || '').toLowerCase()}`)
            );

            console.log('🔍 Duplicate check — State:', state, '| Pipeline rows:', allPipelineData.length, '| Existing keys:', existingKeywords.size, '| Failed keys:', failedKeys.size, '| Passed keys:', passedKeys.size);

            parsed.forEach(p => {
                const key = `${p.keyword.toLowerCase()}|${state.toLowerCase()}`;
                const existing = existingKeywords.get(key);
                if (existing) {
                    duplicateKeywords.push({ ...p, type: 'pipeline', existingStage: existing.stage, existingStatus: existing.status });
                } else if (passedKeys.has(key)) {
                    duplicateKeywords.push({ ...p, type: 'passed' });
                } else if (failedKeys.has(key)) {
                    duplicateKeywords.push({ ...p, type: 'failed' });
                } else {
                    newKeywords.push(p);
                }
            });

            if (duplicateKeywords.length > 0) {
                showToast(`⚠️ ${duplicateKeywords.length} duplicate keyword(s) skipped`, 'warning');
            }
        } else {
            newKeywords.push(...parsed);
        }

        // Build preview table — show new keywords normally, flag duplicates
        let html = '';
        let rowNum = 0;
        const renderNewMax = 100;
        const renderDupMax = 50;

        const newToRender = newKeywords.slice(0, renderNewMax);
        newToRender.forEach(p => {
            rowNum++;
            const city = extractCity(p.keyword, niche);
            html += `<tr>
                <td style="color: var(--text-muted); font-size: 0.75rem;">${rowNum}</td>
                <td style="font-family: monospace; font-size: 0.82rem;">${escapeHtml(p.keyword)}</td>
                <td>${escapeHtml(niche)}</td>
                <td>${escapeHtml(city)}</td>
                <td>${escapeHtml(state || '—')}</td>
                <td style="font-weight: 600;">${p.volume !== null ? p.volume.toLocaleString() : '—'}</td>
            </tr>`;
        });
        if (newKeywords.length > renderNewMax) {
            html += `<tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); font-style: italic; padding: 0.6rem; background: rgba(255,255,255,0.01); border-top: 1px dashed var(--border-color);">
                    ... and ${newKeywords.length - renderNewMax} more new keywords ...
                </td>
            </tr>`;
        }

        const dupToRender = duplicateKeywords.slice(0, renderDupMax);
        dupToRender.forEach(p => {
            rowNum++;
            const city = extractCity(p.keyword, niche);
            let stageLabel = '';
            let badgeBg = '#f59e0b';
            let badgeColor = '#000';
            if (p.type === 'pipeline') {
                stageLabel = `Stage ${p.existingStage}`;
            } else if (p.type === 'passed') {
                stageLabel = 'PASSED';
                badgeBg = 'var(--stage-4, #10b981)'; // Green for success
                badgeColor = '#fff';
            } else {
                stageLabel = 'FAILED';
                badgeBg = 'var(--danger, #ef4444)';
                badgeColor = '#fff';
            }
            html += `<tr style="opacity: 0.5; text-decoration: line-through;">
                <td style="color: var(--text-muted); font-size: 0.75rem;">${rowNum}</td>
                <td style="font-family: monospace; font-size: 0.82rem;">${escapeHtml(p.keyword)}</td>
                <td>${escapeHtml(niche)}</td>
                <td>${escapeHtml(city)}</td>
                <td><span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${stageLabel}</span></td>
                <td style="font-weight: 600;">${p.volume !== null ? p.volume.toLocaleString() : '—'}</td>
            </tr>`;
        });
        if (duplicateKeywords.length > renderDupMax) {
            html += `<tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); font-style: italic; padding: 0.6rem; background: rgba(255,255,255,0.01); border-top: 1px dashed var(--border-color);">
                    ... and ${duplicateKeywords.length - renderDupMax} more skipped duplicates ...
                </td>
            </tr>`;
        }

        previewBody.innerHTML = html;
        kwCount.textContent = `${newKeywords.length} new` + (duplicateKeywords.length > 0 ? `, ${duplicateKeywords.length} skipped` : '');
        nicheLabel.textContent = niche || '—';
        previewContainer.style.display = 'block';
        submitBtn.disabled = newKeywords.length === 0;

        // Store only new keywords for submission
        window._stage1NewKeywords = newKeywords;
    }

    function splitKeywordIntoNicheAndCity(keyword) {
        const words = keyword.trim().split(/\s+/);
        if (words.length <= 1) {
            return { niche: keyword, city: '' };
        }

        const lowerWords = words.map(w => w.toLowerCase());
        
        // Common service/niche indicators - we split immediately after these if found
        const serviceIndicators = [
            'repair', 'control', 'dentist', 'dentistry', 'plumber', 'plumbing', 
            'roofing', 'roof', 'concrete', 'removal', 'towing', 'cleaning', 
            'landscaping', 'service', 'services', 'contractors', 'contractor', 
            'installation', 'care', 'electrician', 'painter', 'painting', 
            'mover', 'movers', 'hvac', 'attorney', 'lawyer', 'towing', 'tow',
            'damage', 'restoration', 'cleanup', 'detoxing'
        ];

        // 1. Check if any service indicator is present in the middle
        for (let i = 0; i < words.length - 1; i++) {
            if (serviceIndicators.includes(lowerWords[i])) {
                const niche = words.slice(0, i + 1).join(' ');
                const city = words.slice(i + 1).join(' ');
                return { niche, city };
            }
        }

        // Common multi-word city suffixes and prefixes
        const citySuffixes = ['falls', 'city', 'bay', 'rapids', 'beach', 'springs', 'valley', 'hills', 'heights', 'lake', 'junction', 'pines', 'forks', 'haven', 'wood', 'port'];
        const cityPrefixes = ['sioux', 'rapid', 'green', 'las', 'vegas', 'san', 'los', 'new', 'santa', 'grand', 'fort', 'el', 'st', 'saint', 'mount', 'port', 'lake', 'palm', 'south', 'north', 'west', 'east', 'ann', 'baton', 'corpus'];

        // 2. Check 3-word cities first
        if (words.length >= 4) {
            const last3Lower = lowerWords.slice(-3).join(' ');
            if (last3Lower === 'salt lake city' || last3Lower === 'west palm beach') {
                const niche = words.slice(0, -3).join(' ');
                const city = words.slice(-3).join(' ');
                return { niche, city };
            }
        }

        // 3. Check 2-word cities
        if (words.length >= 3) {
            const lastWord = lowerWords[words.length - 1];
            const secondLastWord = lowerWords[words.length - 2];
            if (citySuffixes.includes(lastWord) || cityPrefixes.includes(secondLastWord)) {
                const niche = words.slice(0, -2).join(' ');
                const city = words.slice(-2).join(' ');
                return { niche, city };
            }
        }

        // 4. Default fallback: take everything except the last word as niche
        const niche = words.slice(0, -1).join(' ');
        const city = words.slice(-1).join(' ');
        return { niche, city };
    }

    function autoDetectNiche(keywords) {
        if (keywords.length === 0) return '';
        if (keywords.length === 1) {
            return splitKeywordIntoNicheAndCity(keywords[0]).niche;
        }

        // Find common prefix words
        const wordArrays = keywords.map(k => k.toLowerCase().split(' '));
        const minLen = Math.min(...wordArrays.map(a => a.length));
        let commonWords = [];

        for (let i = 0; i < minLen - 1; i++) {
            const word = wordArrays[0][i];
            if (wordArrays.every(arr => arr[i] === word)) {
                commonWords.push(word);
            } else {
                break;
            }
        }

        return commonWords.join(' ');
    }

    function extractCity(keyword, niche) {
        if (!niche) {
            return splitKeywordIntoNicheAndCity(keyword).city;
        }
        const lower = keyword.toLowerCase();
        const nicheL = niche.toLowerCase();
        let city = '';
        if (lower.startsWith(nicheL)) {
            city = keyword.substring(niche.length).trim();
        } else {
            // Fallback: If keyword doesn't start with the custom niche, use the auto-splitter to find the city
            city = splitKeywordIntoNicheAndCity(keyword).city;
        }

        // Clean up service indicators at the start of the extracted city
        // E.g. "repair sioux falls" -> "sioux falls"
        if (city) {
            const serviceIndicators = [
                'repair', 'control', 'dentist', 'dentistry', 'plumber', 'plumbing', 
                'roofing', 'roof', 'concrete', 'removal', 'towing', 'cleaning', 
                'landscaping', 'service', 'services', 'contractors', 'contractor', 
                'installation', 'care', 'electrician', 'painter', 'painting', 
                'mover', 'movers', 'hvac', 'attorney', 'lawyer', 'towing', 'tow',
                'damage', 'restoration', 'cleanup', 'detoxing'
            ];
            let cityWords = city.trim().split(/\s+/);
            while (cityWords.length > 1 && serviceIndicators.includes(cityWords[0].toLowerCase())) {
                cityWords.shift();
            }
            city = cityWords.join(' ');
        }
        return city;
    }

    async function submitStage1() {
        const textarea = document.getElementById('stage1Textarea');
        const nicheInput = document.getElementById('stage1Niche');
        const stateSelect = document.getElementById('stage1State');
        const submitBtn = document.getElementById('stage1SubmitBtn');

        const niche = nicheInput.value.trim();
        const state = stateSelect.value;

        if (!niche) {
            showToast('Please enter a niche name', 'error');
            return;
        }

        // Use pre-filtered keywords from preview (duplicates already removed)
        const newKeywords = window._stage1NewKeywords;
        if (!newKeywords || newKeywords.length === 0) {
            showToast('No new keywords to submit', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        // Split keywords: volume >= 50 (or null) pass, volume < 50 fail
        const passingKeywords = newKeywords.filter(p => p.volume === null || p.volume === undefined || p.volume >= 50);
        const failedKeywords = newKeywords.filter(p => p.volume !== null && p.volume !== undefined && p.volume < 50);

        const batchId = generateId();
        const now = new Date().toISOString();

        // Insert passing keywords into pipeline
        if (passingKeywords.length > 0) {
            const rows = passingKeywords.map(p => {
                const city = extractCity(p.keyword, niche);
                return {
                    id: generateId(),
                    keyword: p.keyword,
                    niche: niche,
                    city: city,
                    state: state || null,
                    volume: p.volume,
                    stage: 1,
                    batch_id: batchId,
                    batch_label: `${niche} — ${new Date().toLocaleDateString()}`,
                    status: 'pending',
                    stage_1_at: now,
                    created_at: now
                };
            });
            await insertPipelineRows(rows);
        }

        // Save failed keywords (volume < 50) to failed_niches
        if (failedKeywords.length > 0) {
            const failedRows = failedKeywords.map(p => {
                const city = extractCity(p.keyword, niche);
                return {
                    keyword: p.keyword,
                    niche: niche,
                    city: city,
                    state: state || null,
                    volume: p.volume || 0,
                    failed_stage: 1,
                    fail_reason: `Volume too low (${p.volume} < 50)`,
                    created_by: currentUserEmail,
                    created_at: now
                };
            });
            await saveFailedNiches(failedRows);
            showToast(`⚠️ ${failedKeywords.length} keyword(s) failed (volume < 50)`, 'warning');
        }

        // Reset form
        textarea.value = '';
        nicheInput.value = '';
        stateSelect.selectedIndex = 0;
        document.getElementById('stage1Preview').style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Submit to Pipeline';
        window._stage1NewKeywords = null;

        if (passingKeywords.length > 0) {
            showToast(`${passingKeywords.length} keywords submitted to pipeline!`, 'success');
        } else {
            showToast('No keywords passed the volume filter (≥ 50)', 'error');
        }
        updateAllViews();
    }

    // Stage 1 History
    function updateStage1History() {
        const container = document.getElementById('stage1History');
        if (!container) return;
        const stage1Data = allPipelineData.filter(r => r.stage === 1);

        // Group by batch_id
        const batches = groupByBatch(stage1Data);

        if (batches.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding: 1.5rem;">
                <i class="fa-solid fa-inbox" style="font-size: 1.5rem;"></i>
                <p style="margin-top: 0.5rem;">No submissions yet</p>
            </div>`;
            return;
        }

        // Limit to 10 most recent submissions to prevent page bloat
        const recentBatches = batches.slice(0, 10);

        let html = '';
        recentBatches.forEach(batch => {
            const date = new Date(batch.rows[0].created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            html += `<div class="history-card">
                <div class="history-icon"><i class="fa-solid fa-folder"></i></div>
                <div class="history-info">
                    <div class="history-niche">${escapeHtml(batch.niche)}</div>
                    <div class="history-meta">${batch.rows.length} keywords · ${date}</div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }

    // ─── STAGE 2/3/4/5 LOGIC (shared) ───
    function initStage2() { initStageN(2); }
    function initStage3() { initStageN(3); }
    function initStage4() { initStageN(4); }
    function initStage5() { initStageN(5); }

    function initStageN(stageNum) {
        const textarea = document.getElementById(`stage${stageNum}Textarea`);
        if (!textarea) return;
        const previewBtn = document.getElementById(`stage${stageNum}PreviewBtn`);
        const submitBtn = document.getElementById(`stage${stageNum}SubmitBtn`);
        const groupSelect = document.getElementById(`stage${stageNum}GroupSelect`);

        // Preview button: match keywords and show preview table with notes
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                previewStageN(stageNum);
            });
        }

        // Submit button: submit matched keywords with notes
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                submitStageN(stageNum);
            });
        }
    }

    function groupFailedNiches(rows, stageNum) {
        const filtered = rows.filter(r => r.failed_stage === stageNum);
        const groups = {};
        filtered.forEach(r => {
            const timeKey = r.created_at || '';
            const key = `${(r.niche || '').toLowerCase()}|${(r.state || '').toLowerCase()}|${timeKey}`;
            if (!groups[key]) {
                groups[key] = {
                    batchId: 'failed-' + timeKey.replace(/[^a-zA-Z0-9]/g, '-') + '-' + (r.niche || '').replace(/[^a-zA-Z0-9]/g, '-'),
                    niche: r.niche,
                    state: r.state || '',
                    status: 'failed',
                    checkedAt: r.created_at,
                    rows: []
                };
            }
            groups[key].rows.push({
                id: r.id,
                keyword: r.keyword,
                niche: r.niche,
                city: r.city,
                state: r.state,
                volume: r.volume,
                status: 'failed',
                created_at: r.created_at
            });
        });
        return Object.values(groups);
    }

    function updateStageView(stageNum) {
        const prevStage = stageNum - 1;

        // Get pending groups from previous stage
        const pendingData = allPipelineData.filter(r => r.stage === prevStage && r.status === 'pending');
        const checkedData = allPipelineData.filter(r => r.stage === prevStage && (r.status === 'checked' || r.status === 'failed'));

        const pendingBatches = groupByBatch(pendingData);
        const checkedBatches = groupByBatch(checkedData);
        const stageFailedGroups = groupFailedNiches(failedNichesForCheck, stageNum);

        // Merge checked batches and failed batches
        const checkedMap = {};
        checkedBatches.forEach(b => {
            const key = `${b.niche.toLowerCase()}|${(b.state || '').toLowerCase()}`;
            checkedMap[key] = b;
        });
        stageFailedGroups.forEach(fb => {
            const key = `${fb.niche.toLowerCase()}|${(fb.state || '').toLowerCase()}`;
            checkedMap[key] = fb;
        });

        const combinedCheckedBatches = Object.values(checkedMap).sort((a, b) => {
            const dateA = a.rows && a.rows[0] ? new Date(a.rows[0].created_at) : new Date(0);
            const dateB = b.rows && b.rows[0] ? new Date(b.rows[0].created_at) : new Date(0);
            return dateB - dateA;
        });

        // Update header dynamic pending groups counter
        const pendingTitleEl = document.getElementById(`stage${stageNum}PendingTitle`);
        if (pendingTitleEl) {
            let stageText = '';
            if (stageNum === 2) stageText = 'KD Check';
            else if (stageNum === 3) stageText = 'GMB Check';
            else if (stageNum === 4) stageText = 'DA & Traffic Check';
            else if (stageNum === 5) stageText = 'Directories & R&R Check';
            pendingTitleEl.textContent = `Pending — Needs ${stageText} (${pendingBatches.length} groups pending)`;
        }

        // Render pending groups
        const pendingContainer = document.getElementById(`stage${stageNum}PendingGroups`);
        if (pendingContainer) {
            if (pendingBatches.length === 0) {
                pendingContainer.innerHTML = `<div class="empty-state">
                    <i class="fa-solid fa-hourglass-start"></i>
                    <h3>No keywords waiting</h3>
                    <p>Keywords from Stage ${prevStage} will appear here</p>
                </div>`;
            } else {
                pendingContainer.innerHTML = pendingBatches.map((batch, idx) =>
                    renderBatchGroup(batch, 'pending', stageNum, idx + 1)
                ).join('');
                // Attach toggle and copy events
                attachBatchEvents(pendingContainer);
            }
        }

        // Render checked groups
        const checkedContainer = document.getElementById(`stage${stageNum}CheckedGroups`);
        if (checkedContainer) {
            if (combinedCheckedBatches.length === 0) {
                checkedContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No checked groups yet</p>`;
            } else {
                checkedContainer.innerHTML = combinedCheckedBatches.map(batch =>
                    renderBatchGroup(batch, 'checked', stageNum)
                ).join('');
                attachBatchEvents(checkedContainer);
            }
        }

        // Update group select dropdown
        const groupSelect = document.getElementById(`stage${stageNum}GroupSelect`);
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="" disabled selected>Select niche group</option>';
            pendingBatches.forEach(batch => {
                const opt = document.createElement('option');
                opt.value = batch.batchId;
                const stateLabel = batch.state ? ` — ${batch.state}` : '';
                opt.textContent = `${batch.niche}${stateLabel} (${batch.rows.length} keywords)`;
                groupSelect.appendChild(opt);
            });
        }
    }

    function renderBatchGroup(batch, type, currentStage, index = null) {
        const isChecked = type === 'checked';
        const keywords = batch.rows;
        const date = new Date(keywords[0].created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
        });

        // Build keyword list items — show note indicator for checked keywords that have notes
        let kwListHtml = '';
        keywords.forEach((kw, i) => {
            const hasNote = kw.notes && kw.notes.trim().length > 0;
            let noteDisplay = kw.notes || '';
            if (hasNote && kw.notes.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(kw.notes);
                    if (parsed.gmb_reviews !== undefined || parsed.gmb_count !== undefined) {
                        noteDisplay = `Reviews: ${parsed.gmb_reviews || '—'} | GMBs: ${parsed.gmb_count || '—'}`;
                    } else if (parsed.low_da !== undefined || parsed.traffic !== undefined) {
                        noteDisplay = `Low DA: ${parsed.low_da || '—'} | Traffic: ${parsed.traffic || '—'}`;
                    } else if (parsed.directories !== undefined || parsed.rr_sites !== undefined) {
                        noteDisplay = `Dirs: ${parsed.directories || '—'} | R&R: ${parsed.rr_sites || '—'}`;
                    }
                } catch (e) {}
            }
            const noteIndicator = (isChecked && hasNote)
                ? `<span style="color: #f59e0b; font-size: 0.75rem; margin-left: 0.5rem;" title="${escapeHtml(noteDisplay)}">📝</span>`
                : '';

            kwListHtml += `<div class="keyword-item">
                <span class="kw-num">${i + 1}.</span>
                <span class="kw-text">${escapeHtml(kw.keyword)}</span>
                ${kw.state ? `<span class="kw-vol" style="color: var(--primary); font-weight: 600;">${escapeHtml(kw.state)}</span>` : ''}
                ${kw.volume ? `<span class="kw-vol">vol: ${kw.volume.toLocaleString()}</span>` : ''}
                ${noteIndicator}
            </div>`;
        });

        // Build batch copy buttons
        const batchSize = 100;
        let copyButtonsHtml = '';
        if (!isChecked) {
            if (keywords.length <= batchSize) {
                copyButtonsHtml = `<button class="copy-batch-btn" data-batch-id="${batch.batchId}" data-start="0" data-end="${keywords.length}">
                    <i class="fa-regular fa-clipboard"></i> Copy All ${keywords.length}
                </button>`;
            } else {
                const numBatches = Math.ceil(keywords.length / batchSize);
                for (let b = 0; b < numBatches; b++) {
                    const start = b * batchSize;
                    const end = Math.min(start + batchSize, keywords.length);
                    copyButtonsHtml += `<button class="copy-batch-btn ${b > 0 ? 'secondary' : ''}" data-batch-id="${batch.batchId}" data-start="${start}" data-end="${end}">
                        <i class="fa-regular fa-clipboard"></i> Copy ${start + 1}-${end}
                    </button>`;
                }
            }
        }

        // Recheck button for checked groups - removed per user request
        let recheckHtml = '';

        // Fail group button for pending groups
        let failGroupBtn = '';
        if (!isChecked) {
            failGroupBtn = `<button class="fail-group-btn" data-batch-id="${batch.batchId}" data-stage="${currentStage}" title="Fail Entire Group">
                <i class="fa-solid fa-circle-xmark"></i> Fail Group
            </button>`;
        }

        const checkedInfo = isChecked && batch.checkedAt
            ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Checked ${new Date(batch.checkedAt).toLocaleDateString()}</span>`
            : '';

        const batchState = keywords[0].state || '';
        const stateTag = batchState ? `<span style="color: var(--primary); font-size: 0.8rem; font-weight: 600; background: var(--stage-1-bg); padding: 0.1rem 0.4rem; border-radius: 4px;">${escapeHtml(batchState)}</span>` : '';

        const titlePrefix = index ? `Group #${index}: ` : '';

        let badgeClass = 'pending-badge';
        let badgeLabel = 'PENDING';
        if (isChecked) {
            if (batch.status === 'failed') {
                badgeClass = 'failed-badge';
                badgeLabel = 'FAILED';
            } else {
                badgeClass = 'checked-badge';
                badgeLabel = 'CHECKED';
            }
        }
        const failedClass = batch.status === 'failed' ? 'failed' : '';
        return `<div class="batch-group ${type} ${failedClass}">
            <div class="batch-group-header" data-toggle="batch-body-${batch.batchId}">
                <div class="group-title">
                    <i class="fa-solid fa-folder${isChecked ? '-open' : ''}"></i>
                    <span>${titlePrefix}${escapeHtml(batch.niche)}</span>
                    ${stateTag}
                    <span style="color: var(--text-muted); font-weight: 400; font-size: 0.85rem;">(${keywords.length} keywords)</span>
                </div>
                <div class="group-meta">
                    ${checkedInfo}
                    <span class="group-badge ${badgeClass}">${badgeLabel}</span>
                    ${failGroupBtn}
                    ${recheckHtml}
                    <span style="font-size: 0.75rem;">${date}</span>
                    <i class="fa-solid fa-chevron-down batch-group-chevron"></i>
                </div>
            </div>
            <div class="batch-group-body" id="batch-body-${batch.batchId}">
                <div class="keyword-list-container">
                    <div class="keyword-list">${kwListHtml}</div>
                </div>
                ${copyButtonsHtml ? `<div class="batch-actions">${copyButtonsHtml}</div>` : ''}
            </div>
        </div>`;
    }

    function attachBatchEvents(container) {
        // Toggle expand/collapse
        container.querySelectorAll('.batch-group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.recheck-btn') || e.target.closest('.fail-group-btn')) return; // Don't toggle on button clicks
                const targetId = header.dataset.toggle;
                const body = document.getElementById(targetId);
                if (body) {
                    body.classList.toggle('open');
                    header.classList.toggle('expanded');
                }
            });
        });

        // Copy buttons
        container.querySelectorAll('.copy-batch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const batchId = btn.dataset.batchId;
                const start = parseInt(btn.dataset.start);
                const end = parseInt(btn.dataset.end);
                copyBatchKeywords(batchId, start, end, btn);
            });
        });

        // Recheck buttons
        container.querySelectorAll('.recheck-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const batchId = btn.dataset.batchId;
                await updatePipelineRows(batchId, { status: 'pending', checked_at: null });
                showToast('Group moved back to pending', 'success');
                updateAllViews();
            });
        });

        // Fail group buttons
        container.querySelectorAll('.fail-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const batchId = btn.dataset.batchId;
                const stage = parseInt(btn.dataset.stage);
                await failEntireGroup(batchId, stage);
            });
        });
    }

    function showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-confirm-overlay';
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.25s ease;
            `;

            const container = document.createElement('div');
            container.className = 'custom-confirm-container';
            container.style.cssText = `
                background: var(--bg-surface-solid);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                width: 90%;
                max-width: 420px;
                padding: 1.75rem;
                box-shadow: var(--shadow-xl);
                transform: translateY(20px);
                transition: transform 0.25s ease;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.75rem;
            `;

            const icon = document.createElement('div');
            icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            icon.style.cssText = `
                width: 40px;
                height: 40px;
                background: var(--danger-bg);
                color: var(--danger);
                border: 1px solid var(--danger-border);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.15rem;
                flex-shrink: 0;
            `;

            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.cssText = `
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            `;

            header.appendChild(icon);
            header.appendChild(titleEl);

            const msgEl = document.createElement('p');
            msgEl.textContent = message;
            msgEl.style.cssText = `
                font-size: 0.88rem;
                color: var(--text-secondary);
                line-height: 1.5;
                margin: 0;
            `;

            const footer = document.createElement('div');
            footer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                margin-top: 0.5rem;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 0.5rem 1.25rem;
                font-size: 0.85rem;
            `;

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn';
            confirmBtn.textContent = 'Yes, Fail Group';
            confirmBtn.style.cssText = `
                background: var(--danger);
                color: white;
                border: 1px solid rgba(239, 68, 68, 0.2);
                padding: 0.5rem 1.25rem;
                font-size: 0.85rem;
                font-weight: 600;
            `;

            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);

            container.appendChild(header);
            container.appendChild(msgEl);
            container.appendChild(footer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            // Trigger reflow & animate
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            });

            function closeConfirm(value) {
                overlay.style.opacity = '0';
                container.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    overlay.remove();
                    resolve(value);
                }, 250);
            }

            cancelBtn.addEventListener('click', () => closeConfirm(false));
            confirmBtn.addEventListener('click', () => closeConfirm(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeConfirm(false);
            });
        });
    }

    async function failEntireGroup(batchId, stageNum) {
        const batchRows = allPipelineData.filter(r => r.batch_id === batchId);
        if (batchRows.length === 0) {
            showToast('No keywords found in this group', 'error');
            return;
        }

        const nicheName = batchRows[0].niche;
        
        const confirmed = await showCustomConfirm(
            `Fail "${nicheName}"?`, 
            `Are you sure you want to fail the entire group "${nicheName}"? This will mark all ${batchRows.length} keywords in this group as failed and remove them from the pending list.`
        );
        
        if (!confirmed) {
            return;
        }

        const now = new Date().toISOString();

        // 1. Log all keywords as failed niches
        const failedRows = batchRows.map(r => ({
            keyword: r.keyword,
            niche: r.niche,
            city: r.city,
            state: r.state || null,
            volume: r.volume || 0,
            failed_stage: stageNum,
            fail_reason: `Entire group marked as failed at Stage ${stageNum} check`,
            created_by: currentUserEmail,
            created_at: now
        }));

        try {
            await saveFailedNiches(failedRows);
            
            // 2. Mark the pipeline rows as failed
            await updatePipelineRows(batchId, {
                status: 'failed',
                checked_at: now
            });

            showToast(`Marked entire group "${nicheName}" as failed`, 'success');
        } catch (err) {
            console.error('Error failing entire group:', err);
            showToast('Failed to mark group as failed', 'error');
        }

        // 3. Update the view
        await loadAllPipelineData();
    }

    function copyBatchKeywords(batchId, start, end, btnEl) {
        const batchRows = allPipelineData
            .filter(r => r.batch_id === batchId)
            .sort((a, b) => (a.keyword || '').localeCompare(b.keyword || ''));

        const slice = batchRows.slice(start, end);
        const text = slice.map(r => r.keyword).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const origHTML = btnEl.innerHTML;
            btnEl.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btnEl.classList.add('copied');
            setTimeout(() => {
                btnEl.innerHTML = origHTML;
                btnEl.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    }

    // ─── Preview matched keywords with notes (stages 2, 3, 4) ───
    let stagePreviewData = {}; // Holds matched data per stage for submit

    function previewStageN(stageNum) {
        const textarea = document.getElementById(`stage${stageNum}Textarea`);
        const groupSelect = document.getElementById(`stage${stageNum}GroupSelect`);
        const warningDiv = document.getElementById(`stage${stageNum}MatchWarning`);
        const previewContainer = document.getElementById(`stage${stageNum}Preview`);
        const previewBody = document.getElementById(`stage${stageNum}PreviewBody`);
        const matchCount = document.getElementById(`stage${stageNum}MatchCount`);

        const raw = textarea.value.trim();
        const selectedBatchId = groupSelect.value;

        if (!raw || !selectedBatchId) {
            showToast('Please paste keywords and select a niche group first', 'error');
            return;
        }

        const pastedKeywords = raw.split('\n').map(l => l.trim().toLowerCase()).filter(l => l);

        // Get the batch rows from previous stage
        const batchRows = allPipelineData.filter(
            r => r.batch_id === selectedBatchId && r.status === 'pending'
        );

        const matched = [];
        const unmatched = [];

        pastedKeywords.forEach(pk => {
            const found = batchRows.find(r => r.keyword.toLowerCase() === pk);
            if (found) {
                matched.push(found);
            } else {
                unmatched.push(pk);
            }
        });

        // Show warnings for unmatched
        if (unmatched.length > 0) {
            warningDiv.innerHTML = `<div class="match-warning">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <strong>${unmatched.length} keyword(s) could not be matched:</strong><br>
                    ${unmatched.slice(0, 5).map(u => `• "${escapeHtml(u)}"`).join('<br>')}
                    ${unmatched.length > 5 ? `<br>...and ${unmatched.length - 5} more` : ''}
                </div>
            </div>`;
        } else {
            warningDiv.innerHTML = '';
        }

        if (matched.length === 0) {
            showToast('No keywords matched. Check your paste text.', 'error');
            previewContainer.style.display = 'none';
            return;
        }

        // Store matched data for submit
        stagePreviewData[stageNum] = { matched, selectedBatchId };

        // Build preview table with note inputs
        matchCount.textContent = matched.length;
        previewBody.innerHTML = matched.map((kw, i) => {
            let noteInputHtml = '';
            if (stageNum === 2) {
                noteInputHtml = `
                    <input type="number" class="preview-note-input" 
                           data-kw-id="${kw.id}" 
                           placeholder="KD (0-100)..."
                           min="0" max="100"
                           style="width: 100%; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem;">
                `;
            } else if (stageNum === 3) {
                noteInputHtml = `
                    <div style="display: flex; gap: 0.5rem; width: 100%;">
                        <input type="text" class="preview-gmb-reviews-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="Reviews (e.g. 15,30,45)..."
                               style="flex: 1.2; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                        <input type="number" class="preview-gmb-count-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="GMB Count..."
                               min="0"
                               style="flex: 0.8; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                    </div>
                `;
            } else if (stageNum === 4) {
                noteInputHtml = `
                    <div style="display: flex; gap: 0.5rem; width: 100%;">
                        <input type="text" class="preview-low-da-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="Low DA sites..."
                               style="flex: 1; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                        <input type="text" class="preview-traffic-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="Traffic (e.g. 500-10)..."
                               style="flex: 1; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                    </div>
                `;
            } else if (stageNum === 5) {
                noteInputHtml = `
                    <div style="display: flex; gap: 0.5rem; width: 100%;">
                        <input type="text" class="preview-directories-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="Directories..."
                               style="flex: 1; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                        <input type="text" class="preview-rr-sites-input" 
                               data-kw-id="${kw.id}" 
                               placeholder="R&R sites..."
                               style="flex: 1; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; min-width: 0;">
                    </div>
                `;
            } else {
                noteInputHtml = `
                    <input type="text" class="preview-note-input" 
                           data-kw-id="${kw.id}" 
                           placeholder="Write note..."
                           style="width: 100%; padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem;">
                `;
            }

            return `
                <tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(kw.keyword)}</td>
                    <td>${escapeHtml(kw.city || '—')}</td>
                    <td>${kw.volume ? kw.volume.toLocaleString() : '—'}</td>
                    <td>${noteInputHtml}</td>
                </tr>
            `;
        }).join('');

        // Attach Enter key navigation between input fields in preview table
        const inputs = previewBody.querySelectorAll('input');
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextInput = inputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                        if (typeof nextInput.select === 'function') nextInput.select();
                    } else {
                        input.blur();
                    }
                }
            });
        });

        previewContainer.style.display = 'block';
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Submit for stages 2, 3, 4, 5 — uses preview data
    async function submitStageN(stageNum) {
        const textarea = document.getElementById(`stage${stageNum}Textarea`);
        const groupSelect = document.getElementById(`stage${stageNum}GroupSelect`);
        const submitBtn = document.getElementById(`stage${stageNum}SubmitBtn`);
        const previewContainer = document.getElementById(`stage${stageNum}Preview`);

        const preview = stagePreviewData[stageNum];
        if (!preview || preview.matched.length === 0) {
            showToast('Please preview keywords first', 'error');
            return;
        }

        const { matched, selectedBatchId } = preview;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        // Collect notes from preview inputs
        const notesMap = {};
        let validationFailed = false;

        if (stageNum === 3) {
            const rows = previewContainer.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (validationFailed) return;
                const reviewsInput = row.querySelector('.preview-gmb-reviews-input');
                const countInput = row.querySelector('.preview-gmb-count-input');
                if (reviewsInput && countInput) {
                    const kwId = reviewsInput.dataset.kwId;
                    const reviewsText = reviewsInput.value.trim();
                    const countText = countInput.value.trim();
                    if (reviewsText || countText) {
                        const countVal = countText ? parseInt(countText, 10) : '';
                        if (countText && (isNaN(countVal) || countVal < 0)) {
                            showToast('GMB Count must be a valid positive number.', 'error');
                            validationFailed = true;
                            countInput.focus();
                            return;
                        }
                        notesMap[kwId] = JSON.stringify({
                            gmb_reviews: reviewsText,
                            gmb_count: countVal
                        });
                    }
                }
            });
        } else if (stageNum === 4) {
            const rows = previewContainer.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (validationFailed) return;
                const lowDaInput = row.querySelector('.preview-low-da-input');
                const trafficInput = row.querySelector('.preview-traffic-input');
                if (lowDaInput && trafficInput) {
                    const kwId = lowDaInput.dataset.kwId;
                    const lowDaText = lowDaInput.value.trim();
                    const trafficText = trafficInput.value.trim();
                    if (lowDaText || trafficText) {
                        notesMap[kwId] = JSON.stringify({
                            low_da: lowDaText,
                            traffic: trafficText
                        });
                    }
                }
            });
        } else if (stageNum === 5) {
            const rows = previewContainer.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (validationFailed) return;
                const dirsInput = row.querySelector('.preview-directories-input');
                const rrInput = row.querySelector('.preview-rr-sites-input');
                if (dirsInput && rrInput) {
                    const kwId = dirsInput.dataset.kwId;
                    const dirsText = dirsInput.value.trim();
                    const rrText = rrInput.value.trim();
                    if (dirsText || rrText) {
                        notesMap[kwId] = JSON.stringify({
                            directories: dirsText,
                            rr_sites: rrText
                        });
                    }
                }
            });
        } else {
            const noteInputs = previewContainer.querySelectorAll('.preview-note-input');
            noteInputs.forEach(input => {
                const kwId = input.dataset.kwId;
                const noteText = input.value.trim();
                if (stageNum === 2) {
                    const num = parseInt(noteText, 10);
                    if (!noteText) {
                        showToast('Keyword Difficulty (KD) is required for each keyword.', 'error');
                        validationFailed = true;
                        input.focus();
                    } else if (isNaN(num) || num < 0 || num > 100) {
                        showToast('Keyword Difficulty (KD) must be a valid number between 0 and 100.', 'error');
                        validationFailed = true;
                        input.focus();
                    } else {
                        notesMap[kwId] = noteText;
                    }
                } else {
                    if (noteText) {
                        notesMap[kwId] = noteText;
                    }
                }
            });
        }

        if (validationFailed) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = getSubmitBtnText(stageNum);
            return;
        }

        // Save notes to the original pipeline rows (previous stage rows)
        for (const [kwId, noteText] of Object.entries(notesMap)) {
            const row = allPipelineData.find(r => r.id === kwId);
            if (row) row.notes = noteText;

            if (supabase) {
                try {
                    await supabase
                        .from('pipeline_keywords')
                        .update({ notes: noteText })
                        .eq('id', kwId);
                } catch (e) {
                    console.warn('Note save failed:', e);
                }
            }
        }
        savePipelineData(allPipelineData);

        // Mark the original batch as checked
        await updatePipelineRows(selectedBatchId, {
            status: 'checked',
            checked_at: new Date().toISOString()
        });

        // ─── Capture unmatched batch keywords as failed niches ───
        const batchRows = allPipelineData.filter(
            r => r.batch_id === selectedBatchId
        );
        const matchedIds = new Set(matched.map(m => m.id));
        const unmatchedRows = batchRows.filter(r => !matchedIds.has(r.id));

        if (unmatchedRows.length > 0) {
            const now = new Date().toISOString();
            const failedRows = unmatchedRows.map(r => ({
                keyword: r.keyword,
                niche: r.niche,
                city: r.city,
                state: r.state || null,
                volume: r.volume || 0,
                failed_stage: stageNum,
                fail_reason: `Did not pass Stage ${stageNum} check`,
                created_by: currentUserEmail,
                created_at: now
            }));
            await saveFailedNiches(failedRows);
            showToast(`⚠️ ${unmatchedRows.length} keyword(s) marked as failed at Stage ${stageNum}`, 'warning');
        }

        if (stageNum === 5) {
            // Stage 5: Save to main niches table
            await saveFinalToNiches(matched);

            // Also create stage 5 records for tracking
            const newBatchId = generateId();
            const now = new Date().toISOString();
            const newRows = matched.map(m => ({
                id: generateId(),
                keyword: m.keyword,
                niche: m.niche,
                city: m.city,
                state: m.state,
                volume: m.volume,
                stage: 5,
                batch_id: newBatchId,
                batch_label: m.batch_label,
                status: 'checked',
                stage_5_at: now,
                checked_at: now,
                created_at: now
            }));
            await insertPipelineRows(newRows);
            showToast(`🏆 ${matched.length} keywords saved to main dashboard!`, 'success');
        } else {
            // Stages 2, 3 & 4: Create new batch in current stage
            const newBatchId = generateId();
            const now = new Date().toISOString();
            const stageKey = `stage_${stageNum}_at`;

            const newRows = matched.map(m => ({
                id: generateId(),
                keyword: m.keyword,
                niche: m.niche,
                city: m.city,
                state: m.state,
                volume: m.volume,
                stage: stageNum,
                batch_id: newBatchId,
                batch_label: m.batch_label,
                status: 'pending',
                [stageKey]: now,
                created_at: now
            }));

            await insertPipelineRows(newRows);
            showToast(`${matched.length} keywords sent to Stage ${stageNum + 1}!`, 'success');
        }

        // Reset
        textarea.value = '';
        groupSelect.selectedIndex = 0;
        submitBtn.disabled = false;
        submitBtn.innerHTML = getSubmitBtnText(stageNum);
        previewContainer.style.display = 'none';
        stagePreviewData[stageNum] = null;

        updateAllViews();
    }

    // ─── Notepad: Save keyword note ───
    async function saveKeywordNote(kwId, noteText) {
        // Update in allPipelineData
        const row = allPipelineData.find(r => r.id === kwId);
        if (row) row.notes = noteText;

        // Update localStorage
        savePipelineData(allPipelineData);

        // Update Supabase
        if (supabase) {
            try {
                await supabase
                    .from('pipeline_keywords')
                    .update({ notes: noteText || null })
                    .eq('id', kwId);
            } catch (e) {
                console.warn('Supabase note save failed:', e);
            }
        }
    }

    // ─── Collect all stage notes for a keyword when finalizing ───
    function collectKeywordNotes(keyword) {
        const notes = {};
        // Search through all pipeline data for this keyword across stages
        // Notes are written by Stage N worker on rows with stage = N-1 (previous stage)
        // So we use stage + 1 to get the correct label
        allPipelineData.forEach(row => {
            if (row.keyword && row.keyword.toLowerCase() === keyword.toLowerCase() && row.notes && row.notes.trim()) {
                // row.stage is the stage that CREATED the row, but notes were written
                // by the NEXT stage's worker, so the note belongs to stage + 1
                const writerStage = row.stage + 1;
                if (writerStage < 2 || writerStage > 5) return; // Only stages 2-5 have notes
                const stageKey = `stage_${writerStage}`;
                // Keep the latest note if duplicates
                if (!notes[stageKey] || new Date(row.created_at) > new Date(notes[stageKey].date)) {
                    notes[stageKey] = { text: row.notes.trim(), date: row.created_at };
                }
            }
        });

        // Build final JSON
        const result = {};
        if (notes.stage_2) result.stage_2 = notes.stage_2.text;
        if (notes.stage_3) {
            let s3Val = notes.stage_3.text;
            if (s3Val && s3Val.startsWith('{')) {
                try {
                    s3Val = JSON.parse(s3Val);
                } catch (e) {}
            }
            result.stage_3 = s3Val;
        }
        if (notes.stage_4) {
            let s4Val = notes.stage_4.text;
            if (s4Val && s4Val.startsWith('{')) {
                try {
                    s4Val = JSON.parse(s4Val);
                } catch (e) {}
            }
            result.stage_4 = s4Val;
        }
        if (notes.stage_5) {
            let s5Val = notes.stage_5.text;
            if (s5Val && s5Val.startsWith('{')) {
                try {
                    s5Val = JSON.parse(s5Val);
                } catch (e) {}
            }
            result.stage_5 = s5Val;
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    // ─── Save failed niches to failed_niches table ───
    async function saveFailedNiches(rows) {
        if (!rows || rows.length === 0) return;

        let savedToSupabase = false;
        if (supabase) {
            try {
                const { error } = await supabase.from('failed_niches').insert(rows);
                if (error) {
                    console.error('Supabase failed_niches insert error:', error);
                    throw error;
                }
                savedToSupabase = true;
            } catch (e) {
                console.warn('Supabase failed_niches insert failed, falling back to LocalStorage:', e);
            }
        }

        // Always save to localStorage fallback
        if (!savedToSupabase) {
            try {
                const existing = JSON.parse(localStorage.getItem('rank_rent_failed_niches') || '[]');
                const withIds = rows.map(r => ({ ...r, id: r.id || generateId() }));
                localStorage.setItem('rank_rent_failed_niches', JSON.stringify([...withIds, ...existing]));
                console.log('Saved failed niches to LocalStorage fallback');
            } catch (err) {
                console.error('Failed to save failed niches to LocalStorage:', err);
            }
        }
    }

    // Save final keywords to main niches table
    async function saveFinalToNiches(keywords) {
        const rows = keywords.map(kw => {
            const collectedNotes = collectKeywordNotes(kw.keyword);
            const stage2Kd = (collectedNotes && collectedNotes.stage_2) ? parseInt(collectedNotes.stage_2, 10) : 0;
            
            // Delete stage_2 from collectedNotes so it's not saved in the notes column
            if (collectedNotes) {
                delete collectedNotes.stage_2;
            }
            const cleanNotes = (collectedNotes && Object.keys(collectedNotes).length > 0) ? collectedNotes : null;

            return {
                niche: kw.niche,
                city: kw.city,
                state: kw.state || null,
                keyword: kw.keyword,
                volume: kw.volume || 0,
                // Set all criteria to passing defaults since they're already proven, except KD
                kd: isNaN(stage2Kd) ? 0 : stage2Kd,
                da_count: 4,
                gmb_reviews: [0, 0, 0],
                gmb_count: 10,
                directory_count: 1,
                competitor_traffic: 50,
                rr_site_count: 1,
                zip_codes: 2,
                population: 0,
                status: 'PASS',
                fail_reasons: [],
                notes: cleanNotes,
                created_at: new Date().toISOString()
            };
        });

        let savedToSupabase = false;
        if (supabase) {
            try {
                const { error } = await supabase.from('niches').insert(rows);
                if (error) {
                    console.error('Supabase niches insert error:', error);
                    throw error;
                }
                savedToSupabase = true;
            } catch (e) {
                console.warn('Supabase niches insert failed, falling back to LocalStorage:', e);
            }
        }

        // Always save to localStorage or run fallback if Supabase insert failed
        if (!savedToSupabase) {
            try {
                const existing = JSON.parse(localStorage.getItem('rank_rent_niches') || '[]');
                localStorage.setItem('rank_rent_niches', JSON.stringify([...rows, ...existing]));
                console.log('Saved niches to LocalStorage fallback');
            } catch (err) {
                console.error('Failed to save niches to LocalStorage fallback:', err);
            }
        }
    }

    function getSubmitBtnText(stageNum) {
        if (stageNum === 5) return '<i class="fa-solid fa-trophy"></i> Finalize & Save to Main Dashboard';
        return `<i class="fa-solid fa-paper-plane"></i> Submit & Send to Stage ${stageNum + 1}`;
    }

    // ─── Helper Functions ───
    function groupByBatch(rows) {
        const map = {};
        rows.forEach(r => {
            if (!map[r.batch_id]) {
                map[r.batch_id] = {
                    batchId: r.batch_id,
                    niche: r.niche,
                    state: r.state || '',
                    status: r.status,
                    checkedAt: r.checked_at,
                    rows: []
                };
            }
            map[r.batch_id].rows.push(r);
        });
        return Object.values(map).sort((a, b) =>
            new Date(b.rows[0].created_at) - new Date(a.rows[0].created_at)
        );
    }

    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('funnelToast');
        const text = document.getElementById('funnelToastText');
        const icon = toast.querySelector('i');

        text.textContent = message;
        toast.className = `funnel-toast ${type}`;
        icon.className = type === 'success'
            ? 'fa-solid fa-check-circle'
            : 'fa-solid fa-exclamation-circle';

        // Show
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Hide after 3s
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

})();
