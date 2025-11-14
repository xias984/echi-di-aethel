/**
 * White Paper - Logica Principale
 * Gestisce l'inizializzazione e l'interattività della pagina
 */

// ============================================
// VARIABILI GLOBALI
// ============================================
let xpChartInstance = null;
let contractsData = [];
let currentLang = 'it'; // Default language

// ============================================
// GESTIONE LINGUA
// ============================================
/**
 * Applica le traduzioni alla pagina
 * @param {string} lang - Codice lingua ('it' o 'en')
 */
const setLanguage = (lang) => {
    currentLang = lang;
    const t = translations[lang];
    
    // 1. Aggiorna l'attributo lang dell'HTML
    document.documentElement.setAttribute('lang', lang);

    // 2. Traduce il testo statico e gli attributi ARIA
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (t[key]) {
            el.setAttribute('aria-label', t[key]);
        }
    });

    // 3. Ricarica/aggiorna i componenti dinamici
    initCharacterGenerator(true); // Rigenera con la nuova lingua
    const progressionPane = document.getElementById('progressione');
    if (progressionPane && progressionPane.classList.contains('active') && xpChartInstance) {
         initXpChart(true); // Aggiorna chart
    }
    initMestieri(); // Rigenera l'albero dei mestieri
    // Aggiorna anche le opzioni del filtro dei contratti
    const contractFilter = document.getElementById('contract-filter');
    if (contractFilter) {
        contractFilter.querySelectorAll('option').forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (key && t[key]) {
                option.textContent = t[key];
            }
        });
        renderContracts(contractFilter.value); // Ricarica i contratti
    }
    
    // 4. Aggiorna i link PDF in base alla nuova lingua
    initS3Assets(lang);
};

// ============================================
// NAVIGAZIONE
// ============================================
/**
 * Inizializza la navigazione con Intersection Observer
 */
const initNavigation = () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href').substring(1) === entry.target.id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.5 });

    sections.forEach(section => observer.observe(section));
};

// ============================================
// TABS
// ============================================
/**
 * Inizializza il sistema di tabs
 */
const initTabs = () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabPanes.forEach(pane => {
                pane.classList.add('hidden');
                if (pane.id === tabId) {
                    pane.classList.remove('hidden');
                    // Ridisegna il grafico se la tab è Progression
                    if (tabId === 'progressione') {
                        initXpChart(true);
                    }
                }
            });
        });
    });
};

// ============================================
// GENERATORE PERSONAGGIO
// ============================================
/**
 * Inizializza il generatore di personaggi
 * @param {boolean} isUpdate - Se true, aggiorna senza ri-aggiungere event listener
 */
const initCharacterGenerator = (isUpdate = false) => {
    const t = translations[currentLang];
    
    const talenti = [
        t['talent.pioneering'], 
        t['talent.melee'], 
        t['talent.gathering'], 
        t['talent.crafting'], 
        t['talent.trading']
    ];
    const tratti = [
        { nome: t['trait.patient_name'], desc: t['trait.patient_desc'] },
        { nome: t['trait.bold_name'], desc: t['trait.bold_desc'] },
        { nome: t['trait.pragmatic_name'], desc: t['trait.pragmatic_desc'] },
        { nome: t['trait.wise_name'], desc: t['trait.wise_desc'] }
    ];
    const ganci = [
        t['hook.water'], 
        t['hook.mark'], 
        t['hook.debt'], 
        t['hook.ruins']
    ];

    const btn = document.getElementById('genera-destino-btn');
    const talentoOutput = document.getElementById('talento-output');
    const trattoOutput = document.getElementById('tratto-output');
    const gancioOutput = document.getElementById('gancio-output');

    if (!btn || !talentoOutput || !trattoOutput || !gancioOutput) {
        return;
    }

    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    const generate = () => {
        let randomTalent1 = getRandomItem(talenti); 
        let availableTalents = talenti.filter(t => t !== randomTalent1);
        let randomTalent2 = getRandomItem(availableTalents);
        
        const finalTalentText = `${randomTalent1}, ${randomTalent2}`;
        const randomTratto = getRandomItem(tratti);
        const randomGancio = getRandomItem(ganci);

        talentoOutput.textContent = finalTalentText.substring(0, 50) + "...";
        trattoOutput.textContent = `${randomTratto.nome}: ${randomTratto.desc}`;
        gancioOutput.textContent = randomGancio;
    };

    if (!isUpdate) {
        btn.addEventListener('click', generate);
    }
    generate();
};

