import mongoose from "mongoose";
import { withFilter } from "apollo-server";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { pubSub } from "../utils/apollo-server";
import { MESSAGE_CREATED, NEW_CONVERSATION } from "../constants/Subscriptions";
var admin = require("firebase-admin");
const Query = {
  /**
   * Gets user's specific conversation
   *
   * @param {string} authUserId
   * @param {string} userId
   */
  getMessages: async (root, { userId, postId }, { Message, authUser }) => {
    const specificMessage = await Message.find()
      .and([
        { $or: [{ sender: authUser.id }, { receiver: authUser.id }] },
        { $or: [{ sender: userId }, { receiver: userId }] },
        { post: postId },
      ])
      .populate("sender")
      .populate("receiver")
      .sort({ createdAt: "desc" });

    return specificMessage;
  },
  /**
   * Get users with whom authUser had a conversation
   *
   * @param {string} authUserId
   */
  getConversations: async (root, args, { User, Message, authUser }) => {
    // Get users with whom authUser had a chat
    const users = await User.findById(authUser.id).populate({
      path: "messages",
      populate: [
        { path: "user" },
        { path: "post", populate: [{ path: "author" }] },
      ],
    });

    // Get last messages with wom authUser had a chat
    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            {
              receiver: mongoose.Types.ObjectId(authUser.id),
            },
            {
              sender: mongoose.Types.ObjectId(authUser.id),
            },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$postMessage",
          doc: {
            $first: "$$ROOT",
          },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    // Attach message properties to users

    const conversations = [];

    users.messages.map((u) => {
      const user = {
        idChannel: u.id,
        userId: u.post.author.id !== authUser.id ? u.post.author.id : u.user.id,
        username:
          u.post.author.id !== authUser.id
            ? u.post.author.username
            : u.user.username,
        fullName:
          u.post.author.id !== authUser.id
            ? u.post.author.fullName
            : u.user.fullName,
        image:
          u.post.author.id !== authUser.id ? u.post.author.image : u.user.image,
        isOnline:
          u.post.author.id !== authUser.id
            ? u.post.author.isOnline
            : u.user.isOnline,
        post: u.post,
        location:
          u.post.author.id !== authUser.id
            ? u.post.author.location.name
            : u.user.location.name,
      };

      const sender = lastMessages.find(
        (m) =>
          user.userId === m.sender.toString() && u.post.id === m.post.toString()
      );
      if (sender) {
        user.sender1 = sender.sender;
        user.seen = sender.seen;
        user.lastMessageCreatedAt = sender.createdAt;
        user.lastMessage = sender.message;
        user.lastMessageSender = false;
        user.imageMessage = sender && sender.image ? true : false;
      } else {
        const receiver = lastMessages.find(
          (m) =>
            user.userId === m.receiver.toString() &&
            u.post.id === m.post.toString()
        );

        if (receiver) {
          user.sender1 = receiver.sender;
          user.seen = receiver.seen;
          user.lastMessageCreatedAt = receiver.createdAt;
          user.lastMessage = receiver.message;
          user.lastMessageSender = true;
          user.imageMessage = receiver && receiver.image ? true : false;
        } else {
          user.sender1 = "";
          user.seen = false;
          user.lastMessageCreatedAt = "";
          user.lastMessage = "";
          user.lastMessageSender = true;
          user.imageMessage = false;
        }
      }

      conversations.push(user);
    });

    // console.log(conversations);
    // Sort users by last created messages date
    const sortedConversations = conversations.sort(
      (a, b) => b.lastMessageCreatedAt - a.lastMessageCreatedAt
    );

    return sortedConversations;
  },
};

