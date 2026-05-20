import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || "{}");

  const todo = {
    id: uuidv4(),
    title: body.title,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  await client.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: todo,
    }),
  );

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(todo),
  };
};
