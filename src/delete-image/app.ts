import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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
  const { todoId, imageId } = event.pathParameters || {};

  if (!todoId || !imageId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing todoId or imageId" }),
    };
  }

  const bucket = process.env.IMAGES_BUCKET_NAME;
  const prefix = `todos/${todoId}/${imageId}/`;

  try {
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      }),
    );

    const objects = listResult.Contents?.filter((item) => item.Key).map((item) => ({ Key: item.Key! })) || [];
    if (objects.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Image not found" }),
      };
    }

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objects },
      }),
    );

    const todoResult = await dynamoClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: todoId },
      }),
    );

    const images = Array.isArray(todoResult.Item?.images) ? todoResult.Item.images : [];
    const updatedImages = images.filter((img: any) => img.imageId !== imageId);

    await dynamoClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: todoId },
        UpdateExpression: "SET images = :images",
        ExpressionAttributeValues: {
          ":images": updatedImages,
        },
      }),
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Image deleted successfully", imageId }),
    };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete image" }),
    };
  }
};
