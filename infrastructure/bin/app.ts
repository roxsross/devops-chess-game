#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const databaseStack = new DatabaseStack(app, 'ChessGameDatabase', {
  env,
  description: 'Chess Game — DynamoDB tables (stateful, termination protected)',
  terminationProtection: true,
});

new AppStack(app, 'ChessGameApp', {
  env,
  description: 'Chess Game — App Runner backend + S3/CloudFront frontend',
  gamesTable: databaseStack.gamesTable,
  playersTable: databaseStack.playersTable,
});
