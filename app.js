// 1. CONFIGURAZIONE (Verifica che sia questa!)
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

// --- 2. LOGIN CON REDIRECT (Più sicuro per i blocchi popup) ---
window.startLogin = function() {
    console.log("Avvio login con redirect...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Questo comando cambia pagina e va su Google
    auth.signInWithRedirect(provider);
};

// Gestisce il ritorno dal login
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Bentornato:", result.user.displayName);
}).catch((error) => {
    console.error("Errore ritorno login:", error.code);
});

// --- 3. GESTORE STATO ---
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        document.getElementById("welcomeTitle").innerHTML = `Ciao ${user.displayName.split(' ')[0]} 🤙🏻`;
        
        // Carica dati dal database
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().availability) {
            caricaInterfaccia(doc.data().availability);
        }
    } else {
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
});

// --- 4. FUNZIONI APP ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    btn.innerText = "Salvataggio...";
    const av = {
        venerdi: Array.from(document.querySelectorAll("#venerdi-slots input:checked")).map(c => c.value),
        sabato: Array.from(document.querySelectorAll("#sabato-slots input:checked")).map(c => c.value),
        domenica: Array.from(document.querySelectorAll("#domenica-slots input:checked")).map(c => c.value)
    };
    try {
        await db.collection("users").doc(auth.currentUser.uid).set({ 
            availability: av, 
            displayName: auth.currentUser.displayName 
        }, { merge: true });
        btn.innerText = "✅ Salvato!";
        setTimeout(() => btn.innerText = "Salva disponibilità", 2000);
    } catch (e) { alert("Errore permessi!"); }
};

function caricaInterfaccia(av) {
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

// Eventi bottoni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});

window.logout = () => auth.signOut().then(() => location.reload());
