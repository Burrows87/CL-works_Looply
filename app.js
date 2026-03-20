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

// USA IL POPUP: Interrompe il loop di ricaricamento della pagina
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login riuscito:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Errore Login:", error);
            alert("Errore: " + error.message);
        });
};

auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        // MOSTRA SUBITO L'APP: Questo blocca visivamente il loop
        loginDiv.style.display = "none";
        appDiv.style.display = "block";

        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().displayName) {
                document.getElementById("welcomeTitle").innerText = `Ciao ${doc.data().displayName} 🤙🏻`;
                // Carica qui le disponibilità se presenti
            } else {
                document.getElementById("onboardingModal").style.display = "flex";
            }
        } catch (e) {
            console.error("Firestore error:", e);
        }
    } else {
        loginDiv.style.display = "flex";
        appDiv.style.display = "none";
    }
});

// Funzione Onboarding
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    if (nome.length < 2) return alert("Inserisci un nome!");
    await db.collection("users").doc(auth.currentUser.uid).set({
        displayName: nome, lang: 'it'
    }, { merge: true });
    document.getElementById("onboardingModal").style.display = "none";
    document.getElementById("welcomeTitle").innerText = `Ciao ${nome} 🤙🏻`;
};

// Navigazione
window.logout = () => auth.signOut().then(() => {
    // Invece di reload, puliamo l'interfaccia manualmente
    document.getElementById("app").style.display = "none";
    document.getElementById("formLogin").style.display = "flex";
});

// Gestione click pulsanti giorni
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const d = btn.dataset.day;
        btn.classList.toggle("active");
        document.getElementById(d + "-slots").classList.toggle("disabled");
    };
});
