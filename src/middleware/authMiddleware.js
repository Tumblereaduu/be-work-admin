import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // GET TOKEN
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // FORMAT: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    // VERIFY TOKEN
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SAVE USER DATA
    req.user = decoded;

    next();
  } catch (error) {
    console.log(error);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default authMiddleware;