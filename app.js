// 1. CONFIGURAZIONE
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

// 2. LOGIN (Usa Popup invece di Redirect per interrompere il loop sui domini)
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login successo:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Errore login:", error.code);
            alert("Errore Login: " + error.message);
        });
};

// 3. GESTIONE STATO (Logica Anti-Loop)
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        console.log("Utente riconosciuto:", user.uid);
        
        // MOSTRA L'APP IMMEDIATAMENTE
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";

        try {
            const doc = await db.collection("users").doc(user.uid).get();
            
            if (doc.exists && doc.data().displayName) {
                document.getElementById("welcomeTitle").innerText = `Ciao ${doc.data().displayName} 🤙🏻`;
                if (doc.data().availability) caricaDisponibilita(doc.data().availability);
            } else {
                document.getElementById("onboardingModal").style.display = "flex";
            }
        } catch (e) {
            console.error("Errore Database:", e);
            // Se arrivi qui, Firestore è bloccato dalle regole
            alert("Firestore Error: Controlla le regole del database!");
        }
    } else {
        // Nessun utente: mostra solo login
        if (loginDiv) loginDiv.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
});

// 4. SALVATAGGIO
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
    } catch (e) {
        alert("Errore permessi database!");
        btn.innerText = "Salva disponibilità";
    }
};

// 5. UTILITY
function caricaDisponibilita(av) {
    Object.keys(av).forEach(giorno => {
        const slots = document.getElementById(giorno + "-slots");
        if (av[giorno].length > 0) {
            document.querySelector(`[data-day="${giorno}"]`).classList.add("active");
            slots.classList.remove("disabled");
            av[giorno].forEach(val => {
                const cb = slots.querySelector(`input[value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }
    });
}

// Navigazione e Onboarding
window.saveOnboarding = async () => {
    const n = document.getElementById("inputNome").value;
    await db.collection("users").doc(auth.currentUser.uid).set({ displayName: n, lang: 'it' }, { merge: true });
    document.getElementById("onboardingModal").style.display = "none";
    document.getElementById("welcomeTitle").innerText = `Ciao ${n} 🤙🏻`;
};

document.querySelectorAll(".day-btn").forEach(b => {
    b.onclick = () => {
        b.classList.toggle("active");
        document.getElementById(b.dataset.day + "-slots").classList.toggle("disabled");
    };
});

window.logout = () => auth.signOut().then(() => { location.href = location.pathname; });
