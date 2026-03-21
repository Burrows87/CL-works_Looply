// 1. CONFIGURAZIONE (Verificata: AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione sicura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// --- 2. FUNZIONE LOGIN (Chiamata solo dal tasto HTML) ---
window.startLogin = function() {
    console.log("Pulsante cliccato: avvio login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Usiamo il Popup: è l'unico che non ricarica la pagina e ferma il loop
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login riuscito:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Errore durante il login:", error.code);
            // Se il popup è bloccato (es. su Safari), usiamo il redirect come emergenza
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
            alert("Il browser ha bloccato la finestra. Controlla le impostazioni popup o riprova.");
        });
};

// --- 3. GESTORE STATO (Controlla se sei loggato senza ricaricare) ---
auth.onAuthStateChanged(async (user) => {
    const loader = document.getElementById("initialLoader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        console.log("Stato: Utente loggato", user.uid);
        currentUser = user.uid;
        
        // UI Switch
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";

        // Nome e Foto
        const title = document.getElementById("welcomeTitle");
        if (title) title.innerHTML = `Ciao ${user.displayName.split(' ')[0]} 🤙🏻`;
        
        if(document.getElementById("userName")) document.getElementById("userName").innerText = user.displayName;
        if(document.getElementById("userEmail")) document.getElementById("userEmail").innerText = user.email;
        if(document.getElementById("userPhoto") && user.photoURL) {
            document.getElementById("userPhoto").src = user.photoURL;
            document.getElementById("userPhoto").style.display = "block";
        }

        await caricaDatiUtente();
    } else {
        console.log("Stato: Nessun utente");
        currentUser = null;
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }

    // Nascondi caricamento iniziale
    if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 500);
    }
});

// --- 4. LOGICA GIORNI ---
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        
        btn.classList.toggle("active", selectedDays[day]);
        if(slots) slots.classList.toggle("disabled", !selectedDays[day]);
    };
});

// --- 5. SALVATAGGIO E MATCH ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvo...';

    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({
            availability: av,
            displayName: auth.currentUser.displayName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        btn.innerHTML
