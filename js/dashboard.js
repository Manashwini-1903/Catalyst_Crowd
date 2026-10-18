import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ========================================
// 1. DASHBOARD ELEMENTS
// ========================================

const userName = document.getElementById("userName");
const accountName = document.getElementById("accountName");
const accountEmail = document.getElementById("accountEmail");
const userAvatar = document.getElementById("userAvatar");

const campaignCount = document.getElementById("campaignCount");
const totalFundsRaised = document.getElementById("totalFundsRaised");
const totalContributions = document.getElementById("totalContributions");
const goalsAchieved = document.getElementById("goalsAchieved");

const overallRaised = document.getElementById("overallRaised");
const overallGoal = document.getElementById("overallGoal");
const overallProgressFill = document.getElementById("overallProgressFill");
const overallProgressText = document.getElementById("overallProgressText");
const campaignStatus = document.getElementById("campaignStatus");
const campaignStatusText = document.getElementById("campaignStatusText");

const campaignLoading = document.getElementById("campaignLoading");
const myCampaignsList = document.getElementById("myCampaignsList");
const emptyCampaignState = document.getElementById("emptyCampaignState");
const campaignError = document.getElementById("campaignError");

const logoutButton = document.getElementById("logoutButton");
const dashboardMessage = document.getElementById("dashboardMessage");


// ========================================
// 2. MONEY AND DATE FORMATTING
// ========================================

const moneyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
});

function formatMoney(amount) {
    return moneyFormatter.format(Number(amount) || 0);
}

