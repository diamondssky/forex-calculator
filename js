// ==========================================
//  1. CONFIGURATION & DATABASE
// ==========================================
const currencyPairs = {
    major: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
        'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CHF/JPY', 'EUR/CHF', 'GBP/CHF'
    ],
    minor: [
        'EUR/CAD', 'EUR/AUD', 'EUR/NZD', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD', 'AUD/CAD',
        'AUD/NZD', 'NZD/CAD', 'NZD/JPY', 'CAD/JPY', 'AUD/CHF', 'CAD/CHF', 'NZD/CHF'
    ],
    exotic: [
        'USD/TRY', 'USD/MXN', 'USD/ZAR', 'USD/SGD', 'USD/HKD', 'USD/SEK', 'USD/DKK',
        'USD/NOK', 'EUR/TRY', 'GBP/TRY', 'USD/RUB', 'USD/CNH', 'USD/PLN', 'USD/THB',
        'USD/HUF', 'USD/CZK', 'USD/ILS', 'USD/CLP', 'USD/PHP', 'USD/MYR', 'USD/IDR',
        'USD/INR', 'USD/KRW', 'USD/TWD', 'USD/BRL', 'USD/COP', 'USD/ARS'
    ]
};

const elements = {
    accountBalance: document.getElementById('accountBalance'),
    riskAmount: document.getElementById('riskAmount'),
    riskPercentage: document.getElementById('riskPercentage'),
    tradeDirection: document.getElementById('tradeDirection'),
    pairType: document.getElementById('pairType'),
    currencyPair: document.getElementById('currencyPair'),
    entryPrice: document.getElementById('entryPrice'),
    slPrice: document.getElementById('slPrice'),
    slPips: document.getElementById('slPips'),
    tpPrice: document.getElementById('tpPrice'),
    tpPips: document.getElementById('tpPips'),
    calculateBtn: document.getElementById('calculateBtn'),
    standardLots: document.getElementById('standardLots'),
    resultEntryPrice: document.getElementById('resultEntryPrice'),
    resultSLPrice: document.getElementById('resultSLPrice'),
    resultTPPrice: document.getElementById('resultTPPrice'),
    positionSize: document.getElementById('positionSize'),
    riskRewardRatio: document.getElementById('riskRewardRatio'),
    uploadArea: document.getElementById('uploadArea'),
    screenshotInput: document.getElementById('screenshotInput'),
    ocrResults: document.getElementById('ocrResults'),
    ocrPair: document.getElementById('ocrPair'),
    ocrEntry: document.getElementById('ocrEntry'),
    ocrSL: document.getElementById('ocrSL'),
    ocrTP: document.getElementById('ocrTP'),
    applyOCR: document.getElementById('applyOCR'),
    pairSuggestions: document.getElementById('pairSuggestions')
};

// ==========================================
//  2. CALCULATOR MATH
// ==========================================

function getPipValue(pair) {
    return pair.includes('JPY') ? 0.01 : 0.0001;
}

function isJPYPair(pair) {
    return pair.includes('JPY');
}

function calculatePips(entry, exit, pair) {
    const pipValue = getPipValue(pair);
    return Math.abs(entry - exit) / pipValue;
}

function calculatePrice(entry, pips, pair, direction = 'subtract') {
    const pipValue = getPipValue(pair);
    const priceChange = pips * pipValue;
    return direction === 'subtract' ? entry - priceChange : entry + priceChange;
}

function updateRiskPercentage() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const amount = parseFloat(elements.riskAmount.value) || 0;
    if (balance > 0) {
        elements.riskPercentage.value = ((amount / balance) * 100).toFixed(2);
    }
}

function updateRiskAmount() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const percentage = parseFloat(elements.riskPercentage.value) || 0;
    elements.riskAmount.value = (balance * percentage / 100).toFixed(2);
}

function updateSLPips() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const sl = parseFloat(elements.slPrice.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (entry && sl) {
        const pips = calculatePips(entry, sl, pair);
        elements.slPips.value = pips.toFixed(1);
    }
}

function updateSLPrice() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const pips = parseFloat(elements.slPips.value) || 0;
    const pair = elements.currencyPair.value;
    const direction = elements.tradeDirection.value;
    
    if (entry && pips) {
        const slPrice = calculatePrice(entry, pips, pair, direction === 'buy' ? 'subtract' : 'add');
        elements.slPrice.value = slPrice.toFixed(isJPYPair(pair) ? 3 : 5);
    }
}

function updateTPPips() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const tp = parseFloat(elements.tpPrice.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (entry && tp) {
        const pips = calculatePips(entry, tp, pair);
        elements.tpPips.value = pips.toFixed(1);
    }
}

