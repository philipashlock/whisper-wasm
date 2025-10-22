import React, { useState, useEffect } from 'react';
import { WhisperWasmService } from '../../src/index';

interface WasmSupportCheckProps {
  whisperService: WhisperWasmService;
  onSupportCheck: (supported: boolean | null) => void;
}

export const WasmSupportCheck: React.FC<WasmSupportCheckProps> = ({
  whisperService,
  onSupportCheck,
}) => {
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkWasmSupport = async () => {
    setLoading(true);
    try {
      const supported = await whisperService.checkWasmSupport();
      setWasmSupported(supported);
      onSupportCheck(supported);
    } catch (error) {
      console.error('Error checking WASM support:', error);
      setWasmSupported(false);
      onSupportCheck(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWasmSupport();
  }, []);

  return (
    <div className="section">
      <h2>1. Check WASM Support</h2>
      <button onClick={checkWasmSupport} disabled={loading}>
        {loading ? 'Checking...' : 'Check WASM Support'}
      </button>
      {wasmSupported !== null && (
        <div className={wasmSupported ? 'status-success' : 'status-danger'}>
          WASM {wasmSupported ? 'is supported' : 'is not supported'}
        </div>
      )}
    </div>
  );
};