function formatDate(dateString) {
    if (!dateString) {
        return "Not specified";
    }

    const date = new Date(dateString + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        return "Not specified";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


// ========================================
// 3. CAMPAIGN STATUS
// ========================================

function getCampaignStatus(campaign) {
    const goal = Number(campaign.goalAmount) || 0;
    const raised = Number(campaign.amountRaised) || 0;

    if (goal > 0 && raised >= goal) {
        return "Goal reached";
    }

    if (campaign.deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadline = new Date(
            campaign.deadline + "T00:00:00"
        );

        if (
            !Number.isNaN(deadline.getTime()) &&
            deadline < today
        ) {
            return "Deadline passed";
        }
    }

    return "Active";
}


// ========================================
// 4. CREATE A CAMPAIGN CARD
// ========================================

function createCampaignCard(campaign, campaignId, user) {
    const goal = Math.max(
        0,
        Number(campaign.goalAmount) || 0
    );

    const raised = Math.max(
        0,
        Number(campaign.amountRaised) || 0
    );

    const percentage = goal > 0
        ? Math.min(100, Math.round((raised / goal) * 100))
        : 0;

    const card = document.createElement("article");
    card.className = "my-campaign-card";

    const content = document.createElement("div");
    content.className = "my-campaign-content";

    // Category
    const category = document.createElement("span");
    category.className = "my-campaign-category";
    category.textContent = campaign.category || "Other";

    // Title
    const title = document.createElement("h3");
    title.className = "my-campaign-title";
    title.textContent = campaign.title || "Untitled campaign";

    // Description
    const description = document.createElement("p");
    description.className = "my-campaign-description";
    description.textContent =
        campaign.description || "No description provided.";

    // Status
    const status = document.createElement("span");
    status.className = "my-campaign-status";
    status.textContent = getCampaignStatus(campaign);

    // Funding information
    const funding = document.createElement("div");
    funding.className = "my-campaign-funding";

    const raisedText = document.createElement("strong");
    raisedText.textContent = formatMoney(raised);

    const goalText = document.createElement("span");
    goalText.textContent = " raised of " + formatMoney(goal);

    funding.append(raisedText, goalText);

    // Contribution count
    const contributionCount = document.createElement("p");
    contributionCount.className = "my-campaign-contribution-count";
    contributionCount.textContent =
        "Contributions received: " +
        (Number(campaign.contributionCount) || 0);

    contributionCount.style.margin = "8px 0";
    contributionCount.style.fontSize = "14px";
    contributionCount.style.color = "#64748b";

    // Progress bar
    const progressTrack = document.createElement("div");
    progressTrack.className = "my-campaign-progress";

    const progressFill = document.createElement("div");
    progressFill.className = "my-campaign-progress-fill";
    progressFill.style.width = percentage + "%";

    progressTrack.appendChild(progressFill);

    // Percentage text
    const percentageText = document.createElement("p");
    percentageText.textContent = percentage + "% of funding goal reached";
    percentageText.style.fontSize = "13px";
    percentageText.style.margin = "6px 0 12px";

    // Footer
    const footer = document.createElement("div");
    footer.className = "my-campaign-footer";

    const deadline = document.createElement("span");
    deadline.textContent =
        "Deadline: " + formatDate(campaign.deadline);

    // View campaign button
    const viewLink = document.createElement("a");
    viewLink.href =
        "campaign.html?id=" + encodeURIComponent(campaignId);

    viewLink.className = "my-campaign-view";
    viewLink.textContent = "View Campaign →";

    footer.append(deadline, viewLink);


    // ========================================
    // 5. EDIT AND DELETE BUTTONS
    // ========================================

    const actions = document.createElement("div");
    actions.className = "my-campaign-actions";

    actions.style.display = "flex";
    actions.style.gap = "10px";
    actions.style.flexWrap = "wrap";
    actions.style.marginTop = "16px";

    // Edit button
    const editButton = document.createElement("a");

    editButton.href =
        "edit-campaign.html?id=" + encodeURIComponent(campaignId);

    editButton.className = "my-campaign-edit";
    editButton.textContent = "Edit Campaign";

    editButton.style.display = "inline-block";
    editButton.style.padding = "10px 16px";
    editButton.style.borderRadius = "8px";
    editButton.style.backgroundColor = "#2563eb";
    editButton.style.color = "#ffffff";
    editButton.style.textDecoration = "none";
    editButton.style.fontSize = "14px";

    // Delete button
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "my-campaign-delete";
    deleteButton.textContent = "Delete Campaign";

    deleteButton.style.padding = "10px 16px";
    deleteButton.style.borderRadius = "8px";
    deleteButton.style.border = "1px solid #dc2626";
    deleteButton.style.backgroundColor = "transparent";
    deleteButton.style.color = "#dc2626";
    deleteButton.style.cursor = "pointer";
    deleteButton.style.fontSize = "14px";

    // Delete campaign when clicked
    deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
            'Are you sure you want to delete "' +
            (campaign.title || "this campaign") +
            '"?\n\nThis action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";
        dashboardMessage.textContent = "";

        try {
            await deleteDoc(
                doc(db, "campaigns", campaignId)
            );

            dashboardMessage.textContent =
                "Campaign deleted successfully.";

            await loadMyCampaigns(user);

        } catch (error) {
            console.error("Error deleting campaign:", error);

            dashboardMessage.textContent =
                "Unable to delete this campaign. Please try again.";

            deleteButton.disabled = false;
            deleteButton.textContent = "Delete Campaign";
        }
    });

    actions.append(editButton, deleteButton);

    // Put everything together
    content.append(
        category,
        title,
        description,
        status,
        funding,
        contributionCount,
        progressTrack,
        percentageText,
        footer,
        actions
    );

    card.appendChild(content);

    return card;
}

// ========================================
// CALCULATE OVERALL DASHBOARD STATISTICS
// ========================================

function updateDashboardStatistics(campaigns) {
    let fundsRaised = 0;
    let contributionsReceived = 0;
    let goalsReached = 0;
    let totalGoalAmount = 0;

    campaigns.forEach((campaign) => {
        const raised = Number(campaign.amountRaised) || 0;
        const goal = Number(campaign.goalAmount) || 0;

        fundsRaised += raised;
        contributionsReceived +=
            Number(campaign.contributionCount) || 0;

        totalGoalAmount += goal;

        if (goal > 0 && raised >= goal) {
            goalsReached++;
        }
    });

    // Update summary cards.
    totalFundsRaised.textContent = formatMoney(fundsRaised);
    totalContributions.textContent =
        String(contributionsReceived);
    goalsAchieved.textContent = String(goalsReached);

    // Update overall funding overview.
    overallRaised.textContent = formatMoney(fundsRaised);
    overallGoal.textContent = formatMoney(totalGoalAmount);

    const percentage = totalGoalAmount > 0
        ? Math.min(
            100,
            Math.round((fundsRaised / totalGoalAmount) * 100)
        )
        : 0;

    overallProgressFill.style.width = percentage + "%";

    overallProgressText.textContent =
        percentage + "% of your combined funding goal reached";
}