function updateTPPrice() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const pips = parseFloat(elements.tpPips.value) || 0;
    const pair = elements.currencyPair.value;
    const direction = elements.tradeDirection.value;
    
    if (entry && pips) {
        const tpPrice = calculatePrice(entry, pips, pair, direction === 'buy' ? 'add' : 'subtract');
        elements.tpPrice.value = tpPrice.toFixed(isJPYPair(pair) ? 3 : 5);
    }
}

function calculatePositionSize() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const riskAmount = parseFloat(elements.riskAmount.value) || 0;
    const slPips = parseFloat(elements.slPips.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (!balance || !riskAmount || !slPips) return;
    
    const pipValue = isJPYPair(pair) ? 0.01 : 0.0001;
    const lotSize = riskAmount / (slPips * pipValue * 100000);
    return lotSize;
}

function calculateRiskReward() {
    const slPips = parseFloat(elements.slPips.value) || 0;
    const tpPips = parseFloat(elements.tpPips.value) || 0;
    
    if (!slPips) return 0;
    return (tpPips / slPips).toFixed(2);
}

function updateResults() {
    const lotSize = calculatePositionSize();
    const riskReward = calculateRiskReward();
    
    if (lotSize) {
        elements.standardLots.textContent = lotSize.toFixed(2); 
        elements.standardLots.setAttribute('data-copy', lotSize.toFixed(5));
        
        elements.resultEntryPrice.textContent = parseFloat(elements.entryPrice.value).toFixed(isJPYPair(elements.currencyPair.value) ? 3 : 5);
        elements.resultEntryPrice.setAttribute('data-copy', elements.entryPrice.value);
        
        elements.resultSLPrice.textContent = parseFloat(elements.slPrice.value).toFixed(isJPYPair(elements.currencyPair.value) ? 3 : 5);
        elements.resultSLPrice.setAttribute('data-copy', elements.slPrice.value);
        
        elements.resultTPPrice.textContent = parseFloat(elements.tpPrice.value).toFixed(isJPYPair(elements.currencyPair.value) ? 3 : 5);
        elements.resultTPPrice.setAttribute('data-copy', elements.tpPrice.value);
        
        elements.positionSize.textContent = (lotSize * 100000).toFixed(0);
        elements.positionSize.setAttribute('data-copy', (lotSize * 100000).toFixed(0));
        
        elements.riskRewardRatio.textContent = riskReward;
        elements.riskRewardRatio.setAttribute('data-copy', riskReward);
    }
}

// ==========================================
//  3. SCANNER & UTILS
// ==========================================

function setupOCR() {
    elements.uploadArea.addEventListener('click', () => elements.screenshotInput.click());
    
    elements.screenshotInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) processImage(file);
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    elements.uploadArea.addEventListener('dragover', () => {
        elements.uploadArea.style.borderColor = '#3498db';
        elements.uploadArea.style.backgroundColor = '#ebf8ff';
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.style.borderColor = '#cbd5e0';
        elements.uploadArea.style.backgroundColor = '#ffffff';
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        elements.uploadArea.style.borderColor = '#cbd5e0';
        elements.uploadArea.style.backgroundColor = '#ffffff';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImage(file);
        }
    });

    document.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.includes('image/')) {
                const blob = item.getAsFile();
                elements.uploadArea.style.borderColor = '#3498db';
                elements.uploadArea.style.backgroundColor = '#ebf8ff';
                setTimeout(() => {
                    elements.uploadArea.style.borderColor = '#cbd5e0';
                    elements.uploadArea.style.backgroundColor = '#ffffff';
                }, 500);
                processImage(blob);
            }
        }
    });
    
    elements.applyOCR.addEventListener('click', function() {
        const pairVal = elements.ocrPair.value;
        const entryVal = elements.ocrEntry.value;
        const slVal = elements.ocrSL.value;
        const tpVal = elements.ocrTP.value;
        
        if (pairVal) elements.currencyPair.value = pairVal.toUpperCase();
        if (entryVal && !isNaN(parseFloat(entryVal))) elements.entryPrice.value = entryVal;
        if (slVal && !isNaN(parseFloat(slVal))) elements.slPrice.value = slVal;
        if (tpVal && !isNaN(parseFloat(tpVal))) elements.tpPrice.value = tpVal;
        
        updateSLPips();
        updateTPPips();
        elements.ocrResults.style.display = 'none';
    });
}

function processImage(file) {
    const statusDiv = document.getElementById('ocrStatus');
    if(statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reading image...';
    }
    elements.ocrResults.style.display = 'none';

    const reader = new FileReader();
    reader.onload = function(e) {
        if (typeof Tesseract === 'undefined') {
            alert("Scanner library not loaded.");
            if(statusDiv) statusDiv.style.display = 'none';
            return;
        }

        Tesseract.recognize(e.target.result, 'eng', {
            logger: m => console.log(m)
        }).then(({ data: { text } }) => {
            if(statusDiv) statusDiv.style.display = 'none';
            extractPricesWithClusterLogic(text);
        }).catch(err => {
            console.error(err);
            if(statusDiv) statusDiv.style.display = 'none';
            alert("Scanner Error: " + (err.message || "Unknown error"));
        });
    };
    reader.readAsDataURL(file);
}

