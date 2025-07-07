const Campaign = require("../model/campaignModel");
const mongoose = require("mongoose");
const { validationResult, body, param, query } = require("express-validator");
// const { body } = require("express-validator");
// const { param } = require("express-validator");
// const { sanitizeBody } = require("express-validator");

// Middleware validate trực tiếp trong controller
const validateCreateCampaign = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters."),
  body("budget")
    .notEmpty()
    .withMessage("Budget is required.")
    .isNumeric()
    .withMessage("Budget must be a numeric value.")
    .custom((value) => value >= 0)
    .withMessage("Budget cannot be negative."),
  body("status")
    .notEmpty()
    .withMessage("Status is required.")
    .isIn(["draft", "active", "paused", "completed"])
    .withMessage("Invalid status value."),
  body("owner").optional().isMongoId().withMessage("Invalid owner ID."),
];

const validateCampaignId = [
  param("id")
    .notEmpty()
    .withMessage("Campaign ID is required.")
    .isMongoId()
    .withMessage("Invalid campaign ID format."),
];

const validateUpdateCampaign = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters."),
  body("budget")
    .optional()
    .isNumeric()
    .withMessage("Budget must be a numeric value.")
    .custom((value) => value >= 0)
    .withMessage("Budget cannot be negative."),
  body("status")
    .optional()
    .isIn(["draft", "active", "paused", "completed"])
    .withMessage("Invalid status value."),
];

const validateSearchCampaign = [
  query("name")
    .optional()
    .isString()
    .withMessage("Name must be a string.")
    .isLength({ max: 100 })
    .withMessage("Search term cannot exceed 100 characters."),
  query("status")
    .optional()
    .isIn(["draft", "active", "paused", "completed"])
    .withMessage("Invalid status value."),
  query("minBudget")
    .optional()
    .isNumeric()
    .withMessage("MinBudget must be a numeric value."),
  query("maxBudget")
    .optional()
    .isNumeric()
    .withMessage("MaxBudget must be a numeric value."),
];

const createdCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const campaignData = req.body;
    if (
      !campaignData.owner ||
      !mongoose.Types.ObjectId.isValid(campaignData.owner)
    ) {
      return res.status(400).json({ message: "Invalid owner ID." });
    }

    // const newCampaign = new Campaign.create(campaignData);
    const newCampaign = await Campaign(campaignData);
    await newCampaign.save();
    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: newCampaign,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating campaign", error: error.message });
  }
};

const getAllCampaign = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      status,
      minBudget,
      maxBudget,
    } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (minBudget) filter.budget = { $gte: minBudget };
    if (maxBudget) filter.budget = { ...filter.budget, $lte: maxBudget };

    // const campaigns = await Campaign.find(filter)
    const campaigns = await Campaign.find()
      .populate("owner")
      .populate("phones")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalCampaigns = await Campaign.countDocuments(filter);
    // console.log(campaigns);
    res.status(200).json({
      success: true,
      message: "Campaigns retrieved successfully",
      data: campaigns,
      pagitions: {
        total: totalCampaigns,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCampaigns / limit),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving campaigns", error: error.message });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate("owner")
      .populate("phones");

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }
    res.status(200).json({
      success: true,
      message: "Campaign retrieved successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving campaign by ID",
      error: error.message,
    });
  }
};

const updateCampaignById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updatedData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid campaign ID." });
    }

    // const campaign = await Campaign.findById(id);
    const campaign = await Campaign.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    if (updatedData.budget && updatedData.budget !== campaign.budget) {
      campaign.budgetHistory.push({
        amount: updatedData.budget,
        date: new Date(),
      });
    }

    Object.assign(campaign, updatedData);
    await campaign.save();

    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
      budgetHistory: campaign.budgetHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating campaign by ID",
      error: error.message,
    });
  }
};

const deleteCampaignById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid campaign ID." });
    }

    const deletedCampaign = await Campaign.findByIdAndDelete(id);

    if (!deletedCampaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
      data: deletedCampaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting campaign by ID",
      error: error.message,
    });
  }
};

const searchCampaigns = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.query || req.body || req.params;

    // const campaigns = await Campaign.find({
    //   name: { $regex: name, $options: "i" },
    // });
    // console.log("Found campaigns:", name);
    const campaigns = await Campaign.find({
      name: { $regex: `.*${name}.*`, $options: "i" },
    })
      .populate("owner")
      .populate("phones");

    // if (!campaigns) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "No campaigns found with that name",
    //   });
    // }
    // console.log("Found campaigns:", campaigns);

    if (!campaigns || campaigns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No campaigns found with that name",
      });
    }

    res.status(200).json({
      success: true,
      message: "Campaigns retrieved successfully",
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching campaigns",
      error: error.message,
    });
  }
};

// Get campaign statistics
const getCampaignStatistics = async (req, res) => {
  try {
    const stats = await Campaign.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalBudget: { $sum: "$budget" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Campaign statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving campaign statistics",
      error: error.message,
    });
  }
};
// Increment impressions when a user views a campaign
const incrementImpressions = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    await campaign.incrementImpressions();
    console.log("Impressions incremented!");
  } catch (error) {
    console.error("Error incrementing impressions:", error);
  }
};

// Increment clicks when a user clicks on a campaign ad
const incrementClicks = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    await campaign.incrementClicks();
    console.log("Clicks incremented!");
  } catch (error) {
    console.error("Error incrementing clicks:", error);
  }
};

// Increment conversions when a user completes a conversion action
const incrementConversions = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    await campaign.incrementConversions();
    console.log("Conversions incremented!");
  } catch (error) {
    console.error("Error incrementing conversions:", error);
  }
};

// Add a new expense to the campaign
const addExpense = async (campaignId, expenseData) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    await campaign.addExpense(expenseData);
    console.log("Expense added!");
  } catch (error) {
    console.error("Error adding expense:", error);
  }
};

module.exports = {
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
};
