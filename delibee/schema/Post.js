import { gql } from "apollo-server-express";

/**
 * Post schema
 */
const PostSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------
  type Post {
    id: ID!
    title: String
    image: [File]
    imagePublicId: [String]
    price: String
    typePost: String
    view: String
    contact: String
    categoryPost: String
    content: String
    author: User!
    likes: [Like]
    comments: [Comment]
    createdAt: String
    updatedAt: String
    location: LocationPost!
  }
  type LocationPost {
    name: String
    lat: String
    long: String
  }

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------

  input LocationInput {
    name: String!
    lat: String
    long: String
  }
  input CreatePostInput {
    title: String
    image: [Upload]
    imagePublicId: [String]
    price: String
    content: String
    typePost: String
    categoryPost: String
    location: LocationInput
  }

  input DeletePostInput {
    id: ID!
    imagePublicId: [String]
  }

  input ViewPostInput {
    id: ID!
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------
  type UserPostsPayload {
    posts: [PostPayload]!
    count: String!
  }

  type PostPayload {
    id: ID!
    title: String
    image: [String]
    imagePublicId: [String]
    price: String
    typePost: String
    content: String
    categoryPost: String
    author: UserPayload!
    likes: [Like]
    comments: [CommentPayload]
    createdAt: String
    updatedAt: String
    location: LocationPost!
    view: String
    contact: String
    messages: [ID]
  }
  type SearchPostsPayLoad {
    id: ID!
    title: String
    price: String
    typePost: String
    categoryPost: String
    author: UserPayload!
    createdAt: String
    updatedAt: String
    location: LocationPost!
  }
  type RelatedPost {
    id: ID!
    title: String
    image: [String]
    imagePublicId: [String]
    price: String
    typePost: String
    content: String
    categoryPost: String
    createdAt: String
    updatedAt: String
    location: LocationPost!
  }

  type PostsPayload {
    posts: [PostPayload]!
    count: String!
  }

  type PostnRelatePayload {
    post: PostPayload
    relatedPost: [RelatedPost]
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------
  extend type Query {
    # Gets user posts by username
    getUserPosts(username: String!, skip: Int, limit: Int): UserPostsPayload

    # Gets posts from followed users
    getFollowedPosts(
      skip: Int
      limit: Int
      type: String
      category: [String]
    ): PostsPayload

    # Gets all posts
    getPosts(authUserId: ID!, skip: Int, limit: Int): PostsPayload

    # Gets post by id
    getPost(id: ID!): PostnRelatePayload

    # Search Posts
    searchPosts(title: String, category: String): [SearchPostsPayLoad]
  }

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a new post
    createPost(input: CreatePostInput!): PostPayload

    # Deletes a user post
    deletePost(input: DeletePostInput!): PostPayload

    # View Post
    viewPost(input: ViewPostInput!): PostPayload
    # Contact Post
    contactPost(input: ViewPostInput!): PostPayload
  }
`;

export default PostSchema;
