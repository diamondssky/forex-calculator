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

// Global variable to store the "Pip Value in USD" fetched from the internet
let currentPipValueUSD = 10; // Default fallback

// ==========================================
//  2. API & LIVE DATA FUNCTIONS
// ==========================================

async function fetchLivePipValue() {
    const pair = elements.currencyPair.value.toUpperCase();
    const accountCurrency = "USD"; // Assuming USD account for now
    
    // 1. If it's a USD pair (EUR/USD), value is always $10. No API needed.
    if (pair.endsWith('USD')) {
        currentPipValueUSD = 10;
        updateResults();
        return;
    }

    // 2. Identify the "Quote Currency" (The second one: JPY, CAD, CHF...)
    // Example: GBP/JPY -> Quote is JPY. We need USD/JPY rate.
    const quoteCurrency = pair.slice(-3); // Last 3 letters
    
    // We need to know: How much is 1 USD worth in that Quote Currency?
    // API Call: "Get rates for USD"
    try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${accountCurrency}&to=${quoteCurrency}`);
        const data = await response.json();
        
        const exchangeRate = data.rates[quoteCurrency];
        
        if (exchangeRate) {
            // MATH:
            // Standard Lot = 100,000 units.
            // 1 Pip in Quote Currency = 0.0001 (or 0.01 for JPY).
            // Value in Account Currency = (100,000 * PipUnit) / ExchangeRate
            
            let basePipUnit = quoteCurrency === 'JPY' ? 0.01 : 0.0001;
            
            // Special case for Gold/Silver if supported later
            if (pair.includes('XAU')) basePipUnit = 0.01; 

            currentPipValueUSD = (100000 * basePipUnit) / exchangeRate;
            
            console.log(`Live Rate Fetched! 1 Pip for ${pair} = $${currentPipValueUSD.toFixed(2)}`);
            updateResults();
        }
    } catch (error) {
        console.error("API Error (Using fallback):", error);
        // Fallback Logic if internet fails
        if (pair.startsWith('USD')) {
            const currentPrice = parseFloat(elements.entryPrice.value) || 1;
            currentPipValueUSD = (quoteCurrency === 'JPY' ? 1000 : 10) / currentPrice;
        } else {
            currentPipValueUSD = 10; // Safe average
        }
        updateResults();
    }
}

// ==========================================
//  3. STANDARD MATH FUNCTIONS
// ==========================================

function getPipValue(pair) {
    return pair.includes('JPY') ? 0.01 : 0.0001;
}

function isJPYPair(pair) {
    return pair.includes('JPY');
}

function updateInputPrecision() {
    const pair = elements.currencyPair.value.toUpperCase();
    let step = "0.00001"; 
    if (isJPYPair(pair) || pair.includes('XAU')) {
        step = "0.001"; 
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
        const decimals = (isJPYPair(pair) || pair.includes('XAU')) ? 3 : 5;
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
        const decimals = (isJPYPair(pair) || pair.includes('XAU')) ? 3 : 5;
        elements.tpPrice.value = tpPrice.toFixed(decimals);
    }
    updateResults();
}

function calculatePositionSize() {
    const riskAmount = parseFloat(elements.riskAmount.value) || 0;
    const slPips = parseFloat(elements.slPips.value) || 0;
    
    if (!riskAmount || !slPips) return 0;
    
    // USE THE LIVE FETCHED VALUE!
    const lotSize = riskAmount / (slPips * currentPipValueUSD);
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
    const decimals = (isJPYPair(pair) || pair.includes('XAU')) ? 3 : 5;

    if (lotSize > 0) {
        elements.standardLots.textContent = lotSize.toFixed(2);
        elements.standardLots.setAttribute('data-copy', lotSize.toFixed(2));
        
        elements.resultEntryPrice.textContent = parseFloat(elements.entryPrice.value || 0).toFixed(decimals);
        elements.resultSLPrice.textContent = parseFloat(elements.slPrice.value || 0).toFixed(decimals);
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
            // Trigger Live Data Fetch
            updateInputPrecision();
            fetchLivePipValue(); 
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
        fetchLivePipValue(); // Fetch data when user manually changes text and hits enter
    });
    
    elements.tradeDirection.addEventListener('change', () => { updateSLPrice(); updateTPPrice(); });
    elements.calculateBtn.addEventListener('click', updateResults);
}

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupCopyFunctionality();
    setupPairSuggestions();
    updateInputPrecision();
    updateRiskPercentage();
    fetchLivePipValue(); // Initial Fetch
});
