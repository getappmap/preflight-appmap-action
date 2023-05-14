import {existsSync} from 'fs';
import {basename, dirname, join} from 'path';
import ArtifactStore from './ArtifactStore';
import {executeCommand} from './executeCommand';
import log, {LogLevel} from './log';
import verbose from './verbose';

export default class Archiver {
  public appmapCommand = 'node /home/runner/work/appmap-server/appmap-js/packages/cli/built/cli.js';
  public archiveBranch = 'appmap-archive';

  constructor(public artifactStore: ArtifactStore, public revision: string) {}

  async archive(): Promise<{archiveFile: string}> {
    {
      const existingArchives = [
        join('.appmap', 'archive', 'full', `${this.revision}.tar`),
        join('.appmap', 'archive', 'incremental', `${this.revision}.tar`),
      ]
        .filter(file => existsSync(file))
        // With alphabetical sort, 'full' archive will be preferred to 'incremental'
        .sort((a, b) => a.localeCompare(b));
      const existingArchive = existingArchives.shift();
      if (existingArchive) {
        log(LogLevel.Info, `Using existing AppMap archive ${existingArchive}`);
        return {archiveFile: existingArchive};
      }
    }

    log(LogLevel.Info, `Archiving AppMaps from ${process.cwd()}`);

    let archiveCommand = `${this.appmapCommand} archive --revision ${this.revision}`;
    if (verbose()) archiveCommand += ' --verbose';
    await executeCommand(archiveCommand);

    const archiveFiles = [
      join('.appmap', 'archive', 'full', `${this.revision}.tar`),
      join('.appmap', 'archive', 'incremental', `${this.revision}.tar`),
    ]
      .filter(file => existsSync(file))
      // With alphabetical sort, 'full' archive will be preferred to 'incremental'
      .sort((a, b) => a.localeCompare(b));

    if (archiveFiles.length === 0) {
      throw new Error(`No AppMap archives found in ${process.cwd()}`);
    }
    if (archiveFiles.length > 1) {
      log(
        LogLevel.Warn,
        `Multiple AppMap archives found in ${process.cwd()}: ${archiveFiles.join(', ')}`
      );
    }

    const archiveFile = archiveFiles.shift()!;

    log(LogLevel.Debug, `Processing AppMap archive ${archiveFile}`);

    // e.g. .appmap/archive/full
    const dir = dirname(archiveFile);
    // e.g. appmap-archive-full
    const artifactPrefix = dir.replace(/\//g, '-').replace(/\./g, '');
    const [sha] = basename(archiveFile).split('.');
    const artifactName = `${artifactPrefix}_${sha}.tar`;

    await this.artifactStore.uploadArtifact(artifactName, [archiveFile]);

    return {archiveFile};
  }

  async unpack(archiveFile: string, directory: string) {
    log(LogLevel.Info, `Restoring AppMap archive ${archiveFile} into ${directory}`);

    let restoreCommand = `${this.appmapCommand} restore --exact --revision ${this.revision} --output-dir ${directory}`;
    if (verbose()) restoreCommand += ' --verbose';
    await executeCommand(restoreCommand);
  }
}
