import {executeCommand} from './executeCommand';
import verbose from './verbose';

export default class MarkdownReport {
  public appmapCommand = 'strace -e 'trace=!all' node /home/runner/work/appmap-server/appmap-js/packages/cli/built/cli.js';

  constructor(public reportDir: string) {}

  async generateReport() {
    let cmd = `${this.appmapCommand} compare-report ${this.reportDir}`;
    if (verbose()) cmd += ' --verbose';
    await executeCommand(cmd);
  }
}
