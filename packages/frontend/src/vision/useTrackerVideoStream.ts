import { useEffect, useState } from 'react';
import { browserTrackingSource } from './browserTrackingSource';

/**
 * The MediaStream the tracker currently owns — null when not running.
 * The tracker is imperative (creates its video element + stream outside
 * React's lifecycle), so this polls and reports stream *identity* changes.
 * Consumers bind `video.srcObject = stream` when it changes — identity is
 * the correct re-attach trigger: a tracker restart swaps the stream object,
 * and a dead stream must be released, not latched.
 */
export function useTrackerVideoStream(enabled = true): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStream(null);
      return;
    }
    let last: MediaStream | null = null;
    const check = () => {
      const next =
        (browserTrackingSource.videoElement?.srcObject as MediaStream | null) ?? null;
      if (next !== last) {
        last = next;
        setStream(next);
      }
    };
    check();
    const t = setInterval(check, 200);
    return () => clearInterval(t);
  }, [enabled]);

  return stream;
}
