// ==========================================
//  1. CONFIGURATION & DATABASE
// ==========================================
const allPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CHF/JPY', 'EUR/CHF', 'GBP/CHF',
    'EUR/CAD', 'EUR/AUD', 'EUR/NZD', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD', 'AUD/CAD',
    'AUD/NZD', 'NZD/CAD', 'NZD/JPY', 'CAD/JPY', 'AUD/CHF', 'CAD/CHF', 'NZD/CHF',
    'USD/TRY', 'USD/MXN', 'USD/ZAR', 'USD/SGD', 'USD/HKD', 'USD/SEK', 'USD/DKK',
    'USD/NOK', 'XAU/USD', 'XAG/USD', 'BTC/USD', 'ETH/USD'
];

const elements = {
    accountBalance: document.getElementById('accountBalance'),
    riskAmount: document.getElementById('riskAmount'),
    riskPercentage: document.getElementById('riskPercentage'),
    tradeDirection: document.getElementById('tradeDirection'),
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
    positionSize: document.getElementById('positionSize'),
    riskRewardRatio: document.getElementById('riskRewardRatio'),
    pairSuggestions: document.getElementById('pairSuggestions')
};

// ==========================================
//  2. SMART MATH FUNCTIONS
// ==========================================

function isJPYPair(pair) {
    return pair.includes('JPY');
}

// Check if pair is Gold (XAU), Silver (XAG), or Crypto
function isSpecialPair(pair) {
    return pair.includes('XAU') || pair.includes('XAG') || pair.includes('BTC') || pair.includes('ETH');
}

function getPipValue(pair) {
    // JPY pairs use 0.01 as base pip unit (often displayed as 0.001 with pipettes)
    if (isJPYPair(pair)) return 0.01;
    // Gold/Silver often use 0.01 or 0.1 depending on broker, 0.01 is safe standard
    if (isSpecialPair(pair)) return 0.01; 
    // Most others use 0.0001
    return 0.0001;
}

// Dynamically update input precision based on pair
function updateInputPrecision() {
    const pair = elements.currencyPair.value.toUpperCase();
    let step = "0.00001"; // Standard 5 decimals
    
    if (isJPYPair(pair) || isSpecialPair(pair)) {
        step = "0.001"; // JPY/Gold 3 decimals
    }
    
    elements.entryPrice.setAttribute("step", step);
    elements.slPrice.setAttribute("step", step);
    elements.tpPrice.setAttribute("step", step);
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
    updateResults();
}

function updateRiskAmount() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const percentage = parseFloat(elements.riskPercentage.value) || 0;
    elements.riskAmount.value = (balance * percentage / 100).toFixed(2);
    updateResults();
}

function updateSLPips() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const sl = parseFloat(elements.slPrice.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (entry && sl) {
        const pips = calculatePips(entry, sl, pair);
        elements.slPips.value = pips.toFixed(1);
    }
    updateResults();
}

function updateSLPrice() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const pips = parseFloat(elements.slPips.value) || 0;
    const pair = elements.currencyPair.value;
    const direction = elements.tradeDirection.value;
    
    if (entry && pips) {
        const slPrice = calculatePrice(entry, pips, pair, direction === 'buy' ? 'subtract' : 'add');
        // Handle decimals for JPY vs Others
        const decimals = (isJPYPair(pair) || isSpecialPair(pair)) ? 3 : 5;
        elements.slPrice.value = slPrice.toFixed(decimals);
    }
    updateResults();
}

function updateTPPips() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const tp = parseFloat(elements.tpPrice.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (entry && tp) {
        const pips = calculatePips(entry, tp, pair);
        elements.tpPips.value = pips.toFixed(1);
    }
    updateResults();
}

function updateTPPrice() {
    const entry = parseFloat(elements.entryPrice.value) || 0;
    const pips = parseFloat(elements.tpPips.value) || 0;
    const pair = elements.currencyPair.value;
    const direction = elements.tradeDirection.value;
    
    if (entry && pips) {
        const tpPrice = calculatePrice(entry, pips, pair, direction === 'buy' ? 'add' : 'subtract');
        const decimals = (isJPYPair(pair) || isSpecialPair(pair)) ? 3 : 5;
        elements.tpPrice.value = tpPrice.toFixed(decimals);
    }
    updateResults();
}

