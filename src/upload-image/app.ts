import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

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
  const body = JSON.parse(event.body || "{}");
  const { todoId, fileName, fileData, mimeType } = body;

  if (!todoId || !fileData || !mimeType || !fileName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing required fields: todoId, fileName, fileData, mimeType" }),
    };
  }

  const imageId = uuidv4();
  const bucket = process.env.IMAGES_BUCKET_NAME;
  const key = `todos/${todoId}/${imageId}/${fileName}`;
  const uploadedAt = new Date().toISOString();

  try {
    const buffer = Buffer.from(fileData, "base64");

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          todoId,
          imageId,
          uploadedAt,
        },
      }),
    );

    const imageMetadata = {
      imageId,
      fileName,
      s3Key: key,
      uploadedAt,
    };

    await dynamoClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: todoId },
        UpdateExpression: "SET images = list_append(if_not_exists(images, :empty), :image)",
        ExpressionAttributeValues: {
          ":empty": [],
          ":image": [imageMetadata],
        },
      }),
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        todoId,
        ...imageMetadata,
      }),
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to upload image" }),
    };
  }
};
