import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  connectFirestoreEmulator
} from
  "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* VISUAL DEBUG TOOL */
window.onerror = function(msg, url, line) {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:red; color:white; padding:10px; z-index:9999; font-size:12px;";
  div.innerText = "Error: " + msg + " at line " + line;
  document.body.appendChild(div);
};
window.addEventListener("unhandledrejection", (e) => {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed; bottom:40px; left:0; right:0; background:darkred; color:white; padding:10px; z-index:9999; font-size:12px;";
  div.innerText = "Async Error: " + (e.reason.message || e.reason);
  document.body.appendChild(div);
});

/* ✅ Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyDw0XicCM2yKlgF535Y3ChI5_JU6QtpFLk",
  authDomain: "qr-docs-9dd35.firebaseapp.com",
  projectId: "qr-docs-9dd35",
  storageBucket: "qr-docs-9dd35.firebasestorage.app",
  messagingSenderId: "277495922261",
  appId: "1:277495922261:web:88e742806a4af3db95dedc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
// }

/* Multi-user extraction */
const qs = new URLSearchParams(window.location.search);
const userId = qs.get("id");

if (!userId) {
  document.getElementById("profileName").innerText = "Invalid QR Code - No User ID";
  document.getElementById("bloodGroup").innerText = "N/A";
  document.querySelector(".emergency-card").style.display = "none";
  document.querySelector(".documents-card").style.display = "none";
}

/* ✅ Load Profile */
async function loadProfile() {
  if (!userId) return;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) {
    document.getElementById("profileName").innerText = "Profile not found";
    return;
  }

  const data = snap.data();

  document.getElementById("profileName")
    .append(" " + (data.name || "Unknown"));

  document.getElementById("bloodGroup")
    .textContent = data.bloodGroup || "Unknown";

  if (data.address) {
    document.getElementById("addressContainer").style.display = "block";
    const addrSpan = document.getElementById("profileAddress");
    if (data.mapsLink) {
      addrSpan.innerHTML = `<a href="${data.mapsLink}" target="_blank" class="text-decoration-none text-primary">${data.address}</a>`;
    } else {
      addrSpan.textContent = data.address;
    }
  }

  const alertsDiv = document.getElementById("medicalAlerts");
  alertsDiv.innerHTML = "";

  (data.medicalAlerts || []).forEach(alert => {
    const span = document.createElement("span");
    span.className = "badge-med me-2";
    span.textContent = alert;
    alertsDiv.appendChild(span);
  });
}

/* ✅ Load Emergency Contacts */
async function loadContacts() {
  if (!userId) return;
  const container = document.getElementById("contactsContainer");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "users", userId, "contacts"));

  snap.forEach(d => {
    const data = d.data();
    if (!window.primaryContactPhone) {
        window.primaryContactPhone = data.phone; // save first as primary
    }

    const a = document.createElement("a");
    a.href = "tel:" + data.phone;
    a.className = "btn btn-outline-success w-100 text-start";
    a.innerHTML = `<i class="bi bi-telephone-fill me-2"></i><strong>${data.label || 'Contact'}</strong>: ${data.phone}`;

    container.appendChild(a);
  });
}

/* ✅ Load Documents */
async function loadDocuments() {
  if (!userId) return;
  const container = document.getElementById("documentsContainer");
  if (!container) return;

  container.innerHTML = "";

  const snap = await getDocs(collection(db, "users", userId, "documents"));

  snap.forEach(d => {
    const data = d.data();
    if (!data.fileUrl) return;

    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary w-100 mb-2";
    btn.textContent = "View " + data.title;
    btn.onclick = () => viewDocument(data.fileUrl);

    container.appendChild(btn);
  });
}

/* ✅ Password-protected document view */
window.viewDocument = async function (fileUrl) {
  if (!userId) return;
  const snap = await getDoc(doc(db, "users", userId));
  const docPass = snap.exists() ? snap.data().documentPassword : null;
  
  if (!docPass) {
    // If no password is set for the user, maybe we allow access directly or warn them
    // Let's assume it's publicly readable if not protected, though ideally they set a password.
    // We will just let them open it for now if no password configured.
    console.warn("No document password configured by user. Proceeding directly.");
    window.open(fileUrl, "_blank");
    return;
  }

  const pwd = prompt("Enter document password");
  if (pwd !== docPass) {
    alert("Incorrect password");
    return;
  }

  window.open(fileUrl, "_blank");
};

/* ✅ Emergency Actions */
window.openEmergencyActions = function () {
  const panel = document.getElementById("emergencyPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
};

window.callPrimaryContact = function () {
  if (window.primaryContactPhone) {
    window.location.href = "tel:" + window.primaryContactPhone;
  } else {
    alert("No primary contact available");
  }
};

window.sendEmergencySMS = function () {
  navigator.geolocation.getCurrentPosition(pos => {
    const patientName = document.getElementById("profileName").innerText || "this patient";
    const msg =
      "🚨 URGENT MEDICAL EMERGENCY 🚨\n\n" +
      "This is an automated SOS. I have scanned the emergency medical QR code for " + patientName + 
      ", and they require immediate assistance.\n\n" +
      "Their live GPS coordinates are attached below. Please send help or contact me back immediately.\n\n" +
      "📍 Map Location:\n" +
      "https://maps.google.com/?q=" +
      pos.coords.latitude + "," +
      pos.coords.longitude;

    if (window.primaryContactPhone) {
      window.location.href = "sms:" + window.primaryContactPhone + "?body=" + encodeURIComponent(msg);
    } else {
      alert("No contacts set to message.");
    }
  }, (error) => {
      // Fallback if no location
      const patientName = document.getElementById("profileName").innerText || "this patient";
      const msg = "🚨 URGENT MEDICAL EMERGENCY for " + patientName + "🚨\nNeed immediate assistance!";
      if (window.primaryContactPhone) {
        window.location.href = "sms:" + window.primaryContactPhone + "?body=" + encodeURIComponent(msg);
      }
  });
};

/* ✅ Load everything on page load */
if (userId) {
  loadProfile();
  loadContacts();
  loadDocuments();
}