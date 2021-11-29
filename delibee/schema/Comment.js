import { gql } from "apollo-server-express";

/**
 * Comment schema
 */
const CommentSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type Comment {
    id: ID!
    comment: String
    author: ID
    post: ID
    createdAt: String
    likes: [Like]
    parentId: ID
    childrenId: [ID]
    image: File
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------
  input CreateCommentInput {
    comment: String
    postId: ID!
    type: String!
    parentId: ID
    image: [Upload]
    imagePublicId: [String]
  }
  input CreateCommentImageInput {
    comment: String
    postId: ID!
    type: String!
    parentId: ID
    image: [Upload]
    imagePublicId: [String]
    postSocial: ID!
    topic: String
  }

  input DeleteCommentInput {
    id: ID!
    type: String
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------

  type ChildrentPayload1 {
    id: ID
    comment: String
    author: UserPayload
    post: PostPayload
    createdAt: String
    likes: [Like]
    parentId: ID
    image: String
  }

  type ChildrentPayload {
    id: ID
    comment: String
    author: UserPayload
    post: PostPayload
    createdAt: String
    likes: [Like]
    parentId: ID

    image: String
  }

  type CommentPayload {
    id: ID
    comment: String
    author: UserPayload
    post: PostPayload
    createdAt: String
    likes: [Like]
    parentId: ID
    childrenId: [CommentPayload]
    image: String
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a post comment
    createComment(input: CreateCommentInput!): Comment
    createCommentPostImage(input: CreateCommentImageInput!): Comment
    # Deletes a post comment
    deleteComment(input: DeleteCommentInput!): Comment
  }
`;

export default CommentSchema;
