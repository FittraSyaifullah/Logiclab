import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkerMessage, WorkerMessageType } from '@/worker/types';
import OpenSCADError from '@/lib/OpenSCADError';

export function useOpenSCAD() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<OpenSCADError | Error | undefined>();
  const [isError, setIsError] = useState(false);
  const [output, setOutput] = useState<Blob | undefined>();
  const workerRef = useRef<Worker | null>(null);

  const eventHandler = useCallback((event: MessageEvent) => {
    if (event.data.err) {
      setError(event.data.err);
      setIsError(true);
      setOutput(undefined);
    } else if (event.data.data.output) {
      const blob = new Blob([event.data.data.output], {
        type:
          event.data.data.fileType === 'stl' ? 'model/stl' : 'image/svg+xml',
      });
      setOutput(blob);
    }
    setIsCompiling(false);
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../worker/worker.ts', import.meta.url),
      { type: 'module' },
    );

    workerRef.current.addEventListener('message', eventHandler);

    return () => {
      workerRef.current?.terminate();
    };
  }, [eventHandler]);

  const compileScad = useCallback(
    async (code: string) => {
      setIsCompiling(true);
      setError(undefined);
      setIsError(false);

      // Reuse existing worker if available, only create new one if needed
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../worker/worker.ts', import.meta.url),
          { type: 'module' },
        );
        workerRef.current.addEventListener('message', eventHandler);
      }

      const message: WorkerMessage = {
        type: WorkerMessageType.PREVIEW,
        data: {
          code,
          params: [],
          fileType: 'stl',
        },
      };

      workerRef.current?.postMessage(message);
    },
    [eventHandler],
  );

  return {
    compileScad,
    isCompiling,
    output,
    error,
    isError,
  };
}
