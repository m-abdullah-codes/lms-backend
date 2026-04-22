require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ejs from "ejs";
import path from "path";
import cloudinary from "cloudinary";

import sendEmail from "../utils/sendMail";

// register a user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data,
      );

      try {
        await sendEmail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email (${user.email}) to activate your account.`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "User registration failed", 400),
      );
    }
  },
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

// create activation token
import jwt, { Jwt, JwtPayload, Secret } from "jsonwebtoken";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById, getAllUsersService, updateUserRoleService } from "../services/user.service";

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a random 4-digit activation code

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    },
  );

  return { token, activationCode };
};

// activate user
interface IActivationRequestBody {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequestBody;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret,
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });

      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "User activation failed", 400),
      );
    }
  },
);

// login user
interface ILoginRequestBody {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequestBody;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide email and password", 400));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 401));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 401));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("accessToken", "", { maxAge: 1 });
      res.cookie("refreshToken", "", { maxAge: 1 });

      const userId = req.user?._id.toString() || "";
      if (userId) {
        await redis.del(userId);
      }

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// updatre access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refreshToken as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string,
      ) as JwtPayload;

      const message = "Could not refresh access token, please login again";
      if (!decoded || !decoded.id) {
        return next(new ErrorHandler(message, 401));
      }
      const session = await redis.get(decoded.id as string);

      if (!session) {
        return next(new ErrorHandler("Please login to access", 401));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        },
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "7d",
        },
      );

      req.user = user;

      res.cookie("accessToken", accessToken, accessTokenOptions);
      res.cookie("refreshToken", refreshToken, refreshTokenOptions);

      await redis.set(user._id, JSON.stringify(user));
      await redis.expire(user._id, 604800);

      res.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id.toString() || "";
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar?: string;
}

// social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });

      if (!user) {
        const newUser = await userModel.create({
          email,
          name,
          avatar: avatar ? { url: avatar } : undefined,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// update user info
interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user?._id.toString() || "";
      const user = await userModel.findById(userId);

      if (email && user) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exist", 400));
        }
        user.email = email;
      }

      if (name && user) {
        user.name = name;
      }

      await user?.save();

      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//update password
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please provide old and new password", 400),
        );
      }

      const user = await userModel.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid user", 400));
      }

      const isPasswordMatch = await user?.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid old password", 400));
      }

      user.password = newPassword;

      await user.save();
      await redis.set(user._id.toString(), JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// update profile picture
export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;

      const userId = req.user?._id.toString() || "";
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!avatar) {
        return next(new ErrorHandler("Please provide an avatar", 400));
      }

      const normalizedAvatar = avatar.startsWith("data:")
        ? avatar
        : `data:image/png;base64,${avatar}`;

      const myCloud = await cloudinary.v2.uploader.upload(normalizedAvatar, {
        folder: "avatars",
        width: 150,
      });

      if (user.avatar?.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await user.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// get all users --- only for admin
export const getAllUsers = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllUsersService(res);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

// update user role --- only for admin
export const updateUserRole = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, role } = req.body;
            updateUserRoleService(res, id, role);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

// Delete user --- only for admin
export const deleteUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const user = await userModel.findById(id);

            if (!user) {
                return next(new ErrorHandler("User not found", 404));
            }

            await user.deleteOne({ id });

            await redis.del(id.toString());

            res.status(200).json({
                success: true,
                message: "User deleted successfully",
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);