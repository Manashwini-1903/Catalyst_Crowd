// ==========================================
// CATALYST CROWD
// Main JavaScript
// ==========================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// ==========================================
// 1. MOBILE NAVIGATION
// ==========================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function () {

        const isOpen = navLinks.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", isOpen);

        menuToggle.textContent = isOpen ? "✕" : "☰";

    });

    const navigationLinks = navLinks.querySelectorAll("a");

    navigationLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            navLinks.classList.remove("open");

            menuToggle.setAttribute("aria-expanded", "false");

            menuToggle.textContent = "☰";

        });

    });

}


// ==========================================
// 2. SMOOTH SCROLL AND ACTIVE NAVIGATION
// ==========================================

const internalLinks = document.querySelectorAll('a[href*="#"]');

function updateActiveNavigation() {
const currentPage = window.location.pathname;
const currentHash = window.location.hash;


document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.remove("active");

    const url = new URL(link.href);
    const linkPage = url.pathname;
    const linkHash = url.hash;

    // Highlight the selected homepage section
    if (
        linkPage === currentPage &&
        linkHash &&
        currentHash === linkHash
    ) {
        link.classList.add("active");
    }

    // Highlight Home when on the homepage without a section hash
    else if (
        linkPage === currentPage &&
        !linkHash &&
        !currentHash &&
        link.textContent.trim() === "Home"
    ) {
        link.classList.add("active");
    }

    // Highlight Explore on the Explore page
    else if (
        currentPage.endsWith("/explore.html") &&
        linkPage.endsWith("/explore.html")
    ) {
        link.classList.add("active");
    }
});


}

internalLinks.forEach(function (link) {
link.addEventListener("click", function (event) {
const url = new URL(link.href);


    if (
        url.pathname === window.location.pathname &&
        url.hash
    ) {
        const targetElement = document.querySelector(url.hash);

        if (targetElement) {
            event.preventDefault();

            targetElement.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            history.replaceState(null, "", url.hash);
            updateActiveNavigation();
        }
    }
});


});

// Set the correct active link when the page loads
updateActiveNavigation();

// Handle browser back/forward navigation
window.addEventListener("hashchange", updateActiveNavigation);



// ==========================================
// 3. UPDATE NAVIGATION BASED ON LOGIN STATUS
// ==========================================

const navActions = document.getElementById("navActions");

if (navActions) {

    onAuthStateChanged(auth, function (user) {

        if (user) {

            // User is logged in.

            navActions.innerHTML = `
                <a href="create-campaign.html"
                   class="btn btn-outline">
                    + Create Campaign
                </a>

                <a href="dashboard.html"
class="btn btn-outline">
Dashboard </a>

<a href="profile.html"
class="btn btn-outline">
Profile </a>


                <button type="button"
                        class="btn btn-outline"
                        id="logoutButton">
                    Logout
                </button>
            `;

            const logoutButton =
                document.getElementById("logoutButton");

            logoutButton.addEventListener("click", async function () {

                try {

                    await signOut(auth);

                    window.location.href = "index.html";

                } catch (error) {

                    console.error("Logout failed:", error);

                    alert("Unable to log out. Please try again.");

                }

            });

        } else {

            // User is not logged in.

            navActions.innerHTML = `
                <a href="login.html"
                   class="btn btn-outline">
                    Log In
                </a>

                <a href="signup.html"
                   class="btn btn-primary">
                    Get Started <span>↗</span>
                </a>
            `;

        }

    });

}


// ==========================================
// 4. HOMEPAGE INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("Catalyst Crowd homepage loaded successfully.");

});