// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
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

// --- 3. FIX LOGIN PER MOBILE (REDIRECT) ---
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Login completato con successo!");
}).catch((error) => {
    console.error("Errore Login Redirect:", error.message);
});

function inizializzaLogin() {
    const btn = document.getElementById("googleBtn");
    if (btn) {
        btn.onclick = (e) => {
            e.preventDefault();
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            auth.signInWithRedirect(provider);
        };
    }
}

// --- 4. GESTIONE PROFILO & LINGUA ---
async function inizializzaUtente(user) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    
    if (userDoc.exists && userDoc.data().displayName && userDoc.data().lang) {
        const data = userDoc.data();
        userLang = data.lang;
        applicaLingua(data.displayName, userLang);
        if (data.themeColor) document.documentElement.style.setProperty('--primary-color', data.themeColor);
        document.getElementById("userName").innerText = data.displayName;
    } else {
        document.getElementById("onboardingModal").style.display = "flex";
    }
}

window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return alert("Inserisci un nome valido!");

    try {
        await db.collection("users").doc(currentUser).set({
            displayName: nome,
            lang: lingua,
            themeColor: "#2563eb"
        }, { merge: true });

        userLang = lingua;
        document.getElementById("onboardingModal").style.display = "none";
        applicaLingua(nome, lingua);
    } catch (e) { alert("Errore nel salvataggio"); }
};

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
    document.getElementById("labelWhatsApp").innerText = t.waBtn;
}

// --- 5. STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        await inizializzaUtente(user);
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) document.getElementById("userPhoto").src = user.photoURL;
        await caricaDati();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
        inizializzaLogin();
    }
});

// --- 6. CORE LOGIC (SALVA & MATCH) ---
window.saveAvailability = async () => {
    const btnText = document.getElementById("labelSaveBtn");
    const t = langPack[userLang];
    btnText.innerText = t.saving;
    
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        btnText.innerText = t.saved;
        setTimeout(() => { btnText.innerText = t
