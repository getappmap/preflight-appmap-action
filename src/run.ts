import Compare from './Compare';
import Restore from './Restore';
import {executeCommand} from './executeCommand';
import {mkdir} from 'fs/promises';
import {join} from 'path';
import Archiver from './Archiver';
import ArtifactStore from './ArtifactStore';
import {CommandOptions} from './CommandOptions';
import {existsSync} from 'fs';
import MarkdownReport from './MarkdownReport';
import assert from 'assert';

export default async function run(
  artifactStore: ArtifactStore,
  options: CommandOptions
): Promise<{outputDir: string; reportFile: string}> {
  const baseRevision = (await executeCommand(`git rev-parse ${options.baseRef}`)).trim();
  const headRevision = (await executeCommand(`git rev-parse ${options.headRef}`)).trim();

  const outputDir = `.appmap/change-report/${baseRevision}-${headRevision}`;
  // if (existsSync(outputDir))
  //   throw new Error(
  //     `Output directory ${outputDir} already exists. Please remove it and try again.`
  //   );
  await mkdir(outputDir, {recursive: true});

  // const archiver = new Archiver(artifactStore, headRevision);
  // if (options.appmapCommand) archiver.appmapCommand = options.appmapCommand;
  // const archiveResult = await archiver.archive();
  // await archiver.unpack(archiveResult.archiveFile, join(outputDir, 'head'));

  // Restore the base revision AppMaps into change-report/base.
  const restorer = new Restore(baseRevision, join(outputDir, 'base'));
  if (options.githubToken) restorer.githubToken = options.githubToken;
  if (options.appmapCommand) restorer.appmapCommand = options.appmapCommand;
  if (options.githubRepo) restorer.repository = options.githubRepo;
  await restorer.restore();

  const comparer = new Compare(artifactStore, baseRevision, headRevision);
  comparer.outputDir = outputDir;
  if (options.appmapCommand) comparer.appmapCommand = options.appmapCommand;
  if (options.sourceDir) comparer.sourceDir = options.sourceDir;
  await comparer.compare();

  const reportFile = await summarizeChanges(outputDir);
  return {outputDir, reportFile};
}

export async function summarizeChanges(outputDir: string) {
  const reporter = new MarkdownReport(outputDir);
  const reportFile = join(outputDir, 'report.md');
  await reporter.generateReport();
  assert(existsSync(reportFile), `${reportFile} does not exist`);
  return reportFile;
}
