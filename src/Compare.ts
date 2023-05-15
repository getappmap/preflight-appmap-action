import {glob} from 'glob';
import {join} from 'path';
import ArtifactStore from './ArtifactStore';
import {executeCommand} from './executeCommand';
import log, {LogLevel} from './log';
import verbose from './verbose';

export default class Compare {
  public appmapCommand = `strace -e 'trace=!all' node /home/runner/work/appmap-server/appmap-js/packages/cli/built/cli.js`;
  public sourceDir?: string;
  public outputDir?: string;

  constructor(
    public artifactStore: ArtifactStore,
    public baseRevision: string,
    public headRevision: string
  ) {}

  async compare() {
    const outputDir =
      this.outputDir || `.appmap/change-report/${this.baseRevision}-${this.headRevision}`;

    log(
      LogLevel.Info,
      `Comparing base revision ${this.baseRevision} with head revision ${this.headRevision}`
    );
    log(LogLevel.Debug, `Report output directory is ${outputDir}`);

    let cmd = `${this.appmapCommand} compare --base-revision ${this.baseRevision} --head-revision ${this.headRevision} --clobber-output-dir=true`;
    if (verbose()) cmd += ' --verbose';
    if (this.outputDir) cmd += ` --output-dir ${outputDir}`;
    if (this.sourceDir) cmd += ` --source-dir ${this.sourceDir}`;
    await executeCommand(cmd);

    const reportFile = `appmap-preflight-${this.baseRevision}-${this.headRevision}.tar.gz`;
    const dir = process.cwd();
    process.chdir(outputDir);
    try {
      await executeCommand(`tar -czf ${reportFile} *`);
    } finally {
      process.chdir(dir);
    }

    log(LogLevel.Info, `Storing comparison report ${reportFile}`);
    await this.artifactStore.uploadArtifact(reportFile, [join(outputDir, reportFile)]);
  }
}
