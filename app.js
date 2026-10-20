import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

lucide.createIcons();

const firebaseConfig = {
    apiKey: "AIzaSyCZO4i0vQbMxdY3DMmfnbnoNOmTBDCiE0U",
    authDomain: "athleticstracker-15125.firebaseapp.com",
    projectId: "athleticstracker-15125",
    storageBucket: "athleticstracker-15125.firebasestorage.app",
    messagingSenderId: "649006902093",
    appId: "1:649006902093:web:ffe33f07d93639af1ae504"
};

const appFB = initializeApp(firebaseConfig);
const auth = getAuth(appFB);
const db = getFirestore(appFB);

// ==========================================
// MOTOR SINTETIZADOR DE SONIDOS (Web Audio API)
// ==========================================
class SoundEffects {
    constructor() { this.ctx = null; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    playStep() {
        this.init(); if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    }
    playGun() {
        this.init(); if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
    playFoul() {
        this.init(); if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    }
    playCheer() {
        this.init(); if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.4);
    }
}
const sfx = new SoundEffects();

// ==========================================
// MOTOR DEL JUEGO ARCADE ATHLETICS
// ==========================================
class ArcadeEngine {
    constructor(appInstance) {
        this.app = appInstance;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mode = 'sprint'; 
        
        this.resetVars();
        this.bindControls();
        this.loop();
    }

    resetVars() {
        this.state = 'ready'; 
        this.playerX = 50;
        this.speed = 0;
        this.maxSpeed = 12;
        this.lastStep = null; 
        this.timer = 0;
        this.startTime = 0;
        this.endTime = 0;
        
        this.angle = 45;
        this.angleDir = 1;
        this.foulLineX = 650;
        this.releaseX = 0;
        this.projX = 0;
        this.projY = 0;
        this.projVx = 0;
        this.projVy = 0;
        this.markDistance = 0;
        
        this.jumpY = 0;
        this.jumpVy = 0;
        this.isGrounded = true;

        this.updateInstructions();
    }

    selectGame(mode) {
        this.mode = mode;
        ['sprint', 'javelin', 'longjump'].forEach(m => {
            const btn = document.getElementById(`btn-mode-${m}`);
            if(btn) {
                if(m === mode) btn.className = "px-3 py-1.5 rounded text-xs font-bold bg-amber-500 text-black";
                else btn.className = "px-3 py-1.5 rounded text-xs font-bold text-zinc-400 hover:text-white";
            }
        });
        this.resetGame();
    }

    resetGame() {
        this.resetVars();
    }

    updateInstructions() {
        const inst = document.getElementById('arcade-instructions');
        if(!inst) return;
        if(this.mode === 'sprint') {
            inst.innerHTML = `<span class="bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold uppercase">100m Lisos</span> <span>Alterna <strong>◄ / ►</strong> o <strong>A / D</strong> para esprintar lo más rápido posible.</span>`;
        } else if(this.mode === 'javelin') {
            inst.innerHTML = `<span class="bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold uppercase">Jabalina</span> <span>1. Corre con <strong>◄ / ►</strong>. 2. Pulsa <strong>ACCIÓN (Espacio)</strong> para fijar ángulo. 3. Pulsa <strong>ACCIÓN</strong> otra vez antes de la línea roja para lanzar.</span>`;
        } else if(this.mode === 'longjump') {
            inst.innerHTML = `<span class="bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold uppercase">Salto Longitud</span> <span>1. Corre con <strong>◄ / ►</strong>. 2. Pulsa <strong>ACCIÓN (Espacio)</strong> justo sobre la tabla blanca de plastilina para batir.</span>`;
        }
    }

    bindControls() {
        const handleStep = (dir) => {
            sfx.init();
            if(this.state === 'ready') {
                this.state = 'running';
                this.startTime = performance.now();
                sfx.playGun();
            }
            if(this.state === 'running') {
                if(this.lastStep !== dir) {
                    this.speed = Math.min(this.maxSpeed, this.speed + 1.2);
                    this.lastStep = dir;
                    sfx.playStep();
                }
            }
        };

        const handleAction = () => {
            sfx.init();
            if(this.mode === 'javelin') {
                if(this.state === 'running') {
                    this.state = 'phase2';
                } else if(this.state === 'phase2') {
                    if(this.playerX >= this.foulLineX) {
                        this.state = 'foul';
                        sfx.playFoul();
                    } else {
                        this.state = 'flying';
                        this.releaseX = this.playerX;
                        const rad = (this.angle * Math.PI) / 180;
                        const totalVel = this.speed * 2.2;
                        this.projX = this.playerX;
                        this.projY = 220;
                        this.projVx = Math.cos(rad) * totalVel;
                        this.projVy = -Math.sin(rad) * totalVel;
                        sfx.playCheer();
                    }
                }
            } else if(this.mode === 'longjump') {
                if(this.state === 'running' && this.isGrounded) {
                    if(this.playerX > this.foulLineX + 20) {
                        this.state = 'foul';
                        sfx.playFoul();
                    } else {
                        this.state = 'jumping';
                        this.isGrounded = false;
                        this.jumpVy = -Math.min(14, 6 + this.speed * 0.8);
                        this.releaseX = this.playerX;
                        sfx.playCheer();
                    }
                }
            }
        };

        window.addEventListener('keydown', (e) => {
            if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code)) {
                if(document.getElementById('tab-arcade').classList.contains('hidden') === false) {
                    e.preventDefault();
                }
            }
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') handleStep('left');
            if(e.code === 'ArrowRight' || e.code === 'KeyD') handleStep('right');
            if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') handleAction();
        });

        document.getElementById('btn-touch-left')?.addEventListener('touchstart', (e)=>{ e.preventDefault(); handleStep('left'); });
        document.getElementById('btn-touch-right')?.addEventListener('touchstart', (e)=>{ e.preventDefault(); handleStep('right'); });
        document.getElementById('btn-touch-action')?.addEventListener('touchstart', (e)=>{ e.preventDefault(); handleAction(); });
        
