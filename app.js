// 1. CONFIGURAZIONE (Verificata)
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

// 2. FUNZIONE LOGIN (Cambiata in Popup per evitare il loop)
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Forza la scelta dell'account
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login riuscito:", result.user.displayName);
            // Non serve ricaricare, onAuthStateChanged farà il resto
        })
        .catch((error) => {
            console.error("Errore Login:", error.code);
            alert("Errore durante il login: " + error.message);
        });
};

// 3. GESTORE STATO (Senza reload automatici)
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        console.log("Utente loggato con UID:", user.uid);
        
        // Blocca il loop visivo: nascondi login e mostra app subito
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";

        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().displayName) {
                document.getElementById("welcomeTitle").innerText = `Ciao ${doc.data().displayName} 🤙🏻`;
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

// 4. ALTRE FUNZIONI (Onboarding e Logout)
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    if (nome.length < 2) return alert("Inserisci un nome!");
    
    await db.collection("users").doc(auth.currentUser.uid).set({
        displayName: nome, lang: 'it', availability: {}
    }, { merge: true });
    
    document.getElementById("onboardingModal").style.display = "none";
    document.getElementById("welcomeTitle").innerText = `Ciao ${nome} 🤙🏻`;
};

window.logout = () => auth.signOut().then(() => {
    // Invece di reload, puliamo l'interfaccia
    document.getElementById("app").style.display = "none";
    document.getElementById("formLogin").style.display = "flex";
});

// Gestione interruttori giorni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});
