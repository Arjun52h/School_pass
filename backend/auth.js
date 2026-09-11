const userRoles = {
  // Replace these with your actual NamoID sub values
  "eb30bb8c-a68e-4fcd-9296-8283de3840c2": "guardian",
  "f8f4a820-9d89-4564-9dfa-24275c062cda": "staff"
};

function authenticateUser(req, res, next) {
  const { userSub } = req.body;

  if (!userSub) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const role = userRoles[userSub];

  if (!role) {
    return res.status(403).json({
      message: "User is not authorized"
    });
  }

  req.user = {
    sub: userSub,
    role
  };

  next();
}

module.exports = {
  authenticateUser,
  userRoles
};