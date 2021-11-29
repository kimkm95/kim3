import { gql } from "apollo-server-express";

/**
 * User schema
 */
const UserSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type User {
    id: ID!
    fullName: String!
    email: String
    phoneNumber: String
    password: String!
    resetToken: String
    resetTokenExpiry: String
    image: File
    imagePublicId: String
    coverImage: File
    coverImagePublicId: String
    isOnline: Boolean
    posts: [PostPayload]
    likes: [Like]
    comments: [Comment]
    followers: [Follow]
    following: [Follow]
    notifications: [NotificationPayload]
    createdAt: String
    updatedAt: String
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }
  type UserSignUp {
    id: ID!
    fullName: String!
    image: String!
    location: LocationPost
  }
  type Token {
    token: String!
    user: UserSignUp
  }

  type SuccessMessage {
    message: String!
  }
  type SettingPayLoad {
    sound: Boolean
    notification: Boolean
    message: Boolean
    channel: Boolean
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------
  input SignInInput {
    token: String!
  }
  input SignUpInputGoogle {
    token: String!
    idGoogle: String!
    idToken: String!
  }

  input SignUpInput {
    email: String
    phoneNumber: String
    password: String!
    name: String!
    lat: String!
    long: String!
  }

  input RequestPasswordResetInput {
    email: String
  }
  input DeviceTokenInput {
    token: String
    id: ID!
  }
  input ResetPasswordInput {
    email: String
    token: String
    password: String
  }
  input EditAccount {
    id: ID!
    name: String
    phoneNumber: String
    email: String
  }

  input UploadUserPhotoInput {
    id: ID!
    image: Upload!
    imagePublicId: String
    isCover: Boolean
  }
  input SetLocationInput {
    name: String!
    lat: String!
    long: String!
  }
  input SettingInput {
    type: String
    value: Boolean
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type UserPayload {
    id: ID!
    fullName: String
    email: String
    phoneNumber: String
    username: String
    password: String
    image: String
    imagePublicId: String
    coverImage: String
    coverImagePublicId: String
    isOnline: Boolean
    posts: [PostPayload]
    socialPosts: [PostSocialPayload]
    likes: [Like]
    followers: [Follow]
    following: [Follow]
    notifications: [NotificationPayload]
    newNotifications: [NotificationPayload]
    newConversations: [ConversationsPayload]
    unseenMessage: Boolean
    createdAt: String
    updatedAt: String
    location: LocationPost
    setting: SettingPayLoad
  }

  type UsersPayload {
    users: [UserPayload]!
    count: String!
  }

  type IsUserOnlinePayload {
    userId: ID!
    isOnline: Boolean
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------
  extend type Query {
    # Verifies reset password token
    verifyResetPasswordToken(email: String, token: String!): SuccessMessage

    # Gets the currently logged in user
    getAuthUser: UserPayload

    # Gets user by phoneNumber or by id
    getUser(id: ID): UserPayload

    # Gets all users
    getUsers(userId: String!, skip: Int, limit: Int): UsersPayload

    # Searches users by phoneNumber or fullName
    searchUsers(searchQuery: String!): [UserPayload]

    # Gets Suggested people for user
    suggestPeople(userId: String!): [UserPayload]
    getSetting: SettingPayLoad
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Signs in user
    signin(input: SignInInput!): Token

    signinKaKao(input: SignInInput!): Token

    signinGoogle(input: SignUpInputGoogle!): Token
    # Signs up user
    signup(input: SignInInput!): Token
    checkDeviceToken(input: DeviceTokenInput!): Boolean
    deleteDeviceToken(input: DeviceTokenInput!): Boolean
    # Requests reset password
    requestPasswordReset(input: RequestPasswordResetInput!): SuccessMessage

    # Resets user password
    resetPassword(input: ResetPasswordInput!): Token

    # Uploads user Profile or Cover photo
    uploadUserPhoto(input: UploadUserPhotoInput!): UserPayload
    setSetting(input: SettingInput!): Boolean
    editAccount(input: EditAccount!): UserPayload
    setLocationUser(input: SetLocationInput!): UserPayload
  }

  # ---------------------------------------------------------
  # Subscriptions
  # ---------------------------------------------------------
  extend type Subscription {
    # Subscribes to is user online event
    isUserOnline(authUserId: ID!, userId: ID!): IsUserOnlinePayload
  }
`;

export default UserSchema;
