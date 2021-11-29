import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const Schema = mongoose.Schema;

/**
 * User schema that has references to Post, Like, Comment, Follow and Notification schemas
 */
const userSchema = new Schema(
  {
    fullName: {
      type: String,
    },
    email: String,
    username: {
      type: String,
      lowercase: true,
    },
    phoneNumber: String,
    idNaver: String,
    idKakao: String,
    idGoogle: String,
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,
    image: {
      type: String,
      default:
        "https://res.cloudinary.com/delg9pckx/image/upload/v1614324453/user/none_kt1yr8.jpg",
    },
    imagePublicId: String,
    coverImage: String,
    coverImagePublicId: String,
    isOnline: {
      type: Boolean,
      default: false,
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    socialPosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "PostSocial",
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Like",
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Follow",
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "Follow",
      },
    ],
    notifications: [
      {
        type: Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "PostMessage",
      },
    ],
    location: {
      lat: String,
      long: String,
      name: String,
    },
    setting: {
      sound: {
        type: Boolean,
        default: true,
      },
      notification: {
        type: Boolean,
        default: true,
      },
      message: {
        type: Boolean,
        default: true,
      },
      channel: {
        type: Boolean,
        default: true,
      },
    },
    deviceToken: [String],
  },
  {
    timestamps: true,
  }
);

/**
 * Hashes the users password when saving it to DB
 */
// userSchema.pre("save", function (next) {
//   if (!this.isModified("password")) {
//     return next();
//   }

//   bcrypt.genSalt(10, (err, salt) => {
//     if (err) return next(err);

//     bcrypt.hash(this.password, salt, (err, hash) => {
//       if (err) return next(err);

//       this.password = hash;
//       next();
//     });
//   });
// });

export default mongoose.model("User", userSchema);
