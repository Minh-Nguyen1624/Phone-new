const express = require("express");
const {
  createdCampaign,
  getAllCampaign,
  getCampaignById,
  updateCampaignById,
  deleteCampaignById,
  searchCampaigns,
  getCampaignStatistics,
  validateCreateCampaign,
  validateCampaignId,
  validateSearchCampaign,
  validateUpdateCampaign,
  incrementImpressions,
  incrementClicks,
  incrementConversions,
  addExpense,
} = require("../controller/campaignController");

const router = express.Router();

// Create a new campaign
router.post("/add", validateCreateCampaign, createdCampaign);

// Get all campaigns
router.get("/", getAllCampaign);

// Get a single campaign by ID
// search?name=Summer thêm phần name vào sau phần search
router.get("/search", validateSearchCampaign, searchCampaigns);
// router.get("/search/:id", validateSearchCampaign, searchCampaigns);
// Get campaign statistics
router.get("/stats", getCampaignStatistics);
router.get("/:id", validateCampaignId, getCampaignById);

// Search campaigns

// Update a campaign by ID
router.put(
  "/update/:id",
  validateCampaignId,
  validateUpdateCampaign,
  updateCampaignById
);

// Delete a campaign by ID
router.delete("/delete/:id", validateCampaignId, deleteCampaignById);

// // Get campaign statistics
// router.get("/stats", getCampaignStatistics);

// Increment impressions for a campaign (could be triggered when a user views a campaign)
router.patch(
  "/increment/impressions/:id",
  validateCampaignId,
  async (req, res) => {
    const { id } = req.params;
    try {
      await incrementImpressions(id);
      res
        .status(200)
        .json({ success: true, message: "Impressions incremented." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Increment clicks for a campaign (could be triggered when a user clicks on a campaign)
router.patch("/increment/clicks/:id", validateCampaignId, async (req, res) => {
  const { id } = req.params;
  try {
    await incrementClicks(id);
    res.status(200).json({ success: true, message: "Clicks incremented." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Increment conversions for a campaign (could be triggered when a conversion action is completed)
router.patch(
  "/increment/conversions/:id",
  validateCampaignId,
  async (req, res) => {
    const { id } = req.params;
    try {
      await incrementConversions(id);
      res
        .status(200)
        .json({ success: true, message: "Conversions incremented." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Add a new expense to the campaign
router.post("/expense/:id", validateCampaignId, async (req, res) => {
  const { id } = req.params;
  const expenseData = req.body;
  try {
    await addExpense(id, expenseData);
    res.status(200).json({ success: true, message: "Expense added." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
