import { db, auth } from "./firebase.js";

import {
doc,
getDoc,
collection,
addDoc,
getDocs,
query,
where,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// ========================================
// 1. PAGE ELEMENTS
// ========================================

const loadingMessage = document.getElementById("detailsLoading");
const errorSection = document.getElementById("detailsError");
const errorTitle = document.getElementById("errorTitle");
const errorMessage = document.getElementById("errorMessage");
const detailsLayout = document.getElementById("detailsLayout");

const detailsImage = document.getElementById("detailsImage");
const detailsTitle = document.getElementById("detailsTitle");
const detailsCategory = document.getElementById("detailsCategory");
const detailsCreator = document.getElementById("detailsCreator");
const detailsDescription = document.getElementById("detailsDescription");

const detailsRaised = document.getElementById("detailsRaised");
const detailsGoal = document.getElementById("detailsGoal");
const detailsProgressFill = document.getElementById("detailsProgressFill");
const detailsProgressBar = document.getElementById("detailsProgressBar");
const detailsPercentage = document.getElementById("detailsPercentage");
const detailsRemaining = document.getElementById("detailsRemaining");

const infoCategory = document.getElementById("infoCategory");
const detailsDeadline = document.getElementById("detailsDeadline");
const detailsStatus = document.getElementById("detailsStatus");

const contributionForm = document.getElementById("contributionForm");
const contributionAmount = document.getElementById("contributionAmount");
const supportButton = document.getElementById("supportButton");
const contributionMessage = document.getElementById("contributionMessage");

// ========================================
// 2. CAMPAIGN AND AUTHENTICATION VARIABLES
// ========================================

const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");

let currentCampaign = null;
let totalRaised = 0;
let campaignIsOpen = true;
let currentUser = null;

// Wait for Firebase to determine whether the user is logged in.
const authReady = new Promise((resolve) => {
const unsubscribe = onAuthStateChanged(
auth,
(user) => {
currentUser = user;
unsubscribe();
resolve(user);
},
(error) => {
console.error("Authentication error:", error);
resolve(null);
}
);
});

// ========================================
// 3. HELPER FUNCTIONS
// ========================================

const currencyFormatter = new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
maximumFractionDigits: 0
});

function formatMoney(amount) {
return currencyFormatter.format(amount);
}

function formatDeadline(deadline) {
if (!deadline) {
return "Not specified";
}

   
const date = new Date(deadline + "T00:00:00");

if (Number.isNaN(date.getTime())) {
    return "Not specified";
}

return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
});
   

}

function showError(title, message) {
loadingMessage.hidden = true;
detailsLayout.hidden = true;
errorSection.hidden = false;

   
errorTitle.textContent = title;
errorMessage.textContent = message;
   

}

function showContributionMessage(message, type) {
contributionMessage.textContent = message;
contributionMessage.className = "contribution-message " + type;
}

function getDeadlineStatus(deadline) {
if (!deadline) {
return "Active";
}

   
const today = new Date();
today.setHours(0, 0, 0, 0);

const deadlineDate = new Date(deadline + "T00:00:00");

if (Number.isNaN(deadlineDate.getTime())) {
    return "Active";
}

if (deadlineDate < today) {
    return "Deadline passed";
}

return "Active";
   

}

// ========================================
// 4. LOAD CONTRIBUTIONS FROM FIRESTORE
// ========================================

async function loadContributions() {
const contributionsRef = collection(db, "contributions");

   
const contributionsQuery = query(
    contributionsRef,
    where("campaignId", "==", campaignId)
);

const snapshot = await getDocs(contributionsQuery);

let total = 0;

snapshot.forEach((contributionDocument) => {
    const contribution = contributionDocument.data();
    const amount = Number(contribution.amount);

    if (Number.isFinite(amount) && amount > 0) {
        total += amount;
    }
});

totalRaised = total;

return total;
   

}

// ========================================
// 5. UPDATE FUNDING INFORMATION
// ========================================

function updateFundingDisplay() {
if (!currentCampaign) {
return;
}

   
const goal = Number(currentCampaign.goalAmount) || 0;

const percentage = goal > 0
    ? Math.min(100, Math.round((totalRaised / goal) * 100))
    : 0;

const remaining = Math.max(0, goal - totalRaised);

detailsRaised.textContent = formatMoney(totalRaised);
detailsGoal.textContent = formatMoney(goal);

detailsPercentage.textContent = percentage + "% funded";
detailsRemaining.textContent = formatMoney(remaining) + " to go";

detailsProgressFill.style.width = percentage + "%";

detailsProgressBar.setAttribute(
    "aria-valuenow",
    String(percentage)
);

// Update campaign status.
const deadlineStatus = getDeadlineStatus(currentCampaign.deadline);

if (goal > 0 && totalRaised >= goal) {
    detailsStatus.textContent = "Goal reached";
} else {
    detailsStatus.textContent = deadlineStatus;
}

campaignIsOpen = deadlineStatus !== "Deadline passed";

if (!campaignIsOpen) {
    supportButton.disabled = true;
    supportButton.textContent = "Campaign Deadline Passed";
} else {
    supportButton.disabled = false;
    supportButton.textContent = "Record Simulated Contribution";
}
   

}

