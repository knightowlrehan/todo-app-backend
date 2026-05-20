import { APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  const result = await client.send(
    new ScanCommand({
      TableName: process.env.TABLE_NAME,
    }),
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items || []),
  };
};
