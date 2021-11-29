import mongoose from "mongoose";
const Schema = mongoose.Schema;

const reportPostSchema = Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    image: [String],
    imagePublicId: [String],
    content: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ReportPost", reportPostSchema);
