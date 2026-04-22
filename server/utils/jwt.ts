require("dotenv").config();
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import jwt from "jsonwebtoken";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}


  // parse environment variables to integrate with fallback
  const accessTokenExpires = parseInt(
    process.env.ACCESS_TOKEN_EXPIRES_IN || "300",
    10,
  );
  const refreshTokenExpires = parseInt(
    process.env.REFRESH_TOKEN_EXPIRES_IN || "1200",
    10,
  );

  // options for cookies
  export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + accessTokenExpires *60 * 1000),
    maxAge: accessTokenExpires*60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpires * 60*60*24 * 1000),
    maxAge: refreshTokenExpires *24*60*60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // upload session to redis
  redis.set(user._id.toString(), JSON.stringify(user));


  res.cookie("accessToken", accessToken, accessTokenOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
