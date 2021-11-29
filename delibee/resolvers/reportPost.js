import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
const Mutation = {
  /**
   * Creates a new post
   *
   * @param {string} title
   * @param {string} image
   * @param {string} authorId
   */
  createReportPost: async (
    root,
    { input: { postId, image, content } },
    { ReportPost, authUser }
  ) => {
    if (!content) {
      throw new Error("제목을 입력하세요!");
    }

    let imageUrl = [],
      imagePublicId = [];

    if (image) {
      for (let i = 0; i < image.length; i++) {
        const { createReadStream } = await image[i];
        const stream = createReadStream();
        const uploadImage = await uploadToCloudinary(stream, "post");

        if (!uploadImage.secure_url) {
          throw new Error("Something went wrong while uploading image");
        }
        imageUrl.push(uploadImage.secure_url);
        imagePublicId.push(uploadImage.public_id);
      }
    }

    const newReportPost = await new ReportPost({
      post: postId,
      image: imageUrl,
      imagePublicId,
      user: authUser.id,
      content,
    }).save();

    return newReportPost;
  },
};

export default { Mutation };
