// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let userLang = 'it';
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// 2. DIZIONARIO TRADUZIONI
const langPack = {
    it: {
        welcome: "Ciao",
        save: "Salva disponibilità",
        saving: "Salvo...",
        saved: "✅ Salvato!",
        matchTitle: "Match Trovato!",
        matchText: (nome, giorno, fascia) => `🎉 <b>Grande!</b> Tu e <b>${nome}</b> siete liberi <b>${giorno} ${fascia}</b>!`,
        waBtn: "Scrivi su WhatsApp",
        waMsg: (nome, giorno, fascia) => `Ehi ${nome}! Ho visto su Looply che siamo liberi entrambi ${giorno} ${fascia}, usciamo? 🤙🏻`,
        later: "Più tardi",
        settings: "Impostazioni",
        logout: "Esci",
        days: { ven: "Ven", sab: "Sab", dom: "Dom", labels: ["Venerdì", "Sabato", "Domenica"] },
        slots: { always: "Sempre", morning: "Mattina", afternoon: "Pom.", evening: "Sera" }
    },
    en: {
        welcome: "Hi",
        save: "Save availability",
        saving: "Saving...",
        saved: "✅ Saved!",
        matchTitle: "Match Found!",
        matchText: (nome, giorno, fascia) => `🎉 <b>Great!</b> You and <b>${nome}</b> are both free on <b>${giorno} ${fascia}</b>!`,
        waBtn: "Message on WhatsApp",
        waMsg: (nome, giorno, fascia) => `Hi ${nome}! I saw on Looply that we're both free on ${giorno} ${fascia}, shall we hang out? 🤙🏻`,
        later: "Later",
        settings: "Settings",
        logout: "Logout",
        days: { ven: "Fri", sab: "Sat", dom: "Sun", labels: ["Friday", "Saturday", "Sunday"] },
        slots: { always: "Always", morning: "Morning", afternoon: "After.", evening: "Evening" }
    }
};

// --- 3. LOGICA TRADUZIONE ---
function applicaLingua(nome, lingua) {
    const t = langPack[lingua];
    
    // Header & Buttons
    document.getElementById("welcomeTitle").innerHTML = `${t.welcome} ${nome} 🤙🏻`;
    document.getElementById("labelSaveBtn").innerText = t.save;
    document.getElementById("titleSettings").innerText = t.settings;
    document.getElementById("labelLogout").innerText = t.logout;
    
    // Days Buttons
    document.getElementById("btnVen").innerText = t.days.ven;
    document.getElementById("btnSab").innerText = t.days.sab;
    document.getElementById("btnDom").innerText = t.days.dom;

    // Day Labels
    document.getElementById("labelVen").innerText = t.days.labels[0];
    document.getElementById("labelSab").innerText = t.days.labels[1];
    document.getElementById("labelDom").innerText = t.days.labels[2];

    // Slots Text
    document.querySelectorAll(".txtAlways").forEach(el => el.innerText = t.slots.always);
    document.querySelectorAll(".txtMorning").forEach(el => el.innerText = t.slots.morning);
    document.querySelectorAll(".txtAfternoon").forEach(el => el.innerText = t.slots.afternoon);
    document.querySelectorAll(".txtEvening").forEach(el => el.innerText = t.slots.evening);

    // Match Modal
    document.getElementById("matchFoundTitle").innerText = t.matchTitle;
    document.getElementById("labelLater").innerText = t.later;
    document.getElementById("labelWhatsApp").innerText = t.waBtn;
}

// --- 4. GESTIONE PROFILO & ONBOARDING ---
async function inizializzaUtente(user) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    
    if (userDoc.exists && userDoc.data().displayName && userDoc.data().lang) {
        const data = userDoc.data();
        userLang = data.lang;
        applicaLingua(data.displayName, userLang);
        if (data.themeColor) document.documentElement.style.setProperty('--primary-color', data.themeColor);
    } else {
        document.getElementById("onboardingModal").style.display = "flex";
    }
}

window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return;

    await db.collection("users").doc(currentUser).set({
        displayName: nome,
        lang: lingua,
        themeColor: "#2563eb"
    }, { merge: true });

    userLang = lingua;
    document.getElementById("onboardingModal").style.display = "none";
    applicaLingua(nome, lingua);
};

// --- 5. CUORE DELL'APP (MATCH & SALVATAGGIO) ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user.uid;
        document.getElementById("formLogin").style.display = "none";
        document.getElementById("app").style.display = "block";
        await inizializzaUtente(user);
        
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) {
            const img = document.getElementById("userPhoto");
            img.src = user.photoURL;
            img.style.display = "block";
        }
        await caricaDati();
    } else {
        document.getElementById("formLogin").style.display = "block";
        document.getElementById("app").style.display = "none";
        inizializzaLogin();
    }
});

window.saveAvailability = async () => {
    const btnText = document.getElementById("labelSaveBtn");
    const t = langPack[userLang];
    btnText.innerText = t.saving;
    
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
    btnText.innerText = t.saved;
    setTimeout(() => { btnText.innerText = t.save; }, 2000);
    await controllaMatch(av);
};

async function controllaMatch(miaAv) {
    const snapshot = await db.collection("users").get();
    let matchTrovato = false;
    const t = langPack[userLang];

    snapshot.forEach(doc => {
        if (doc.id !== currentUser && !matchTrovato) {
            const altro = doc.data();
            const altraAv = altro.availability;
            if (altraAv) {
                ["venerdi", "sabato", "domenica"].forEach(g => {
                    if (miaAv[g] && altraAv[g]) {
                        const comuni = miaAv[g].filter(f => altraAv[g].includes(f));
                        if (comuni.length > 0 && !matchTrovato) {
                            const giornoTradotto = document.getElementById(`label${g.charAt(0).toUpperCase() + g.slice(1)}`).innerText;
                            mostraPopupMatch(altro.displayName, giornoTradotto, comuni[0]);
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
    
    const btnWA = document.getElementById("matchWA");
    btnWA.onclick = () => {
        const msg = t.waMsg(nome, giorno, fascia);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById("matchModal").style.display = "flex";
}

// --- 6. UTILITY & NAVIGAZIONE ---
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
                document.querySelector(`[data-day="${d}"]`).classList.add("active");
                const s = document.getElementById(d + "-slots");
                s.classList.remove("disabled");
                s.querySelectorAll("input").forEach(cb => { if (av[d].includes(cb.value)) cb.checked = true; });
            }
        }
    }
}

document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        selectedDays[d] = !selectedDays[d];
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.changeTheme = (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
};

window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

function inizializzaLogin() {
    const b = document.getElementById("googleBtn");
    if (b) b.onclick = () => auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
}
