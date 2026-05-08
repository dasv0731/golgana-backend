import { handle } from 'hono/aws-lambda';
import { createApp } from './app.js';

/** AWS Lambda handler · API Gateway HTTP API (v2) o ALB compatibles. */
export const handler = handle(createApp());
