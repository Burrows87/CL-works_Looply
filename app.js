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

// ================= SESSION =================

auth.onAuthStateChanged(user => {

  if (user) {

    currentUser = user.uid;

    console.log("SESSION ACTIVE:", user.email);

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } else {

    currentUser = null;

    console.log("NO SESSION");

    document.getElementById("formLogin").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");

  }

});

// ================= GOOGLE LOGIN =================

// CLICK BUTTON
document.getElementById("googleBtn").addEventListener("click", () => {

  console.log("Google login click");

  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithRedirect(provider);

});

// HANDLE REDIRECT RESULT
auth.getRedirectResult()
  .then(async (result) => {

    if (result.user) {

      const user = result.user;
      currentUser = user.uid;

      console.log("Redirect login OK:", user.email);

      await db.collection("users").doc(currentUser).set({
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date()
      }, { merge: true });

    }

  })
  .catch(err => {
    console.error("Redirect error:", err);
    alert(err.message);
  });

// ================= EMAIL LOGIN (PLACEHOLDER) =================

window.login = function () {
  alert("Login email non configurato");
};

// ================= DAYS =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

document.querySelectorAll(".day-btn").forEach(btn => {

  btn.addEventListener("click", () => {
    toggleDay(btn.dataset.day);
  });

});

function toggleDay(day) {

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
}

window.toggleDay = toggleDay;

// ================= AVAILABILITY =================

function getAvailability() {

  function getDay(day) {

    if (!selectedDays[day]) return null;

    const container = document.getElementById(`${day}-slots`);

    const checked = Array.from(container.querySelectorAll("input:checked"))
      .map(cb => cb.value);

    return checked.length ? checked : ["any"];
  }

  return {
    venerdi: getDay("venerdi"),
    sabato: getDay("sabato"),
    domenica: getDay("domenica")
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

  } catch (err) {
    console.error(err);
    alert("Errore salvataggio");
  }
};
