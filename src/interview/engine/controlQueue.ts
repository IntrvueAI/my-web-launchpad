/** Bounded station controls waiting behind an in-flight model response. No browser dependencies. */
export type PendingControl = {
  action: "skip" | "time_up" | "switch_topic";
  stationIndex?: number;
  topic?: string;
  studentText?: string;
};
export class StationControlQueue {
  private pending: PendingControl[] = [];
  enqueue(control: PendingControl): void {
    if (control.action === "switch_topic") {
      this.pending = this.pending.filter(
        (item) => item.action !== "switch_topic",
      );
    } else if (
      this.pending.some(
        (item) =>
          item.action !== "switch_topic" &&
          item.stationIndex === control.stationIndex,
      )
    ) {
      return; // Repeated clicks and the bell must not advance the same station twice.
    }
    this.pending.push(control);
    this.pending = this.pending.slice(-8);
  }
  take(currentIndex?: number): PendingControl | undefined {
    while (this.pending.length) {
      const next = this.pending.shift()!;
      if (next.stationIndex === undefined || next.stationIndex === currentIndex)
        return next;
    }
    return undefined;
  }
  clear(): void {
    this.pending = [];
  }
}