function extractPricesWithClusterLogic(text) {
    const cleanText = text.replace(/,/g, '');
    let pair = '';
    
    // Pair Detection
    const pairRegex = /\b[A-Z]{3}\/?[A-Z]{3}\b/;
    const pairMatch = cleanText.match(pairRegex);
    if (pairMatch) {
        pair = pairMatch[0].replace('/', '').toUpperCase();
        if(pair.length === 6) pair = pair.slice(0,3) + "/" + pair.slice(3);
    }

    // Number Extraction & Filtering
    const allNumberRegex = /\d+\.\d+/g;
    const allMatches = cleanText.match(allNumberRegex) || [];
    
    let candidates = allMatches.map(n => parseFloat(n)).filter(num => {
        if (num < 0.05) return false; // Filter percentages/distances
        if (num > 5000) return false; // Filter amounts
        return true;
    });

    candidates = [...new Set(candidates)].sort((a, b) => a - b);

    // Cluster Logic
    let bestCluster = [];
    let bestSpread = Infinity;

    if (candidates.length >= 3) {
        for (let i = 0; i <= candidates.length - 3; i++) {
            const window = [candidates[i], candidates[i+1], candidates[i+2]];
            const spread = (window[2] - window[0]) / window[0];
            if (spread < bestSpread) {
                bestSpread = spread;
                bestCluster = window;
            }
        }
    } else {
        bestCluster = candidates;
    }

    // Assign Values
    let entry = '', sl = '', tp = '';
    if (bestCluster.length === 3) {
        sl = bestCluster[0];
        entry = bestCluster[1];
        tp = bestCluster[2];
        
        if (text.toLowerCase().includes('short') || text.toLowerCase().includes('sell')) {
            tp = bestCluster[0];
            sl = bestCluster[2];
        }
    } else if (bestCluster.length > 0) {
        entry = bestCluster[0];
    }

    elements.ocrPair.value = pair;
    elements.ocrEntry.value = entry;
    elements.ocrSL.value = sl;
    elements.ocrTP.value = tp;
    
    elements.ocrResults.style.display = 'flex';
}

function setupCopyFunctionality() {
    document.querySelectorAll('.result-value').forEach(element => {
        element.addEventListener('click', function() {
            const value = this.getAttribute('data-copy');
            if (value && value !== '0') {
                navigator.clipboard.writeText(value).then(() => {
                    this.classList.add('copied');
                    setTimeout(() => this.classList.remove('copied'), 500);
                });
            }
        });
    });
}

function setupPairSuggestions() {
    elements.currencyPair.addEventListener('input', function() {
        const value = this.value.toUpperCase();
        const type = elements.pairType.value;
        const suggestions = currencyPairs[type] || [];
        const filtered = suggestions.filter(pair => pair.includes(value));
        
        if (filtered.length > 0 && value.length > 0) {
            elements.pairSuggestions.innerHTML = filtered.map(pair => 
                `<div class="suggestion-item" data-pair="${pair}">${pair}</div>`
            ).join('');
            elements.pairSuggestions.style.display = 'block';
        } else {
            elements.pairSuggestions.style.display = 'none';
        }
    });
    
    elements.pairSuggestions.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion-item')) {
            elements.currencyPair.value = e.target.getAttribute('data-pair');
            elements.pairSuggestions.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.pair-input-container')) {
            elements.pairSuggestions.style.display = 'none';
        }
    });
}

function setupEventListeners() {
    elements.riskAmount.addEventListener('input', updateRiskPercentage);
    elements.riskPercentage.addEventListener('input', updateRiskAmount);
    elements.accountBalance.addEventListener('input', () => {
        updateRiskPercentage();
        updateRiskAmount();
    });
    elements.entryPrice.addEventListener('input', () => { updateSLPips(); updateTPPips(); });
    elements.slPrice.addEventListener('input', updateSLPips);
    elements.slPips.addEventListener('input', updateSLPrice);
    elements.tpPrice.addEventListener('input', updateTPPips);
    elements.tpPips.addEventListener('input', updateTPPrice);
    elements.currencyPair.addEventListener('change', () => { updateSLPips(); updateTPPips(); });
    elements.tradeDirection.addEventListener('change', () => { updateSLPrice(); updateTPPrice(); });
    elements.calculateBtn.addEventListener('click', updateResults);
}

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupCopyFunctionality();
    setupPairSuggestions();
    setupOCR();
    updateRiskPercentage();
    updateSLPips();
    updateTPPips();
});
