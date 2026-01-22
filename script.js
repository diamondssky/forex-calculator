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
            'METAL': 100 
        },
        thresholds: {
            'DEFAULT': 3,
            'JPY': 5,
            'METAL': 50 
        }
    };

    // --- 2. DOM ELEMENTS ---
    const els = {
        pairInput: document.getElementById('currency-pair'), 
        pairOptions: document.getElementById('pair-options'),
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
        quoteToUsdRate: 1, 
        isJpy: false,
        isGold: false,
        isSilver: false,
        lastInput: Date.now()
    };

    // --- 4. INIT ---
    function init() {
        // Build Custom Dropdown Options
        renderOptions(SCOPE.pairs);

        // Event: Search/Filter
        els.pairInput.addEventListener('input', (e) => {
            const term = e.target.value.toUpperCase();
            const filtered = SCOPE.pairs.filter(p => p.includes(term));
            renderOptions(filtered);
            els.pairOptions.classList.remove('hidden');
        });

        // Event: Show Options on Focus/Click
        els.pairInput.addEventListener('focus', () => {
            els.pairOptions.classList.remove('hidden');
        });

        // Event: Hide Options on Click Outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#pair-wrapper')) {
                els.pairOptions.classList.add('hidden');
            }
        });

        // Event Listeners for Math
        const inputs = [els.equity, els.accountSize, els.riskVal, els.entry, els.sl, els.tp];
        inputs.forEach(el => {
            if(el) {
                el.addEventListener('input', () => {
                    state.lastInput = Date.now();
                    calculate();
                });
                el.addEventListener('blur', (e) => cleanInput(e.target));
            }
        });
        
        els.riskType.addEventListener('change', calculate);
        els.resultMode.addEventListener('change', calculate);
        
        if(els.mode) {
            els.mode.addEventListener('change', () => {
                const isMarket = els.mode.checked;
                els.modeText.innerText = isMarket ? "MARKET (EXECUTION)" : "LIMIT (PLANNING)";
                els.modeText.style.color = isMarket ? "#3b82f6" : "#737373";
                calculate();
            });
        }
    }

    // --- 5. DROPDOWN LOGIC ---
    function renderOptions(pairs) {
        els.pairOptions.innerHTML = '';
        if(pairs.length === 0) {
            const div = document.createElement('div');
            div.className = 'option-item';
            div.textContent = "No results";
            els.pairOptions.appendChild(div);
            return;
        }
        pairs.forEach(p => {
            const div = document.createElement('div');
            div.className = 'option-item';
            div.textContent = p;
            div.addEventListener('click', () => selectInstrument(p));
            els.pairOptions.appendChild(div);
        });
    }

    function selectInstrument(pair) {
        els.pairInput.value = pair;
        els.pairOptions.classList.add('hidden');
        updateInstrument();
    }

    function cleanInput(el) {
        if (!el.value) return;
        const val = parseFloat(el.value);
        if (el.value.length > 8) {
             el.value = val.toFixed(5);
        }
    }

    // --- 6. INSTRUMENT CONFIG ---
    async function updateInstrument() {
        state.quoteToUsdRate = 1;
        
        const pair = els.pairInput.value;
        
        // Safety: If empty, clear calculation and return
        if(!pair) {
            renderOutput(0, 0, 0, "WAITING FOR INPUT", "-", "RISK", "text-flat");
            return;
        }

        const quote = pair.slice(3);

        state.isJpy = quote === 'JPY';
        state.isGold = pair === 'XAUUSD';
        state.isSilver = pair === 'XAGUSD';
        
        // 1. Set Scalar
        if (state.isGold || state.isSilver) state.scalar = SCOPE.scalars.METAL;
        else if (state.isJpy) state.scalar = SCOPE.scalars.JPY;
        else state.scalar = SCOPE.scalars.DEFAULT;

        // 2. Set Decimals Step
        const precision = state.isJpy ? "0.01" : (state.isGold || state.isSilver ? "0.01" : "0.00001");
        els.entry.step = els.sl.step = els.tp.step = precision;

        // 3. Set Contract Size
        if (state.isGold) {
            els.contract.value = "100";
        } 
        else if (state.isSilver) {
            let hasSilverOpt = Array.from(els.contract.options).some(o => o.value === "5000");
            if (!hasSilverOpt) {
                const opt = new Option("Silver (5000)", "5000");
                els.contract.add(opt);
            }
            els.contract.value = "5000";
        } 
        else {
            els.contract.value = "100000";
        }

        // 4. API Fetch for Cross Pairs
        if (quote !== 'USD') {
            try {
                const res = await fetch(`https://api.frankfurter.app/latest?from=${quote}&to=USD`);
                const data = await res.json();
                if (data.rates && data.rates.USD) {
                    state.quoteToUsdRate = data.rates.USD;
                }
            } catch (e) {
                // Silent Fail
            }
        }
        
        calculate();
    }

    // --- 7. HINTS & MATH ---
    function checkHints(isMarket, points, threshold) {
        els.hintBox.innerHTML = "";
        els.hintBox.classList.add("hidden");

        if (isMarket && points < threshold) {
            els.hintBox.innerHTML = `⚠️ <b>UNSAFE SPREAD</b><br>Distance is too tight for market execution.`;
            els.hintBox.classList.remove("hidden");
        }
    }

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

        const riskAmount = (els.riskType.value === 'percent') 
            ? equity * (riskInput / 100) 
            : riskInput;

        const rawDist = Math.abs(entry - sl);
        const points = rawDist * state.scalar;
        els.points.value = points.toFixed(1);

        let threshold = SCOPE.thresholds.DEFAULT;
        if(state.isJpy) threshold = SCOPE.thresholds.JPY;
        if(state.isGold || state.isSilver) threshold = SCOPE.thresholds.METAL;
        
        checkHints(isMarket, points, threshold);

        let vppl = 0;
        if (els.pairInput.value.endsWith("USD")) {
            vppl = (1 / state.scalar) * contract;
        } 
        else if (els.pairInput.value.startsWith("USD")) {
            vppl = ((1 / state.scalar) * contract) / entry;
        } 
        else {
            const valInQuote = (1 / state.scalar) * contract;
            vppl = valInQuote * state.quoteToUsdRate;
        }

        let lots = 0;
        if (points > 0 && vppl > 0) {
            lots = riskAmount / (points * vppl);
        }

        let msg = "LIMIT (EXACT)";
        if (isMarket) {
            lots = lots * 0.95; 
            msg = "MARKET (-5% BUFFER)";
        }
        lots = Math.floor(lots * 100) / 100;

        let displayVal = riskAmount;
        let displayLbl = "RISK";
        
        if (els.resultMode.value === 'gain' && tp > 0) {
            const tpDist = Math.abs(entry - tp);
            const tpPoints = tpDist * state.scalar;
            displayVal = lots * tpPoints * vppl;
            displayLbl = "POTENTIAL GAIN";
        }

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

        let displayMultiplier = (state.isJpy || state.isGold || state.isSilver) ? 1 : 10;

        renderOutput(lots, displayVal, vppl * displayMultiplier, msg, deltaText, displayLbl, deltaClass);
    }

    function renderOutput(lots, val, vpplDisplay, msg, deltaText, lbl, deltaClass) {
        els.resLots.innerText = lots.toFixed(2);
        els.resLots.style.color = (lots === 0) ? "#737373" : "#e5e5e5";
        
        els.resRiskLbl.innerText = lbl;
        els.resRisk.innerText = "$" + val.toFixed(2);
        els.resRisk.style.color = (lbl.includes("GAIN")) ? "#22c55e" : "#e5e5e5";

        els.resValPoint.innerText = "$" + vpplDisplay.toFixed(2); 
        els.bufferMsg.innerText = msg;
        
        els.resEquityDelta.innerText = deltaText;
        els.resEquityDelta.className = "mono " + deltaClass;
    }

    init();
});