const Mutation = {
  /**
   * Creates a message
   *
   * @param {string} message
   * @param {string} sender
   * @param {string} receiver
   */
  createMessage: async (
    root,
    {
      input: {
        message,
        sender,
        receiver,
        postId,
        isAuthor,
        image,
        imagePost,
        type,
        postShare,
      },
    },
    { Message, User, PostMessage, Post }
  ) => {
    // let newMessage = await new Message({
    //   message,
    //   sender,
    //   receiver,
    //   post: postId,
    // }).save();

    let newMessage;
    if (imagePost) {
      newMessage = await new Message({
        message,
        sender,
        receiver,
        post: postId,
        image: imagePost,
        type,
        postShare,
      }).save();
    } else {
      if (image && image.length > 0) {
        const { createReadStream } = await image[0];
        const stream = createReadStream();
        const uploadImage = await uploadToCloudinary(stream, "post");
        if (!uploadImage.secure_url) {
          throw new Error("Something went wrong while uploading image");
        }

        newMessage = await new Message({
          image: uploadImage.secure_url,
          imagePublicId: uploadImage.public_id,
          sender,
          receiver,
          post: postId,
        }).save();
      } else {
        newMessage = await new Message({
          message,
          sender,
          receiver,
          post: postId,
        }).save();
      }
    }

    newMessage = await newMessage
      .populate("sender")
      .populate("receiver")
      .execPopulate();

    // Publish message created event
    pubSub.publish(MESSAGE_CREATED, { messageCreated: newMessage });

    // Check if user already had a conversation
    // if not push their ids to users collection
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);
    const checkChannel = await PostMessage.findOne({
      user: isAuthor ? receiver : sender,
      post: postId,
    });
    let newPostMessage;
    if (!checkChannel) {
      newPostMessage = await new PostMessage({
        user: isAuthor ? receiver : sender,
        post: postId,
      }).save();

      await User.findOneAndUpdate(
        { _id: sender },
        { $push: { messages: newPostMessage.id } }
      );
      await User.findOneAndUpdate(
        { _id: receiver },
        { $push: { messages: newPostMessage.id } }
      );
      await Post.findOneAndUpdate(
        { _id: postId },
        { $push: { messages: newPostMessage.id } }
      );
      newMessage.isFirstMessage = true;
      newMessage.postMessage = newPostMessage.id;
      newMessage.save();
    } else {
      newMessage.postMessage = checkChannel.id;
      newMessage.save();

      const checkChatSender = senderUser.messages.find(
        (o) => o.toString() === checkChannel.id.toString()
      );

      const checkChatReceiver = receiverUser.messages.find(
        (o) => o.toString() === checkChannel.id.toString()
      );
      if (!checkChatSender) {
        await User.findOneAndUpdate(
          { _id: sender },
          { $push: { messages: checkChannel.id } }
        );
      }
      if (!checkChatReceiver) {
        await User.findOneAndUpdate(
          { _id: receiver },
          { $push: { messages: checkChannel.id } }
        );
      }
    }

    const post = await Post.findById(postId).populate({ path: "author" });
    // Publish message created event
    pubSub.publish(NEW_CONVERSATION, {
      newConversation: {
        idChannel: checkChannel ? checkChannel.id : newPostMessage.id,
        receiverId: receiver,
        userId: isAuthor ? receiver : sender,
        username: senderUser.username,
        image: senderUser.image,
        isOnline: senderUser.isOnline,
        seen: false,
        lastMessage: newMessage.message,
        lastMessageSender: false,
        lastMessageCreatedAt: newMessage.createdAt,
        imageMessage: newMessage.image ? true : false,
        post,
      },
    });

    if (receiverUser.setting.notification) {
      if (receiverUser.setting.message) {
        await admin.messaging().sendToDevice(
          receiverUser.deviceToken, // ['token_1', 'token_2', ...]
          {
            notification: {
              title: senderUser.username,
              body: message,
              sound: receiverUser.setting.sound
                ? "default"
                : `nosound.wav` || `nosound`,
            },

            data: {
              postId: post.id,
              authorId: post.author.id,
              price: post.price,
              title: post.title,
              image: post.image[0],
              receiver: isAuthor ? receiver : sender,
              type: "message",
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

    return newMessage;
  },

  deleteChatConversation: async (
    root,
    { input: { id } },
    { User, authUser }
  ) => {
    try {
      await User.findOneAndUpdate(
        { _id: authUser.id },
        { $pull: { messages: id } }
      );
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Updates message seen values for user
   *
   * @param {string} userId
   */
  updateMessageSeen: async (
    root,
    { input: { sender, receiver, post } },
    { Message }
  ) => {
    try {
      await Message.update(
        { receiver, sender, post, seen: false },
        { seen: true },
        { multi: true }
      );

      return true;
    } catch (e) {
      return false;
    }
  },
};

const Subscription = {
  /**
   * Subscribes to message created event
   */
  messageCreated: {
    subscribe: withFilter(
      () => pubSub.asyncIterator(MESSAGE_CREATED),
      (payload, variables) => {
        const { sender, receiver } = payload.messageCreated;
        const { authUserId, userId } = variables;

        const isAuthUserSenderOrReceiver =
          authUserId === sender.id || authUserId === receiver.id;
        const isUserSenderOrReceiver =
          userId === sender.id || userId === receiver.id;

        return isAuthUserSenderOrReceiver && isUserSenderOrReceiver;
      }
    ),
  },

  /**
   * Subscribes to new conversations eventdav
   */
  newConversation: {
    subscribe: withFilter(
      () => pubSub.asyncIterator(NEW_CONVERSATION),
      (payload, variables, { authUser }) => {
        return (
          variables &&
          variables.authUserId === payload.newConversation.receiverId
        );
      }
    ),
  },
};

export default { Mutation, Query, Subscription };
