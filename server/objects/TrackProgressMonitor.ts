/** @param trackIndex - The index of the track that started. */
type TrackStartedCallback = (trackIndex: number) => void

/**
 * @param trackIndex - The index of the current track.
 * @param progressInTrack - The current track progress in percent.
 * @param totalProgress - The total progress in percent.
 */
type ProgressCallback = (trackIndex: number, progressInTrack: number, totalProgress: number) => void

/** @param trackIndex - The index of the track that finished. */
type TrackFinishedCallback = (trackIndex: number) => void

class TrackProgressMonitor {
  trackDurations: number[]
  totalDuration: number
  trackStartedCallback: TrackStartedCallback
  progressCallback: ProgressCallback
  trackFinishedCallback: TrackFinishedCallback
  currentTrackIndex: number
  cummulativeProgress: number
  currentTrackPercentage: number
  /** Set on the first update() call */
  currentTrackProgress?: number
  numTracks: number
  allTracksFinished: boolean

  /**
   * Creates a new TrackProgressMonitor.
   * @param trackDurations - The durations of the tracks in seconds.
   * @param trackStartedCallback - The callback to call when a track starts.
   * @param progressCallback - The callback to call when progress is updated.
   * @param trackFinishedCallback - The callback to call when a track finishes.
   */
  constructor(trackDurations: number[], trackStartedCallback: TrackStartedCallback, progressCallback: ProgressCallback, trackFinishedCallback: TrackFinishedCallback) {
    this.trackDurations = trackDurations
    this.totalDuration = trackDurations.reduce((total, duration) => total + duration, 0)
    this.trackStartedCallback = trackStartedCallback
    this.progressCallback = progressCallback
    this.trackFinishedCallback = trackFinishedCallback
    this.currentTrackIndex = -1
    this.cummulativeProgress = 0
    this.currentTrackPercentage = 0
    this.numTracks = this.trackDurations.length
    this.allTracksFinished = false
    this.#moveToNextTrack()
  }

  #outsideCurrentTrack(progress: number): boolean {
    this.currentTrackProgress = progress - this.cummulativeProgress
    return this.currentTrackProgress >= this.currentTrackPercentage
  }

  #moveToNextTrack() {
    if (this.currentTrackIndex >= 0) this.#trackFinished()
    this.currentTrackIndex++
    this.cummulativeProgress += this.currentTrackPercentage
    if (this.currentTrackIndex >= this.numTracks) {
      this.allTracksFinished = true
      return
    }
    this.currentTrackPercentage = (this.trackDurations[this.currentTrackIndex] / this.totalDuration) * 100
    this.#trackStarted()
  }

  #trackStarted() {
    this.trackStartedCallback(this.currentTrackIndex)
  }

  #progressUpdated(totalProgress: number): void {
    // currentTrackProgress is set by #outsideCurrentTrack(), which update() always calls first
    const progressInTrack = ((this.currentTrackProgress as number) / this.currentTrackPercentage) * 100
    this.progressCallback(this.currentTrackIndex, progressInTrack, totalProgress)
  }

  #trackFinished() {
    this.trackFinishedCallback(this.currentTrackIndex)
  }

  /**
   * Updates the track progress based on the total progress.
   * @param totalProgress - The total progress in percent.
   */
  update(totalProgress: number): void {
    while (this.#outsideCurrentTrack(totalProgress) && !this.allTracksFinished) this.#moveToNextTrack()
    if (!this.allTracksFinished) this.#progressUpdated(totalProgress)
  }

  /**
   * Finish the track progress monitoring.
   * Forces all remaining tracks to finish.
   */
  finish(): void {
    this.update(101)
  }
}
export = TrackProgressMonitor
