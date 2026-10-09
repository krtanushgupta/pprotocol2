/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InputScreen } from './components/InputScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { UnmissedAnalysis } from './types';

export default function App() {
  const [analysis, setAnalysis] = useState<UnmissedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async (transcript: string, useCloud: boolean = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, useCloud }),
      });

      const json = await response.json();

      if (json.success && json.data) {
        setAnalysis(json.data);
      } else {
        setErrorMessage(json.message || 'Could not analyze conversation. Please verify the input format.');
      }
    } catch (err: any) {
      setErrorMessage('A network error occurred while analyzing the conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen protocol-bg text-[#F4F5F7]">
      {analysis ? (
        <ResultsScreen analysis={analysis} onReset={handleReset} />
      ) : (
        <InputScreen
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
}
