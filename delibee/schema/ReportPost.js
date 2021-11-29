import { gql } from "apollo-server-express";

const ReportPostSchema = gql`
  # ---------------------------------------------------------
  # Model Objects
  # ---------------------------------------------------------

  # ---------------------------------------------------------
  # Input Objects
  # ---------------------------------------------------------

  input CreateReportInput {
    postId: ID!
    image: [Upload]
    imagePublicId: [String]
    content: String!
  }

  # ---------------------------------------------------------
  # Return Payloads
  # ---------------------------------------------------------

  type ReportPostPayLoad {
    id: ID!
  }

  # ---------------------------------------------------------
  # Queries
  # ---------------------------------------------------------

  # ---------------------------------------------------------
  # Mutations
  # ---------------------------------------------------------
  extend type Mutation {
    # Creates a new reportPost
    createReportPost(input: CreateReportInput!): ReportPostPayLoad
  }
`;

export default ReportPostSchema;
