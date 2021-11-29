import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Post schema that has references to User, Like and Comment schemas
 */
const postSchema = Schema(
  {
    title: String,
    image: [String],
    imagePublicId: [String],
    typePost: String,
    categoryPost: String,
    content: String,
    price: String,
    view: {
      type: Number,
      default: 0,
    },
    contact: {
      type: Number,
      default: 0,
    },
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
    location: {
      lat: String,
      long: String,
      name: String,
    },
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "PostMessage",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Post", postSchema);