// ============================================
// GRAFICO XP
// ============================================
/**
 * Inizializza il grafico della curva XP
 * @param {boolean} isUpdate - Se true, aggiorna il grafico esistente
 */
const initXpChart = (isUpdate = false) => {
    const t = translations[currentLang];
    const canvas = document.getElementById('xpCurveChart');
    
    if (!canvas) {
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (xpChartInstance) {
        xpChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(166, 123, 91, 0.6)');
    gradient.addColorStop(1, 'rgba(166, 123, 91, 0.1)');

    xpChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Liv. 1', 'Liv. 50', 'Liv. 100', 'Liv. 150', 'Liv. 200', 'Liv. 250', 'Liv. 300+'],
            datasets: [{
                label: t['xp.chart_label'],
                data: [100, 5000, 25000, 75000, 200000, 500000, 1500000],
                borderColor: '#A67B5B',
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6F4E37',
                pointRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const level = context[0].parsed.x;
                            if (level <= 1) return t['xp.tooltip1'];
                            if (level <= 4) return t['xp.tooltip2'];
                            return t['xp.tooltip3'];
                        },
                        title: function(context) {
                            return t['xp.chart_label'];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: t['xp.chart_y_title'] }
                },
                x: {
                    title: { display: true, text: t['xp.chart_x_title'] }
                }
            }
        }
    });
};

// ============================================
// MESTIERI
// ============================================
/**
 * Inizializza la visualizzazione dei mestieri
 */
const initMestieri = () => {
    const t = translations[currentLang];
    const container = document.getElementById('mestieri-container');
    
    if (!container) {
        return;
    }
    
    const mestieriData = [
        { base: t['trade.pioneer'], specs: [t['trade.hunter'], t['trade.farmer']], icon: '🧭' },
        { base: t['trade.fighter'], specs: [t['trade.mercenary'], t['trade.duelist']], icon: '⚔️' },
        { base: t['trade.gatherer'], specs: [t['trade.miner'], t['trade.lumberjack'], t['trade.herbalist']], icon: '⛏️' },
        { base: t['trade.crafter'], specs: [t['trade.builder'], t['trade.bs_tailor']], icon: '🔨' },
        { base: t['trade.wanderer'], specs: [t['trade.treasure_hunter'], t['trade.diplomat']], icon: '💼' }
    ];

    container.innerHTML = mestieriData.map(m => `
        <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group min-h-[200px]">
            <div class="flex flex-col items-center text-2xl font-bold mb-4">
                <span class="text-4xl mb-1 flex-shrink-0">${m.icon}</span><br>
                <h4 class="text-[#6F4E37] text-lg leading-tight break-words">${m.base}</h4>
            </div>
            <div class="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300">
               <p class="text-sm text-gray-600 mb-2">${t['trades.specs_label']}</p>
               <ul class="text-sm space-y-1">
               ${m.specs.map(s => `<li class="bg-gray-100 rounded px-2 py-1 break-words">${s}</li>`).join('')}
               </ul>
            </div>
        </div>
    `).join('');
};

// ============================================
// CONTRATTI
// ============================================
/**
 * Dati statici dei contratti
 */
contractsData = [
    { title_key: 'contract.escort_title', req: 'Lottatore (Liv. 50+)', reward_key: 'contract.escort_reward', type: 'Lottatore' },
    { title_key: 'contract.commission_title', req: 'Fabbricatore (Liv. 25+)', reward_key: 'contract.commission_reward', type: 'Fabbricatore' },
    { title_key: 'contract.search_title', req: 'Raccoglitore (Liv. 30+)', reward_key: 'contract.search_reward', type: 'Raccoglitore' },
    { title_key: 'contract.urgent_title', req: 'Costruttore (Liv. 100+)', reward_key: 'contract.urgent_reward', type: 'Fabbricatore' },
    { title_key: 'contract.defense_title', req: 'Lottatore (Liv. 80+)', reward_key: 'contract.defense_reward', type: 'Lottatore' },
    { title_key: 'contract.supply_title', req: 'Erborista (Liv. 120+)', reward_key: 'contract.supply_reward', type: 'Raccoglitore' },
];

/**
 * Renderizza i contratti filtrati
 * @param {string} filterValue - Valore del filtro
 */
