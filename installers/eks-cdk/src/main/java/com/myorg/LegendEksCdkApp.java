package com.myorg;


import software.amazon.awscdk.core.App;

import java.util.Arrays;

public class LegendEksCdkApp {
    public static void main(final String[] args) {
        App app = new App();

        new LegendEksCdkStack(app, "LegendEksCdkStack");

        app.synth();
    }
}
