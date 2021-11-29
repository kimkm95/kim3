import { gql } from "apollo-server-express";

/**
 * PostSocial schema
 */
const PostSocialSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type PostSocial {
    id: ID!
    title: String
    image: [PostImage]
    topic: String
    author: User!
    likes: [Like]
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------
  input CreatePostSocialInput {
    title: String
    image: [Upload]

    topic: String
  }

  input DeletePostSocialInput {
    id: ID!
    imagePublicId: [String]
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type UserPostSocialsPayload {
    posts: [PostSocialPayload]!
    count: String!
  }
  type ImagePostPayloads {
    id: ID!
    image: String
    likes: [Like]
    comments: [CommentPayload]
    author: UserPayload
    createdAt: String
    updatedAt: String
  }
  type SearchPostSocailPostsPayLoad {
    id: ID!
    title: String
    author: UserPayload!
    createdAt: String
    updatedAt: String
    image: [ImagePostPayloads]
  }
  type PostSocialPayload {
    id: ID!
    title: String
    image: [ImagePostPayloads]
    topic: String
    author: UserPayload!
    likes: [Like]
    comments: [CommentPayload]
    createdAt: String
    updatedAt: String
  }
  type PostImageDetailPayload {
    id: ID!
    image: String
    author: UserPayload!
    likes: [Like]
    comments: [CommentPayload]
    createdAt: String
    updatedAt: String
  }

  type PostSocialsPayload {
    postSocials: [PostSocialPayload]!
    count: String!
  }
  type PostSocialCountPayload {
    post: PostSocialPayload!
    count: String!
  }
  type PostImageCountPayload {
    post: ImagePostPayloads!
    count: String!
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------
  extend type Query {
    # Gets user posts by username
    getUserPostSocials(
      username: String!
      skip: Int
      limit: Int
    ): UserPostSocialsPayload

    # Gets posts from followed users
    getFollowedPostSocials(
      skip: Int
      limit: Int
      type: String
    ): PostSocialsPayload

    # Gets all posts
    getPostSocials(authUserId: ID!, skip: Int, limit: Int): PostSocialsPayload

    # Gets post by id
    getPostSocial(id: ID!): PostSocialCountPayload
    getPostImage(id: ID!): PostImageCountPayload
    # Search Posts
    searchSocailPosts(title: String): [SearchPostSocailPostsPayLoad]
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a new post
    createPostSocial(input: CreatePostSocialInput!): PostSocialPayload

    # Deletes a user post
    deletePostSocial(input: DeletePostSocialInput!): PostSocialPayload
  }
`;

export default PostSocialSchema;
