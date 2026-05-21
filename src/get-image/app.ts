import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});
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
        MaxKeys: 1,
      }),
    );

    const objectKey = listResult.Contents?.[0]?.Key;
    if (!objectKey) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Image not found" }),
      };
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        imageId,
        todoId,
        s3Key: objectKey,
        presignedUrl: url,
        expiresIn: 3600,
      }),
    };
  } catch (error) {
    console.error("S3 Get Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to get image URL" }),
    };
  }
};
