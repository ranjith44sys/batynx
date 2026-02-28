require("dotenv").config()

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const batteryRoutes = require("./routes/battery.routes");
const verifyRoutes = require("./routes/verify.routes");
const passportRoutes = require("./routes/passportRoutes");
const authRoutes = require("./routes/auth.routes");
const marketplaceRoutes = require("./routes/marketplace.routes");
const aiRoutes = require("./routes/ai.routes");
const uploadRoutes = require("./routes/upload.routes");
const logsRoutes = require("./routes/logs.routes");
const SyncService = require("./services/SyncService");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0-transfer-fix" });
});


app.use("/battery", batteryRoutes);
app.use("/verify", verifyRoutes);
app.use("/api/passport", passportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/logs", logsRoutes);

app.listen(4000, async () => {
  console.log("Backend running on http://localhost:4000");
  try {
    await SyncService.detectAndSync();
  } catch (e) {
    console.error("[Sync] Failed to initialize:", e.message);
  }
});
