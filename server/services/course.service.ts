import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course.model";
import {Response} from "express"

//create course
export const createCourse = CatchAsyncError(async (data: any, res: any, next: any) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
        success: true,
        course
    });
});

// Get All courses
export const getAllCoursesService = async (res: Response) => {
    const courses = await CourseModel.find().sort({ createdAt: -1 });

    res.status(201).json({
        success: true,
        courses,
    });
};