import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Notification schema that has references to User, Like, Follow and Comment schemas
 */
const notificationSchema = Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    typePost: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    post: Schema.Types.ObjectId,
    like: {
      type: Schema.Types.ObjectId,
      ref: "Like",
    },
    follow: {
      type: Schema.Types.ObjectId,
      ref: "Follow",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    click: {
      type: Boolean,
      default: false,
    },
    key: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", notificationSchema);
