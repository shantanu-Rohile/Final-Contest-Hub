import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const jwtAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        try {
            // Extract token from "Bearer <token>" format
            const token = authHeader.split(" ")[1];
            
            if (!token) {
                return res.status(401).json({ message: "Unauthorized: No token provided" });
            }

            // Verify and decode token
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    // Handle token expiration and other errors gracefully
                    if (err.name === "TokenExpiredError") {
                        return res.status(401).json({ message: "Unauthorized: Token expired" });
                    }
                    return res.status(401).json({ message: "Unauthorized: Invalid token" });
                }

                // Attach user data to request
                req.user = decoded;
                req.userId = decoded.userId;
                
                next();
            });
        } catch (error) {
            res.status(401).json({ message: "Unauthorized: Invalid token format" });
        }
    } else {
        res.status(401).json({ message: "Unauthorized: No token provided" });
    }
};

export default jwtAuth;
