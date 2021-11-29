import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { withFilter } from "apollo-server";

import { uploadToCloudinary } from "../utils/cloudinary";
import { generateToken } from "../utils/generate-token";
import { sendEmail } from "../utils/email";
import { pubSub } from "../utils/apollo-server";
const fetch = require("node-fetch");
import { IS_USER_ONLINE } from "../constants/Subscriptions";
import jwt from "jsonwebtoken";

const AUTH_TOKEN_EXPIRY = "1y";
const RESET_PASSWORD_TOKEN_EXPIRY = 3600000;

const Query = {
  /**
   * Gets the currently logged in user
   */

  getAuthUser: async (root, args, { authUser, Message, User }) => {
    if (!authUser) return null;

    // If user is authenticated, update it's isOnline field to true
    const user = await User.findOneAndUpdate(
      { email: authUser.email },
      { isOnline: true }
    )
      .populate({ path: "posts", options: { sort: { createdAt: "desc" } } })
      .populate("likes")
      .populate("followers")
      .populate("following")
      .populate({
        path: "notifications",
        populate: [
          { path: "author" },
          { path: "follow" },
          { path: "like", populate: { path: "post" } },
          { path: "comment", populate: { path: "post" } },
        ],
        match: { seen: false },
      });

    user.newNotifications = user.notifications;

    // Find unseen messages
    const lastUnseenMessages = await Message.aggregate([
      {
        $match: {
          receiver: mongoose.Types.ObjectId(authUser.id),
          seen: false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$sender",
          doc: {
            $first: "$$ROOT",
          },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
    ]);

    // Transform data
    const newConversations = [];
    lastUnseenMessages.map((u) => {
      const user = {
        id: u.sender[0]._id,
        username: u.sender[0].username,
        fullName: u.sender[0].fullName,
        image: u.sender[0].image,
        lastMessage: u.message,
        lastMessageCreatedAt: u.createdAt,
      };

      newConversations.push(user);
    });

    // Sort users by last created messages date
    const sortedConversations = newConversations.sort((a, b) =>
      b.lastMessageCreatedAt.toString().localeCompare(a.lastMessageCreatedAt)
    );

    // Attach new conversations to auth User
    user.newConversations = sortedConversations;

    return user;
  },
  /**
   * Gets user by username
   *
   * @param {string} username
   */
  getUser: async (root, { id }, { User }) => {
    const query = { _id: id };
    const user = await User.findOne(query)
      .populate({
        path: "posts",

        options: { sort: { createdAt: "desc" } },
      })
      .populate({
        path: "socialPosts",
        populate: [{ path: "image" }],
        options: { sort: { createdAt: "desc" } },
      });

    return user;
  },
  /**
   * Gets user posts by username
   *
   * @param {string} username
   * @param {int} skip how many posts to skip
   * @param {int} limit how many posts to limit
   */
  getUserPosts: async (root, { username, skip, limit }, { User, Post }) => {
    const user = await User.findOne({ username }).select("_id");

    const query = { author: user._id };
    const count = await Post.find(query).countDocuments();
    const posts = await Post.find(query)
      .populate({
        path: "author",
        populate: [
          { path: "following" },
          { path: "followers" },
          {
            path: "notifications",
            populate: [
              { path: "author" },
              { path: "follow" },
              { path: "like" },
              { path: "comment" },
            ],
          },
        ],
      })
      .populate("likes")
      .populate({
        path: "comments",
        options: { sort: { createdAt: "desc" } },
        populate: { path: "author" },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: "desc" });

    return { posts, count };
  },
  /**
   * Gets all users
   *
   * @param {string} userId
   * @param {int} skip how many users to skip
   * @param {int} limit how many users to limit
   */
  getUsers: async (root, { userId, skip, limit }, { User, Follow }) => {
    // Find user ids, that current user follows
    const userFollowing = [];
    const follow = await Follow.find({ follower: userId }, { _id: 0 }).select(
      "user"
    );
    follow.map((f) => userFollowing.push(f.user));

    // Find users that user is not following
    const query = {
      $and: [{ _id: { $ne: userId } }, { _id: { $nin: userFollowing } }],
    };
    const count = await User.where(query).countDocuments();
    const users = await User.find(query)
      .populate("followers")
      .populate("following")
      .populate({
        path: "notifications",
        populate: [
          { path: "author" },
          { path: "follow" },
          { path: "like" },
          { path: "comment" },
        ],
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: "desc" });

    return { users, count };
  },
  /**
   * Searches users by username or fullName
   *
   * @param {string} searchQuery
   */
  getSetting: async (root, args, { authUser, User }) => {
    if (!authUser) return null;

    const user = await User.findById(authUser.id);

    return user.setting;
  },
  searchUsers: async (root, { searchQuery }, { User, authUser }) => {
    // Return an empty array if searchQuery isn't presented
    if (!searchQuery) {
      return [];
    }

    const users = User.find({
      $or: [
        { username: new RegExp(searchQuery, "i") },
        { fullName: new RegExp(searchQuery, "i") },
      ],
      _id: {
        $ne: authUser.id,
      },
    }).limit(50);

    return users;
  },
  /**
   * Gets Suggested people for user
   *
   * @param {string} userId
   */
  suggestPeople: async (root, { userId }, { User, Follow }) => {
    const LIMIT = 6;

    // Find who user follows
    const userFollowing = [];
    const following = await Follow.find(
      { follower: userId },
      { _id: 0 }
    ).select("user");
    following.map((f) => userFollowing.push(f.user));
    userFollowing.push(userId);

    // Find random users
    const query = { _id: { $nin: userFollowing } };
    const usersCount = await User.where(query).countDocuments();
    let random = Math.floor(Math.random() * usersCount);

    const usersLeft = usersCount - random;
    if (usersLeft < LIMIT) {
      random = random - (LIMIT - usersLeft);
      if (random < 0) {
        random = 0;
      }
    }

    const randomUsers = await User.find(query).skip(random).limit(LIMIT);

    return randomUsers;
  },
  /**
   * Verifies reset password token
   *
   * @param {string} email
   * @param {string} token
   */
  verifyResetPasswordToken: async (root, { email, token }, { User }) => {
    // Check if user exists and token is valid
    const user = await User.findOne({
      email,
      passwordResetToken: token,
      passwordResetTokenExpiry: {
        $gte: Date.now() - RESET_PASSWORD_TOKEN_EXPIRY,
      },
    });
    if (!user) {
      throw new Error("This token is either invalid or expired!");
    }

    return { message: "Success" };
  },
};

const Mutation = {
  checkDeviceToken: async (root, { input: { id, token } }, { User }) => {
    const user = await User.findById(id);
    if (!user) return null;
    const idx = user.deviceToken.indexOf(token);
    if (idx === -1) {
      user.deviceToken.push(token);
    }

    user.save();
    return true;
  },
  deleteDeviceToken: async (root, { input: { id, token } }, { User }) => {
    const user = await User.findById(id);
    if (!user) return null;
    const idx = user.deviceToken.indexOf(token);

    if (idx !== -1) {
      user.deviceToken = user.deviceToken.filter((m) => m !== token);
    }

    user.save();
    return true;
  },

  setSetting: async (root, { input: { type, value } }, { authUser, User }) => {
    if (!authUser) return null;

    try {
      const user = await User.findById(authUser.id);

      user.setting[type] = value;

      user.save();
      return true;
    } catch (e) {
      return false;
    }
  },

  setLocationUser: async (
    root,
    { input: { name, lat, long } },
    { authUser, User }
  ) => {
    if (!authUser) return null;

    const user = await User.findOneAndUpdate(
      { _id: authUser.id },
      { location: { name, lat, long } }
    );

    user.save();
    return user;
  },
  /**
   * Signs in user
   *
   * @param {string} emailOrUsername
   * @param {string} password
   */
  signin: async (root, { input: { token } }, { User }) => {
    const socialUser = await fetch("https://openapi.naver.com/v1/nid/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (responseJson) {
        return responseJson.response;
      })
      .catch(function (err) {});

    if (!socialUser) return null;
    const user = await User.findOne({ idNaver: socialUser.id });

    if (!user) {
      const newUser = await new User({
        idNaver: socialUser.id,
        email: socialUser.email,
        phoneNumber: socialUser.mobile_e164,
        fullName: socialUser.name,
        username: socialUser.nickname,
        image: socialUser.profile_image,
      }).save();
      return {
        token: generateToken(newUser, process.env.SECRET, AUTH_TOKEN_EXPIRY),
        user: {
          id: newUser.id,
          fullName: newUser.username,
          image: newUser.image,
          location: null,
        },
      };
    }

    return {
      token: generateToken(user, process.env.SECRET, AUTH_TOKEN_EXPIRY),
      user: {
        id: user.id,
        fullName: user.username,
        image: user.image,
        location: user.location,
      },
    };
  },
  signinKaKao: async (root, { input: { token } }, { User }) => {
    const socialUser = await fetch("https://kapi.kakao.com/v2/user/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (responseJson) {
        return responseJson;
      })
      .catch(function (err) {});

    if (!socialUser) return null;
    const user = await User.findOne({ idKakao: socialUser.id.toString() });

    if (!user) {
      const newUser = await new User({
        idKakao: socialUser.id.toString(),
        email: socialUser.kakao_account.email,
        username: socialUser.kakao_account.profile.nickname,
        image: socialUser.kakao_account.profile.thumbnail_image_url
          ? socialUser.kakao_account.profile.thumbnail_image_url
          : "https://res.cloudinary.com/delg9pckx/image/upload/v1614324453/user/none_kt1yr8.jpg",
      }).save();
      return {
        token: generateToken(newUser, process.env.SECRET, AUTH_TOKEN_EXPIRY),
        user: {
          id: newUser.id,
          fullName: newUser.username,
          image: newUser.image,
          location: null,
        },
      };
    }

    return {
      token: generateToken(user, process.env.SECRET, AUTH_TOKEN_EXPIRY),
      user: {
        id: user.id,
        fullName: user.username,
        image: user.image,
        location: user.location,
      },
    };
  },
  signinGoogle: async (
    root,
    { input: { idToken, token, idGoogle } },
    { User }
  ) => {
    const user = await User.findOne({ idGoogle: idGoogle });

    if (!user) {
      const socialUser = await jwt.decode(idToken);
      const phoneUser = await fetch(
        `https://people.googleapis.com/v1/people/${idGoogle}?personFields=phoneNumbers`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      )
        .then(function (response) {
          return response.json();
        })
        .then(function (responseJson) {
          return responseJson;
        })
        .catch(function (err) {});

      const newUser = await new User({
        idGoogle,
        phoneNumber: phoneUser.phoneNumbers
          ? phoneUser.phoneNumbers[0].canonicalForm
          : "",
        email: socialUser.email,
        username: socialUser.name,
        image: socialUser.picture
          ? socialUser.picture
          : "https://res.cloudinary.com/delg9pckx/image/upload/v1614324453/user/none_kt1yr8.jpg",
      }).save();
      return {
        token: generateToken(newUser, process.env.SECRET, AUTH_TOKEN_EXPIRY),
        user: {
          id: newUser.id,
          fullName: newUser.username,
          image: newUser.image,
          location: null,
        },
      };
    }

    return {
      token: generateToken(user, process.env.SECRET, AUTH_TOKEN_EXPIRY),
      user: {
        id: user.id,
        fullName: user.username,
        image: user.image,
        location: user.location,
      },
    };
  },
  /**
   * Signs up user
   *
   * @param {string} fullName
   * @param {string} email
   * @param {string} username
   * @param {string} password
   */
  // signup: async (
  //   root,
  //   { input: { phoneNumber, email, password, name, lat, long } },
  //   { User }
  // ) => {
  //   // Check if user with given email or username already exists

  //   let user;
  //   if (email) {
  //     user = await User.findOne().or([{ email }, { phoneNumber }]);
  //   } else {
  //     user = await User.findOne({ phoneNumber });
  //   }

  //   if (user) {
  //     const field =
  //       user.phoneNumber.toLowerCase() === phoneNumber.toLowerCase()
  //         ? "phoneNumber"
  //         : "email";

  //     throw new Error(`User with given ${field} already exists.`);
  //   }

  //   // Empty field validation
  //   if (!phoneNumber || !password) {
  //     throw new Error("All fields are required.");
  //   }

  //   // FullName validation

  //   // Email validation
  //   // const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  //   // if (!emailRegex.test(String(email).toLowerCase())) {
  //   //   throw new Error("Enter a valid email address.");
  //   // }

  //   // Username validation
  //   // const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;

  //   // Password validation

  //   const newUser = await new User(
  //     email
  //       ? {
  //           email: email,
  //           phoneNumber,
  //           password,
  //           fullName: phoneNumber,
  //           username: phoneNumber,
  //           location: { name, lat, long },
  //         }
  //       : {
  //           phoneNumber,
  //           password,
  //           fullName: phoneNumber,
  //           username: phoneNumber,
  //           location: { name, lat, long },
  //         }
  //   ).save();

  //   return {
  //     token: generateToken(newUser, process.env.SECRET, AUTH_TOKEN_EXPIRY),
  //     user: {
  //       id: newUser.id,
  //       fullName: newUser.fullName,
  //       image: newUser.image,
  //     },
  //   };
  // },
  /**
   * Requests reset password
   *
   * @param {string} email
   */
  requestPasswordReset: async (root, { input: { email } }, { User }) => {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error(`No such user found for email ${email}.`);
    }

    // Set password reset token and it's expiry
    const token = generateToken(
      user,
      process.env.SECRET,
      RESET_PASSWORD_TOKEN_EXPIRY
    );
    const tokenExpiry = Date.now() + RESET_PASSWORD_TOKEN_EXPIRY;
    await User.findOneAndUpdate(
      { _id: user.id },
      { passwordResetToken: token, passwordResetTokenExpiry: tokenExpiry },
      { new: true }
    );

    // Email user reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?email=${email}&token=${token}`;
    const mailOptions = {
      to: email,
      subject: "Password Reset",
      html: resetLink,
    };

    await sendEmail(mailOptions);

    // Return success message
    return {
      message: `A link to reset your password has been sent to ${email}`,
    };
  },
  /**
   * Resets user password
   *
   * @param {string} email
   * @param {string} token
   * @param {string} password
   */
  resetPassword: async (
    root,
    { input: { email, token, password } },
    { User }
  ) => {
    if (!password) {
      throw new Error("Enter password and Confirm password.");
    }

    if (password.length < 6) {
      throw new Error("Password min 6 characters.");
    }

    // Check if user exists and token is valid
    const user = await User.findOne({
      email,
      passwordResetToken: token,
      passwordResetTokenExpiry: {
        $gte: Date.now() - RESET_PASSWORD_TOKEN_EXPIRY,
      },
    });
    if (!user) {
      throw new Error("This token is either invalid or expired!");
    }

    // Update password, reset token and it's expiry
    user.passwordResetToken = "";
    user.passwordResetTokenExpiry = "";
    user.password = password;
    await user.save();

    // Return success message
    return {
      token: generateToken(user, process.env.SECRET, AUTH_TOKEN_EXPIRY),
    };
  },

  editAccount: async (
    root,
    { input: { id, name, phoneNumber, email } },
    { User }
  ) => {
    const updatedUser = await User.findOneAndUpdate(
      { _id: id },
      { username: name, phoneNumber, email }
    )
      .populate("posts")
      .populate("likes");

    return updatedUser;
  },
  /**
   * Uploads user Profile or Cover photo
   *
   * @param {string} id
   * @param {obj} image
   * @param {string} imagePublicId
   * @param {bool} isCover is Cover or Profile photo
   */
  uploadUserPhoto: async (
    root,
    { input: { id, image, imagePublicId, isCover } },
    { User }
  ) => {
    const { createReadStream } = await image;
    const stream = createReadStream();
    const uploadImage = await uploadToCloudinary(stream, "user", imagePublicId);

    if (uploadImage.secure_url) {
      const fieldsToUpdate = {};
      if (isCover) {
        fieldsToUpdate.coverImage = uploadImage.secure_url;
        fieldsToUpdate.coverImagePublicId = uploadImage.public_id;
      } else {
        fieldsToUpdate.image = uploadImage.secure_url;
        fieldsToUpdate.imagePublicId = uploadImage.public_id;
      }

      const updatedUser = await User.findOneAndUpdate(
        { _id: id },
        { ...fieldsToUpdate },
        { new: true }
      )
        .populate("posts")
        .populate("likes");

      return updatedUser;
    }

    throw new Error(
      "Something went wrong while uploading image to Cloudinary."
    );
  },
};

const Subscription = {
  /**
   * Subscribes to user's isOnline change event
   */
  isUserOnline: {
    subscribe: withFilter(
      () => pubSub.asyncIterator(IS_USER_ONLINE),
      (payload, variables, { authUser }) => variables.authUserId === authUser.id
    ),
  },
};

export default { Query, Mutation, Subscription };
