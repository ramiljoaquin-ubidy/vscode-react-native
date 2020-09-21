// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as semver from "semver";
import { GeneralMobilePlatform, MobilePlatformDeps } from "../generalMobilePlatform";
import { ImacOSRunOptions, PlatformType } from "../launchArgs";
import { OutputVerifier, PatternToFailure } from "../../common/outputVerifier";
import { TelemetryHelper } from "../../common/telemetryHelper";
import { CommandExecutor } from "../../common/commandExecutor";
import { InternalErrorCode } from "../../common/error/internalErrorCode";

/**
 * macOS specific platform implementation for debugging RN applications.
 */
export class macOSPlatform extends GeneralMobilePlatform {
    protected static NO_PACKAGER_VERSION = "0.53.0";

    private static SUCCESS_PATTERNS = [
        "Launching app",
    ];
    private static FAILURE_PATTERNS: PatternToFailure[] = [
        {
            pattern: "Unrecognized command 'run-macos'",
            errorCode: InternalErrorCode.WinRNMPPluginIsNotInstalled,
        },
    ];

    constructor(protected runOptions: ImacOSRunOptions, platformDeps: MobilePlatformDeps = {}) {
        super(runOptions, platformDeps);
    }

    public runApp(): Promise<void> {
        let extProps = {
            platform: {
                value: PlatformType.macOS,
                isPii: false,
            },
        };

        extProps = TelemetryHelper.addPropertyToTelemetryProperties(this.runOptions.reactNativeVersions.reactNativeVersion, "reactNativeVersion", extProps);
        extProps = TelemetryHelper.addPropertyToTelemetryProperties(this.runOptions.reactNativeVersions.reactNativemacOSVersion, "reactNativemacOSVersion", extProps);

        return TelemetryHelper.generate("macOSPlatform.runApp", extProps, () => {
            const env = GeneralMobilePlatform.getEnvArgument(process.env, this.runOptions.env, this.runOptions.envFile);

            if (!semver.valid(this.runOptions.reactNativeVersions.reactNativeVersion) /*Custom RN implementations should support this flag*/ || semver.gte(this.runOptions.reactNativeVersions.reactNativeVersion, macOSPlatform.NO_PACKAGER_VERSION)) {
                this.runArguments.push("--no-packager");
            }

            const runmacOSSpawn = new CommandExecutor(this.projectPath, this.logger).spawnReactCommand(`run-${this.platformName}`, this.runArguments, { env });
            return new OutputVerifier(() => Promise.resolve(macOSPlatform.SUCCESS_PATTERNS), () => Promise.resolve(macOSPlatform.FAILURE_PATTERNS), this.platformName)
                .process(runmacOSSpawn);
        });
    }

    public prewarmBundleCache(): Promise<void> {
        return this.packager.prewarmBundleCache(PlatformType.macOS);
    }

    public getRunArguments(): string[] {
        let runArguments: string[] = [];

        if (this.runOptions.runArguments && this.runOptions.runArguments.length > 0) {
            runArguments.push(...this.runOptions.runArguments);
        } else {
            let target = this.runOptions.target === macOSPlatform.simulatorString ? "" : this.runOptions.target;
            if (target) {
                runArguments.push(`--${target}`);
            }
        }

        return runArguments;
    }
}
