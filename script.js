// Inicialização do Web App Telegram
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
}

let balanceVisible = false;
let currentUser = null; 
let transactions = []; 
let charts = {}; 

// NOVA FUNÇÃO INIT (Força Dark Mode no início)
function init() {
    // Verifica se o usuário JÁ escolheu o modo claro anteriormente.
    if (localStorage.theme === 'light') {
        // Se sim, remove a classe dark e ajusta o ícone para lua
        document.documentElement.classList.remove('dark');
        const icon = document.getElementById('theme-icon');
        if(icon) {
             icon.classList.remove('fa-sun');
             icon.classList.add('fa-moon');
        }
    } else {
        // Se for a primeira visita OU se ele já preferia dark:
        // Garante que a classe dark existe e o ícone é o sol.
        // (O HTML já deve ter class="dark", mas isso garante o estado correto do JS)
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('theme-icon');
        if(icon) {
             icon.classList.remove('fa-moon');
             icon.classList.add('fa-sun');
        }
    }

    // Verifica sessão do usuário
    const storedUser = sessionStorage.getItem('soberanus_user');
    if (storedUser) loginUser(JSON.parse(storedUser));
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    const icon = document.getElementById('theme-icon');
    if(icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleBalance() {
    balanceVisible = !balanceVisible;
    const icon = document.getElementById('balance-icon');
    if(icon) icon.className = balanceVisible ? 'fas fa-eye-slash' : 'fas fa-eye';
    calculateMetrics();
}

function showLogin() { document.getElementById('auth-forms').classList.remove('hidden'); switchAuthMode('login'); }
function showRegister() { document.getElementById('auth-forms').classList.remove('hidden'); switchAuthMode('register'); }
function closeAuth() { document.getElementById('auth-forms').classList.add('hidden'); }
function switchAuthMode(mode) {
    document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', mode !== 'register');
}
function performRegister() {
    const user = document.getElementById('reg-username').value;
    if(!user) return alert('Identificação necessária.');
    localStorage.setItem('sob_user_' + user, JSON.stringify({ username: user, createdAt: new Date() }));
    loginUser({ username: user }); closeAuth();
}
function performLogin() {
    const user = document.getElementById('login-username').value;
    let userData = JSON.parse(localStorage.getItem('sob_user_' + user));
    if (!userData) userData = { username: user }; 
    loginUser(userData); closeAuth();
}
function loginUser(user) {
    currentUser = user; sessionStorage.setItem('soberanus_user', JSON.stringify(user));
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('user-section').classList.remove('hidden');
    document.getElementById('header-username').textContent = user.username;
    document.getElementById('dash-username').textContent = user.username;
    loadTransactions(); updateDashboard();
}
function logout() { sessionStorage.removeItem('soberanus_user'); window.location.reload(); }

function loadTransactions() { const data = localStorage.getItem('sob_tx_' + currentUser.username); transactions = data ? JSON.parse(data) : []; }
function saveTransactions() { localStorage.setItem('sob_tx_' + currentUser.username, JSON.stringify(transactions)); updateDashboard(); }
function updateDashboard() { updateHistoryTable(); calculateMetrics(); renderCharts(); }

function calculateMetrics() {
    let totalIn = 0, totalOut = 0, currentHoldings = 0, totalFees = 0; 
    transactions.forEach(t => { 
        const extraFee = parseFloat(t.feeFixed || 0);
        totalFees += extraFee;
        if(t.type === 'BUY') { totalIn += t.fiatValue; currentHoldings += t.cryptoValue; } 
        else { totalOut += t.fiatValue; currentHoldings -= t.cryptoValue; } 
    });
    const estimatedFiatBalance = currentHoldings * 1.00; 
    const pnl = (totalOut - totalIn) - totalFees + estimatedFiatBalance;
    
    const balanceEl = document.getElementById('total-balance-display');
    if(balanceEl) balanceEl.innerText = balanceVisible ? `R$ ${estimatedFiatBalance.toFixed(2)}` : `R$ •••••`;
    
    const pnlEl = document.getElementById('pnl-value');
    if(pnlEl) {
        pnlEl.innerText = `R$ ${pnl.toFixed(2)}`;
        pnlEl.className = `text-xl md:text-2xl font-bold tracking-tight ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
    }
    const totalInEl = document.getElementById('total-in');
    if(totalInEl) totalInEl.innerText = `R$ ${totalIn.toFixed(0)}`;
    const totalOutEl = document.getElementById('total-out');
    if(totalOutEl) totalOutEl.innerText = `R$ ${totalOut.toFixed(0)}`;
    
    const pnlBar = document.getElementById('pnl-bar');
    if(pnlBar) {
        pnlBar.style.width = '100%';
        pnlBar.className = `h-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`;
    }
}

function registerTransaction(type) {
    const valFiat = parseFloat(document.getElementById('inp-fiat').value)||0;
    const valCrypto = parseFloat(document.getElementById('inp-crypto').value)||0;
    const feePct = parseFloat(document.getElementById('inp-fee-pct').value)||0;
    const feeFixed = parseFloat(document.getElementById('inp-fee-fixed').value)||0;
    const dateInput = document.getElementById('inp-date').value;
    if(valFiat <= 0 || !dateInput) return alert("Dados inválidos.");
    const parts = dateInput.split('-');
    const tx = { id: Date.now(), date: new Date(parts[0], parts[1]-1, parts[2], 12,0,0).toISOString(), type, fiatValue: valFiat, cryptoValue: valCrypto, feePct, feeFixed, feeFiatTotal: feeFixed };
    transactions.push(tx); saveTransactions(); closeModal();
}

function openModal(type) {
    const overlay = document.getElementById('modal-overlay'); const body = document.getElementById('modal-body'); overlay.classList.remove('hidden');
    const today = new Date().toISOString().split('T')[0];
    const inputClass = "w-full bg-gray-100 dark:bg-dark-800 border border-gray-300 dark:border-gray-700 rounded p-3 text-gray-900 dark:text-white focus:border-gold-500 outline-none placeholder-gray-500 text-sm";
    const labelClass = "block text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold";
    let html = '';

    if(type === 'modal-buy' || type === 'modal-sell') {
        const isBuy = type === 'modal-buy';
        const color = isBuy ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
        html = `<h2 class="text-xl font-bold ${color} mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 font-serif">${isBuy?'Registrar Compra':'Registrar Saque'}</h2><div class="space-y-4"><div><label class="${labelClass}">Data</label><input type="date" id="inp-date" value="${today}" class="${inputClass}"></div><div class="grid grid-cols-2 gap-4"><div><label class="${labelClass}">Valor R$</label><input type="number" id="inp-fiat" class="${inputClass}"></div><div><label class="${labelClass}">Qtd DePIX</label><input type="number" id="inp-crypto" class="${inputClass}"></div></div><div class="grid grid-cols-2 gap-4 bg-gray-5 dark:bg-white/5 p-3 rounded"><div><label class="${labelClass}">Taxa %</label><input type="number" id="inp-fee-pct" placeholder="0" class="${inputClass}"></div><div><label class="${labelClass}">Taxa Fixa R$</label><input type="number" id="inp-fee-fixed" placeholder="0" class="${inputClass}"></div></div><button onclick="registerTransaction('${isBuy?'BUY':'SELL'}')" class="w-full py-4 mt-2 font-bold rounded bg-gray-900 dark:bg-white text-white dark:text-black uppercase tracking-widest text-xs">Salvar Registro</button></div>`;
    } else if (type === 'modal-wallet') {
        let currentHoldings = 0; transactions.forEach(t => { if(t.type === 'BUY') currentHoldings += t.cryptoValue; else currentHoldings -= t.cryptoValue; });
        const valDePIX = currentHoldings;
        const valBRL = valDePIX * 1; 
        const valUSD = valBRL / 5.20; 
        const valEUR = valBRL / 5.60;
        const valSats = (valBRL / 600000) * 100000000; 
        html = `<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6 font-serif border-b border-gray-200 dark:border-white/5 pb-4">Saldos Globais</h2><div class="space-y-3">
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded"><span class="text-gray-500 text-xs font-bold">DEPIX</span><span class="text-gray-900 dark:text-white font-mono">${valDePIX.toFixed(4)}</span></div>
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded"><span class="text-orange-500 text-xs font-bold">SATOCHIS BTC</span><span class="text-gray-900 dark:text-white font-mono">${valSats.toFixed(0)}</span></div>
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded"><span class="text-green-600 dark:text-green-400 text-xs font-bold">REAL (BRL)</span><span class="text-gray-900 dark:text-white font-mono">R$ ${valBRL.toFixed(2)}</span></div>
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded"><span class="text-blue-500 text-xs font-bold">DOLLAR (USD)</span><span class="text-gray-900 dark:text-white font-mono">$ ${valUSD.toFixed(2)}</span></div>
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded"><span class="text-indigo-500 text-xs font-bold">EURO (EUR)</span><span class="text-gray-900 dark:text-white font-mono">€ ${valEUR.toFixed(2)}</span></div></div>`;
    } else if (type === 'modal-ir') {
        html = `<h2 class="text-xl font-bold text-gold-500 mb-6 font-serif">Gerar Relatório Fiscal</h2><div class="space-y-4"><input type="text" id="ir-name" placeholder="Nome Completo" class="${inputClass}"><input type="text" id="ir-cpf" placeholder="CPF" class="${inputClass}"><input type="text" id="ir-address" placeholder="Endereço Completo" class="${inputClass}"><input type="text" id="ir-cep" placeholder="CEP" class="${inputClass}"><button onclick="generatePDF()" class="w-full py-3 btn-primary rounded mt-2 text-xs uppercase tracking-widest">Baixar PDF</button></div>`;
    } else if (type === 'modal-pix') {
        html = `
            <h2 class="text-xl font-bold text-green-600 dark:text-green-500 mb-2 font-serif">Doação via PIX</h2>
            <p class="text-[10px] text-gray-400 mb-2">Regras: Mínimo R$ 5,00 | Máximo R$ 3.000,00</p>
            <p class="text-[10px] text-gray-400 mb-6">Use ponto (.) para centavos (ex: 10.50)</p>
            <div id="pix-input-area">
                <input type="number" id="pix-amount" value="10" min="5" class="${inputClass} text-center text-3xl font-bold mb-6 !py-4">
                <button onclick="fetchPixCode()" class="w-full py-4 bg-green-600 hover:bg-green-500 rounded font-bold text-black uppercase tracking-widest text-xs">Gerar QR Code</button>
            </div>
            <div id="pix-loading" class="hidden flex-col items-center">
                <div class="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden shadow-inner mb-2 progress-3d">
                    <div class="h-full w-full absolute top-0 left-0 animate-gradient-x"></div>
                </div>
                <p class="text-gold-500 text-xs font-bold animate-pulse">Preparando sua Doação...</p>
            </div>
            <div id="pix-result" class="hidden flex flex-col items-center mt-4">
                <div class="bg-white p-3 rounded mb-4" id="pix-qr-container"></div>
                <div class="flex w-full">
                    <input type="text" id="pix-string" readonly class="w-full bg-gray-100 dark:bg-dark-900 border border-gray-300 dark:border-gray-700 rounded-l p-3 text-xs font-mono text-gray-500">
                    <button onclick="copyPixString()" class="bg-gray-700 px-4 rounded-r hover:bg-gray-600 text-white"><i class="fas fa-copy"></i></button>
                </div>
            </div>
        `;
    }
    body.innerHTML = html;
}

function openDonationModal() {
    const overlay = document.getElementById('modal-overlay'); const body = document.getElementById('modal-body'); overlay.classList.remove('hidden');
    body.innerHTML = `<div class="text-center mb-8"><i class="fas fa-hand-holding-heart text-3xl text-gold-500 mb-4"></i><h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2 font-serif uppercase tracking-widest">Contribuição Soberana</h2><p class="text-xs text-gray-500">Apoio consciente. Sem obrigação.</p></div><div class="mb-6 p-4 border-l-2 border-gold-500 bg-gray-50 dark:bg-white/5 text-left"><p class="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed">"O SOBERANUS é mantido de forma independente... Se este sistema gera valor para você, contribuições voluntárias ajudam a sustentar sua continuidade."</p></div><button onclick="openModal('modal-pix')" class="w-full py-4 mb-8 bg-green-100 dark:bg-green-900/20 border border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500 hover:text-white dark:hover:text-black rounded font-bold uppercase tracking-widest text-xs transition">Doar via PIX</button><div class="space-y-3 mb-8"><div class="flex items-center justify-between bg-gray-100 dark:bg-black/40 p-3 rounded border border-gray-300 dark:border-white/5 group hover:border-gold-500/30 transition"><div><span class="text-[10px] text-gold-600 dark:text-gold-500 font-bold block uppercase">Bitcoin On-Chain</span><code class="text-[10px] text-gray-500 font-mono">bc1qvsu6...aepd</code></div><button onclick="copyAddress('bc1qvsu6n806jg8zswkvpyqxe9dujs6q5398jkaepd', 'Bitcoin On-Chain')" class="text-gray-400 hover:text-black dark:hover:text-white px-2"><i class="fas fa-copy"></i></button></div><div class="flex items-center justify-between bg-gray-100 dark:bg-black/40 p-3 rounded border border-gray-300 dark:border-white/5 group hover:border-gold-500/30 transition"><div><span class="text-[10px] text-gold-600 dark:text-gold-500 font-bold block uppercase">Bitcoin Lightning</span><code class="text-[10px] text-gray-500 font-mono">web3sats...com</code></div><button onclick="copyAddress('web3satsfinance@ln.satsails.com', 'Bitcoin Lightning')" class="text-gray-400 hover:text-black dark:hover:text-white px-2"><i class="fas fa-copy"></i></button></div><div class="flex items-center justify-between bg-gray-100 dark:bg-black/40 p-3 rounded border border-gray-300 dark:border-white/5 group hover:border-gold-500/30 transition"><div><span class="text-[10px] text-gold-600 dark:text-gold-500 font-bold block uppercase">Liquid Network</span><code class="text-[10px] text-gray-500 font-mono">lq1qq2gf...0nt</code></div><button onclick="copyAddress('lq1qq2gflwdl95jlexg6tmulcdgdlrv8jwc64ulnpp0jhs0xgx0v02vhyqqj6ag980al9gumlx3dk78q2q6yntqgzz9suuzjgf0nt', 'Liquid Network')" class="text-gray-400 hover:text-black dark:hover:text-white px-2"><i class="fas fa-copy"></i></button></div><div class="flex items-center justify-between bg-gray-100 dark:bg-black/40 p-3 rounded border border-gray-300 dark:border-white/5 group hover:border-gold-500/30 transition"><div><span class="text-[10px] text-gold-600 dark:text-gold-500 font-bold block uppercase">EVM (BSC/POL)</span><code class="text-[10px] text-gray-500 font-mono">0x135a83...8ed</code></div><button onclick="copyAddress('0x135a83c5a641a4265297853dd70b6f7565e5c8ed', 'EVM (BSC/Base/Polygon)')" class="text-gray-400 hover:text-black dark:hover:text-white px-2"><i class="fas fa-copy"></i></button></div></div><p class="text-[10px] text-gray-400 text-center uppercase tracking-wide">Nenhuma funcionalidade é bloqueada. Nenhum privilégio é comprado.<br>Apoiar é um ato de convicção.</p>`;
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function renderCharts() {
    const ctxEv = document.getElementById('evolutionChart').getContext('2d');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let buys = new Array(12).fill(0), sells = new Array(12).fill(0);
    transactions.forEach(t => { const m = new Date(t.date).getMonth(); if(t.type === 'BUY') buys[m] += t.fiatValue; else sells[m] += t.fiatValue; });
    if(charts.evolution) charts.evolution.destroy();
    charts.evolution = new Chart(ctxEv, { type: 'bar', data: { labels: months, datasets: [{ label: 'Entradas', data: buys, backgroundColor: '#22c55e', borderRadius: 2 }, { label: 'Saídas', data: sells, backgroundColor: '#ef4444', borderRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#6b7280', font: {size: 9, family: 'Mono'} } }, y: { grid: { color: 'rgba(107, 114, 128, 0.2)' }, ticks: { color: '#6b7280', font: {size: 9, family: 'Mono'} } } } } });
}

function updateHistoryTable() {
    const tbody = document.getElementById('transaction-table-body');
    tbody.innerHTML = transactions.length ? transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t => `
        <tr class="border-b border-gray-200 dark:border-white/5">
            <td class="px-2 py-3 font-mono text-gray-500 whitespace-nowrap">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
            <td class="px-2 py-3 font-bold ${t.type==='BUY'?'text-green-600 dark:text-green-500':'text-red-600 dark:text-red-500'}">${t.type==='BUY'?'ENT':'SAI'}</td>
            <td class="px-2 py-3 font-mono text-gray-900 dark:text-white text-right">R$ ${t.fiatValue.toFixed(2)}</td>
            <td class="px-2 py-3 font-mono text-gray-400 text-right">${t.cryptoValue.toFixed(4)}</td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="py-10 text-center text-gray-600">Nenhum registro</td></tr>';
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(20, 20, 20); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(212, 175, 55); doc.setFontSize(24); doc.setFont("helvetica", "bold");
    doc.text("SOBERANUS", 14, 25);
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Financial Layer | Extrato Auxiliar", 140, 25);

    const name = document.getElementById('ir-name').value || "N/A";
    const cpf = document.getElementById('ir-cpf').value || "N/A";
    const address = document.getElementById('ir-address').value || "N/A";
    const cep = document.getElementById('ir-cep').value || "N/A";
    
    doc.setTextColor(0,0,0); doc.setFontSize(10); 
    doc.text(`Contribuinte: ${name}`, 14, 50);
    doc.text(`CPF: ${cpf}`, 14, 56);
    doc.text(`Endereço: ${address}`, 14, 62);
    doc.text(`CEP: ${cep}`, 14, 68);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 72, 196, 72);

    let totalBuy = 0, totalSell = 0, totalFees = 0, totalPnL = 0;
    
    let rows = transactions.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(t => {
        const extraFee = parseFloat(t.feeFixed || 0); 
        totalFees += extraFee;
        
        if(t.type === 'BUY') {
            totalBuy += t.fiatValue;
        } else {
            totalSell += t.fiatValue;
        }
        
        return [
            new Date(t.date).toLocaleDateString('pt-BR'), 
            t.type==='BUY'?'COMPRA':'VENDA', 
            `R$ ${t.fiatValue.toFixed(2)}`, 
            `${t.cryptoValue.toFixed(4)}`, 
            t.feePct > 0 ? `${t.feePct}%` : `R$ ${extraFee.toFixed(2)}`
        ];
    });

    totalPnL = (totalSell - totalBuy) - totalFees;

    doc.autoTable({ 
        startY: 75, 
        head: [['DATA','OPERAÇÃO','VALOR BRL','QTD DEPIX','TAXAS']], 
        body: rows, 
        headStyles: {fillColor:[20,20,20], textColor:[212,175,55]} 
    });
    
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); 
    doc.text(`RESUMO CONSOLIDADO ANUAL ${new Date().getFullYear()}`, 14, finalY);
    
    doc.autoTable({
        startY: finalY + 5,
        head: [['TOTAL COMPRADO', 'TOTAL VENDIDO', 'TAXAS EXTRA', 'TOTAL LUCRO/PREJUIZO']],
        body: [[
            `R$ ${totalBuy.toFixed(2)}`,
            `R$ ${totalSell.toFixed(2)}`,
            `R$ ${totalFees.toFixed(2)}`,
            `R$ ${totalPnL.toFixed(2)}`
        ]],
        headStyles: {fillColor:[50,50,50], textColor:[255,255,255]},
        styles: {halign: 'center'}
    });

    doc.save('soberanus_report.pdf');
    closeModal();
}

async function fetchPixCode() {
    const val = document.getElementById('pix-amount').value;
    // Efeitos visuais
    document.getElementById('pix-input-area').classList.add('hidden');
    document.getElementById('pix-loading').classList.remove('hidden');
    document.getElementById('pix-loading').classList.add('flex');

    try {
        const res = await fetch(`https://liquidx.pro/api/integrated-payment?value=${val}&description=Donation&code=YITOWQXGVZETOPAY`);
        const json = await res.json();
        
        if(json.pix.success) {
            const copyPaste = json.pix.data.response.qrCopyPaste;
            document.getElementById('pix-loading').classList.add('hidden');
            document.getElementById('pix-loading').classList.remove('flex');
            document.getElementById('pix-result').classList.remove('hidden');
            document.getElementById('pix-string').value = copyPaste;
            const container = document.getElementById('pix-qr-container');
            container.innerHTML = ""; 
            new QRCode(container, { text: copyPaste, width: 180, height: 180, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
        } else { throw new Error('API Error'); }
    } catch(e) { 
        alert('Erro na comunicação com gateway.'); 
        document.getElementById('pix-loading').classList.add('hidden');
        document.getElementById('pix-loading').classList.remove('flex');
        document.getElementById('pix-input-area').classList.remove('hidden');
    }
}

function copyPixString() { navigator.clipboard.writeText(document.getElementById('pix-string').value); alert('Código Copiado!'); }
function copyAddress(address, networkName) {
    navigator.clipboard.writeText(address);
    Swal.fire({ icon: 'warning', title: 'Endereço Copiado!', html: `Você copiou o endereço da rede: <br><b>${networkName}</b><br><br>Envie APENAS através desta rede.`, background: '#1a1a1a', color: '#fff', confirmButtonColor: '#D4AF37' });
}

window.onload = init;
