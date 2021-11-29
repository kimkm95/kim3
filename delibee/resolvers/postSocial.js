import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";

const Query = {
  /**
   * Gets all posts
   *
   * @param {string} authUserId
   * @param {int} skip how many posts to skip
   * @param {int} limit how many posts to limit
   */
  getPostSocials: async (root, { authUserId, skip, limit }, { Post }) => {
    const query = {
      $and: [{ image: { $ne: null } }, { author: { $ne: authUserId } }],
    };
    const postsCount = await Post.find(query).countDocuments();
    const allPosts = await Post.find(query)
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
        populate: [{ path: "author" }, { path: "likes" }],
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: "desc" });

    return { posts: allPosts, count: postsCount };
  },
  /**
   * Gets posts from followed users
   *
   * @param {string} userId
   * @param {int} skip how many posts to skip
   * @param {int} limit how many posts to limit
   */
  getFollowedPostSocials: async (
    root,
    { skip, limit, type },
    { PostSocial, authUser, User }
  ) => {
    // Find user ids, that current user follows
    const checkUser = await User.findById(authUser.id);

    if (!checkUser) {
      throw new Error("User not exited");
    }
    const R = 6371e3; // earth's mean radius in metres
    const sin = Math.sin;
    const cos = Math.cos;
    const acos = Math.acos;
    const π = Math.PI;
    const lat = Number(checkUser.location.lat); // or e.g. req.query.lat (degrees)
    const lon = Number(checkUser.location.long); // or e.g. req.query.lon (degrees)
    const radius = 2000; // or e.g. req.query.radius; (metres)
    const params = {
      minLat: lat - ((radius / R) * 180) / π,
      maxLat: lat + ((radius / R) * 180) / π,
      minLon: lon - ((radius / R) * 180) / π / cos((lat * π) / 180),
      maxLon: lon + ((radius / R) * 180) / π / cos((lat * π) / 180),
    };
    const pointsBoundingBox = await User.find({
      "location.lat": {
        $gt: params.minLat,
        $lt: params.maxLat,
      },
      "location.long": {
        $gt: params.minLon,
        $lt: params.maxLon,
      },
    });
    pointsBoundingBox.forEach((p) => {
      p.d =
        acos(
          sin((Number(p.location.lat) * π) / 180) * sin((lat * π) / 180) +
            cos((Number(p.location.lat) * π) / 180) *
              cos((lat * π) / 180) *
              cos((Number(p.location.long) * π) / 180 - (lon * π) / 180)
        ) * R;
    });
    const pointsWithinCircle = pointsBoundingBox
      .filter((p) => p.d < radius)
      .sort((a, b) => a.d - b.d);

    if (pointsWithinCircle.length > 0) {
      const followedPosts = await PostSocial.find({
        $or: [...pointsWithinCircle.map((e) => ({ author: e.id }))],
        topic: type !== "" ? type : { $ne: null },
      })
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
          populate: [
            { path: "author" },
            { path: "likes" },
            {
              path: "childrenId",
              options: { sort: { createdAt: "desc" } },
              populate: [
                { path: "author" },
                { path: "likes" },
                {
                  path: "childrenId",
                  options: { sort: { createdAt: "desc" } },
                  populate: [{ path: "author" }, { path: "likes" }],
                },
              ],
            },
          ],
        })
        .populate({
          path: "image",
          select: "image",
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: "desc" });

      return { postSocials: followedPosts, count: followedPosts.length };
    } else {
      return { postSocials: [], count: 0 };
    }
    // Find user posts and followed posts by using userFollowing ids array
  },
  /**
   * Gets post by id
   *
   * @param {string} id
   */
  getPostSocial: async (root, { id }, { PostSocial, Comment }) => {
    const post = await PostSocial.findById(id)
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
      .populate({
        path: "image",
        populate: [
          { path: "likes" },
          { path: "author" },
          {
            path: "comments",
            options: {
              sort: { createdAt: "desc" },
              query: {
                parentId: null,
              },
            },
            populate: [
              { path: "author" },
              { path: "likes" },
              {
                path: "childrenId",
                options: { sort: { createdAt: "desc" } },
                populate: [
                  { path: "author" },
                  { path: "likes" },
                  {
                    path: "childrenId",
                    options: { sort: { createdAt: "desc" } },
                    populate: [{ path: "author" }, { path: "likes" }],
                  },
                ],
              },
            ],
          },
        ],
      })
      .populate("likes")
      .populate({
        path: "comments",
        options: {
          sort: { createdAt: "desc" },
        },
        populate: [
          { path: "author" },
          { path: "likes" },
          {
            path: "childrenId",
            options: { sort: { createdAt: "desc" } },
            populate: [
              { path: "author" },
              { path: "likes" },
              {
                path: "childrenId",
                options: { sort: { createdAt: "desc" } },
                populate: [{ path: "author" }, { path: "likes" }],
              },
            ],
          },
        ],
      });
    const count = await Comment.find({ post: id }).countDocuments();

    return { count, post };
  },
  getPostImage: async (root, { id }, { PostImage, Comment }) => {
    const post = await PostImage.findById(id)
      .populate({
        path: "author",
        populate: [
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
        options: {
          sort: { createdAt: "desc" },
        },
        populate: [
          { path: "author" },
          { path: "likes" },
          {
            path: "childrenId",
            options: { sort: { createdAt: "desc" } },
            populate: [
              { path: "author" },
              { path: "likes" },
              {
                path: "childrenId",
                options: { sort: { createdAt: "desc" } },
                populate: [{ path: "author" }, { path: "likes" }],
              },
            ],
          },
        ],
      });

    const count = await Comment.find({ post: id }).countDocuments();

    return { count, post };
  },
  searchSocailPosts: async (root, { title }, { PostSocial, Follow }) => {
    // Find user ids, that current user follows

    // Find user posts and followed posts by using userFollowing ids array
    const query = {
      title: new RegExp(title, "i"),
    };
    // const followedPostsCount = await PostSocial.find(query).countDocuments();
    const followedPosts = await PostSocial.find(query)
      .populate({
        path: "author",
      })
      .populate({
        path: "image",
      })

      .sort({ createdAt: "desc" });

    return followedPosts;
  },
};

