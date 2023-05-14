import * as core from '@actions/core';
import {ArgumentParser} from 'argparse';

import {ActionLogger, setLogger} from './log';
import verbose from './verbose';
import assert from 'assert';
import {DirectoryArtifactStore} from './DirectoryArtifactStore';
import run from './run';
import {GitHubArtifactStore} from './GitHubArtifactStore';
import {cp} from 'fs/promises';

async function runInGitHub(): Promise<void> {
  verbose(core.getBooleanInput('verbose'));
  setLogger(new ActionLogger());

  const baseRevisionArg = core.getInput('base-revision');
  const headRevisionArg = core.getInput('head-revision');
  const sourceDir = core.getInput('source-dir');

  const baseRef = baseRevisionArg || process.env.GITHUB_BASE_REF;
  if (!baseRef)
    throw new Error(
      'base-revision argument must be provided, or GITHUB_BASE_REF must be available from GitHub (https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables).'
    );

  const headRef = headRevisionArg || process.env.GITHUB_SHA;
  const githubToken = core.getInput('github-token');
  const githubRepo = process.env.GITHUB_REPOSITORY;

  assert(baseRef, 'baseRef is undefined');
  assert(headRef, 'headRef is undefined');

  // const baseURL = [process.env.GITHUB_SERVER_URL, githubRepo, 'tree', baseRef].join('/');

  const {reportFile} = await run(new GitHubArtifactStore(), {
    baseRef,
    headRef,
    sourceDir,
    githubRepo,
    githubToken,
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    await cp(reportFile, process.env.GITHUB_STEP_SUMMARY);
  }
}

async function runLocally() {
  const parser = new ArgumentParser({
    description: 'Preflight command',
  });
  parser.add_argument('-v', '--verbose');
  parser.add_argument('-d', '--directory', {help: 'Program working directory'});
  parser.add_argument('--appmap-command', {
    default: 'node /home/runner/work/appmap-server/appmap-js/packages/cli/built/cli.js',
  });
  parser.add_argument('--base-revision', {required: true});
  parser.add_argument('--head-revision', {required: true});
  parser.add_argument('--source-dir');
  parser.add_argument('--github-token');
  parser.add_argument('--github-repo');
  parser.add_argument('--artifact-dir', {default: '.appmap/artifacts'});

  const options = parser.parse_args();

  verbose(options.verbose === 'true' || options.verbose === true);
  const artifactDir = options.artifact_dir;
  assert(artifactDir);
  const directory = options.directory;
  if (directory) process.chdir(directory);

  await run(new DirectoryArtifactStore(artifactDir), {
    appmapCommand: options.appmap_command,
    baseRef: options.base_revision,
    headRef: options.head_revision,
    sourceDir: options.source_dir,
    githubToken: options.github_token || process.env.GITHUB_TOKEN,
    githubRepo: options.github_repo,
  });
}

if (require.main === module) {
  if (process.env.CI) runInGitHub();
  else runLocally();
}
