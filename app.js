// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ================= STATE =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

// ================= TOGGLE DAY =================

window.toggleDay = function(day) {

  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);

  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");

    // reset checkbox
    slots.querySelectorAll("input").forEach(cb => cb.checked = false);
  }
};

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {

  // Prefill "Ricordami"
  const savedName = localStorage.getItem("looply_name");
  const savedPhone = localStorage.getItem("looply_phone");

  if (savedName) document.getElementById("username").value = savedName;
  if (savedPhone) document.getElementById("phone").value = savedPhone;

  // Event listener bottoni giorni
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.getAttribute("data-day");
      toggleDay(day);
    });
  });

});

// ================= LOGIN =================

window.login = async function () {

  const name = document.getElementById("username").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const remember = document.getElementById("rememberMe")?.checked;

  if (!name || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name,
      phone,
      createdAt: new Date()
    });

    // Ricordami
    if (remember) {
      localStorage.setItem("looply_name", name);
      localStorage.setItem("looply_phone", phone);
    } else {
      localStorage.removeItem("looply_name");
      localStorage.removeItem("looply_phone");
    }

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= GET AVAILABILITY =================

function getAvailability() {

  function getDaySlots(day) {

    if (!selectedDays[day]) return null;

    const container = document.getElementById(`${day}-slots`);

    const checked = Array.from(container.querySelectorAll("input:checked"))
      .map(cb => cb.value);

    return checked.length > 0 ? checked : ["any"];
  }

  return {
    venerdi: getDaySlots("venerdi"),
    sabato: getDaySlots("sabato"),
    domenica: getDaySlots("domenica")
  };
}

// ================= SAVE =================

window.saveAvailability = async function () {

  if (!currentUser) {
    alert("Utente non loggato");
    return;
  }

  const availability = getAvailability();

  try {
    await db.collection("users").doc(currentUser).set({
      availability
    }, { merge: true });

    alert("Disponibilità salvata");

  } catch (error) {
    console.error(error);
    alert("Errore nel salvataggio");
  }
};
