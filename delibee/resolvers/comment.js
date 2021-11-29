import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
var admin = require("firebase-admin");
const Mutation = {
  /**
   * Creates a post comment
   *
   * @param {string} comment
   * @param {string} author author id
   * @param {string} postId
   */
  createComment: async (
    root,
    { input: { comment, postId, type, parentId, image } },
    { Comment, PostSocial, User, PostImage, authUser }
  ) => {
    let post;
    let newComment;
    if (image.length > 0) {
      const { createReadStream } = await image[0];
      const stream = createReadStream();
      const uploadImage = await uploadToCloudinary(stream, "post");
      if (!uploadImage.secure_url) {
        throw new Error("Something went wrong while uploading image");
      }

      newComment = await new Comment({
        image: uploadImage.secure_url,
        imagePublicId: uploadImage.public_id,
        comment,
        author: authUser.id,
        post: postId,
        parentId,
      }).save();
    } else {
      newComment = await new Comment({
        comment,
        author: authUser.id,
        post: postId,
        parentId,
      }).save();
    }

    if (parentId !== null) {
      await Comment.findOneAndUpdate(
        { _id: parentId },
        { $push: { childrenId: newComment.id } }
      );
    }
    // Push comment to post collection
    if (type === "postSocial") {
      post = await PostSocial.findOneAndUpdate(
        { _id: postId },
        { $push: { comments: newComment.id } }
      ).populate("author");
    }
    if (type === "postImage") {
      post = await PostImage.findOneAndUpdate(
        { _id: postId },
        { $push: { comments: newComment.id } }
      ).populate("author");
    }
    // Push comment to user collection
    const auth = await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { comments: newComment.id } }
    );

    if (auth.id !== post.author.id) {
      if (post.author.setting.notification) {
        await admin.messaging().sendToDevice(
          post.author.deviceToken, // ['token_1', 'token_2', ...]
          {
            notification: {
              title: auth.username,
              body: "님이 회원님의 게시글에 댓글을 달았습니다.",
              imageUrl: auth.image,
              sound: post.author.setting.sound
                ? "default"
                : `nosound.wav` || `nosound`,
            },
            data: {
              postId: postId,
              type,
            },
          },
          {
            // Required for background/quit data-only messages on iOS
            contentAvailable: true,
            // Required for background/quit data-only messages on Android
            priority: "high",
          }
        );
      }
    }

    return newComment;
  },
  createCommentPostImage: async (
    root,
    { input: { comment, postId, type, parentId, image, topic, postSocial } },
    { Comment, User, PostImage, authUser }
  ) => {
    let post;
    let newComment;
    if (image.length > 0) {
      const { createReadStream } = await image[0];
      const stream = createReadStream();
      const uploadImage = await uploadToCloudinary(stream, "post");
      if (!uploadImage.secure_url) {
        throw new Error("Something went wrong while uploading image");
      }

      newComment = await new Comment({
        image: uploadImage.secure_url,
        imagePublicId: uploadImage.public_id,
        comment,
        author: authUser.id,
        post: postId,
        parentId,
      }).save();
    } else {
      newComment = await new Comment({
        comment,
        author: authUser.id,
        post: postId,
        parentId,
      }).save();
    }

    if (parentId !== null) {
      await Comment.findOneAndUpdate(
        { _id: parentId },
        { $push: { childrenId: newComment.id } }
      );
    }
    // Push comment to post collection

    post = await PostImage.findOneAndUpdate(
      { _id: postId },
      { $push: { comments: newComment.id } }
    ).populate("author");

    // Push comment to user collection
    const auth = await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { comments: newComment.id } }
    );

    if (auth.id !== post.author.id) {
      if (post.author.setting.notification) {
        await admin.messaging().sendToDevice(
          post.author.deviceToken, // ['token_1', 'token_2', ...]
          {
            notification: {
              title: auth.username,
              body: "님이 회원님의 게시글에 댓글을 달았습니다.",
              imageUrl: auth.image,
              sound: post.author.setting.sound
                ? "default"
                : `nosound.wav` || `nosound`,
            },
            data: {
              postId: postId,
              type,
              topic,
              postSocial,
            },
          },
          {
            // Required for background/quit data-only messages on iOS
            contentAvailable: true,
            // Required for background/quit data-only messages on Android
            priority: "high",
          }
        );
      }
    }

    return newComment;
  },
  /**
   * Deletes a post comment
   *
   * @param {string} id
   */
  deleteComment: async (
    root,
    { input: { id, type } },
    { Comment, User, PostSocial, PostImage }
  ) => {
    const comment = await Comment.findByIdAndRemove(id);

    // Delete comment from users collection
    await User.findOneAndUpdate(
      { _id: comment.author },
      { $pull: { comments: comment.id } }
    );
    // Delete comment from posts collection
    if (type === "postSocial") {
      await PostSocial.findOneAndUpdate(
        { _id: comment.post },
        { $pull: { comments: comment.id } }
      );
    }
    if (type === "postImage") {
      await PostImage.findOneAndUpdate(
        { _id: comment.post },
        { $pull: { comments: comment.id } }
      );
    }

    return comment;
  },
};

export default { Mutation };
