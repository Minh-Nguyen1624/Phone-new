const express = require("express");
const {
  createdTransaction,
  getAllTransaction,
  getTransactionById,
  updateTransaction,
  deletedTransaction,
  getTransactionStats,
  searchTransaction,
  updateTransactionStatus,
} = require("../controller/transactionController");

const router = express.Router();

// Create a new transaction

router.post("/add", createdTransaction);

// Get all transactions

router.get("/", getAllTransaction);

// Get a transaction by id

router.get("/:id", getTransactionById);

// Update a transaction

router.put("/update/:id", updateTransaction);

// Delete a transaction

router.delete("/delete/:id", deletedTransaction);

// Get transaction statistics

router.get("/stats", getTransactionStats);

// Search for a transaction

router.get("/search", searchTransaction);

// Update a transaction status

router.put("/:id/status", updateTransactionStatus);

module.exports = router;
