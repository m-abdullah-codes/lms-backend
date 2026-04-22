import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";

// create layout
export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const isTypeExist = await LayoutModel.findOne({ type });
      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exist`, 400));
      }
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        };
        await LayoutModel.create({
          type: "Banner",
          banner,
        });
        return res.status(201).json({
          success: true,
        });
      }
      if (type === "FAQ") {
        const { faq } = req.body;
        const faqItems = await Promise.all(
          faq.map(async (item: any) => {
            return {
              question: item.question,
              answer: item.answer,
            };
          }),
        );
        await LayoutModel.create({
          type: "FAQ",
          faq: faqItems,
        });
        return res.status(201).json({
          success: true,
        });
      }
      if (type === "Categories") {
        const { categories } = req.body;
        const categoryItems = await Promise.all(
        categories.map(async (item: any) => {
            return {
              title: item.title,
            };
          }),
        );
        await LayoutModel.create({
          type: "Categories",
          categories:categoryItems,
        });
        return res.status(201).json({
          success: true,
        });
      }
      return next(new ErrorHandler("Invalid layout type", 400));
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);

//edit layout
export const editLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (type === "Banner") {
        const bannerData: any = await LayoutModel.findOne({ type: "Banner" });
        if (!bannerData) {
          return next(new ErrorHandler("Banner layout not found", 404));
        }

        const { image, title, subTitle } = req.body;

        if (bannerData?.image?.public_id) {
          await cloudinary.v2.uploader.destroy(bannerData.image.public_id);
        }

        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });

        const banner = {
          type: "Banner",
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        };

        await LayoutModel.findByIdAndUpdate(bannerData._id, banner);
      } 
      
      else if (type === "FAQ") {
        const { faq } = req.body;
        const faqItem = await LayoutModel.findOne({ type: "FAQ" });

        if (!faqItem) {
          return next(new ErrorHandler("FAQ layout not found", 404));
        }

        const faqItems = faq.map((item: any) => ({
          question: item.question,
          answer: item.answer,
        }));

        await LayoutModel.findByIdAndUpdate(faqItem._id, {
          type: "FAQ",
          faq: faqItems,
        });
      } 
      
      else if (type === "Categories") {
        const { categories } = req.body;
        const categoriesData = await LayoutModel.findOne({ type: "Categories" });

        if (!categoriesData) {
          return next(new ErrorHandler("Categories layout not found", 404));
        }

        const categoriesItems = categories.map((item: any) => ({
          title: item.title,
        }));

        await LayoutModel.findByIdAndUpdate(categoriesData._id, {
          type: "Categories",
          categories: categoriesItems,
        });
      }

      res.status(200).json({
        success: true,
        message: "Layout updated successfully",
      });

    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get layout by type
export const getLayoutByType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {type} = req.body
      const layout = await LayoutModel.findOne({type});
      res.status(201).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);