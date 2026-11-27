import { writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

type CommitSnapshot = (file: string, data: string) => Promise<void>;
interface Waiter { revision: number; resolve: () => void; reject: (error: unknown) => void }

async function commitSnapshot(file: string, data: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let published = false;
  let failure: unknown;
  try {
    await writeFile(temporary, data, { mode: 0o600 });
    await rename(temporary, file);
    published = true;
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (!published) {
      try { await rm(temporary, { force: true }); }
      catch (cleanup) { throw new AggregateError([failure, cleanup], '快照保存及临时文件清理失败'); }
    }
  }
}

/** 合并磁盘快照，不合并调用者的可靠提交边界。目标目录须由调用方创建并校验。 */
export class SnapshotWriter {
  private revision = 0;
  private waiters: Waiter[] = [];
  private running: Promise<void> | null = null;
  private failure: unknown;

  constructor(
    readonly file: string,
    private readonly snapshot: () => unknown,
    private readonly commit: CommitSnapshot = commitSnapshot,
  ) {}

  get error(): unknown { return this.failure; }

  save(): Promise<void> {
    const revision = ++this.revision;
    this.failure = undefined;
    const operation = new Promise<void>((resolve, reject) => this.waiters.push({ revision, resolve, reject }));
    this.start();
    return operation;
  }

  async flush(): Promise<void> {
    while (this.running) await this.running;
    if (this.failure !== undefined) throw this.failure;
  }

  private start(): void {
    if (this.running) return;
    // 同步登记的多个请求共用下一次微任务，尚未开始写入时不序列化中间状态。
    this.running = Promise.resolve().then(() => this.drain()).finally(() => {
      this.running = null;
      // 失败回调也可能立即申请重试；不能把新等待者留在已结束的循环后面。
      if (this.waiters.length) this.start();
    });
  }

  private async drain(): Promise<void> {
    while (this.waiters.length) {
      const revision = this.revision;
      try {
        const data = JSON.stringify(this.snapshot(), null, 2);
        if (data === undefined) throw new Error('快照内容无法序列化');
        await this.commit(this.file, data);
      } catch (error) {
        this.failure = error;
        const failed = this.waiters;
        this.waiters = [];
        for (const waiter of failed) waiter.reject(error);
        return;
      }
      const saved = this.waiters.filter((waiter) => waiter.revision <= revision);
      this.waiters = this.waiters.filter((waiter) => waiter.revision > revision);
      for (const waiter of saved) waiter.resolve();
    }
  }
}
