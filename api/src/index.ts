import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { prospectsRouter } from "./routes/prospects";
import { metricsRouter } from "./routes/metrics";
import { campaignsRouter } from "./routes/campaigns";
import { emailsRouter } from "./routes/emails";
import { jobsRouter } from "./routes/jobs";
import { webhooksRouter } from "./routes/webhooks";
import { startScheduler } from "./jobs/scheduler";

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
// Raw body needed for webhook signature verification
app.use("/api/webhooks", express.raw({ type: "application/json" }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
  next();
});
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/prospects", prospectsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/webhooks", webhooksRouter);

if (process.env.NODE_ENV === "production") {
  startScheduler();
}

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
