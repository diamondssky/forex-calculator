document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURATION ---
    const SCOPE = {
        // FULL INSTRUMENT LIST
        pairs: [
            "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD", 
            "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "NZDJPY",
            "EURCAD", "GBPCAD", "AUDCAD", "AUDNZD",
            "XAUUSD", "XAGUSD"
        ],
        scalars: {
            'DEFAULT': 10000,
            'JPY': 100,
            'XAU': 100
        },
        thresholds: {
            'DEFAULT': 3,
            'JPY': 5,
            'XAU': 50
        }
    };

    // --- 2. DOM ELEMENTS ---
    const els = {
        pair: document.getElementById('currency-pair'),
        contract: document.getElementById('contract-size'),
        mode: document.getElementById('exec-mode'),
        modeText: document.getElementById('mode-text'),
        
        equity: document.getElementById('equity'),
        accountSize: document.getElementById('account-size'),
        riskVal: document.getElementById('risk-value'),
        riskType: document.getElementById('risk-type'),
        
        entry: document.getElementById('entry-price'),
        sl: document.getElementById('sl-price'),
        tp: document.getElementById('tp-price'),
        points: document.getElementById('sl-points'),
        
        resultMode: document.getElementById('result-mode'),
        resLots: document.getElementById('res-lots'),
        resRiskLbl: document.getElementById('res-risk-lbl'),
        resRisk: document.getElementById('res-risk'),
        resValPoint: document.getElementById('res-val-per-point'),
        resEquityDelta: document.getElementById('res-equity-delta'),
        bufferMsg: document.getElementById('buffer-msg'),
        hintBox: document.getElementById('exec-hint')
    };

    // --- 3. STATE ---
    const state = {
        quoteToUsdRate: 1, // Default to 1
        isJpy: false,
        isGold: false,
        lastInput: Date.now()
    };

    // --- 4. INIT ---
    function init() {
        // Populate Instrument Dropdown
        SCOPE.pairs.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            els.pair.appendChild(opt);
        });

        // Event Listeners
        const inputs = [els.equity, els.accountSize, els.riskVal, els.entry, els.sl, els.tp];
        inputs.forEach(el => {
            if(el) {
                el.addEventListener('input', () => {
                    state.lastInput = Date.now();
                    calculate();
                });
                // Auto-clean long decimals on blur
                el.addEventListener('blur', (e) => cleanInput(e.target));
            }
        });
        
        els.riskType.addEventListener('change', calculate);
        els.resultMode.addEventListener('change', calculate);
        
        els.pair.addEventListener('change', updateInstrument);
        
        if(els.mode) {
            els.mode.addEventListener('change', () => {
                const isMarket = els.mode.checked;
                els.modeText.innerText = isMarket ? "MARKET (EXECUTION)" : "LIMIT (PLANNING)";
                els.modeText.style.color = isMarket ? "#3b82f6" : "#737373";
                calculate();
            });
        }

        updateInstrument(); 
    }

    // --- 5. CLEAN INPUT HELPER ---
    function cleanInput(el) {
        if (!el.value) return;
        const val = parseFloat(el.value);
        if (el.value.length > 8) {
             el.value = val.toFixed(5);
        }
    }

    // --- 6. INSTRUMENT CONFIG ---
    async function updateInstrument() {
        // Reset Rate default
        state.quoteToUsdRate = 1;
        
        const pair = els.pair.value;
        const quote = pair.slice(3);

        state.isJpy = quote === 'JPY';
        state.isGold = pair === 'XAUUSD';
        
        if (state.isGold) state.scalar = SCOPE.scalars.XAU;
        else if (state.isJpy) state.scalar = SCOPE.scalars.JPY;
        else state.scalar = SCOPE.scalars.DEFAULT;

        const precision = state.isJpy ? "0.01" : (state.isGold ? "0.01" : "0.00001");
        els.entry.step = els.sl.step = els.tp.step = precision;

        if (state.isGold) els.contract.value = "100";
        else els.contract.value = "100000";

        // SILENT API FETCH (BACKGROUND ONLY)
        // Needed for Cross Pairs (e.g. AUDCAD -> CADUSD rate needed)
        if (quote !== 'USD') {
            try {
                const res = await fetch(`https://api.frankfurter.app/latest?from=${quote}&to=USD`);
                const data = await res.json();
                if (data.rates && data.rates.USD) {
                    state.quoteToUsdRate = data.rates.USD;
                }
            } catch (e) {
                // Silent Fail - Defaults to 1.0
            }
        }
        
        calculate();
    }

    // --- 7. HINTS ---
    function checkHints(isMarket, points, threshold) {
        els.hintBox.innerHTML = "";
        els.hintBox.classList.add("hidden");

        if (isMarket && points < threshold) {
            els.hintBox.innerHTML = `⚠️ <b>UNSAFE SPREAD</b><br>Distance is too tight for market execution.`;
            els.hintBox.classList.remove("hidden");
        }
    }

    // --- 8. CORE MATH ENGINE ---
    function calculate() {
        const equity = parseFloat(els.equity.value) || 0;
        const riskInput = parseFloat(els.riskVal.value) || 0;
        const entry = parseFloat(els.entry.value) || 0;
        const sl = parseFloat(els.sl.value) || 0;
        const tp = parseFloat(els.tp.value) || 0;
        const contract = parseFloat(els.contract.value);
        const isMarket = els.mode.checked;

        if (!entry || !sl || !equity) {
            renderOutput(0, 0, 0, "WAITING FOR INPUT", "-", "RISK", "text-flat");
            return;
        }

        // A) Risk
        const riskAmount = (els.riskType.value === 'percent') 
            ? equity * (riskInput / 100) 
            : riskInput;

        // B) Points
        const rawDist = Math.abs(entry - sl);
        const points = rawDist * state.scalar;
        els.points.value = points.toFixed(1);

        // C) Hints
        let threshold = SCOPE.thresholds.DEFAULT;
        if(state.isJpy) threshold = SCOPE.thresholds.JPY;
        if(state.isGold) threshold = SCOPE.thresholds.XAU;
        
        checkHints(isMarket, points, threshold);

        // D) VPPL
        let vppl = 0;
        if (els.pair.value.endsWith("USD")) {
            vppl = (1 / state.scalar) * contract;
        } 
        else if (els.pair.value.startsWith("USD")) {
            vppl = ((1 / state.scalar) * contract) / entry;
        } 
        else {
            const valInQuote = (1 / state.scalar) * contract;
            valuePerPointPerLot = valInQuote * state.quoteToUsdRate;
            vppl = valuePerPointPerLot;
        }

        // E) Lots
        let lots = 0;
        if (points > 0 && vppl > 0) {
            lots = riskAmount / (points * vppl);
        }

        // F) Buffer & Rounding
        let msg = "LIMIT (EXACT)";
        if (isMarket) {
            lots = lots * 0.95; 
            msg = "MARKET (-5% BUFFER)";
        }
        lots = Math.floor(lots * 100) / 100;

        // G) Gain & Drawdown
        let displayVal = riskAmount;
        let displayLbl = "RISK";
        
        if (els.resultMode.value === 'gain' && tp > 0) {
            const tpDist = Math.abs(entry - tp);
            const tpPoints = tpDist * state.scalar;
            displayVal = lots * tpPoints * vppl;
            displayLbl = "POTENTIAL GAIN";
        }

        // H) Equity Delta (Symmetric)
        const accountSize = parseFloat(els.accountSize.value) || 0;
        let deltaText = "-";
        let deltaClass = "text-flat";

        if (accountSize > 0) {
            const deltaPct = ((equity - accountSize) / accountSize) * 100;
            const sign = deltaPct > 0 ? "+" : "";
            deltaText = `${sign}${deltaPct.toFixed(2)}%`;

            if (deltaPct > 0) deltaClass = "text-profit";
            else if (deltaPct < 0) deltaClass = "text-drawdown";
        }

        renderOutput(lots, displayVal, vppl, msg, deltaText, displayLbl, deltaClass);
    }

    function renderOutput(lots, val, vppl, msg, deltaText, lbl, deltaClass) {
        els.resLots.innerText = lots.toFixed(2);
        els.resLots.style.color = (lots === 0) ? "#737373" : "#e5e5e5";
        
        els.resRiskLbl.innerText = lbl;
        els.resRisk.innerText = "$" + val.toFixed(2);
        els.resRisk.style.color = (lbl.includes("GAIN")) ? "#22c55e" : "#e5e5e5";

        els.resValPoint.innerText = "$" + (vppl * (state.isJpy || state.isGold ? 1 : 10)).toFixed(2); 
        els.bufferMsg.innerText = msg;
        
        // Render Equity Delta
        els.resEquityDelta.innerText = deltaText;
        els.resEquityDelta.className = "mono " + deltaClass;
    }

    init();
});
