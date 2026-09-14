// ─────────────────────────────────────────────────────────────────────────
// audioController.js
//
// Everything related to playing sound and haptic feedback for a segment
// lives in this file. This is the audio/haptics counterpart to
// segmentation.js — SuperImage.js just tells it "play segment X" and
// "stop", and it owns all the Player/timer/haptic bookkeeping.
//
// See docs/CODE_OVERVIEW.md for the full picture of how this fits
// together with the rest of the app.
// ─────────────────────────────────────────────────────────────────────────

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Player } from '@react-native-community/audio-toolkit';
import { Vibration } from 'react-native';

export default class AudioController {
  /**
   * @param {object} imageConfig - per-image config, keyed by segment id,
   *        each value like { sound, volume, color, haptic, switchPlayer }.
   *        Same object reference as SuperImage.imageConfig — this class
   *        will add a default entry for segment "-1" onto it the same way
   *        the original code did.
   * @param {number} initialVolume - fallback volume when a segment doesn't specify one
   */
  constructor(imageConfig, initialVolume) {
    this.imageConfig = imageConfig;
    this.initialVolume = initialVolume;

    this.players = {};
    // segmentRecords holds the full config per segment (sound, haptic, touch count, etc.)
    this.segmentRecords = new Map();

    // We prepare all audio players async, so we track how many are still loading.
    // Once pendingPrepares hits 0, we know everything is ready.
    this.pendingPrepares = 0;
    this.onAllPlayersReady = null;

    this.isPlaying = false;
    this.switchInterval = 5000;

    this.activeSegment = null;
    this.activePlayer = null;
    this.lastSegment = null;
  }

  /**
   * setCompletionCallback
   * Call this if you need to do something once all audio is loaded.
   * If everything's already ready by the time you call this, it fires immediately.
   *
   * @param {function} callback
   */
  setCompletionCallback(callback) {
    this.onAllPlayersReady = callback;
    if (this.pendingPrepares === 0) {
      callback();
      this.onAllPlayersReady = null;
    }
  }

  /**
   * init
   * Builds a Player for every segment in imageConfig that has a sound URL,
   * and starts preparing them all. Call setCompletionCallback() to be
   * notified once every player has finished preparing.
   */
  init() {
    const imageConfig = this.imageConfig;
    if (!imageConfig || Object.keys(imageConfig).length === 0) {
      console.warn(`No ironicConfig found for title`);
      return;
    }

    // Segment -1 means the user is touching outside the image.
    // Give it a default sound if the config doesn't define one.
    if (!imageConfig['-1']) {
      this.imageConfig['-1'] = {
        sound: "https://sgouros.com/stellasonos/samples/piano/E3.mp3",
        volume: this.initialVolume,
        color: "#000000",
        haptic: { type: "haptic", spec: "light" },
      };
    }

    this.pendingPrepares = 0;

    for (let segmentKey in imageConfig) {
      if (!imageConfig.hasOwnProperty(segmentKey)) continue;

      const segmentConfig = imageConfig[segmentKey];
      const { sound: soundUrl, volume } = segmentConfig;

      // Store everything from the config plus a touch counter we'll increment later
      this.segmentRecords.set(segmentKey, { ...segmentConfig, count: 0 });

      if (!soundUrl) continue;

      try {
        const newPlayer = new Player(soundUrl, {
          autoDestroy: false,
          continuesToPlayInBackground: false,
        });

        // Android can sometimes return a bad player object, so double-check before using it
        if (!newPlayer || typeof newPlayer.prepare !== 'function') {
          console.error(`Player creation failed for segment ${segmentKey}: object is null or invalid.`);
          continue;
        }

        this.players[segmentKey] = newPlayer;
        this.pendingPrepares++;

        // prepare() is async — the player isn't usable until this callback fires
        newPlayer.prepare((err) => {
          if (!err) {
            newPlayer.volume = volume || this.initialVolume;
            console.log(`Player for segment ${segmentKey} prepared successfully`);
          } else {
            console.error(`Error preparing player for segment ${segmentKey}:`, err);
          }

          // Tick down the counter; fire the ready callback once the last player is done
          this.pendingPrepares--;
          if (this.pendingPrepares === 0 && this.onAllPlayersReady) {
            this.onAllPlayersReady();
            this.onAllPlayersReady = null;
          }
        });
      } catch (error) {
        console.error(`Fatal error during player setup for segment ${segmentKey}:`, error);
      }
    }

    // Edge case: config exists but none of the segments had a sound URL
    if (this.pendingPrepares === 0 && this.onAllPlayersReady) {
      this.onAllPlayersReady();
      this.onAllPlayersReady = null;
    }
  }

  /**
   * getSegmentInfo
   * @param {string|number} segmentKey
   * @returns {object|null} the stored config for that segment, or null
   */
  getSegmentInfo(segmentKey) {
    if (segmentKey === null || segmentKey === undefined) return null;
    return this.segmentRecords.get(segmentKey.toString()) || null;
  }

