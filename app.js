// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Variabili di Stato
let currentUser = null;
let userLang = 'it';
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// 2. DIZIONARIO TRADUZIONI
const langPack = {
    it: {
        welcome: "Ciao", save: "Salva disponibilità", saving: "Salvo...", saved: "✅ Salvato!",
        matchTitle: "Match Trovato!", matchText: (nome, giorno, fascia) => `🎉 <b>Grande!</b> Tu e <b>${nome}</b> siete liberi <b>${giorno} ${fascia}</b>!`,
        waBtn: "Scrivi su WhatsApp", waMsg: (nome, giorno, fascia) => `Ehi ${nome}! Ho visto su Looply che siamo liberi entrambi ${giorno} ${fascia}, usciamo? 🤙🏻`,
        later: "Più tardi", settings: "Impostazioni", logout: "Esci",
        days: { ven: "Ven", sab: "Sab", dom: "Dom", labels: ["Venerdì", "Sabato", "Domenica"] },
        slots: { always: "Sempre", morning: "Mattina", afternoon: "Pom.", evening: "Sera" }
    },
    en: {
        welcome: "Hi", save: "Save availability", saving: "Saving...", saved: "✅ Saved!",
        matchTitle: "Match Found!", matchText: (nome, giorno, fascia) => `🎉 <b>Great!</b> You and <b>${nome}</b> are both free on <b>${giorno} ${fascia}</b>!`,
        waBtn: "Message on WhatsApp", waMsg: (nome, giorno, fascia) => `Hi ${nome}! I saw on Looply that we're both free on ${giorno} ${fascia}, shall we hang out? 🤙🏻`,
        later: "Later", settings: "Settings", logout: "Logout",
        days: { ven: "Fri", sab: "Sat", dom: "Sun", labels: ["Friday", "Saturday", "Sunday"] },
        slots: { always: "Always", morning: "Morning", afternoon: "After.", evening: "Evening" }
    }
};

// --- 3. FUNZIONE LOGIN (Chiamata dall'HTML) ---
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => { console.log("Login OK:", result.user.displayName); })
        .catch((error) => { alert("Errore Login: " + error.message); });
};

// --- 4. GESTIONE STATO UTENTE ---
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        currentUser = user.uid;
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        
        // Carica Profilo
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().displayName) {
            const data = doc.data();
            userLang = data.lang || 'it';
            applicaLingua(data.displayName, userLang);
            document.getElementById("userPhoto").src = user.photoURL || "";
            document.getElementById("userEmail").innerText = user.email;
            caricaDati();
        } else {
            document.getElementById("onboardingModal").style.display = "flex";
        }
    } else {
        if(loginDiv) loginDiv.style.display = "flex";
        if(appDiv) appDiv.style.display = "none";
    }
});

// --- 5. FUNZIONI UI & SALVATAGGIO ---
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return alert("Inserisci un nome valido");

    await db.collection("users").doc(currentUser).set({
        displayName: nome, lang: lingua, themeColor: "#2563eb"
    }, { merge: true });

    userLang = lingua;
    document.getElementById("onboardingModal").style.display = "none";
    applicaLingua(nome, lingua);
};

window.saveAvailability = async () => {
    const btnLabel = document.getElementById("labelSaveBtn");
    const t = langPack[userLang];
    btnLabel.innerText = t.saving;

    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        btnLabel.innerText = t.saved;
        setTimeout(() => { btnLabel.innerText = t.save; }, 2000);
        await controllaMatch(av);
    } catch (e) { btnLabel.innerText = t.save; }
};

async function controllaMatch(miaAv) {
    const snapshot = await db.collection("users").get();
    let matchTrovato = false;
    snapshot.forEach(doc => {
        if (doc.id !== currentUser && !matchTrovato) {
            const altro = doc.data();
            if (altro.availability) {
                ["venerdi", "sabato", "domenica"].forEach(g => {
                    if (miaAv[g] && altro.availability[g]) {
                        const comuni = miaAv[g].filter(f => altro.availability[g].includes(f));
                        if (comuni.length > 0 && !matchTrovato) {
                            const giornoTrad = document.getElementById(`label${g.charAt(0).toUpperCase() + g.slice(1)}`).innerText;
                            mostraPopupMatch(altro.displayName, giornoTrad, comuni[0]);
                            matchTrovato = true;
                        }
                    }
                });
            }
        }
    });
}

function mostraPopupMatch(nome, giorno, fascia) {
    const t = langPack[userLang];
    document.getElementById("matchText").innerHTML = t.matchText(nome, giorno, fascia);
    document.getElementById("matchWA").onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(t.waMsg(nome, giorno, fascia))}`, '_blank');
    };
    document.getElementById("matchModal").style.display = "flex";
}

// --- 6. UTILS ---
function applicaLingua(nome, lingua) {
    const t = langPack[lingua];
    document.getElementById("welcomeTitle").innerHTML = `${t.welcome} ${nome} 🤙🏻`;
    document.getElementById("labelSaveBtn").innerText = t.save;
    document.getElementById("titleSettings").innerText = t.settings;
    document.getElementById("labelLogout").innerText = t.logout;
    document.getElementById("btnVen").innerText = t.days.ven;
    document.getElementById("btnSab").innerText = t.days.sab;
    document.getElementById("btnDom").innerText = t.days.dom;
    document.getElementById("labelVen").innerText = t.days.labels[0];
    document.getElementById("labelSab").innerText = t.days.labels[1];
    document.getElementById("labelDom").innerText = t.days.labels[2];
    document.querySelectorAll(".txtAlways").forEach(el => el.innerText = t.slots.always);
    document.querySelectorAll(".txtMorning").forEach(el => el.innerText = t.slots.morning);
    document.querySelectorAll(".txtAfternoon").forEach(el => el.innerText = t.slots.afternoon);
    document.querySelectorAll(".txtEvening").forEach(el => el.innerText = t.slots.evening);
    document.getElementById("matchFoundTitle").innerText = t.matchTitle;
    document.getElementById("labelLater").innerText = t.later;
}

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    return Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
}

async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists && doc.data().availability) {
        const av = doc.data().availability;
        for (const d in av) {
            if (av[d] && av[d].length > 0) {
                selectedDays[d] = true;
                const btn = document.querySelector(`[data-day="${d}"]`);
                if(btn) btn.classList.add("active");
                const s = document.getElementById(d + "-slots");
                if(s) {
                    s.classList.remove("disabled");
                    s.querySelectorAll("input").forEach(cb => { if (av[d].includes(cb.value)) cb.checked = true; });
                }
            }
        }
    }
}

// Eventi click giorni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        selectedDays[d] = !selectedDays[d];
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.logout = () => auth.signOut().then(() => location.reload());
window.closeMatch = () => document.getElementById("matchModal").style.display = "none";
window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
