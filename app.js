// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU", // Chiave corretta senza caratteri extra
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
let userLang = 'it';

// 2. LOGIN (Metodo Redirect: il più affidabile su Mobile e PC)
window.startLogin = function() {
    console.log("Reindirizzamento a Google...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithRedirect(provider);
};

// 3. GESTIONE STATO UTENTE (L'anima dell'app)
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        currentUser = user.uid;
        console.log("Utente connesso:", user.displayName);
        
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            
            if (loginDiv) loginDiv.style.display = "none";
            if (appDiv) appDiv.style.display = "block";

            if (doc.exists && doc.data().displayName) {
                // Utente già registrato: carica profilo e dati
                const data = doc.data();
                userLang = data.lang || 'it';
                applicaLingua(data.displayName, userLang);
                document.getElementById("userPhoto").src = user.photoURL || "";
                document.getElementById("userEmail").innerText = user.email;
                caricaDisponibilitaSalvate(data.availability);
            } else {
                // Primo accesso: mostra onboarding
                document.getElementById("onboardingModal").style.display = "flex";
            }
        } catch (error) {
            console.error("Errore Database:", error);
            alert("Errore di connessione al database. Controlla le regole Firestore.");
        }
    } else {
        if (loginDiv) loginDiv.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
});

// 4. FUNZIONI ONBOARDING (Primo accesso)
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return alert("Inserisci un nome!");

    await db.collection("users").doc(currentUser).set({
        displayName: nome,
        lang: lingua,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    userLang = lingua;
    document.getElementById("onboardingModal").style.display = "none";
    applicaLingua(nome, lingua);
};

// 5. SALVATAGGIO DISPONIBILITÀ (Weekend)
window.saveAvailability = async () => {
    const btn = document.getElementById("labelSaveBtn");
    const testoOriginale = btn.innerText;
    btn.innerText = "Salvataggio...";
    btn.disabled = true;

    const availability = {
        venerdi: getSlotSelezionati("venerdi"),
        sabato: getSlotSelezionati("sabato"),
        domenica: getSlotSelezionati("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ 
            availability: availability 
        }, { merge: true });
        
        btn.innerText = "✅ Salvato!";
        setTimeout(() => { 
            btn.innerText = testoOriginale; 
            btn.disabled = false;
        }, 2000);
    } catch (e) {
        alert("Errore nel salvataggio");
        btn.innerText = testoOriginale;
        btn.disabled = false;
    }
};

// 6. UTILITY E NAVIGAZIONE
function getSlotSelezionati(giorno) {
    const container = document.getElementById(giorno + "-slots");
    if (container.classList.contains("disabled")) return [];
    
    return Array.from(container.querySelectorAll("input:checked")).map(cb => cb.value);
}

function caricaDisponibilitaSalvate(av) {
    if (!av) return;
    const giorni = ["venerdi", "sabato", "domenica"];
    
    giorni.forEach(g => {
        if (av[g] && av[g].length > 0) {
            const btn = document.querySelector(`[data-day="${g}"]`);
            const slotsDiv = document.getElementById(g + "-slots");
            btn.classList.add("active");
            slotsDiv.classList.remove("disabled");
            
            av[g].forEach(valore => {
                const cb = slotsDiv.querySelector(`input[value="${valore}"]`);
                if (cb) cb.checked = true;
            });
        }
    });
}

function applicaLingua(nome, lingua) {
    const welcome = lingua === 'it' ? "Ciao" : "Hi";
    document.getElementById("welcomeTitle").innerText = `${welcome} ${nome} 🤙🏻`;
}

// Gestione click pulsanti giorni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};

window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};

window.logout = () => auth.signOut().then(() => location.reload());
