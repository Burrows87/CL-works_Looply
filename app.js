// 1. CONFIGURAZIONE (Chiave corretta: AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU", 
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Log di controllo: premi F12 sul sito per vedere se la chiave è questa!
console.log("Looply Debug - API Key in uso:", firebaseConfig.apiKey);

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. LOGIN (Popup: l'unico che ferma il loop su GitHub Pages)
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithPopup(provider)
        .then((result) => console.log("Login OK:", result.user.displayName))
        .catch((error) => {
            console.error("Errore critico Google:", error);
            alert("Errore API: " + error.message + "\n\nSe vedi 'API key not valid', controlla le restrizioni su Google Cloud Console.");
        });
};

// 3. GESTIONE STATO UTENTE
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";

        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().displayName) {
                document.getElementById("welcomeTitle").innerText = `Ciao ${doc.data().displayName} 🤙🏻`;
                document.getElementById("userPhoto").src = user.photoURL || "";
                if (doc.data().availability) caricaDati(doc.data().availability);
            } else {
                document.getElementById("onboardingModal").style.display = "flex";
            }
        } catch (e) {
            console.error("Errore Firestore:", e);
        }
    } else {
        if (loginDiv) loginDiv.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
});

// 4. FUNZIONI APP
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    if (nome.length < 2) return alert("Inserisci un nome!");
    await db.collection("users").doc(auth.currentUser.uid).set({
        displayName: nome, lang: 'it', availability: {}
    }, { merge: true });
    document.getElementById("onboardingModal").style.display = "none";
    document.getElementById("welcomeTitle").innerText = `Ciao ${nome} 🤙🏻`;
};

window.saveAvailability = async () => {
    const btn = document.getElementById("labelSaveBtn");
    btn.innerText = "Salvataggio...";
    const av = {
        venerdi: Array.from(document.querySelectorAll("#venerdi-slots input:checked")).map(c => c.value),
        sabato: Array.from(document.querySelectorAll("#sabato-slots input:checked")).map(c => c.value),
        domenica: Array.from(document.querySelectorAll("#domenica-slots input:checked")).map(c => c.value)
    };
    try {
        await db.collection("users").doc(auth.currentUser.uid).set({ availability: av }, { merge: true });
        btn.innerText = "✅ Salvato!";
        setTimeout(() => btn.innerText = "Salva disponibilità", 2000);
    } catch (e) { alert("Errore permessi!"); btn.innerText = "Salva"; }
};

function caricaDati(av) {
    ["venerdi", "sabato", "domenica"].forEach(g => {
        if (av[g] && av[g].length > 0) {
            document.querySelector(`[data-day="${g}"]`).classList.add("active");
            document.getElementById(g + "-slots").classList.remove("disabled");
            av[g].forEach(v => {
                const cb = document.querySelector(`#${g}-slots input[value="${v}"]`);
                if (cb) cb.checked = true;
            });
        }
    });
}

// 5. INTERFACCIA
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.logout = () => auth.signOut();
window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