// ========================================
// 6. LOAD CAMPAIGN DETAILS
// ========================================

async function loadCampaign() {
if (!campaignId) {
showError(
"No campaign selected",
"Open Explore Campaigns and select a campaign to see its details."
);
return;
}

   
try {
    const campaignRef = doc(db, "campaigns", campaignId);
    const campaignSnapshot = await getDoc(campaignRef);

    if (!campaignSnapshot.exists()) {
        showError(
            "Campaign not found",
            "This campaign may have been removed, or the link may be incorrect."
        );
        return;
    }

    const campaign = campaignSnapshot.data();

    if (
        typeof campaign.title !== "string" ||
        typeof campaign.description !== "string"
    ) {
        showError(
            "Campaign information unavailable",
            "This campaign does not contain the information needed to display its details."
        );
        return;
    }

    currentCampaign = campaign;

    // Campaign title and description.
    detailsTitle.textContent = campaign.title;
    detailsDescription.textContent = campaign.description;

    // Category.
    const category = campaign.category || "Other";

    detailsCategory.textContent = category;
    infoCategory.textContent = category;

    // Creator.
    detailsCreator.textContent =
        campaign.creatorName || "Community member";

    // Campaign image.
    if (
        typeof campaign.imageUrl === "string" &&
        campaign.imageUrl.trim() !== ""
    ) {
        try {
            const imageURL = new URL(campaign.imageUrl);

            if (
                imageURL.protocol === "https:" ||
                imageURL.protocol === "http:"
            ) {
                detailsImage.src = imageURL.href;
                detailsImage.alt = campaign.title;
                detailsImage.hidden = false;

                detailsImage.onerror = function () {
                    detailsImage.hidden = true;
                };
            } else {
                detailsImage.hidden = true;
            }
        } catch {
            detailsImage.hidden = true;
        }
    } else {
        detailsImage.hidden = true;
    }

    // Deadline.
    detailsDeadline.textContent = formatDeadline(campaign.deadline);

    // Calculate the total from contribution records.
    // We deliberately do not modify campaign.amountRaised.
    await loadContributions();

    updateFundingDisplay();

    // Update the browser tab title.
    document.title = campaign.title + " | Catalyst Crowd";

    // Show the completed page.
    loadingMessage.hidden = true;
    errorSection.hidden = true;
    detailsLayout.hidden = false;

} catch (error) {
    console.error("Error loading campaign:", error);

    if (error.code === "permission-denied") {
        showError(
            "Access denied",
            "Firebase did not allow this information to be read. Please check your Firestore security rules."
        );
    } else {
        showError(
            "Unable to load campaign",
            "Something went wrong while retrieving this campaign. Please check your internet connection and try again."
        );
    }
}
   

}

// ========================================
// 7. RECORD A SIMULATED CONTRIBUTION
// ========================================

contributionForm.addEventListener("submit", async function (event) {
event.preventDefault();

   
if (!currentCampaign) {
    showContributionMessage(
        "Campaign information is not available. Please refresh the page.",
        "error"
    );
    return;
}

// Validate the amount.
const amount = Number(contributionAmount.value);

if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 1000000
) {
    showContributionMessage(
        "Enter a whole-number amount between ₹1 and ₹10,00,000.",
        "error"
    );
    return;
}

if (!campaignIsOpen) {
    showContributionMessage(
        "This campaign's deadline has passed, so new contributions are disabled.",
        "error"
    );
    return;
}

supportButton.disabled = true;
supportButton.textContent = "Recording...";

try {
    // Wait for Firebase authentication to initialize.
    const user = await authReady;

    if (!user) {
        showContributionMessage(
            "Please log in before recording a simulated contribution.",
            "error"
        );

        supportButton.disabled = false;
        supportButton.textContent = "Record Simulated Contribution";

        sessionStorage.setItem(
            "returnAfterLogin",
            window.location.href
        );

        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    // Save one separate contribution document.
    // serverTimestamp() matches the Firestore rule requiring request.time.
    await addDoc(collection(db, "contributions"), {
        campaignId: campaignId,
        contributorId: user.uid,
        amount: amount,
        createdAt: serverTimestamp()
    });

    // Recalculate the total from Firestore records.
    await loadContributions();

    updateFundingDisplay();

    contributionAmount.value = "";

    showContributionMessage(
        "Success! Your simulated contribution of " +
        formatMoney(amount) +
        " has been recorded. No real payment was made.",
        "success"
    );

} catch (error) {
    console.error("Error recording contribution:", error);

    if (error.code === "permission-denied") {
        showContributionMessage(
            "Firebase rejected this contribution. Please check your Firestore security rules.",
            "error"
        );
    } else {
        showContributionMessage(
            "We couldn't record this contribution. Please check your connection and try again.",
            "error"
        );
    }
} finally {
    if (campaignIsOpen) {
        supportButton.disabled = false;
        supportButton.textContent = "Record Simulated Contribution";
    }
}
   

});

// ========================================
// 8. START THE PAGE
// ========================================

loadCampaign();
