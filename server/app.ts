require("dotenv").config();
import express, { NextFunction, Response, Request } from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error";

//body parser
app.use(express.json({ limit: "50mb" }));

//cookie parser
app.use(cookieParser());

//cors => cross-origin resource sharing
app.use(
  cors({
    origin: process.env.ORIGIN,
  }),
);

//routes
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRoute from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.routes";
import layoutRouter from "./routes/layout.route";

app.use("/api/v1", userRouter, courseRouter, orderRouter, notificationRoute, analyticsRouter, layoutRouter);

//testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Hello, World!",
  });
});

//unknown route
app.use((req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

//error middleware
app.use(errorMiddleware);
