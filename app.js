// ================= CONFIGURAZIONE =================
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// ================= GESTIONE UTENTE =================
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");
  
  if (user) {
    currentUser = user.uid;
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");
    await caricaDati();
  } else {
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// LOGIN GOOGLE
document.getElementById("googleBtn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await db.collection("users").doc(result.user.uid).set({
      name: result.user.displayName,
      email: result.user.email,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) { console.error("Errore Login:", e); }
});

// ================= LOGICA INTERFACCIA =================

// Gestione click sui bottoni dei giorni (Ven, Sab, Dom)
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const day = btn.dataset.day;
    toggleDay(day, true); // Passiamo true perché è un'azione manuale
  });
});

function toggleDay(day, isManual = false) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);
  
  // Cambia lo stato del giorno
  if (isManual) {
    selectedDays[day] = !selectedDays[day];
  } else {
    selectedDays[day] = true;
  }

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
    
    // LOGICA RICHIESTA: Se attivo il giorno manualmente, spunta "Sempre" di default
    if (isManual) {
      const alwaysCb = slots.querySelector('input[value="any"]');
      alwaysCb.checked = true;
      // Deseleziona le altre fasce per pulizia
      slots.querySelectorAll('input:not([value="any"])').forEach(cb => cb.checked = false);
    }
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");
    // Se spengo il giorno, pulisco tutti i checkbox
    slots.querySelectorAll("input").forEach(cb => cb.checked = false);
  }
}

// GESTIONE SMART CHECKBOX (Incrocio tra "Sempre" e fasce orarie)
document.querySelectorAll('.slots').forEach(container => {
  container.addEventListener('change', (e) => {
    const clicked = e.target;
    const alwaysCb = container.querySelector('input[value="any"]');
    const fasceCbs = container.querySelectorAll('input:not([value="any"])');

    if (clicked.value === "any") {
      // Se clicco "Sempre", deseleziono le altre fasce
      if (clicked.checked) {
        fasceCbs.forEach(cb => cb.checked = false);
      }
    } else {
      // Se clicco una fascia specifica, deseleziono "Sempre"
      if (clicked.checked) {
        alwaysCb.checked = false;
      }
    }
  });
});

// ================= SALVATAGGIO E CARICAMENTO =================

window.saveAvailability = async () => {
  const btn = document.getElementById("btnSave");
  const originalText = btn.innerText;
  
  const av = {
    venerdi: getCheckedValues("venerdi"),
    sabato: getCheckedValues("sabato"),
    domenica: getCheckedValues("domenica")
  };

  try {
    btn.disabled = true;
    btn.innerText = "Salvataggio...";
    
    await db.collection("users").doc(currentUser).set({ 
      availability: av,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    alert("✅ Disponibilità salvata!");
  } catch (e) {
    alert("Errore nel salvataggio. Riprova.");
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
};

function getCheckedValues(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(`${day}-slots`);
  const checked = Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
  return checked.length > 0 ? checked : null;
}

async function caricaDati() {
  try {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists && doc.data().availability) {
      const data = doc.data().availability;
      for (const day in data) {
        if (data[day] && data[day].length > 0) {
          toggleDay(day, false); // Attiva l'interfaccia senza resettare i flag
          const container = document.getElementById(`${day}-slots`);
          container.querySelectorAll("input").forEach(cb => {
            if (data[day].includes(cb.value)) {
              cb.checked = true;
            }
          });
        }
      }
    }
  } catch (e) { console.error("Errore caricamento:", e); }
}

// UTILS
window.logout = () => auth.signOut().then(() => location.reload());
window.loginEmail = () => alert("Login con email non ancora attivo. Usa Google!");
