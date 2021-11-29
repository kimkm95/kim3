import { gql } from "apollo-server-express";

/**
 * Like schema
 */
const LikeSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type Like {
    id: ID!
    post: ID
    user: ID
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------
  input CreateLikeInput {
    postId: ID!
    type: String!
  }
  input CreateLikeImageInput {
    postId: ID!
    type: String!
    topic: String
    postSocial: ID!
  }

  input DeleteLikeInput {
    id: ID!
    type: String!
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type LikePayload {
    id: ID!
    post: PostPayload
    user: UserPayload
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a like for post
    createLike(input: CreateLikeInput!): Like
    createLikeImage(input: CreateLikeImageInput!): Like
    # Deletes a post like
    deleteLike(input: DeleteLikeInput!): Like
  }
`;

export default LikeSchema;
