const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["access-token"];
  if (!token) {
    return res.status(404).send({
        success: false,
        message: "No token found!",
        data: [],
    });
  }else {
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      return res.status(200).send({
        success: true,
        message: "Sign in successful..",
        data: decoded,
      })
    } catch (err) {
      return res.status(403).send({
        success: false,
        message: "Expired token!",
        data: [],
      })
    }
  }
};

module.exports = verifyToken;