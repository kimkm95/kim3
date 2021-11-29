var admin = require("firebase-admin");

const Mutation = {
  /**
   * Creates a like for post
   *
   * @param {string} userId
   * @param {string} postId
   */
  createLike: async (
    root,
    { input: { postId, type } },
    { Like, Post, User, PostSocial, PostImage, Comment, authUser }
  ) => {
    const checkLike = await Like.findOne({ user: authUser.id, post: postId });
    if (checkLike) return checkLike;
    const like = await new Like({ user: authUser.id, post: postId }).save();
    let post;
    if (type === "post") {
      post = await Post.findOneAndUpdate(
        { _id: postId },
        { $push: { likes: like.id } }
      ).populate("author");
    }
    if (type === "postSocial") {
      post = await PostSocial.findOneAndUpdate(
        { _id: postId },
        { $push: { likes: like.id } }
      ).populate("author");
    }
    if (type === "postImage") {
      post = await PostImage.findOneAndUpdate(
        { _id: postId },
        { $push: { likes: like.id } }
      ).populate("author");
    }
    if (type === "comment") {
      post = await Comment.findOneAndUpdate(
        { _id: postId },
        { $push: { likes: like.id } }
      ).populate("author");
    }

    // Push like to post collection

    // Push like to user collection
    const auth = await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { likes: like.id } }
    );

    if (auth.id !== post.author.id) {
      if (post.author.setting.notification) {
        await admin.messaging().sendToDevice(
          post.author.deviceToken, // ['token_1', 'token_2', ...]
          {
            notification: {
              title: auth.username,
              body: "님이 회원님의 게시글에 좋아요를 눌렀습니다",
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

    return like;
  },
  createLikeImage: async (
    root,
    { input: { postId, type, topic, postSocial } },
    { Like, Post, User, PostSocial, PostImage, Comment, authUser }
  ) => {
    const checkLike = await Like.findOne({ user: authUser.id, post: postId });
    if (checkLike) return checkLike;
    const like = await new Like({ user: authUser.id, post: postId }).save();
    let post;

    post = await PostImage.findOneAndUpdate(
      { _id: postId },
      { $push: { likes: like.id } }
    ).populate("author");

    // Push like to post collection

    // Push like to user collection
    const auth = await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { likes: like.id } }
    );

    if (auth.id !== post.author.id) {
      if (post.author.setting.notification) {
        await admin.messaging().sendToDevice(
          post.author.deviceToken, // ['token_1', 'token_2', ...]
          {
            notification: {
              title: auth.username,
              body: "님이 회원님의 게시글에 좋아요를 눌렀습니다",
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

    return like;
  },
  /**
   * Deletes a post like
   *
   * @param {string} id
   */
  deleteLike: async (
    root,
    { input: { id, type } },
    { Like, User, Post, PostSocial, PostImage }
  ) => {
    const like = await Like.findByIdAndRemove(id);

    await User.findOneAndUpdate({ _id: like.user }, { $pull: { likes: id } });

    // Delete like from posts collection
    if (type === "post") {
      await Post.findOneAndUpdate({ _id: like.post }, { $pull: { likes: id } });
    }
    if (type === "postSocial") {
      await PostSocial.findOneAndUpdate(
        { _id: like.post },
        { $pull: { likes: id } }
      );
    }
    if (type === "postImage") {
      await PostImage.findOneAndUpdate(
        { _id: like.post },
        { $pull: { likes: id } }
      );
    }

    return like;
  },
};

export default { Mutation };
