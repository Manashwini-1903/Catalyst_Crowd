import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
updateProfile,
signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
doc,
getDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Page elements
const profileLoading = document.getElementById("profileLoading");
const profileContent = document.getElementById("profileContent");
const profileError = document.getElementById("profileError");

const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileDisplayEmail = document.getElementById("profileDisplayEmail");

const profileForm = document.getElementById("profileForm");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

const profileCreatedAt = document.getElementById("profileCreatedAt");
const profileMessage = document.getElementById("profileMessage");
const saveProfileButton = document.getElementById("saveProfileButton");

const logoutButton = document.getElementById("logoutButton");
const profileLogoutButton = document.getElementById("profileLogoutButton");

let currentUser = null;

function displayMessage(message, type) {
profileMessage.textContent = message;
profileMessage.className = "profile-message " + type;
}

function updateProfilePreview(name, email) {
profileDisplayName.textContent = name;
profileDisplayEmail.textContent = email;
profileAvatar.textContent = name.charAt(0).toUpperCase() || "U";
}

function formatCreatedAt(timestamp) {
if (!timestamp) {
return "Not available";
}

   
let date;

// Firestore timestamps have a toDate() method.
if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
} else if (timestamp instanceof Date) {
    date = timestamp;
} else {
    return "Not available";
}

return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
});
   

}

async function loadProfile(user) {
currentUser = user;

   
const name = user.displayName || "Crowd Member";
const email = user.email || "";

profileName.value = name;
profileEmail.value = email;

updateProfilePreview(name, email);

try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
        const userData = userSnapshot.data();

        profileCreatedAt.textContent = formatCreatedAt(
            userData.createdAt
        );
    } else {
        profileCreatedAt.textContent = "Not available";
    }

    profileLoading.hidden = true;
    profileContent.hidden = false;

} catch (error) {
    console.error("Error loading profile data:", error);

    // The authentication details can still be displayed if
    // the Firestore profile document cannot be read.
    profileCreatedAt.textContent = "Not available";

    profileLoading.hidden = true;
    profileContent.hidden = false;

    displayMessage(
        "Your account loaded, but some profile information couldn't be retrieved.",
        "error"
    );
}
   

}

// Verify authentication before showing account information.
onAuthStateChanged(auth, async (user) => {
if (!user) {
window.location.replace("login.html");
return;
}

   
await loadProfile(user);
   

});

// Save the new display name.
profileForm.addEventListener("submit", async (event) => {
event.preventDefault();

   
if (!currentUser) {
    displayMessage("Please log in again before updating your profile.", "error");
    return;
}

const newName = profileName.value.trim();

if (newName.length < 2) {
    displayMessage("Your display name must contain at least 2 characters.", "error");
    return;
}

if (newName.length > 60) {
    displayMessage("Your display name cannot exceed 60 characters.", "error");
    return;
}

const originalButtonText = saveProfileButton.textContent;

saveProfileButton.disabled = true;
saveProfileButton.textContent = "Saving...";
profileMessage.textContent = "";

try {
    // Update the Firebase Authentication display name.
    await updateProfile(currentUser, {
        displayName: newName
    });

    // Update the corresponding Firestore user document.
    const userRef = doc(db, "users", currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
        await updateDoc(userRef, {
            name: newName
        });
    }

    updateProfilePreview(newName, currentUser.email || "");

    displayMessage("Your profile was updated successfully!", "success");

} catch (error) {
    console.error("Profile update error:", error);

    if (error.code === "permission-denied") {
        displayMessage(
            "Your name was updated in authentication, but Firestore did not allow the profile update. Please check your security rules.",
            "error"
        );
    } else {
        displayMessage(
            "We couldn't save your changes. Please try again.",
            "error"
        );
    }

} finally {
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = originalButtonText;
}
   

});

// Shared logout function for both buttons.
async function logOutUser() {
logoutButton.disabled = true;
profileLogoutButton.disabled = true;

   
try {
    await signOut(auth);
    window.location.replace("index.html");

} catch (error) {
    console.error("Logout error:", error);

    displayMessage(
        "We couldn't log you out. Please try again.",
        "error"
    );

    logoutButton.disabled = false;
    profileLogoutButton.disabled = false;
}
   

}

logoutButton.addEventListener("click", logOutUser);
profileLogoutButton.addEventListener("click", logOutUser);
