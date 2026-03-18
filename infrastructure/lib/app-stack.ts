import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as ecrassets from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import * as path from 'path';

interface AppStackProps extends cdk.StackProps {
  gamesTable: dynamodb.Table;
  playersTable: dynamodb.Table;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // ── Docker image — built locally and pushed to CDK-managed ECR ───
    const backendImage = new ecrassets.DockerImageAsset(this, 'BackendImage', {
      directory: path.join(__dirname, '../../backend'),
      platform: ecrassets.Platform.LINUX_AMD64,
    });

    // ── IAM: access role lets App Runner pull the image from ECR ──────
    const accessRole = new iam.Role(this, 'AppRunnerAccessRole', {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSAppRunnerServicePolicyForECRAccess',
        ),
      ],
    });

    // ── IAM: instance role grants DynamoDB access to the container ────
    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    props.gamesTable.grantReadWriteData(instanceRole);
    props.playersTable.grantReadWriteData(instanceRole);

    // ── App Runner service (0.25 vCPU / 0.5 GB — dev-sized) ──────────
    //
    // FRONTEND_URL is set to '*' so CORS works on first deploy.
    // After deploying, re-run deploy.sh to tighten it to the CloudFront URL.
    const service = new apprunner.CfnService(this, 'BackendService', {
      sourceConfiguration: {
        autoDeploymentsEnabled: false,
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        imageRepository: {
          imageIdentifier: backendImage.imageUri,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '3001',
            runtimeEnvironmentVariables: [
              { name: 'NODE_ENV', value: 'production' },
              { name: 'PORT', value: '3001' },
              { name: 'AWS_REGION', value: this.region },
              { name: 'DYNAMODB_TABLE_GAMES', value: props.gamesTable.tableName },
              { name: 'DYNAMODB_TABLE_PLAYERS', value: props.playersTable.tableName },
              { name: 'FRONTEND_URL', value: '*' },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: '256',    // 0.25 vCPU
        memory: '512', // 0.5 GB
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/health',
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
    });

    // ── S3 bucket — private, frontend assets only ─────────────────────
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ── CloudFront OAC + Distribution (SPA, frontend only) ───────────
    const oac = new cloudfront.S3OriginAccessControl(this, 'FrontendOAC');

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      // React SPA: serve index.html for any unknown path
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
      ],
      // Price class 100 = US + Europe only (cheapest)
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // ── Outputs (consumed by deploy.sh) ───────────────────────────────
    new cdk.CfnOutput(this, 'AppRunnerServiceUrl', {
      value: `https://${service.attrServiceUrl}`,
      description: 'Backend — set as VITE_API_URL (+ /api/v1) and VITE_WS_URL',
    });

    new cdk.CfnOutput(this, 'AppRunnerServiceArn', {
      value: service.attrServiceArn,
      description: 'App Runner ARN — used by deploy.sh to update FRONTEND_URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket — deploy.sh syncs the Vite build here',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend URL — share this with users',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID — used for cache invalidation',
    });
  }
}
