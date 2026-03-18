import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly gamesTable: dynamodb.Table;
  public readonly playersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // chess-games: pk=gameId (HASH), sk=createdAt (RANGE)
    this.gamesTable = new dynamodb.Table(this, 'GamesTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // chess-players: pk=userId (HASH), sk=username (RANGE)
    this.playersTable = new dynamodb.Table(this, 'PlayersTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'GamesTableName', {
      value: this.gamesTable.tableName,
      exportName: 'ChessGamesTableName',
    });

    new cdk.CfnOutput(this, 'PlayersTableName', {
      value: this.playersTable.tableName,
      exportName: 'ChessPlayersTableName',
    });
  }
}
