// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7H8SUX6LiiSNJFjU",
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

// ================= SESSION HANDLER =================

firebase.auth().onAuthStateChanged(user => {

  if (user) {
    currentUser = user.uid;

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } else {
    currentUser = null;

    document.getElementById("formLogin").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }

});

// ================= GOOGLE LOGIN =================

window.loginWithGoogle = async function () {

  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);

    const user = result.user;
    currentUser = user.uid;

    await db.collection("users").doc(currentUser).set({
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: new Date()
    }, { merge: true });

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= STATE =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.getAttribute("data-day");
      toggleDay(day);
    });
  });

  document.querySelectorAll(".slots").forEach(container => {

    const checkboxes = container.querySelectorAll("input");

    checkboxes.forEach(cb => {

      cb.addEventListener("change", () => {

        const always = container.querySelector(".always");

        if (cb.classList.contains("always") && cb.checked) {
          checkboxes.forEach(c => {
            if (c !== always) c.checked = false;
          });
        } else if (!cb.classList.contains("always") && cb.checked) {
          if (always) always.checked = false;
        }

        const anyChecked = Array.from(checkboxes).some(c => c.checked);

        if (!anyChecked && always) {
          always.checked = true;
        }

      });

    });

  });

});

// ================= TOGGLE DAY =================

window.toggleDay = function(day) {

  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);

  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.disabled = false;
      cb.checked = false;
    });

    const always = slots.querySelector(".always");
    if (always) always.checked = true;

  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });
  }
};

// ================= AVAILABILITY =================

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
