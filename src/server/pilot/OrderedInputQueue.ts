/** Preserve command ordering while replacing adjacent unsent movement samples. */
export class OrderedInputQueue<T> {
  private pending: { value: T; movement: boolean }[] = [];
  private flushing = false;
  private failed = false;
  constructor(private send: (value: T) => Promise<void>, private onFailure: () => void) {}
  isFailed(): boolean { return this.failed; }
  push(value: T, movement = false): void {
    if (this.failed) return;
    const tail = this.pending.at(-1);
    if (movement && tail?.movement) tail.value = value;
    else if (this.pending.length < 128) this.pending.push({ value, movement });
    else { this.failed = true; this.onFailure(); return; }
    void this.flush();
  }
  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.pending.length) await this.send(this.pending.shift()!.value);
    } catch {
      this.failed = true;
      this.pending = [];
      this.onFailure();
    } finally { this.flushing = false; }
  }
}
