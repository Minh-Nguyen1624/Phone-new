const express = require("express");
const {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getActiveVouchers,
  restoreVoucher,
  // generateCoupon,
  generateUniqueCoupon,
  validateVoucher,
  getFlashSaleVouchers,
} = require("../controller/voucherController");
const app = express();
const router = express.Router();

router.get("/", getAllVouchers);

router.post("/add", createVoucher);

router.put("/update/:id", updateVoucher);

router.delete("/delete/:id", deleteVoucher);

// router.post("/apply/:id", applyVoucher);
router.post("/apply", applyVoucher);

// router.get("/active/:id", getActiveVouchers);
// router.get("/active-vouchers", getActiveVouchers);
router.get("/active-vouchers", getActiveVouchers);

router.get("/:id", getVoucherById);

router.post("/restore/:id", restoreVoucher);

// router.post("/generate", generateCoupon);

router.post("/generate/unique", generateUniqueCoupon);

router.post("/validate", validateVoucher);

router.get("/flashsale", getFlashSaleVouchers);
module.exports = router;