  /**
   * playSegment
   * Plays the sound (and triggers the haptic) configured for the given segment.
   * Stops whatever was previously playing first. If the same segment is
   * touched again while it's already playing, restarts it instead of
   * re-triggering everything from scratch.
   *
   * @param {string} segmentKey
   */
  playSegment(segmentKey) {
    const segmentInfo = this.segmentRecords.get(segmentKey);

    // Keep a running count of how many times each segment has been touched (shown in the info box)
    if (segmentInfo) {
      segmentInfo.count = (segmentInfo.count || 0) + 1;
      this.segmentRecords.set(segmentKey, segmentInfo);
    }

    // Don't retrigger if the finger is still on the same segment as last time
    if (segmentKey === this.lastSegment) return;
    this.lastSegment = segmentKey;

    if (!this.players[segmentKey]) {
      console.log(`No audio player found for segment ${segmentKey}. Checking for haptic...`);
      // No sound, but we still fall through to trigger haptic feedback below
    }

    // If the user comes back to the same segment that's already playing, restart it from the top
    if (this.activeSegment === segmentKey) {
      this.restartCurrent();
      return;
    }

    this.stop(() => {
      this.activePlayer = this.players[segmentKey];
      this.activeSegment = segmentKey;

      const segmentConfig = this.imageConfig[segmentKey];
      if (!segmentConfig) {
        console.log(`No config found for segment ${segmentKey}`);
        return;
      }

      // Trigger haptic first — it should fire even if the audio fails
      if (segmentConfig.haptic) this.triggerHaptic(segmentConfig.haptic);

      if (this.activePlayer) {
        // Only play if the player has finished preparing — otherwise the audio toolkit will throw
        if (this.activePlayer.isPrepared) {
          this.activePlayer.play((err) => {
            if (err) {
              console.error(`Error playing sound for segment ${segmentKey}:`, err);
              return;
            }
            this.isPlaying = true;
            if (segmentConfig.switchPlayer) this.scheduleSwitch();
          });
        } else {
          // Player is still loading (slow network?). Nothing we can do but skip this touch.
          console.warn(`Player for segment ${segmentKey} is not prepared yet. Skipping play.`);
        }
      }
    });
  }

  /**
   * restartCurrent
   * Stops and immediately replays whatever's currently active, from the top.
   */
  restartCurrent() {
    if (this.activePlayer && typeof this.activePlayer.stop === 'function') {
      this.activePlayer.stop(() => {
        if (this.activePlayer && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play((err) => {
            if (err) {
              console.error('Error restarting sound:', err);
            } else {
              this.isPlaying = true;
            }
          });
        }
      });
    }
  }

  /**
   * switchPlayer
   * Restarts the currently-active player. Used by scheduleSwitch() for
   * segments configured with `switchPlayer: true`, to periodically retrigger
   * playback (e.g. for looping cues).
   */
  switchPlayer() {
    if (this.isPlaying && this.activePlayer?.isPlaying && typeof this.activePlayer.stop === 'function') {
      this.activePlayer.stop();
      if (typeof this.activePlayer.play === 'function') {
        this.activePlayer.play();
      }
    }
  }

  /**
   * scheduleSwitch
   * Sets a repeating timer (every `switchInterval` ms) that calls switchPlayer()
   * for as long as something is still playing.
   */
  scheduleSwitch() {
    clearTimeout(this.switchTimer);
    this.switchTimer = setTimeout(() => {
      this.switchPlayer();
      if (this.isPlaying) this.scheduleSwitch();
    }, this.switchInterval);
  }

  /**
   * stop
   * Stops whatever's currently playing (if anything) and clears playback state.
   *
   * @param {function} [callback] - called once stopping is complete
   */
  stop(callback) {
    this.isPlaying = false;
    this.lastSegment = null;
    clearTimeout(this.switchTimer);

    if (this.activePlayer && typeof this.activePlayer.stop === 'function') {
      if (this.activePlayer.isPlaying) {
        this.activePlayer.stop(() => {
          this.activePlayer = null;
          this.activeSegment = null;
          if (callback) callback();
        });
      } else {
        // Player exists but isn't currently playing — just clear it and move on
        this.activePlayer = null;
        this.activeSegment = null;
        if (callback) callback();
      }
    } else {
      // No active player at all — nothing to stop, just run the callback
      this.activePlayer = null;
      this.activeSegment = null;
      if (callback) callback();
    }
  }

  /**
   * updateVolume
   * @param {string} segmentKey
   * @param {number} newVolume
   */
  updateVolume(segmentKey, newVolume) {
    if (this.players[segmentKey]) this.players[segmentKey].volume = newVolume;
  }

  /**
   * triggerHaptic
   * @param {{type: 'haptic'|'vibration', spec: any}} hapticConfig
   */
  triggerHaptic(hapticConfig) {
    if (!hapticConfig) return;
    try {
      if (hapticConfig.type === "haptic") {
        ReactNativeHapticFeedback.trigger(hapticConfig.spec, { enableVibrateFallback: true });
      } else if (hapticConfig.type === "vibration") {
        Vibration.vibrate(hapticConfig.spec);
      }
    } catch (error) {
      console.error('Haptic error:', error);
    }
  }

  /**
   * destroy
   * Tears down every player and clears all playback state. Call this when
   * the owning SuperImage is no longer needed (e.g. on screen unmount).
   */
  destroy() {
    Object.values(this.players).forEach(player => {
      if (player && typeof player.destroy === 'function') {
        player?.stop();
        player?.destroy();
      }
    });
    clearTimeout(this.switchTimer);
    this.activeSegment = null;
    this.activePlayer = null;
    this.isPlaying = false;
    this.lastSegment = null;
    this.onAllPlayersReady = null;
  }
}