// ========================================
// 6. LOAD CAMPAIGNS AND CONTRIBUTIONS
// ========================================

async function loadMyCampaigns(user) {
    campaignLoading.hidden = false;
    campaignLoading.textContent = "Loading your campaigns...";

    myCampaignsList.replaceChildren();
    emptyCampaignState.hidden = true;
    campaignError.textContent = "";

    try {
        // Load campaigns and contributions together.
        const [campaignSnapshot, contributionSnapshot] =
            await Promise.all([
                getDocs(collection(db, "campaigns")),
                getDocs(collection(db, "contributions"))
            ]);

        // Calculate totals for each campaign.
        const contributionTotals = new Map();
        const contributionCounts = new Map();

        contributionSnapshot.forEach((contributionDoc) => {
            const contribution = contributionDoc.data();

            const campaignId = contribution.campaignId;
            const amount = Number(contribution.amount);

            if (
                typeof campaignId !== "string" ||
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                return;
            }

            contributionTotals.set(
                campaignId,
                (contributionTotals.get(campaignId) || 0) + amount
            );

            contributionCounts.set(
                campaignId,
                (contributionCounts.get(campaignId) || 0) + 1
            );
        });

        // Keep only campaigns created by the logged-in user.
        const myCampaigns = [];

        campaignSnapshot.forEach((campaignDoc) => {
            const campaign = campaignDoc.data();

            if (campaign.creatorId === user.uid) {
                const campaignId = campaignDoc.id;

                myCampaigns.push({
                    id: campaignId,
                    ...campaign,

                    // Use actual contribution records for totals.
                    amountRaised:
                        contributionTotals.get(campaignId) || 0,

                    contributionCount:
                        contributionCounts.get(campaignId) || 0
                });
            }
        });

        // Show newest campaigns first.
        myCampaigns.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;

            return timeB - timeA;
        });

        // Update campaign count.
        campaignCount.textContent = String(myCampaigns.length);
        updateDashboardStatistics(myCampaigns);

        // Show empty state if the user has no campaigns.
if (myCampaigns.length === 0) {
    emptyCampaignState.hidden = false;
    return;
}

        // Display each campaign.
        myCampaigns.forEach((campaign) => {
            const card = createCampaignCard(
                campaign,
                campaign.id,
                user
            );

            myCampaignsList.appendChild(card);
        });

    } catch (error) {
        console.error(
            "Error loading campaigns and contributions:",
            error
        );

        campaignError.textContent =
            "We couldn't load your campaigns or contributions. " +
            "Please refresh the page and try again.";

        

    } finally {
        campaignLoading.hidden = true;
    }
}


// ========================================
// 7. CHECK LOGIN STATUS
// ========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    const name = user.displayName || "Crowd Member";
    const email = user.email || "";

    userName.textContent = name;
    accountName.textContent = name;
    accountEmail.textContent = email;

    userAvatar.textContent = name.charAt(0).toUpperCase();

    await loadMyCampaigns(user);
});


// ========================================
// 8. LOG OUT
// ========================================

logoutButton.addEventListener("click", async () => {
    const originalText = logoutButton.textContent;

    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    dashboardMessage.textContent = "";

    try {
        await signOut(auth);
        window.location.replace("index.html");

    } catch (error) {
        console.error("Logout error:", error);

        dashboardMessage.textContent =
            "We couldn't log you out. Please try again.";

        logoutButton.disabled = false;
        logoutButton.textContent = originalText;
    }
});