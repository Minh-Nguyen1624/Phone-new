// checkRole middleware function
function checkRole(requiredRole) {
  return (req, res, next) => {
    // Assuming the role information is available on req.user (e.g., added by an authMiddleware)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user data" });
    }

    const { role } = req.user;

    // Check if the user's role matches the required role
    if (role !== requiredRole) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    // If role matches, proceed to the next middleware or route handler
    next();
  };
}

module.exports = checkRole;
