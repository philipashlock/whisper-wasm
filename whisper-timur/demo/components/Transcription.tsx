import React, { useState, useMemo } from 'react';
import { WhisperWasmService } from '../../src/index';
import { AudioHandler } from '../utils/AudioHandler';

interface TranscriptionSegment {
  text: string;
  timeStart: number;
  timeEnd: number;
}

interface TranscriptionProps {
  whisperService: WhisperWasmService;
  audioFile: File | null;
  modelLoaded: boolean;
}

export const Transcription: React.FC<TranscriptionProps> = ({
  whisperService,
  audioFile,
  modelLoaded,
}) => {
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const audioHandler = useMemo(() => new AudioHandler(), []);

  const msToTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const cancelTranscription = () => {
    if (abortController) {
      abortController.abort();
      setCanCancel(false);
      setLoading(false);
      setAbortController(null);
    }
  };

  const transcribeAudio = async () => {
    if (!modelLoaded || !audioFile) {
      return;
    }

    // Create new AbortController for this transcription
    const controller = new AbortController();
    setAbortController(controller);
    setCanCancel(true);
    setLoading(true);
    setTranscription(''); // Clear previous result

    try {
      await audioHandler.loadAudio(
        audioFile,
        // onProgress
        (message: string) => {
          if (controller.signal.aborted) return;
          console.log(message);
        },
        // onSuccess
        async (audioData: Float32Array, audioInfo: any) => {
          if (controller.signal.aborted) return;

          console.log('Audio processed:', audioInfo);
          try {
            const session = whisperService.createSession();
            const result = await session.streamimg(audioData, {
              language: 'ru',
              threads: 25,
              translate: false,
            });

            for await (const segment of result) {
              if (controller.signal.aborted) {
                throw new Error('Transcription cancelled');
              }
              setTranscription(
                (t) =>
                  t +
                  `[${msToTime(segment.timeStart)} --> ${msToTime(segment.timeEnd)}]: ${segment.text}` +
                  '\n',
              );
            }

            if (!controller.signal.aborted) {
              console.log('Transcription completed!');
            }
          } catch (error) {
            if ((error as Error).message === 'Transcription cancelled') {
              console.log('Transcription cancelled');
            } else {
              console.error('Transcription error:', error);
            }
          }
          setLoading(false);
          setCanCancel(false);
          setAbortController(null);
        },
        // onError
        (error: string) => {
          if (controller.signal.aborted) return;

          console.error('Audio processing error:', error);
          setLoading(false);
          setCanCancel(false);
          setAbortController(null);
        },
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Transcription cancelled');
      } else {
        console.error('Transcription error:', error);
      }
      setLoading(false);
      setCanCancel(false);
      setAbortController(null);
    }
  };

  return (
    <div className="section">
      <h2>4. Transcription</h2>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={transcribeAudio} disabled={loading || !modelLoaded || !audioFile}>
          {loading ? 'Processing...' : 'Transcribe'}
        </button>
        {canCancel && (
          <button onClick={cancelTranscription} style={{ marginLeft: '10px' }}>
            ❌ Cancel
          </button>
        )}
      </div>
      <div className="debug-info">
        Debug: modelLoaded={modelLoaded ? 'true' : 'false'}, audioFile=
        {audioFile ? 'true' : 'false'}, loading={loading ? 'true' : 'false'}, canCancel=
        {canCancel ? 'true' : 'false'}
      </div>
      {transcription && (
        <div style={{ marginTop: '10px' }}>
          <h3>Result:</h3>
          <textarea
            className="textarea"
            value={transcription}
            readOnly
            style={{ height: '100px', marginTop: '10px' }}
          />
        </div>
      )}
    </div>
  );
};
