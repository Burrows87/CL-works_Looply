// ================= CONFIGURAZIONE FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b",
  measurementId: "G-RH0H7FFPBJ"
};

// Inizializzazione sicura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// ================= GESTIONE SESSIONE (onAuthStateChanged) =================
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");

  if (user) {
    console.log("Accesso eseguito:", user.email);
    currentUser = user.uid;
    
    // Mostra l'app e nasconde il login
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");

    // Carica i dati salvati dell'utente da Firestore
    caricaDatiUtente();
  } else {
    console.log("Nessun utente collegato.");
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// ================= LOGIN CON GOOGLE (POPUP) =================
document.getElementById("googleBtn").addEventListener("click", async () => {
  console.log("Avvio Google Login...");
  const provider = new firebase.auth.GoogleAuthProvider();
  
  // Forza la scelta dell'account per evitare loop automatici
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Crea o aggiorna il profilo utente su Firestore
    await db.collection("users").doc(user.uid).set({
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Login e salvataggio profilo completati.");
  } catch (error) {
    console.error("Errore Login Google:", error);
    alert("Errore durante il login: " + error.message);
  }
});

// ================= LOGOUT =================
window.logout = function() {
  auth.signOut().then(() => {
    // Reset interfaccia manuale per sicurezza
    location.reload();
  });
};

// ================= LOGICA GIORNI E SLOT =================
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const day = btn.dataset.day;
    toggleDay(day);
  });
});

function toggleDay(day) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);

  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
    slots.querySelectorAll("input").forEach(cb => cb.disabled = false);
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");
    slots.querySelectorAll("input").forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });
  }
}

// ================= SALVATAGGIO E CARICAMENTO FIRESTORE =================

// Salva la disponibilità
window.saveAvailability = async function () {
  if (!currentUser) return alert("Effettua il login!");

  const availability = {
    venerdi: getDayData("venerdi"),
    sabato: getDayData("sabato"),
    domenica: getDayData("domenica")
  };

  try {
    await db.collection("users").doc(currentUser).set({
      availability: availability,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    alert("Disponibilità salvata con successo!");
  } catch (err) {
    console.error("Errore salvataggio:", err);
    alert("Errore durante il salvataggio.");
  }
};

// Carica la disponibilità esistente all'avvio
async function caricaDatiUtente() {
  try {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists && doc.data().availability) {
      const av = doc.data().availability;
      
      // Cicla sui giorni per ripristinare i bottoni e i checkbox
      ["venerdi", "sabato", "domenica"].forEach(day => {
        if (av[day]) {
          // Attiva il giorno
          toggleDay(day); 
          // Seleziona i checkbox specifici
          const container = document.getElementById(`${day}-slots`);
          container.querySelectorAll("input").forEach(cb => {
            if (av[day].includes(cb.value)) {
              cb.checked = true;
            }
          });
        }
      });
    }
  } catch (error) {
    console.error("Errore caricamento dati:", error);
  }
}

function getDayData(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(`${day}-slots`);
  const checked = Array.from(container.querySelectorAll("input:checked")).map(cb => cb.value);
  return checked.length ? checked : ["any"];
}

// Placeholder Login Email
window.loginEmail = function() { 
  alert("Login email in fase di sviluppo. Usa Google!"); 
};
