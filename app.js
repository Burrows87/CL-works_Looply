// ================= CONFIGURAZIONE =================
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7H8SUX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// ================= GESTIONE SESSIONE =================
auth.onAuthStateChanged(user => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");

  if (user) {
    console.log("Utente connesso:", user.email);
    currentUser = user.uid;
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");
  } else {
    console.log("Nessun utente connesso");
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// ================= LOGIN GOOGLE (POPUP) =================
document.getElementById("googleBtn").addEventListener("click", async () => {
  console.log("Avvio Google Login...");
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Salvataggio immediato su Firestore
    await db.collection("users").doc(user.uid).set({
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Login completato e dati salvati.");

  } catch (error) {
    console.error("Errore Login Google:", error);
    alert("Errore: " + error.message);
  }
});

// ================= LOGOUT =================
window.logout = function() {
  auth.signOut().then(() => {
    location.reload(); // Ricarica la pagina per resettare lo stato dell'interfaccia
  });
};

// ================= LOGICA DISPONIBILITÀ =================
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

// ================= SALVATAGGIO DISPONIBILITÀ =================
window.saveAvailability = async function () {
  if (!currentUser) {
    alert("Devi effettuare il login prima di salvare!");
    return;
  }

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
    console.error("Errore salvataggio Firestore:", err);
    alert("Errore durante il salvataggio.");
  }
};

function getDayData(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(`${day}-slots`);
  const checked = Array.from(container.querySelectorAll("input:checked")).map(cb => cb.value);
  return checked.length ? checked : ["any"];
}

window.loginEmail = function() { 
  alert("Il login con email/password sarà disponibile a breve!"); 
};