        document.getElementById('btn-touch-left')?.addEventListener('click', ()=> handleStep('left'));
        document.getElementById('btn-touch-right')?.addEventListener('click', ()=> handleStep('right'));
        document.getElementById('btn-touch-action')?.addEventListener('click', ()=> handleAction());
    }

    update() {
        if(this.state === 'running' || this.state === 'phase2') {
            this.playerX += this.speed;
            this.speed = Math.max(0, this.speed - 0.08);

            if(this.mode === 'sprint' && this.playerX >= 720) {
                this.state = 'finished';
                this.endTime = performance.now();
                const timeSec = ((this.endTime - this.startTime) / 1000).toFixed(2);
                this.markDistance = parseFloat(timeSec);
                sfx.playCheer();
                this.saveArcadeRecord('100m Lisos', this.markDistance);
            }

            if((this.mode === 'javelin' || this.mode === 'longjump') && this.playerX > this.foulLineX && this.state !== 'flying' && this.state !== 'jumping') {
                this.state = 'foul';
                sfx.playFoul();
            }
        }

        if(this.mode === 'javelin' && this.state === 'running') {
            this.angle += 1.8 * this.angleDir;
            if(this.angle >= 80) this.angleDir = -1;
            if(this.angle <= 15) this.angleDir = 1;
        }

        if(this.mode === 'javelin' && this.state === 'flying') {
            this.projX += this.projVx;
            this.projY += this.projVy;
            this.projVy += 0.45; 
            if(this.projY >= 260) {
                this.projY = 260;
                this.state = 'finished';
                const distMeters = ((this.projX - this.releaseX) / 8).toFixed(2);
                this.markDistance = parseFloat(distMeters);
                this.saveArcadeRecord('Lanzamiento de Jabalina', this.markDistance);
            }
        }

        if(this.mode === 'longjump' && this.state === 'jumping') {
            this.playerX += this.speed;
            this.jumpY += this.jumpVy;
            this.jumpVy += 0.5; 
            if(this.jumpY >= 0) {
                this.jumpY = 0;
                this.isGrounded = true;
                this.state = 'finished';
                const distMeters = ((this.playerX - this.releaseX) / 25).toFixed(2);
                this.markDistance = parseFloat(distMeters);
                this.saveArcadeRecord('Salto de Longitud', this.markDistance);
            }
        }
    }

    async saveArcadeRecord(prueba, marca) {
        if(!this.app.currentUser) return;
        if(!this.app.data.arcadeRecords) this.app.data.arcadeRecords = {};
        
        const prev = this.app.data.arcadeRecords[prueba];
        let isBetter = false;
        if(prueba === '100m Lisos') isBetter = !prev || marca < prev;
        else isBetter = !prev || marca > prev;

        if(isBetter) {
            this.app.data.arcadeRecords[prueba] = marca;
            await this.app.saveToCloud();
            this.app.showToast(`¡NUEVO RÉCORD ARCADE! ${marca} ${prueba==='100m Lisos'?'s':'m'}`);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#0f172a'; this.ctx.fillRect(0, 0, 800, 180);
        this.ctx.fillStyle = '#1e293b'; this.ctx.fillRect(0, 140, 800, 40);
        this.ctx.fillStyle = '#b91c1c'; this.ctx.fillRect(0, 180, 800, 140);

        this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 220); this.ctx.lineTo(800, 220);
        this.ctx.moveTo(0, 260); this.ctx.lineTo(800, 260);
        this.ctx.stroke();

        if(this.mode === 'sprint') {
            this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(720, 180, 10, 80);
            this.ctx.fillStyle = '#f59e0b'; this.ctx.font = 'bold 12px Inter';
            this.ctx.fillText('META 100M', 710, 175);
        } else if(this.mode === 'javelin') {
            this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(this.foulLineX, 180, 6, 80);
            this.ctx.font = 'bold 10px Inter'; this.ctx.fillText('NULO', this.foulLineX - 10, 175);
        } else if(this.mode === 'longjump') {
            this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(this.foulLineX, 220, 15, 30);
            this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(this.foulLineX + 12, 220, 3, 30);
            this.ctx.fillStyle = '#d97706'; this.ctx.fillRect(this.foulLineX + 15, 215, 140, 40);
        }

        const drawY = 220 + this.jumpY;
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath(); this.ctx.arc(this.playerX, drawY - 30, 8, 0, Math.PI * 2); this.ctx.fill();

        this.ctx.strokeStyle = '#f59e0b'; this.ctx.lineWidth = 4;
        this.ctx.beginPath(); this.ctx.moveTo(this.playerX, drawY - 22); this.ctx.lineTo(this.playerX, drawY - 8); 
        
        const legOffset = Math.sin(this.playerX * 0.2) * 12;
        this.ctx.moveTo(this.playerX, drawY - 8); this.ctx.lineTo(this.playerX - legOffset, drawY + 8);
        this.ctx.moveTo(this.playerX, drawY - 8); this.ctx.lineTo(this.playerX + legOffset, drawY + 8);
        this.ctx.stroke();

        if(this.mode === 'javelin') {
            if(this.state === 'running' || this.state === 'phase2') {
                const rad = (this.angle * Math.PI) / 180;
                this.ctx.strokeStyle = '#e2e8f0'; this.ctx.lineWidth = 3;
                this.ctx.beginPath(); this.ctx.moveTo(this.playerX - 10, drawY - 15);
                this.ctx.lineTo(this.playerX + Math.cos(rad) * 35, (drawY - 15) - Math.sin(rad) * 35); this.ctx.stroke();
                this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 12px Inter';
                this.ctx.fillText(`Ángulo: ${Math.round(this.angle)}°`, this.playerX - 20, drawY - 45);
            } else if(this.state === 'flying' || (this.state === 'finished' && this.mode === 'javelin')) {
                this.ctx.strokeStyle = '#e2e8f0'; this.ctx.lineWidth = 3;
                this.ctx.beginPath(); this.ctx.moveTo(this.projX, this.projY);
                this.ctx.lineTo(this.projX + 25, this.projY - 10); this.ctx.stroke();
            }
        }

        if(this.state === 'ready') {
            this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 18px Inter'; this.ctx.textAlign = 'center';
            this.ctx.fillText('¡LISTOS! PULSA ◄ / ► O CONTROLES PARA INICIAR', 400, 100);
        } else if(this.state === 'foul') {
            this.ctx.fillStyle = '#ef4444'; this.ctx.font = 'black 26px Inter'; this.ctx.textAlign = 'center';
            this.ctx.fillText('¡INTENTO NULO! (LÍNEA TRASPASADA)', 400, 100);
        } else if(this.state === 'finished') {
            this.ctx.fillStyle = '#10b981'; this.ctx.font = 'black 28px Inter'; this.ctx.textAlign = 'center';
            if(this.mode === 'sprint') this.ctx.fillText(`¡TIEMPO FINAL: ${this.markDistance} s!`, 400, 90);
            else this.ctx.fillText(`¡MARCA FINAL: ${this.markDistance} m!`, 400, 90);
        }
        this.ctx.textAlign = 'left';
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// ==========================================
// APLICACIÓN PRINCIPAL (TRACKER)
// ==========================================
class AthleticsApp {
    constructor() {
        this.currentUser = null;
        this.resetData(); 
        
        this.testChartInstance = null;
        this.dashDoughnutInstance = null;
        this.dashRadarInstance = null;
        this.compChartInstance = null;
        
        this.activeTestType = 'gimnasio';
        this.deferredPrompt = null;
        
        const today = new Date().toISOString().split('T')[0];
        ['esp-fecha', 'gym-fecha', 'test-gym-fecha', 'test-lanz-fecha', 'comp-fecha'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = today;
        });

        this.initApp();
    }

    resetData() {
        this.data = { 
            userName: "", // Nuevo campo
            especifico: [], gym: [], tests: [], competiciones: [], rmBase: {},
            ejerciciosCatalogo: ['Sentadilla Profunda', 'Press Banca', 'Peso Muerto', 'Power Clean', 'Hip Thrust', 'Sentadilla Búlgara', 'Press Militar'],
            arcadeRecords: {}
        };
    }

    initApp() {
        const lanzContainer = document.getElementById('intentos-lanz-container');
        if(lanzContainer) {
            lanzContainer.innerHTML = '';
            for(let i=1; i<=10; i++) lanzContainer.innerHTML += `<div><input type="number" step="0.01" placeholder="Int ${i}" class="test-lanz-val w-full px-2 py-2 text-sm text-center"></div>`;
        }

        document.getElementById('comp-disciplina').addEventListener('change', () => this.updateCompeticionForm());
        this.updateCompeticionForm();

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('btn-install-pwa').classList.remove('hidden');
            document.getElementById('btn-install-pwa').classList.add('flex');
        });

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                document.getElementById('auth-modal').classList.add('hidden');
                await this.loadUserData();
                
                // Mostrar Username en la cabecera si existe, si no, el email
                const displayName = this.data.userName && this.data.userName.trim() !== "" ? this.data.userName : user.email;
                document.getElementById('user-email-display').textContent = displayName;
                
                this.renderAll();
            } else {
                this.currentUser = null;
                this.resetData();
                document.getElementById('auth-modal').classList.remove('hidden');
            }
        });

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const usernameInput = document.getElementById('auth-username').value.trim();

            if (typeof isRegistering !== 'undefined' && isRegistering) {
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    // Si se acaba de registrar, le guardamos su username enseguida
                    this.data.userName = usernameInput || email.split('@')[0];
                    await this.saveToCloud();
                } catch(err) {
                    this.showAuthError("Error al registrar cuenta. Puede que el correo ya exista o la contraseña sea muy corta.");
                }
            } else {
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                } catch(err) {
                    this.showAuthError("Credenciales incorrectas.");
                }
            }
        });

        document.getElementById('form-especifico').addEventListener('submit', (e) => { e.preventDefault(); this.saveEspecifico(); });
        document.getElementById('form-gym').addEventListener('submit', (e) => { e.preventDefault(); this.saveGym(); });
        document.getElementById('form-test-gym').addEventListener('submit', (e) => { e.preventDefault(); this.saveTestGym(); });
        document.getElementById('form-test-lanz').addEventListener('submit', (e) => { e.preventDefault(); this.saveTestLanzamiento(); });
        document.getElementById('form-competicion').addEventListener('submit', (e) => { e.preventDefault(); this.saveCompeticion(); });

        this.agregarEjercicioGym();
    }

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') document.getElementById('btn-install-pwa').classList.add('hidden');
                this.deferredPrompt = null;
            });
        }
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<div class="flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i><span>${message}</span></div>`;
        container.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
    }

    showAuthError(msg) {
        const err = document.getElementById('auth-error');
        err.textContent = msg;
        err.classList.remove('hidden');
    }

    logout() { signOut(auth); }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        document.querySelectorAll('.tab-btn').forEach(btn => {
            if(btn.dataset.target === tabId) btn.className = "tab-btn active px-5 py-2.5 rounded-lg text-sm transition whitespace-nowrap flex items-center gap-2";
            else btn.className = "tab-btn px-5 py-2.5 rounded-lg text-sm transition whitespace-nowrap flex items-center gap-2";
        });
        
        setTimeout(() => this.renderCharts(), 50);
        if(tabId === 'gimnasio') this.actualizarCalculadoraSlider();
        if(tabId === 'ranking') this.updateRankingDropdown();
    }

    setTestType(type) {
        this.activeTestType = type;
        if(type === 'gimnasio') {
            document.getElementById('form-test-gym').classList.remove('hidden');
            document.getElementById('form-test-lanz').classList.add('hidden');
            document.getElementById('btn-tipo-gym').className = "px-5 py-1.5 rounded-md text-xs font-bold transition bg-amber-500 text-black";
            document.getElementById('btn-tipo-lanz').className = "px-5 py-1.5 rounded-md text-xs font-bold transition text-zinc-400 hover:text-white";
        } else {
            document.getElementById('form-test-gym').classList.add('hidden');
            document.getElementById('form-test-lanz').classList.remove('hidden');
            document.getElementById('btn-tipo-gym').className = "px-5 py-1.5 rounded-md text-xs font-bold transition text-zinc-400 hover:text-white";
            document.getElementById('btn-tipo-lanz').className = "px-5 py-1.5 rounded-md text-xs font-bold transition bg-amber-500 text-black";
        }
    }

    async crearNuevoEjercicio() {
        const nombre = prompt("Nombre del nuevo ejercicio de fuerza:");
        if (nombre && nombre.trim() !== '') {
            const limpio = nombre.trim();
            if (!this.data.ejerciciosCatalogo.includes(limpio)) {
                this.data.ejerciciosCatalogo.push(limpio);
                await this.saveToCloud();
                this.renderCatalogoDropdowns();
                this.renderRMConfig();
                this.showToast(`Ejercicio "${limpio}" añadido`);
            } else {
                alert("Ese ejercicio ya existe.");
            }
        }
    }

    setCalcPct(pct) {
        document.getElementById('calc-pct-slider').value = pct;
        this.actualizarCalculadoraSlider();
    }

    actualizarCalculadoraSlider() {
        const ejSelect = document.getElementById('calc-ejercicio-select');
        const slider = document.getElementById('calc-pct-slider');
        const pctDisplay = document.getElementById('calc-pct-display');
        const resultKg = document.getElementById('calc-kilos-result');
        const info1rm = document.getElementById('calc-1rm-info');
        const subtext = document.getElementById('calc-kilos-subtext');

        if(!ejSelect || !slider) return;

        const ejNombre = ejSelect.value;
        const pct = parseInt(slider.value);
        pctDisplay.textContent = `${pct}%`;

        const rm = this.data.rmBase[ejNombre];
        if (rm !== undefined && rm > 0) {
            info1rm.innerHTML = `1RM Registrado: <strong class="text-amber-400">${rm} kg</strong>`;
            const kilos = ((rm * pct) / 100).toFixed(1);
            resultKg.textContent = `${kilos} kg`;
            subtext.textContent = `${pct}% de tu 1RM (${rm} kg)`;
        } else {
            info1rm.innerHTML = `1RM Registrado: <strong class="text-zinc-500">Sin test (-- kg)</strong>`;
            resultKg.textContent = `-- kg`;
            subtext.textContent = `Registra un test para calcular`;
        }
    }

    renderCatalogoDropdowns() {
        const optionsHTML = this.data.ejerciciosCatalogo.map(ej => `<option value="${ej}">${ej}</option>`).join('');
        
        const calcSelect = document.getElementById('calc-ejercicio-select');
        if(calcSelect) calcSelect.innerHTML = optionsHTML;

        const testSelect = document.getElementById('test-gym-ejercicio');
        if(testSelect) testSelect.innerHTML = optionsHTML;

        document.querySelectorAll('.gym-ej-nombre').forEach(sel => {
            const current = sel.value;
            sel.innerHTML = optionsHTML;
            if(this.data.ejerciciosCatalogo.includes(current)) sel.value = current;
        });

        this.actualizarCalculadoraSlider();
    }

    updateCompeticionForm() {
        const disc = document.getElementById('comp-disciplina').value;
        const conViento = ['100m', '200m', '100m vallas', '110m vallas', 'Longitud', 'Triple Salto'];
        const conIntentos = ['Longitud', 'Triple Salto', 'Peso', 'Disco', 'Jabalina', 'Martillo'];
        const conProgresion = ['Altura', 'Pertiga'];
        const esCombinada = ['Decatlon', 'Heptatlon', 'Pentatlon'];

        document.getElementById('container-viento').classList.toggle('hidden', !conViento.includes(disc));
        document.getElementById('container-intentos').classList.toggle('hidden', !conIntentos.includes(disc));
        document.getElementById('container-progresion').classList.toggle('hidden', !conProgresion.includes(disc));
        document.getElementById('container-combinadas').classList.toggle('hidden', !esCombinada.includes(disc));

        if(esCombinada.includes(disc)) {
            const container = document.getElementById('inputs-combinadas-grid');
            let pruebas = [];
            if(disc === 'Decatlon') pruebas = ['100m', 'Longitud', 'Peso', 'Altura', '400m', '110m vallas', 'Disco', 'Pértiga', 'Jabalina', '1500m'];
            else if(disc === 'Heptatlon') pruebas = ['100m vallas', 'Altura', 'Peso', '200m', 'Longitud', 'Jabalina', '800m'];
            else if(disc === 'Pentatlon') pruebas = ['60m vallas', 'Altura', 'Peso', 'Longitud', '800m'];

            container.innerHTML = pruebas.map(p => `
                <div>
                    <label class="block text-[10px] uppercase font-bold text-zinc-400 mb-1 truncate">${p}</label>
                    <input type="text" data-prueba="${p}" class="input-combinada w-full px-2 py-1.5 text-sm bg-[#0b0b0c] border border-zinc-700 rounded-md">
                </div>
            `).join('');
        }
    }

    agregarEjercicioGym() {
        const container = document.getElementById('gym-ejercicios-container');
        const div = document.createElement('div');
        div.className = "bg-[#1f1f23] p-4 rounded-lg border border-zinc-800 space-y-3";
        
        const optionsHTML = this.data.ejerciciosCatalogo.map(ej => `<option value="${ej}">${ej}</option>`).join('');

        div.innerHTML = `
            <div class="flex items-center justify-between">
                <select class="gym-ej-nombre px-3 py-1.5 text-sm font-bold w-2/3 border border-zinc-700 rounded bg-[#0b0b0c]">
                    ${optionsHTML}
                </select>
                <button type="button" onclick="this.closest('.bg-\\[\\#1f1f23\\]').remove()" class="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-[#2a1215] rounded border border-[#4a1c1f] flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> Quitar</button>
            </div>
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] uppercase font-bold text-zinc-500">Series (Kilos / Reps)</span>
                    <button type="button" onclick="app.agregarSerieGym(this)" class="text-[10px] text-amber-500 font-bold uppercase hover:underline">+ Añadir Serie</button>
                </div>
                <div class="gym-series-list space-y-2">
                    <div class="flex items-center gap-2 serie-row">
                        <input type="number" step="0.5" placeholder="Kilos (kg)" class="serie-kg px-3 py-1.5 text-sm w-1/2 border border-zinc-700 rounded bg-[#0b0b0c]" required>
                        <input type="number" placeholder="Repeticiones" class="serie-reps px-3 py-1.5 text-sm w-1/2 border border-zinc-700 rounded bg-[#0b0b0c]" required>
                        <button type="button" onclick="this.closest('.serie-row').remove()" class="text-xs text-zinc-500 hover:text-red-400 px-2">✕</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
        lucide.createIcons();
    }

    agregarSerieGym(btn) {
        const seriesList = btn.closest('div.space-y-3').querySelector('.gym-series-list');
        const row = document.createElement('div');
        row.className = "flex items-center gap-2 serie-row";
        row.innerHTML = `
            <input type="number" step="0.5" placeholder="Kilos (kg)" class="serie-kg px-3 py-1.5 text-sm w-1/2 border border-zinc-700 rounded bg-[#0b0b0c]" required>
            <input type="number" placeholder="Repeticiones" class="serie-reps px-3 py-1.5 text-sm w-1/2 border border-zinc-700 rounded bg-[#0b0b0c]" required>
            <button type="button" onclick="this.closest('.serie-row').remove()" class="text-xs text-zinc-500 hover:text-red-400 px-2">✕</button>
        `;
        seriesList.appendChild(row);
    }

    async loadUserData() {
        try {
            const q = query(collection(db, "atletismo_users"), where("userId", "==", this.currentUser.uid));
            const qs = await getDocs(q);
            if (!qs.empty) {
                const d = qs.docs[0].data();
                this.data = { 
                    userName: d.userName || "",
                    especifico: d.especifico||[], 
                    gym: d.gym||[], 
                    tests: d.tests||[], 
                    competiciones: d.competiciones||[], 
                    rmBase: d.rmBase||{},
                    ejerciciosCatalogo: d.ejerciciosCatalogo || ['Sentadilla Profunda', 'Press Banca', 'Peso Muerto', 'Power Clean', 'Hip Thrust', 'Sentadilla Búlgara', 'Press Militar'],
                    arcadeRecords: d.arcadeRecords || {}
                };
            } else {
                this.resetData();
            }
        } catch(e) {}
    }

    async saveToCloud() {
        if(!this.currentUser) return;
        try {
            const q = query(collection(db, "atletismo_users"), where("userId", "==", this.currentUser.uid));
            const qs = await getDocs(q);
            const payload = { userId: this.currentUser.uid, userEmail: this.currentUser.email, ...this.data };
            if(qs.empty) await addDoc(collection(db, "atletismo_users"), payload);
            else await setDoc(doc(db, "atletismo_users", qs.docs[0].id), payload);
        } catch(e) {}
    }

    async saveEspecifico() {
        this.data.especifico.unshift({
            id: Date.now().toString(),
            fecha: document.getElementById('esp-fecha').value,
            disciplina: document.getElementById('esp-disciplina').value,
            rpe: document.getElementById('esp-rpe').value,
            contenido: document.getElementById('esp-contenido').value,
            notas: document.getElementById('esp-notas').value
        });
        await this.saveToCloud();
        document.getElementById('form-especifico').reset();
        this.showToast("Sesión específica guardada");
        this.renderAll();
    }

    async saveGym() {
        const ejerciciosDivs = document.querySelectorAll('#gym-ejercicios-container > div');
        const ejercicios = [];
        ejerciciosDivs.forEach(div => {
            const ejNombre = div.querySelector('.gym-ej-nombre').value;
            const series = [];
            div.querySelectorAll('.serie-row').forEach(row => {
                series.push({ kg: parseFloat(row.querySelector('.serie-kg').value)||0, reps: parseInt(row.querySelector('.serie-reps').value)||0 });
            });
            if(series.length > 0) ejercicios.push({ ejercicio: ejNombre, series });
        });
        if(ejercicios.length === 0) return alert("Añade al menos un ejercicio.");

        this.data.gym.unshift({
            id: Date.now().toString(),
            fecha: document.getElementById('gym-fecha').value,
            nombre: document.getElementById('gym-nombre').value,
            ejercicios
        });
        await this.saveToCloud();
        document.getElementById('form-gym').reset();
        document.getElementById('gym-ejercicios-container').innerHTML = '';
        this.agregarEjercicioGym();
        this.showToast("Entrenamiento de fuerza guardado");
        this.renderAll();
    }

    async saveTestGym() {
        const ejercicio = document.getElementById('test-gym-ejercicio').value;
        const peso = parseFloat(document.getElementById('test-gym-peso').value);
        const reps = parseInt(document.getElementById('test-gym-reps').value);
        const rmEstimado = Math.round(peso * (1 + 0.0333 * reps));

        this.data.rmBase[ejercicio] = rmEstimado;
        this.data.tests.unshift({
            id: Date.now().toString(), tipo: 'gimnasio', fecha: document.getElementById('test-gym-fecha').value,
            ejercicio, peso, reps, resultado: rmEstimado
        });
        await this.saveToCloud();
        document.getElementById('form-test-gym').reset();
        this.showToast(`Test guardado: 1RM de ${ejercicio} = ${rmEstimado} kg`);
        this.renderAll();
    }

    async saveTestLanzamiento() {
        const tipo = document.getElementById('test-lanz-tipo').value;
        const intentos = [];
        document.querySelectorAll('.test-lanz-val').forEach(inp => {
            if(!isNaN(parseFloat(inp.value))) intentos.push(parseFloat(inp.value));
        });
        if(intentos.length === 0) return alert("Introduce al menos una marca.");

        const max = Math.max(...intentos);
        const prom = (intentos.reduce((a,b)=>a+b,0)/intentos.length).toFixed(2);

        this.data.tests.unshift({
            id: Date.now().toString(), tipo: 'lanzamientos', fecha: document.getElementById('test-lanz-fecha').value,
            subtipo: tipo, intentos, resultado: max, promedio: parseFloat(prom)
        });
        await this.saveToCloud();
        document.getElementById('form-test-lanz').reset();
        document.querySelectorAll('.test-lanz-val').forEach(i => i.value = '');
        this.showToast(`Test guardado. Marca: ${max}m`);
        this.renderAll();
    }

    async saveCompeticion() {
        const disc = document.getElementById('comp-disciplina').value;
        const datosExtra = {};

        if (!document.getElementById('container-viento').classList.contains('hidden')) {
            datosExtra.viento = document.getElementById('comp-viento').value.trim();
        }
        if (!document.getElementById('container-intentos').classList.contains('hidden')) {
            const ints = [];
            document.querySelectorAll('.comp-int').forEach(inp => { if(inp.value.trim() !== '') ints.push(inp.value.trim()); });
            datosExtra.intentos = ints;
        }
        if (!document.getElementById('container-progresion').classList.contains('hidden')) {
            datosExtra.progresion = document.getElementById('comp-progresion').value.trim();
        }
        if (!document.getElementById('container-combinadas').classList.contains('hidden')) {
            const parciales = {};
            document.querySelectorAll('.input-combinada').forEach(inp => {
                if(inp.value.trim() !== '') parciales[inp.dataset.prueba] = inp.value.trim();
            });
            datosExtra.combinadas = parciales;
        }

        this.data.competiciones.unshift({
            id: Date.now().toString(),
            fecha: document.getElementById('comp-fecha').value,
            nombre: document.getElementById('comp-nombre').value,
            disciplina: disc,
            resultado: document.getElementById('comp-resultado').value.trim(),
            notas: document.getElementById('comp-notas').value,
            ...datosExtra
        });

        await this.saveToCloud();
        document.getElementById('form-competicion').reset();
        document.querySelectorAll('.comp-int, .input-combinada, #comp-viento, #comp-progresion').forEach(i => i.value = '');
        this.updateCompeticionForm();
        this.showToast("Competición registrada");
        this.renderAll();
    }

    async deleteItem(type, id) {
        if(confirm("¿Eliminar registro permanentemente?")) {
            this.data[type] = this.data[type].filter(x => x.id !== id);
            await this.saveToCloud();
            this.showToast("Registro eliminado");
            this.renderAll();
        }
    }

    renderAll() {
        document.getElementById('stat-esp').textContent = this.data.especifico.length;
        document.getElementById('stat-lanz-count').textContent = this.data.tests.length;
        document.getElementById('stat-comp').textContent = this.data.competiciones.length;

        const pbs = {};
        this.data.competiciones.forEach(c => { if(!pbs[c.disciplina] || parseFloat(c.resultado) > parseFloat(pbs[c.disciplina])) pbs[c.disciplina] = c.resultado; });
        this.data.tests.forEach(t => { if(t.tipo === 'lanzamientos') { if(!pbs[t.subtipo] || t.resultado > parseFloat(pbs[t.subtipo])) pbs[t.subtipo] = t.resultado; } });
        document.getElementById('stat-pb-count').textContent = Object.keys(pbs).length;

        this.renderCatalogoDropdowns();
        this.renderEspecificoList();
        this.renderGymList();
        this.renderRMConfig();
        this.renderTestsList();
        this.renderCompeticionesList();
        this.renderPBSummary(pbs);
        this.renderCharts();
        
        lucide.createIcons();
    }

    renderEspecificoList() {
        const c = document.getElementById('lista-especifico');
        if(!this.data.especifico.length) return c.innerHTML = `<p class="text-sm text-zinc-500">Vacío.</p>`;
        c.innerHTML = this.data.especifico.map(item => `
            <div class="bg-[#1f1f23] p-4 rounded-lg border border-zinc-800/60 flex justify-between items-start">
                <div>
                    <div class="flex gap-2 items-center mb-1.5">
                        <span class="text-xs font-bold text-amber-500 uppercase">${item.disciplina}</span>
                        <span class="text-xs text-zinc-500 border-l border-zinc-700 pl-2">${item.fecha}</span>
                    </div>
                    <p class="text-sm text-zinc-300 whitespace-pre-line">${item.contenido}</p>
                    ${item.notas ? `<p class="text-xs text-zinc-500 italic mt-2 flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i> ${item.notas}</p>` : ''}
                </div>
                <button onclick="app.deleteItem('especifico', '${item.id}')" class="text-xs text-red-500 hover:text-red-400 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `).join('');
    }

    renderGymList() {
        const c = document.getElementById('lista-gym');
        if(!this.data.gym.length) return c.innerHTML = `<p class="text-sm text-zinc-500">Vacío.</p>`;
        c.innerHTML = this.data.gym.map(item => `
            <div class="bg-[#1f1f23] p-5 rounded-lg border border-zinc-800/60">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h4 class="font-bold text-base text-white">${item.nombre}</h4>
                        <span class="text-[11px] text-zinc-500">${item.fecha}</span>
                    </div>
                    <button onclick="app.deleteItem('gym', '${item.id}')" class="text-xs text-red-500 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${item.ejercicios.map(ej => `
                        <div class="bg-[#121215] p-3 rounded-lg border border-zinc-800">
                            <span class="text-xs font-bold text-amber-500 block mb-2">${ej.ejercicio}</span>
                            <div class="space-y-1">
                                ${ej.series.map((s, i) => `
                                    <div class="text-[11px] text-zinc-400 flex justify-between bg-[#1a1a1f] px-2 py-1 rounded">
                                        <span>Serie ${i+1}</span>
                                        <span class="text-zinc-200 font-semibold">${s.kg} kg × ${s.reps} reps</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderRMConfig() {
        const c = document.getElementById('rm-config-list');
        c.innerHTML = this.data.ejerciciosCatalogo.map(ej => `
            <div class="bg-[#1f1f23] p-3 rounded-lg flex justify-between items-center border border-zinc-800">
                <span class="text-sm font-semibold text-zinc-300 truncate max-w-[150px]">${ej}</span>
                <div class="flex gap-3 items-center">
                    <span class="text-sm text-amber-500 font-black">${this.data.rmBase[ej] ? this.data.rmBase[ej]+' kg' : '--'}</span>
                    <button onclick="app.editarRM('${ej}')" class="text-[10px] font-bold bg-zinc-800 px-2.5 py-1 rounded flex items-center gap-1 hover:bg-zinc-700 transition">
                        <i data-lucide="edit-3" class="w-3 h-3"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
    }

    async editarRM(ej) {
        const v = prompt(`Nuevo 1RM para ${ej} (kg):`, this.data.rmBase[ej]||'');
        if(v && !isNaN(parseFloat(v))) { this.data.rmBase[ej] = parseFloat(v); await this.saveToCloud(); this.renderAll(); }
    }

    renderTestsList() {
        const c = document.getElementById('lista-tests');
        if(!this.data.tests.length) return c.innerHTML = `<p class="text-sm text-zinc-500">Vacío.</p>`;
        c.innerHTML = this.data.tests.map(item => `
            <div class="bg-[#1f1f23] p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                    <span class="text-[10px] text-zinc-500 font-medium">${item.fecha} - ${item.tipo === 'gimnasio'?'FUERZA (1RM)':'LANZAMIENTOS / CAMPO'}</span>
                    <h4 class="text-sm font-bold text-white mt-1">${item.tipo === 'gimnasio'?item.ejercicio:item.subtipo}</h4>
                    <p class="text-sm text-amber-500 font-extrabold mt-0.5">${item.tipo === 'gimnasio'?`${item.resultado} kg`:`${item.resultado} m`}</p>
                    ${item.tipo === 'lanzamientos' ? `<p class="text-[10px] text-zinc-500 mt-1.5 leading-tight">Promedio: ${item.promedio}m <br> Intentos:${item.intentos.join(', ')}</p>` : ''}
                </div>
                <button onclick="app.deleteItem('tests', '${item.id}')" class="text-xs text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `).join('');
    }

    renderCompeticionesList() {
        const c = document.getElementById('lista-competiciones');
        if(!this.data.competiciones.length) return c.innerHTML = `<p class="text-sm text-zinc-500">Vacío.</p>`;
        c.innerHTML = this.data.competiciones.map(item => `
            <div class="bg-[#1f1f23] p-5 rounded-lg border border-zinc-800 flex justify-between items-start">
                <div class="w-full">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="text-xs font-bold text-amber-500 uppercase">${item.disciplina}</span> 
                        <span class="text-[11px] text-zinc-500 border-l border-zinc-700 pl-2">${item.fecha}</span>
                        ${item.viento ? `<span class="text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded ml-2 border border-cyan-900/50">Viento: ${item.viento} m/s</span>` : ''}
                    </div>
                    
                    <div class="flex justify-between items-start w-full">
                        <div>
                            <h4 class="text-base font-bold text-white leading-none">${item.nombre}</h4>
                            <p class="text-2xl font-black text-amber-400 mt-2">${item.resultado}</p>
                            ${item.notas ? `<p class="text-xs text-zinc-400 mt-1 flex items-center gap-1"><i data-lucide="info" class="w-3 h-3"></i> ${item.notas}</p>` : ''}
                        </div>
                        <button onclick="app.deleteItem('competiciones', '${item.id}')" class="text-xs text-red-500 p-2 hover:bg-red-500/10 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>

                    ${item.intentos && item.intentos.length > 0 ? `
                        <div class="mt-3 bg-[#121215] p-2.5 rounded border border-zinc-800">
                            <span class="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Intentos:</span>
                            <div class="flex flex-wrap gap-2 text-sm text-zinc-300">
                                ${item.intentos.map((int, i) => `<span><span class="text-zinc-600 text-[10px]">#${i+1}</span> ${int}</span>`).join('<span class="text-zinc-700">|</span>')}
                            </div>
                        </div>
                    ` : ''}

                    ${item.progresion ? `
                        <div class="mt-3 bg-[#121215] p-2.5 rounded border border-zinc-800">
                            <span class="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Progresión:</span>
                            <p class="text-sm text-zinc-300 font-medium">${item.progresion}</p>
                        </div>
                    ` : ''}

                    ${item.combinadas ? `
                        <div class="mt-3 bg-[#121215] p-2.5 rounded border border-zinc-800">
                            <span class="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Parciales Combinada:</span>
                            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                                ${Object.entries(item.combinadas).map(([k,v]) => `
                                    <div class="bg-[#1a1a1f] p-1.5 rounded text-center">
                                        <div class="text-[9px] text-zinc-500 uppercase font-bold truncate">${k}</div>
                                        <div class="text-xs text-amber-500 font-black">${v}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderPBSummary(pbs) {
        const c1 = document.getElementById('pb-summary-list'), c2 = document.getElementById('comp-pb-list');
        const keys = Object.keys(pbs);
        if(!keys.length) return [c1,c2].forEach(c => { if(c) c.innerHTML = `<p class="text-sm text-zinc-500">Vacío.</p>`;});
        
        const html = keys.map(k => `
            <div class="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-0">
                <span class="text-sm font-medium text-zinc-300 uppercase">${k}</span>
                <span class="text-base font-black text-amber-500">${pbs[k]}</span>
            </div>
        `).join('');
        if(c1) c1.innerHTML = html; if(c2) c2.innerHTML = html;
    }

    async updateRankingDropdown() {
        const tipo = document.getElementById('ranking-tipo').value;
        const subtipoSelect = document.getElementById('ranking-subtipo');
        let options = [];

        if(tipo === 'competicion') {
            options = ['100m', '200m', '400m', '800m', '1500m', '60m vallas', '110m vallas', 'Longitud', 'Triple Salto', 'Altura', 'Pertiga', 'Peso', 'Disco', 'Jabalina', 'Martillo'];
        } else if(tipo === 'arcade') {
            options = ['100m Lisos', 'Lanzamiento de Jabalina', 'Salto de Longitud'];
        } else if(tipo === 'test') {
            const setTests = new Set(this.data.ejerciciosCatalogo);
            try {
                const qs = await getDocs(collection(db, "atletismo_users"));
                qs.forEach(docSnap => {
                    const d = docSnap.data();
                    if(d.tests) d.tests.forEach(t => setTests.add(t.tipo === 'gimnasio' ? t.ejercicio : t.subtipo));
                });
            } catch(e) {}
            options = Array.from(setTests);
        }

        subtipoSelect.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        this.renderRankingTable();
    }

    // RANKING ACTUALIZADO: Sin duplicados del mismo usuario en la misma prueba
    async renderRankingTable() {
        const tipo = document.getElementById('ranking-tipo').value;
        const subtipo = document.getElementById('ranking-subtipo').value;
        const tbody = document.getElementById('ranking-table-body');
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-zinc-500">Cargando clasificación global...</td></tr>`;

        try {
            const qs = await getDocs(collection(db, "atletismo_users"));
            const rankingList = [];

            qs.forEach(docSnap => {
                const d = docSnap.data();
                
                // Usamos el userName guardado, o recaemos al email si no existe
                const rawName = d.userName && d.userName.trim() !== "" ? d.userName : (d.userEmail ? d.userEmail.split('@')[0] : "Atleta Anónimo");
                const uniqueId = d.userId ? d.userId.substring(0, 4).toUpperCase() : '0000';
                
                // Si el usuario no puso username y cae al email, le añadimos el hash. Si puso su username bonito, lo respetamos sin hash feo.
                const atleteName = d.userName && d.userName.trim() !== "" ? d.userName : `${rawName} #${uniqueId}`;

                // ATENCIÓN AQUI: Por cada usuario, sacamos SOLO SU MEJOR MARCA en la prueba seleccionada. 1 usuario = 1 entrada.
                if(tipo === 'competicion') {
                    if(d.competiciones) {
                        const comps = d.competiciones.filter(c => c.disciplina === subtipo);
                        if(comps.length > 0) {
                            const isTime = ['100m','200m','400m','800m','1500m','60m vallas','110m vallas'].includes(subtipo);
                            const best = comps.reduce((prev, curr) => {
                                const pVal = parseFloat(prev.resultado);
                                const cVal = parseFloat(curr.resultado);
                                if(isTime) return cVal < pVal ? curr : prev; // Menor es mejor
                                else return cVal > pVal ? curr : prev;       // Mayor es mejor
                            });
                            rankingList.push({ name: atleteName, score: best.resultado, date: best.fecha });
                        }
                    }
                } else if(tipo === 'arcade') {
                    if(d.arcadeRecords && d.arcadeRecords[subtipo]) {
                        rankingList.push({ name: atleteName, score: d.arcadeRecords[subtipo], date: 'Arcade Record' });
                    }
                } else if(tipo === 'test') {
                    if(d.tests) {
                        const testsFiltrados = d.tests.filter(t => (t.tipo === 'gimnasio' ? t.ejercicio : t.subtipo) === subtipo);
                        if(testsFiltrados.length > 0) {
                            // En tests de gimnasio y campo, mayor peso/distancia es mejor siempre
                            const best = testsFiltrados.reduce((prev, curr) => (parseFloat(curr.resultado) > parseFloat(prev.resultado)) ? curr : prev);
                            const unit = best.tipo === 'gimnasio' ? 'kg' : 'm';
                            rankingList.push({ name: atleteName, score: `${best.resultado} ${unit}`, numericScore: parseFloat(best.resultado), date: best.fecha });
                        }
                    }
                }
            });

            // ORDENAR RANKING FINAL
            const isTime = ['100m','200m','400m','800m','1500m','60m vallas','110m vallas','100m Lisos'].includes(subtipo);
            rankingList.sort((a,b) => {
                const numA = parseFloat(a.numericScore !== undefined ? a.numericScore : a.score);
                const numB = parseFloat(b.numericScore !== undefined ? b.numericScore : b.score);
                return isTime ? numA - numB : numB - numA;
            });

            if(rankingList.length === 0) {
                return tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-zinc-500">No hay registros para esta prueba.</td></tr>`;
            }

            tbody.innerHTML = rankingList.map((item, idx) => {
                let medal = `<span class="text-zinc-500 font-bold">#${idx + 1}</span>`;
                if(idx === 0) medal = `<span class="text-xl">🥇</span>`;
                if(idx === 1) medal = `<span class="text-xl">🥈</span>`;
                if(idx === 2) medal = `<span class="text-xl">🥉</span>`;

                return `
                    <tr class="hover:bg-[#1a1a20] transition">
                        <td class="py-3 px-4 font-bold">${medal}</td>
                        <td class="py-3 px-4 text-white font-bold">${item.name}</td>
                        <td class="py-3 px-4 text-right text-amber-400 font-black text-base">${item.score}</td>
                        <td class="py-3 px-4 text-center text-xs text-zinc-500">${item.date}</td>
                    </tr>
                `;
            }).join('');

        } catch(e) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-400">Error al obtener ranking.</td></tr>`;
        }
    }

    renderCharts() {
        Chart.defaults.color = '#71717a';
        Chart.defaults.font.family = 'Inter';

        const ctxDashDoughnut = document.getElementById('dashDoughnutChart');
        if (ctxDashDoughnut) {
            if (this.dashDoughnutInstance) this.dashDoughnutInstance.destroy();
            this.dashDoughnutInstance = new Chart(ctxDashDoughnut, {
                type: 'doughnut',
                data: {
                    labels: ['Fuerza / Gym', 'Específico', 'Tests', 'Competición'],
                    datasets: [{
                        data: [
                            this.data.gym.length || 1,
                            this.data.especifico.length || 1,
                            this.data.tests.length || 1,
                            this.data.competiciones.length || 1
                        ],
                        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
                        borderWidth: 0, hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', boxWidth: 10, font: { size: 11 } } } },
                    cutout: '70%'
                }
            });
        }

        const ctxDashRadar = document.getElementById('dashRadarChart');
        if (ctxDashRadar) {
            if (this.dashRadarInstance) this.dashRadarInstance.destroy();
            
            const scoreFuerza = Math.min(100, (Object.keys(this.data.rmBase).length * 20) || 20);
            const scorePotencia = Math.min(100, (this.data.tests.length * 15) || 20);
            const scoreEsp = Math.min(100, (this.data.especifico.length * 10) || 20);
            const scoreComp = Math.min(100, (this.data.competiciones.length * 25) || 20);
            const scoreConsistencia = Math.min(100, ((this.data.gym.length + this.data.especifico.length) * 8) || 20);

            this.dashRadarInstance = new Chart(ctxDashRadar, {
                type: 'radar',
                data: {
                    labels: ['Fuerza', 'Potencia', 'Específico', 'Competición', 'Consistencia'],
                    datasets: [{
                        label: 'Nivel Atleta',
                        data: [scoreFuerza, scorePotencia, scoreEsp, scoreComp, scoreConsistencia],
                        backgroundColor: 'rgba(59, 130, 246, 0.25)', borderColor: '#3b82f6', borderWidth: 2, pointBackgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { angleLines: { color: '#27272a' }, grid: { color: '#27272a' }, pointLabels: { color: '#a1a1aa', font: { size: 10, weight: 'bold' } }, ticks: { display: false, max: 100, min: 0 } } }
                }
            });
        }

        const ctxTest = document.getElementById('testChart');
        if (ctxTest) {
            const filterSelect = document.getElementById('test-chart-filter-name');
            if (filterSelect) {
                const nombresUnicos = [...new Set(this.data.tests.map(t => t.tipo === 'gimnasio' ? t.ejercicio : t.subtipo))];
                const valPrevio = filterSelect.value;
                filterSelect.innerHTML = nombresUnicos.length ? nombresUnicos.map(n => `<option value="${n}">${n}</option>`).join('') : `<option value="">Sin tests registrados</option>`;
                if (nombresUnicos.includes(valPrevio)) filterSelect.value = valPrevio;
            }

            const testSeleccionado = filterSelect?.value || '';
            const testFiltrados = this.data.tests.filter(t => (t.tipo === 'gimnasio' ? t.ejercicio : t.subtipo) === testSeleccionado).reverse();

            if (this.testChartInstance) this.testChartInstance.destroy();
            this.testChartInstance = new Chart(ctxTest, {
                type: 'line',
                data: {
                    labels: testFiltrados.length ? testFiltrados.map(t => t.fecha) : ['Sin datos'],
                    datasets: [{
                        label: `Evolución (${testSeleccionado || 'Test'})`,
                        data: testFiltrados.length ? testFiltrados.map(t => t.resultado) : [0],
                        borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        borderWidth: 3, pointBackgroundColor: '#0b0b0c', pointBorderColor: '#f59e0b',
                        pointBorderWidth: 2, pointRadius: 5, fill: true, tension: 0.3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, labels: { color: '#a1a1aa', boxWidth: 12 } } },
                    scales: { x: { grid: { color: '#27272a', drawBorder: false } }, y: { grid: { color: '#27272a', drawBorder: false } } }
                }
            });
        }

        const ctxComp = document.getElementById('compChart');
        if (ctxComp) {
            const compSelect = document.getElementById('comp-chart-filter-disc');
            if (compSelect) {
                const distinctDiscs = [...new Set(this.data.competiciones.map(c => c.disciplina))];
                const currentVal = compSelect.value;
                compSelect.innerHTML = distinctDiscs.length ? distinctDiscs.map(d => `<option value="${d}">${d}</option>`).join('') : `<option value="100m">100m</option>`;
                if (distinctDiscs.includes(currentVal)) compSelect.value = currentVal;
            }

            const selectedCompDisc = compSelect?.value || '100m';
            const comps = this.data.competiciones.filter(c => c.disciplina === selectedCompDisc).reverse();

            if (this.compChartInstance) this.compChartInstance.destroy();
            this.compChartInstance = new Chart(ctxComp, {
                type: 'line',
                data: {
                    labels: comps.length ? comps.map(c => c.fecha) : ['Sin datos'],
                    datasets: [{
                        label: `Evolución Marca (${selectedCompDisc})`,
                        data: comps.length ? comps.map(c => parseFloat(c.resultado) || 0) : [0],
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        borderWidth: 3, pointBackgroundColor: '#0b0b0c', pointBorderColor: '#3b82f6',
                        pointBorderWidth: 2, pointRadius: 5, fill: true, tension: 0.3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, labels: { color: '#a1a1aa', boxWidth: 12 } } },
                    scales: { x: { grid: { color: '#27272a', drawBorder: false } }, y: { grid: { color: '#27272a', drawBorder: false } } }
                }
            });
        }
    }
}

const app = new AthleticsApp();
const arcade = new ArcadeEngine(app);

window.app = app;
window.arcade = arcade;
