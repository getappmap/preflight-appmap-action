import {ChildProcess, exec, ExecOptions} from 'child_process';
import log, {LogLevel} from './log';
import verbose from './verbose';

export type Command = {
  cmd: string;
  options?: ExecOptions;
};

export function executeCommand(
  cmd: string | Command,
  printCommand = verbose(),
  printStdout = verbose(),
  printStderr = verbose()
): Promise<string> {
  let command: ChildProcess;
  let commandString: string;
  if (typeof cmd === 'string') {
    commandString = cmd;
    command = exec(cmd);
  } else {
    commandString = cmd.cmd;
    command = exec(cmd.cmd, cmd.options || {});
  }
  if (printCommand) console.log(commandString);
  const result: string[] = [];
  const stderr: string[] = [];
  if (command.stdout) {
    command.stdout.addListener('data', data => {
      if (printStdout) log(LogLevel.Debug, data);
      result.push(data);
    });
  }
  if (command.stderr) {
    command.stderr.addListener('data', data => {
      if (printStderr) log(LogLevel.Debug, data);
      stderr.push(data);
    });
  }
  return new Promise<string>((resolve, reject) => {
    command.addListener('exit', (code, signal) => {
      if (signal || code === 0) {
        if (signal)
          log(
            LogLevel.Warn,
            `Command "${commandString}" killed by signal ${signal}, exited with code ${code}`
          );
        resolve(result.join(''));
      } else {
        log(LogLevel.Warn, `Command "${commandString}" exited with failure code ${code}`);
        log(LogLevel.Warn, stderr.join(''));
        log(LogLevel.Warn, result.join(''));

        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}
