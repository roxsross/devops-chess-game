import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  type QueryCommandInput,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config/env';

const client = new DynamoDBClient({
  region: config.aws.region,
  // Local dev only: use the DynamoDB local endpoint with fake credentials.
  // In production (App Runner) omit credentials so the SDK uses the IAM instance role.
  ...(config.dynamodb.endpoint
    ? {
        endpoint: config.dynamodb.endpoint,
        credentials: {
          accessKeyId: config.aws.accessKeyId ?? 'local',
          secretAccessKey: config.aws.secretAccessKey ?? 'local',
        },
      }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export async function putItem(tableName: string, item: Record<string, unknown>): Promise<void> {
  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function getItem<T>(
  tableName: string,
  key: Record<string, unknown>
): Promise<T | null> {
  const result = await docClient.send(new GetCommand({ TableName: tableName, Key: key }));
  return (result.Item as T) ?? null;
}

export async function queryItems<T>(params: QueryCommandInput): Promise<T[]> {
  const result = await docClient.send(new QueryCommand(params));
  return (result.Items as T[]) ?? [];
}

export async function updateItem(params: UpdateCommandInput): Promise<void> {
  await docClient.send(new UpdateCommand(params));
}

export async function deleteItem(tableName: string, key: Record<string, unknown>): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: tableName, Key: key }));
}

export async function scanItems<T>(
  tableName: string,
  filterExpression?: string,
  expressionValues?: Record<string, unknown>,
  expressionNames?: Record<string, string>
): Promise<T[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionValues,
      ...(expressionNames ? { ExpressionAttributeNames: expressionNames } : {}),
    })
  );
  return (result.Items as T[]) ?? [];
}
