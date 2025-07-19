require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    req.user = decoded; // decoded token payload (user info)
    next();
  });
}

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db("Khulnadb");

    // Save user location (token verify middleware use korbo)
    app.post("/api/user/location", verifyToken, async (req, res) => {
      try {
        const locationData = req.body;
        // token verified, so user info ase req.user e

        // Optionally, check if token in body matches verified user:
        // if (locationData.token !== req.headers.authorization.replace("Bearer ", "")) { ... }

        await db.collection("locations").insertOne({
          ...locationData,
          userId: req.user.id, // jodi token e user id thake
          timestamp: new Date(),
        });

        res.status(200).json({ message: "Location saved" });
      } catch (error) {
        console.error("Error saving location:", error);
        res.status(500).json({ error: "Failed to save location" });
      }
    });

    // Get user profile (token verify)
    app.get("/api/user/profile", verifyToken, async (req, res) => {
      try {
        // jodi database theke user profile fetch korte chao:
        // const user = await db.collection("users").findOne({ _id: req.user.id });

        // For demo, return dummy profile with token decoded data
        res.json({
          role: req.user.role || "user",
          ab_test: false,
          name: req.user.name || "Demo User",
          email: req.user.email || "demo@example.com",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Failed to get profile" });
      }
    });

    app.get("/api/app/version", (req, res) => {
      res.json({ version: "1.0.0" });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
