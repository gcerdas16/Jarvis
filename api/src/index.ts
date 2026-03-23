import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { prospectsRouter } from "./routes/prospects";
import { metricsRouter } from "./routes/metrics";
import { campaignsRouter } from "./routes/campaigns";
import { startScheduler } from "./jobs/scheduler";

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/prospects", prospectsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/campaigns", campaignsRouter);

if (process.env.NODE_ENV === "production") {
  startScheduler();
}

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
