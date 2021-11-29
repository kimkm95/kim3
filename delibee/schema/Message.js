import { gql } from "apollo-server-express";

/**
 * Message schema
 */
const MessageSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type Message {
    id: ID!
    sender: User!
    receiver: User!
    message: String!
    createdAt: String
    updateAt: String
    image: String
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------
  input CreateMessageInput {
    sender: ID!
    receiver: ID!
    message: String
    postId: ID!
    isAuthor: Boolean
    image: [Upload]
    imagePublicId: [String]
    type: String
    imagePost: String
    postShare: ID
  }

  input UpdateMessageSeenInput {
    sender: ID
    receiver: ID!
    post: ID!
  }

  input DeleteConversationInput {
    id: ID!
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type MessagePayload {
    id: ID!
    receiver: UserPayload
    sender: UserPayload
    message: String
    seen: Boolean
    createdAt: String
    isFirstMessage: Boolean
    image: String
    type: String
    postShare: ID
  }
  type PostChatPayload {
    id: ID!
    title: String
    price: String
    author: UserPayload
    image: [String]
  }

  type ConversationsPayload {
    userId: ID!
    username: String
    fullName: String
    image: String
    isOnline: Boolean
    seen: Boolean
    lastMessage: String
    lastMessageSender: Boolean
    lastMessageCreatedAt: String
    post: PostChatPayload
    imageMessage: Boolean
    sender1: ID
    location: String
    idChannel: ID!
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------
  extend type Query {
    # Gets user's messages
    getMessages(userId: ID!, postId: ID!): [MessagePayload]

    # Gets user's conversations
    getConversations: [ConversationsPayload]
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a message
    createMessage(input: CreateMessageInput!): MessagePayload

    # Updates message seen values for user
    updateMessageSeen(input: UpdateMessageSeenInput!): Boolean

    deleteChatConversation(input: DeleteConversationInput): Boolean
  }

  # ---------------------------------------------------------
  # Subscriptions
  # ---------------------------------------------------------
  extend type Subscription {
    # Subscribes to message created event
    messageCreated(authUserId: ID!, userId: ID!): MessagePayload

    # Subscribes to new conversation event
    newConversation(authUserId: ID!): ConversationsPayload
  }
`;

export default MessageSchema;
