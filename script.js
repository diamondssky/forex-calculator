// Flattened Database (All pairs in one list since "Pair Type" is gone)
const allPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CHF/JPY', 'EUR/CHF', 'GBP/CHF',
    'EUR/CAD', 'EUR/AUD', 'EUR/NZD', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD', 'AUD/CAD',
    'AUD/NZD', 'NZD/CAD', 'NZD/JPY', 'CAD/JPY', 'AUD/CHF', 'CAD/CHF', 'NZD/CHF',
    'USD/TRY', 'USD/MXN', 'USD/ZAR', 'USD/SGD', 'USD/HKD', 'USD/SEK', 'USD/DKK',
    'USD/NOK', 'XAU/USD', 'XAG/USD', 'BTC/USD', 'ETH/USD' // Added Gold/Crypto basics
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
//  MATH FUNCTIONS
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
        elements.slPrice.value = slPrice.toFixed(isJPYPair(pair) ? 3 : 5);
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
        elements.tpPrice.value = tpPrice.toFixed(isJPYPair(pair) ? 3 : 5);
    }
    updateResults(); 
}

function calculatePositionSize() {
    const balance = parseFloat(elements.accountBalance.value) || 0;
    const riskAmount = parseFloat(elements.riskAmount.value) || 0;
    const slPips = parseFloat(elements.slPips.value) || 0;
    const pair = elements.currencyPair.value;
    
    if (!balance || !riskAmount || !slPips) return 0;
    
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
    
    if (lotSize > 0) {
        elements.standardLots.textContent = lotSize.toFixed(2);
        elements.standardLots.setAttribute('data-copy', lotSize.toFixed(2));
        
        elements.resultEntryPrice.textContent = parseFloat(elements.entryPrice.value || 0).toFixed(isJPYPair(elements.currencyPair.value) ? 3 : 5);
        elements.resultSLPrice.textContent = parseFloat(elements.slPrice.value || 0).toFixed(isJPYPair(elements.currencyPair.value) ? 3 : 5);
        
        elements.positionSize.textContent = (lotSize * 100000).toFixed(0);
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
        // Just filter the one big list now
        const filtered = allPairs.filter(pair => pair.includes(value));
        
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
    elements.accountBalance.addEventListener('input', () => { updateRiskPercentage(); updateRiskAmount(); });
    
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
    updateRiskPercentage();
});
