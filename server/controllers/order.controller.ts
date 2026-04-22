import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import { IOrder } from "../models/order.model";
import { newOrder, getAllOrdersService } from "../services/order.service";
import NotificationModel from "../models/notification.model";

// create order
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      const user = await userModel.findById(req.user?._id);

      const courseExistInUser = user?.courses.some(
        (c) => c.courseId === courseId,
      );

      if (courseExistInUser) {
        return next(
          new ErrorHandler("You have already purchased this course", 400),
        );
      }
      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      };

      const mailData = {
        order: {
          _id: course._id?.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: {
              user,
              dashboardUrl: "http://localhost:3000/dashboard",
              order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              },
            },
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }

      if (user && course?._id) {
        user.courses.push({
          courseId: course._id.toString(),
        });
      }

      await user?.save();

      await NotificationModel.create({
        userId: user?._id?.toString(),
        title: "New Order",
        message: `You have a new order from ${course?.name}`,
      });

      course.purchased ? course.purchased += 1 : course.purchased=1 ;
      await course?.save();

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);


// get all orders --- only for admin
export const getAllOrders = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllOrdersService(res);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);