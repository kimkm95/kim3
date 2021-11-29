import { gql } from "apollo-server-express";

/**
 * PostImage schema
 */
const PostImageSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type PostImage {
    id: ID!
    image: [File]
    author: User!
    likes: [Like]
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type UserPostImagesPayload {
    posts: [PostImagePayload]!
    count: String!
  }

  type PostImagePayload {
    id: ID!
    image: [String]
    imagePublicId: [String]
    author: UserPayload!
    likes: [Like]
    comments: [CommentPayload]
    createdAt: String
    updatedAt: String
  }
  type PostImagesPayload {
    posts: [PostImagePayload]!
    count: String!
  }
  type SearchSocailPostsPayLoad {
    id: ID!
    title: String
    author: UserPayload!
    createdAt: String
    updatedAt: String
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------
  extend type Query {
    # Gets user posts by username
    getUserPostImages(
      username: String!
      skip: Int
      limit: Int
    ): UserPostImagesPayload

    # Gets posts from followed users
    getFollowedPostImages(
      userId: String!
      skip: Int
      limit: Int
      type: String
    ): PostImagesPayload

    # Gets all posts
    getPostImages(authUserId: ID!, skip: Int, limit: Int): PostImagesPayload

    # Gets post by id
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
`;

export default PostImageSchema;