const Mutation = {
  /**
   * Creates a new post
   *
   * @param {string} title
   * @param {string} image
   * @param {string} authorId
   */
  createPostSocial: async (
    root,
    { input: { title, image, topic } },
    { PostSocial, User, PostImage, authUser }
  ) => {
    if (!title) {
      throw new Error("제목을 입력하세요!");
    }
    if (!topic) {
      throw new Error("커뮤니티 주제를 선택하세요!");
    }

    let postImage = [];

    if (image) {
      for (let i = 0; i < image.length; i++) {
        const { createReadStream } = await image[i];
        const stream = createReadStream();
        const uploadImage = await uploadToCloudinary(stream, "post");
        if (!uploadImage.secure_url) {
          throw new Error("Something went wrong while uploading image");
        }

        let newPostImage = await new PostImage({
          image: uploadImage.secure_url,
          imagePublicId: uploadImage.public_id,
          author: authUser.id,
        }).save();
        postImage.push(newPostImage.id);
      }
    }

    const newPost = await new PostSocial({
      title,
      image: postImage,
      author: authUser.id,
      topic,
    }).save();

    await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { socialPosts: newPost.id } }
    );

    return newPost;
  },
  /**
   * Deletes a user post
   *
   * @param {string} id
   * @param {imagePublicId} id
   */
  deletePostSocial: async (
    root,
    { input: { id, imagePublicId } },
    { Post, Like, User, Comment, Notification }
  ) => {
    // Remove post image from cloudinary, if imagePublicId is present
    if (imagePublicId) {
      const deleteImage = await deleteFromCloudinary(imagePublicId);

      if (deleteImage.result !== "ok") {
        throw new Error(
          "Something went wrong while deleting image from Cloudinary"
        );
      }
    }

    // Find post and remove it
    const post = await Post.findByIdAndRemove(id);

    // Delete post from authors (users) posts collection
    await User.findOneAndUpdate(
      { _id: post.author },
      { $pull: { posts: post.id } }
    );

    // Delete post likes from likes collection
    await Like.find({ post: post.id }).deleteMany();
    // Delete post likes from users collection
    post.likes.map(async (likeId) => {
      await User.where({ likes: likeId }).update({ $pull: { likes: likeId } });
    });

    // Delete post comments from comments collection
    await Comment.find({ post: post.id }).deleteMany();
    // Delete comments from users collection
    post.comments.map(async (commentId) => {
      await User.where({ comments: commentId }).update({
        $pull: { comments: commentId },
      });
    });

    // Find user notification in users collection and remove them
    const userNotifications = await Notification.find({ post: post.id });

    userNotifications.map(async (notification) => {
      await User.where({ notifications: notification.id }).update({
        $pull: { notifications: notification.id },
      });
    });
    // Remove notifications from notifications collection
    await Notification.find({ post: post.id }).deleteMany();

    return post;
  },
};

export default { Query, Mutation };
