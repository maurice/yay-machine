/*
 * Imaginary external hardware interface
 */

export interface HardwareInterface {
  /**
   * Put head to tape; start showing picture
   */
  engageHead(): void;
  /**
   * Remove head from tape; show black screen
   */
  disengageHead(): void;
  /**
   * Start the motor spinning
   */
  startMotor(direction: "forward" | "backward", speed: number): void;
  /**
   * Stop the motor spinning
   */
  stopMotor(): void;
  /**
   * Get the current position, 0..1
   */
  getPosition(): number;
  /**
   * Listen for lifecycle events
   * - end - the tape
   */
  on(name: "end" | "start", callback: () => void): () => void;
}
