import { Injectable, Logger } from '@nestjs/common';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

import { loadEnv } from '../../../config/env.js';

/**
 * Reads the backup bucket. `PH-0.28`.
 *
 * `BR-1599` — no vendor SDK is imported outside `shared/providers`, which is why the only
 * `@aws-sdk` import in this repository is here. `FEAT-220`'s `StorageProvider` will live alongside
 * it in Phase 1; this is that boundary arriving at its first use rather than being anticipated
 * (`BR-1815`).
 *
 * ## Why it reads R2 rather than a local marker file
 *
 * The obvious implementation writes a timestamp to disk when the backup finishes and reads it back
 * here. That reports **what a script believed**, not what exists at the destination — and the
 * failure this indicator has to catch is precisely a backup that ran, reported success, and did not
 * land. Listing the bucket answers the only question worth asking: **is there a recent object?**
 */
@Injectable()
export class BackupStorageProvider {
  private readonly logger = new Logger(BackupStorageProvider.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor() {
    const env = loadEnv();
    this.bucket = env.R2_BUCKET ?? '';
    this.prefix = env.BACKUP_PREFIX;

    /**
     * Null when unconfigured, and that is a distinct state from "broken".
     *
     * In development there is no bucket and no credentials, and an API that refused to boot for
     * want of a backup bucket would be unusable locally. `configured()` lets the indicator report
     * honestly — see the note there about why it must not report `ok`.
     */
    this.client =
      env.R2_ENDPOINT === undefined ||
      env.R2_BUCKET === undefined ||
      env.R2_ACCESS_KEY_ID === undefined ||
      env.R2_SECRET_ACCESS_KEY === undefined
        ? null
        : new S3Client({
            // R2 is S3-compatible. `auto` because R2 has no meaningful region and the SDK insists
            // on one; the endpoint is what selects the account.
            region: 'auto',
            endpoint: env.R2_ENDPOINT,
            credentials: {
              accessKeyId: env.R2_ACCESS_KEY_ID,
              secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
          });
  }

  configured(): boolean {
    return this.client !== null;
  }

  /**
   * The newest object's timestamp under a prefix, or `null` if the prefix is empty.
   *
   * A fresh `ListObjectsV2Command` per call, on a stateless client. That is the `PH-0.30` lesson
   * applied rather than restated: `ioredis` latched into a permanent error because a retry policy
   * gave up for the process's lifetime, so this holds **no connection and no failure state** —
   * every call is a new request, and a transient outage cannot become a permanent verdict. Proven
   * by the indicator's own recovery test.
   */
  async newestObjectAt(prefix: string): Promise<Date | null> {
    if (this.client === null) {
      throw new Error('backup storage is not configured');
    }

    const response = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );

    const stamps = (response.Contents ?? [])
      .map((object) => object.LastModified)
      .filter((date): date is Date => date instanceof Date);

    if (stamps.length === 0) return null;

    return stamps.reduce((newest, date) => (date > newest ? date : newest));
  }

  /** The dump prefix, e.g. `daily/`. */
  dumpPrefix(): string {
    return `${this.prefix}/`;
  }

  /** Where `restore-verify.sh` writes its marker. */
  verifyPrefix(): string {
    return 'verify/';
  }

  warn(message: string): void {
    this.logger.warn(message);
  }
}