// ---------------------------------------------------------
//  CORE CALCULATION LOGIC (The most important part)
// ---------------------------------------------------------
function calculatePositionSize() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const riskAmount = parseFloat(elements.riskAmount.value) || 0;
    const slPips = parseFloat(elements.slPips.value) || 0;
    const currentPrice = parseFloat(elements.entryPrice.value) || 1; 
    const pair = elements.currencyPair.value.toUpperCase();
    
    if (!balance || !riskAmount || !slPips) return 0;
    
    // --- PIP VALUE LOGIC (USD ACCOUNT) ---
    // Standard Lot = 100,000 units
    // 1 Pip in Base Currency = 0.0001 (or 0.01 for JPY)
    
    let pipValueInUSD = 10; // Default for pairs ending in USD (EUR/USD, GBP/USD)

    if (pair.endsWith('USD')) {
        // Direct Pairs: EUR/USD, AUD/USD, etc.
        // 1 Pip = $10 USD
        pipValueInUSD = 10;
    } 
    else if (pair.startsWith('USD')) {
        // Inverse Pairs: USD/CAD, USD/CHF, USD/JPY
        // Pip Value = $10 / Exchange Rate
        if (isJPYPair(pair)) {
            // For USD/JPY, 100,000 * 0.01 = 1000 JPY. 
            // 1000 JPY / Price = USD Value
            pipValueInUSD = 1000 / currentPrice;
        } else {
            // For USD/CAD, 100,000 * 0.0001 = 10 CAD.
            // 10 CAD / Price = USD Value
            pipValueInUSD = 10 / currentPrice;
        }
    }
    else {
        // Cross Pairs (EUR/JPY, GBP/CHF)
        // Note: Accurately calculating these requires the conversion rate (e.g. USD/JPY rate for EUR/JPY).
        // Since we don't have an API, we use a standard $10 approximation or user must realize the limitation.
        // However, standard $10 is safer than returning 0.
        pipValueInUSD = 10; 
    }

    // Formula: Lot Size = Risk / (SL Pips * Pip Value)
    const lotSize = riskAmount / (slPips * pipValueInUSD);
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
    const pair = elements.currencyPair.value.toUpperCase();
    const decimals = (isJPYPair(pair) || isSpecialPair(pair)) ? 3 : 5;

    if (lotSize > 0) {
        elements.standardLots.textContent = lotSize.toFixed(2);
        elements.standardLots.setAttribute('data-copy', lotSize.toFixed(2));
        
        elements.resultEntryPrice.textContent = parseFloat(elements.entryPrice.value || 0).toFixed(decimals);
        elements.resultSLPrice.textContent = parseFloat(elements.slPrice.value || 0).toFixed(decimals);
        
        // Position Size (Units) = Lots * 100,000
        elements.positionSize.textContent = (lotSize * 100000).toLocaleString('en-US', {maximumFractionDigits: 0});
        elements.riskRewardRatio.textContent = riskReward;
    }
}

// ==========================================
//  UTILS & INIT
// ==========================================

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
        const filtered = allPairs.filter(pair => pair.includes(value));
        
        // Also Trigger Precision Update when typing
        updateInputPrecision();

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
            // Trigger updates immediately after selection
            updateInputPrecision();
            updateSLPips();
            updateTPPips();
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
    elements.accountBalance.addEventListener('input', () => { updateRiskPercentage(); updateRiskAmount(); });
    
    elements.entryPrice.addEventListener('input', () => { updateSLPips(); updateTPPips(); });
    elements.slPrice.addEventListener('input', updateSLPips);
    elements.slPips.addEventListener('input', updateSLPrice);
    elements.tpPrice.addEventListener('input', updateTPPips);
    elements.tpPips.addEventListener('input', updateTPPrice);
    
    elements.currencyPair.addEventListener('change', () => { 
        updateInputPrecision();
        updateSLPips(); 
        updateTPPips(); 
    });
    
    elements.tradeDirection.addEventListener('change', () => { updateSLPrice(); updateTPPrice(); });
    elements.calculateBtn.addEventListener('click', updateResults);
}

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupCopyFunctionality();
    setupPairSuggestions();
    updateInputPrecision(); // Set initial precision
    updateRiskPercentage();
});
