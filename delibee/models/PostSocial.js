import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Post schema that has references to User, Like and Comment schemas
 */
const postSocialSchema = Schema(
  {
    title: String,
    topic: String,
    image: [
      {
        type: Schema.Types.ObjectId,
        ref: "PostImage",
      },
    ],
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("PostSocial", postSocialSchema);
