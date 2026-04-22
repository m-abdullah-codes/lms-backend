require("dotenv").config();

import ErrorHandler from "../utils/ErrorHandler";
import { redis } from "../utils/redis";
import { CatchAsyncError } from "./catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// authentication user
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.accessToken as string

    if (!accessToken) { 
        return next(new ErrorHandler("Please login to access this resource", 401));
    }

    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN as string) as JwtPayload;

    if(!decoded) {
        return next(new ErrorHandler("Invalid token, please login again", 401));
    }

    const user = await redis.get(decoded.id);

    if (!user) {
        return next(new ErrorHandler("Please login to access this resource", 404));
    }

    req.user = JSON.parse(user)

    next();
})


// validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if (!roles.includes(req.user?.role || "")) {
            return next(new ErrorHandler(`Role ${req.user?.role} is not authorized to access this resource`, 403));
        }

        next();
    };
};
