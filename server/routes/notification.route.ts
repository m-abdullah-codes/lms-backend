import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getNotifications, updateNotification } from "../controllers/notification.controller";

const notificationRoute = express.Router();
notificationRoute.get(
  "/notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getNotifications,
);
notificationRoute.put(
  "/notification/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification,
);

export default notificationRoute;
