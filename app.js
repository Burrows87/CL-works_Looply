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

let currentUser = null;

// 2. LOGIN (Redirect per evitare blocchi popup)
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithRedirect(provider);
};

// 3. GESTIONE STATO (Anti-Loop)
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const onboarding = document.getElementById("onboardingModal");

    if (user) {
        currentUser = user.uid;
        
        // INTERROMPI IL LOOP: Mostra subito l'app e nascondi il login
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";

        try {
            const doc = await db.collection("users").doc(user.uid).get();
            
            if (doc.exists && doc.data().displayName) {
                // Utente già registrato
                const data = doc.data();
                document.getElementById("welcomeTitle").innerText = `Ciao ${data.displayName} 🤙🏻`;
                document.getElementById("userPhoto").src = user.photoURL || "";
                
                if (data.availability) {
                    caricaDisponibilitaSalvate(data.availability);
                }
            } else {
                // Nuovo utente: mostra onboarding
                if (onboarding) onboarding.style.display = "flex";
            }
        } catch (error) {
            console.error("Errore Firestore:", error);
            // Se vedi questo alert, devi cambiare le "Rules" su Firebase
            alert("Errore Database: Controlla le 'Rules' su Firebase Console!");
        }
    } else {
        // Nessun utente loggato
        if (loginDiv) loginDiv.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
});

// 4. SALVATAGGIO DISPONIBILITÀ
window.saveAvailability = async () => {
    const btn = document.getElementById("labelSaveBtn");
    btn.innerText = "Salvataggio...";

    const availability = {
        venerdi: Array.from(document.querySelectorAll("#venerdi-slots input:checked")).map(cb => cb.value),
        sabato: Array.from(document.querySelectorAll("#sabato-slots input:checked")).map(cb => cb.value),
        domenica: Array.from(document.querySelectorAll("#domenica-slots input:checked")).map(cb => cb.value)
    };

    try {
        await db.collection("users").doc(currentUser).set({ 
            availability: availability 
        }, { merge: true });
        
        btn.innerText = "✅ Salvato!";
        setTimeout(() => btn.innerText = "Salva disponibilità", 2000);
    } catch (e) {
        alert("Errore nel salvataggio: " + e.message);
        btn.innerText = "Salva disponibilità";
    }
};

// 5. ONBOARDING
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    if (nome.length < 2) return alert("Inserisci un nome!");

    await db.collection("users").doc(currentUser).set({
        displayName: nome,
        lang: document.getElementById("selectLingua").value
    }, { merge: true });

    document.getElementById("onboardingModal").style.display = "none";
    document.getElementById("welcomeTitle").innerText = `Ciao ${nome} 🤙🏻`;
};

// 6. UTILITY INTERFACCIA
function caricaDisponibilitaSalvate(av) {
    ["venerdi", "sabato", "domenica"].forEach(g => {
        if (av[g] && av[g].length > 0) {
            const btn = document.querySelector(`[data-day="${g}"]`);
            const slotsDiv = document.getElementById(g + "-slots");
            if (btn) btn.classList.add("active");
            if (slotsDiv) {
                slotsDiv.classList.remove("disabled");
                av[g].forEach(val => {
                    const cb = slotsDiv.querySelector(`input[value="${val}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    });
}

// Gestione click pulsanti giorni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
