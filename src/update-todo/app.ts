import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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
  const id = event.pathParameters?.id;
  const body = JSON.parse(event.body || "{}");

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Missing id parameter" }),
    };
  }

  const result = await client.send(
    new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET #title = :title, completed = :completed",
      ExpressionAttributeNames: {
        "#title": "title",
      },
      ExpressionAttributeValues: {
        ":title": body.title,
        ":completed": body.completed,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "Todo not found" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Attributes),
  };
};
