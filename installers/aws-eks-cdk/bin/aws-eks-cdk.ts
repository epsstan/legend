#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {LegendPipelineStack} from "../lib/legend-pipeline-stack";

const app = new cdk.App();
new LegendPipelineStack(app, 'LegendPipeline');
