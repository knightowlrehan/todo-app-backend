import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Missing id parameter" }),
    };
  }

  const bucket = process.env.IMAGES_BUCKET_NAME;
  try {
    if (!bucket) {
      throw new Error("IMAGES_BUCKET_NAME is not configured");
    }

    const prefix = `todos/${id}/`;
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      }),
    );

    const objectsToDelete = listResult.Contents?.filter((item) => item.Key).map((item) => ({ Key: item.Key! })) || [];
    if (objectsToDelete.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objectsToDelete },
        }),
      );
    }

    const result = await dynamoClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id },
        ReturnValues: "ALL_OLD",
      }),
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: `${result.Attributes?.title ?? "Todo"} deleted successfully` }),
    };
  } catch (error) {
    console.error("Delete todo error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete todo and its images" }),
    };
  }
};
