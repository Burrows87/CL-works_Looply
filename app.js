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
