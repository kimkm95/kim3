import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";

const Query = {
  /**
   * Gets all posts
   *
   * @param {string} authUserId
   * @param {int} skip how many posts to skip
   * @param {int} limit how many posts to limit
   */
  getPosts: async (root, { authUserId, skip, limit }, { Post }) => {
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
        populate: { path: "author" },
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
  getFollowedPosts: async (
    root,
    { skip, limit, type, category },
    { Post, Follow, authUser, User }
  ) => {
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

    const postsCount = await Post.find({
      $or: [
        {
          $and: [
            {
              "location.lat": {
                $gt: params.minLat,
                $lt: params.maxLat,
              },
            },
            {
              "location.long": {
                $gt: params.minLon,
                $lt: params.maxLon,
              },
            },
          ],
        },
        { author: authUser.id },
      ],
      typePost: type,
    })
      .and([
        {
          $or:
            category.length === 0
              ? [{ categoryPost: { $ne: null } }]
              : [...category.map((e) => ({ categoryPost: e }))],
        },
      ])
      .countDocuments();

    const pointsBoundingBox = await Post.find({
      $or: [
        {
          $and: [
            {
              "location.lat": {
                $gt: params.minLat,
                $lt: params.maxLat,
              },
            },
            {
              "location.long": {
                $gt: params.minLon,
                $lt: params.maxLon,
              },
            },
          ],
        },
        { author: authUser.id },
      ],
      typePost: type,
    })
      .and([
        {
          $or:
            category.length === 0
              ? [{ categoryPost: { $ne: null } }]
              : [...category.map((e) => ({ categoryPost: e }))],
        },
      ])
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
        populate: { path: "author" },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: "desc" });

    // Find user posts and followed posts by using userFollowing ids array

    return { posts: pointsBoundingBox, count: postsCount };
  },
  /**
   * Gets post by id
   *
   * @param {string} id
   */
  getPost: async (root, { id }, { Post }) => {
    const post = await Post.findById(id)
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
        options: { sort: { createdAt: -1 } },
        populate: { path: "author" },
      });
    const R = 6371e3; // earth's mean radius in metres
    const sin = Math.sin;
    const cos = Math.cos;
    const acos = Math.acos;
    const π = Math.PI;
    const lat = Number(post.location.lat); // or e.g. req.query.lat (degrees)
    const lon = Number(post.location.long); // or e.g. req.query.lon (degrees)
    const radius = 2000; // or e.g. req.query.radius; (metres)
    const params = {
      minLat: lat - ((radius / R) * 180) / π,
      maxLat: lat + ((radius / R) * 180) / π,
      minLon: lon - ((radius / R) * 180) / π / cos((lat * π) / 180),
      maxLon: lon + ((radius / R) * 180) / π / cos((lat * π) / 180),
    };
    const pointsBoundingBox = await Post.find({
      "location.lat": {
        $gt: params.minLat,
        $lt: params.maxLat,
      },
      "location.long": {
        $gt: params.minLon,
        $lt: params.maxLon,
      },
      categoryPost: post.categoryPost,
      _id: { $ne: post.id },
    });

    return { post, relatedPost: pointsBoundingBox };
  },
  /**
   * Gets posts from followed users
   *
  
   * @param {int} skip how many posts to skip
   * @param {int} limit how many posts to limit
   */
  searchPosts: async (root, { category, title }, { Post, Follow }) => {
    // Find user ids, that current user follows

    // Find user posts and followed posts by using userFollowing ids array
    const query = {
      title: new RegExp(title, "i"),
      categoryPost: category !== "" ? category : { $ne: null },
    };
    const followedPostsCount = await Post.find(query).countDocuments();
    const followedPosts = await Post.find(query)
      .populate({
        path: "author",
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
  createPost: async (
    root,
    {
      input: { title, price, content, typePost, categoryPost, location, image },
    },
    { Post, User, authUser }
  ) => {
    if (!title) {
      throw new Error("제목을 입력하세요!");
    }
    if (!price) {
      throw new Error("가격을 입력하세요!");
    }
    if (!content) {
      throw new Error("내용을 입력하세요!");
    }
    if (!location.name) {
      throw new Error("동네를 선택하세요!");
    }
    if (image && image.length === 0) {
      throw new Error("사진을 추가하세요!");
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

    const newPost = await new Post({
      title,
      image: imageUrl,
      imagePublicId,
      author: authUser.id,
      price,
      content,
      typePost,
      categoryPost,
      location,
    }).save();

    await User.findOneAndUpdate(
      { _id: authUser.id },
      { $push: { posts: newPost.id } }
    );

    return newPost;
  },

  viewPost: async (root, { input: { id } }, { Post }) => {
    const post = await Post.findByIdAndUpdate(id);
    post.view = (post.view ? Number(post.view) : 0) + 1;
    post.save();
    return post;
  },
  contactPost: async (root, { input: { id } }, { Post }) => {
    const post = await Post.findByIdAndUpdate(id);

    post.contact = (post.contact ? Number(post.contact) : 0) + 1;
    post.save();
    return post;
  },

  /**
   * Deletes a user post
   *
   * @param {string} id
   * @param {imagePublicId} id
   */
  deletePost: async (
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