const renderContracts = (filterValue) => {
    const t = translations[currentLang];
    const list = document.getElementById('contract-list');
    
    if (!list) {
        return;
    }
    
    // Conversione dei valori del filtro in base alla lingua corrente
    const langMap = {
        'it': { 'Lottatore': 'Lottatore', 'Fabbricatore': 'Fabbricatore', 'Raccoglitore': 'Raccoglitore', 'all': 'all' },
        'en': { 'Lottatore': 'Fighter', 'Fabbricatore': 'Crafter', 'Raccoglitore': 'Gatherer', 'all': 'all' }
    };
    const translatedFilterValue = langMap[currentLang][filterValue] || filterValue;

    // Mappaggio dei tipi di contratto nel filtro
    const contractTypeMap = {
        'Lottatore': langMap['it']['Lottatore'],
        'Fighter': langMap['it']['Lottatore'],
        'Fabbricatore': langMap['it']['Fabbricatore'],
        'Crafter': langMap['it']['Fabbricatore'],
        'Raccoglitore': langMap['it']['Raccoglitore'],
        'Gatherer': langMap['it']['Raccoglitore'],
    };
    
    const filteredData = translatedFilterValue === 'all' 
        ? contractsData 
        : contractsData.filter(c => contractTypeMap[c.type] === translatedFilterValue);
    
    if (filteredData.length === 0) {
        list.innerHTML = `<li class="p-4 text-center text-gray-500">${t['contract.none']}</li>`;
        return;
    }

    list.innerHTML = filteredData.map(c => `
        <li class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex justify-between items-center">
                <div>
                    <h5 class="font-bold text-lg text-[#6F4E37]">${t[c.title_key]}</h5>
                    <p class="text-sm text-gray-500">${t['contract.requirements']} ${c.req}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-green-700">${t[c.reward_key]}</p>
                    <button class="text-sm mt-1 bg-[#A67B5B] text-white px-3 py-1 rounded-md hover:bg-[#8C6239]">${t['contract.accept_button']}</button>
                </div>
            </div>
        </li>
    `).join('');
};

/**
 * Inizializza il sistema di contratti
 */
const initContracts = () => {
    const filter = document.getElementById('contract-filter');
    if (filter) {
        filter.addEventListener('change', (e) => renderContracts(e.target.value));
        renderContracts('all');
    }
};

// ============================================
// SELEZIONE LINGUA
// ============================================
/**
 * Inizializza il selettore di lingua
 */
const initLanguageSelector = () => {
    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.value = currentLang;
        selector.addEventListener('change', (e) => setLanguage(e.target.value));
    }
};

// ============================================
// ASSET S3
// ============================================
/**
 * Ottiene il nome del file PDF in base alla lingua
 * @param {string} lang - Codice lingua ('it' o 'en')
 * @returns {string} Nome del file PDF
 */
const getPdfFilename = (lang) => {
    return `white-paper-${lang}.pdf`;
};

/**
 * Inizializza gli asset S3 (PDF e audio)
 * @param {string} lang - Codice lingua opzionale (default: currentLang)
 */
const initS3Assets = (lang = null) => {
    const targetLang = lang || currentLang;
    
    // Aggiorna i link PDF con il file corretto in base alla lingua
    const headerPdfLink = document.getElementById('header-pdf-link');
    const heroPdfLink = document.getElementById('hero-pdf-link');
    const pdfUrl = getAssetUrl(getPdfFilename(targetLang));
    
    if (headerPdfLink) {
        headerPdfLink.href = pdfUrl;
    }
    if (heroPdfLink) {
        heroPdfLink.href = pdfUrl;
    }

    // Aggiorna il source audio
    const audioSource = document.getElementById('audio-source');
    const audioPlayer = document.getElementById('audio-player');
    if (audioSource) {
        audioSource.src = getAssetUrl('white-paper.mp3');
        // Ricarica il player audio con il nuovo source
        if (audioPlayer) {
            audioPlayer.load();
        }
    }
};

// ============================================
// INIZIALIZZAZIONE
// ============================================
/**
 * Inizializza tutti i componenti quando il DOM è pronto
 */
document.addEventListener('DOMContentLoaded', function () {
    // Inizializzazione di tutti i componenti
    initNavigation();
    initTabs();
    initMestieri();
    initContracts();
    initLanguageSelector();
    initS3Assets(); // Inizializza gli asset S3
    
    // Inizializza la lingua predefinita (che esegue anche initCharacterGenerator e renderContracts)
    setLanguage(currentLang);
});

