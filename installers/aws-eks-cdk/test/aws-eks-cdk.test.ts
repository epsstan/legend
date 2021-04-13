import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import {LegendStack} from "../lib/legend-stack";

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new LegendStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
