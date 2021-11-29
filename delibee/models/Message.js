import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Message schema that has reference to user schema
 */
const messageSchema = Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    message: String,
    image: String,
    imagePublicId: String,
    seen: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: "text",
    },
    postMessage: {
      type: Schema.Types.ObjectId,
      ref: "PostMessage",
    },
    postShare: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
