import {Command, executeCommand} from './executeCommand';
import verbose from './verbose';

export default class Restore {
  public repository?: string;
  public githubToken?: string;
  public appmapCommand = `strace -e 'trace=!all' node /home/runner/work/appmap-server/appmap-js/packages/cli/built/cli.js`;

  constructor(public revision: string, public outputDir: string) {}

  async restore() {
    let cmd = `${this.appmapCommand} restore --revision ${this.revision} --output-dir ${this.outputDir}`;
    if (verbose()) cmd += ' --verbose';
    let command: string | Command = cmd;
    if (this.repository) {
      if (!this.githubToken)
        throw new Error(`GitHub repository specified, but no GitHub token provided`);

      command = {
        cmd: cmd + ` --github-repo ${this.repository}`,
        options: {
          env: {...process.env, ...{GITHUB_TOKEN: this.githubToken}},
        },
      };
    }

    await executeCommand(command);
  }
}
