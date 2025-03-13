"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";
import Visualizer from "./Visualizer";
import { analyzeTranscript } from "../utils/voiceCommands";
import CustomCommandSettings from "./CustomCommandSettings";
import { initializeOpenAI } from "../utils/llmProcessor";

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>(
    "Press spacebar and start speaking"
  );
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLLMEnabled, setIsLLMEnabled] = useState<boolean>(false);
  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<any>();
  const keepAliveInterval = useRef<any>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isProcessingRef = useRef<boolean>(false);  // To prevent multiple simultaneous processing

  useEffect(() => {
    setupMicrophone();
    
    // Initialize OpenAI with API key (in real app, handle this more securely)
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        initializeOpenAI(openaiApiKey);
        setIsLLMEnabled(true);
        console.log("LLM functionality enabled");
      } catch (error) {
        console.error("Failed to initialize OpenAI:", error);
        setIsLLMEnabled(false);
      }
    } else {
      console.log("OpenAI API key not found, LLM functionality disabled");
      setIsLLMEnabled(false);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-3",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX:
      // Prevent packetZero from being sent. If sent at size 0, the connection will close. 
      if (e.data.size > 0 && isTranscribing) {
        connection?.send(e.data);
      }
    };

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      console.log("thisCaption", thisCaption);
      if (thisCaption !== "") {
        console.log('thisCaption !== ""', thisCaption);
        setCaption(thisCaption);
        
        // Process voice commands when we have a final transcript
        if (isFinal && speechFinal && thisCaption.trim() && !isProcessingRef.current) {
          isProcessingRef.current = true;
          
          try {
            // Pass the LLM enabled flag to the analyzer
            const result = await analyzeTranscript(thisCaption, isLLMEnabled);
            
            if (result.actionTaken) {
              // Update UI to show the command was recognized
              const commandSource = result.source ? ` (via ${result.source})` : '';
              setLastCommand(`Executed: ${result.command}${commandSource} ${result.data ? JSON.stringify(result.data) : ''}`);
              
              // Optionally provide feedback in the caption
              if (result.command === 'open_website' && result.data?.website) {
                setCaption(`Command detected: Opening ${result.data.website}`);
              } else if (result.command === 'search' && result.data?.searchTerm) {
                setCaption(`Command detected: Searching for "${result.data.searchTerm}"`);
              } else {
                setCaption(`Command detected: ${result.command}`);
              }
            }
          } catch (error) {
            console.error("Error processing transcript:", error);
          } finally {
            isProcessingRef.current = false;
          }
        }
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption("Press spacebar and start speaking");
          setLastCommand(null);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      if (isTranscribing) {
        startMicrophone();
      }
    }

    return () => {
      // prettier-ignore
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, isTranscribing, isLLMEnabled]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  // Add keyboard event listeners for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key is spacebar and not in an input field
      if (e.code === 'Space' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); // Prevent page scrolling
        if (!isTranscribing) {
          handleTranscribeButtonDown();
          if (buttonRef.current) {
            buttonRef.current.classList.add('active');
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (isTranscribing) {
          handleTranscribeButtonUp();
          if (buttonRef.current) {
            buttonRef.current.classList.remove('active');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTranscribing]);

  const handleTranscribeButtonDown = () => {
    setIsTranscribing(true);
  };

  const handleTranscribeButtonUp = () => {
    setIsTranscribing(false);
    stopMicrophone();
    setCaption("Press spacebar and start speaking");
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            <div className="relative w-full h-full">
              {/* Visualizer and main content */}
              {microphone && <Visualizer microphone={microphone} />}
              
              {/* Centered transcription text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-2xl px-4 text-center">
                  {caption && (
                    <span className="bg-black/70 p-4 rounded-lg text-white text-xl inline-block">
                      {caption}
                    </span>
                  )}
                  
                  {/* Command feedback */}
                  {lastCommand && (
                    <div className="mt-4">
                      <span className="bg-green-800/70 p-2 rounded-lg text-white text-sm inline-block">
                        {lastCommand}
                      </span>
                    </div>
                  )}
                  
                  {/* LLM Status */}
                  <div className="mt-2">
                    <span className={`text-xs ${isLLMEnabled ? 'text-green-500' : 'text-yellow-500'}`}>
                      {isLLMEnabled ? 'LLM Enhanced Commands: Active ✓' : 'LLM Enhanced Commands: Disabled (API key not set)'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Help text for voice commands */}
              <div className="absolute top-6 left-6 bg-black/50 p-3 rounded-lg max-h-[80vh] overflow-y-auto">
                <h3 className="text-white text-sm font-bold mb-1">Voice Commands:</h3>
                
                <div className="mb-2">
                  <h4 className="text-white text-xs font-bold">Open Websites:</h4>
                  <ul className="text-gray-300 text-xs list-disc list-inside">
                    <li>"Open Netflix" - Opens Netflix in a new tab</li>
                    <li>"Open YouTube" - Opens YouTube in a new tab</li>
                    <li>"Open Google" - Opens Google in a new tab</li>
                    <li>Also try: Facebook, Twitter, Instagram, Amazon</li>
                  </ul>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-white text-xs font-bold">Search Web:</h4>
                  <ul className="text-gray-300 text-xs list-disc list-inside">
                    <li>"Search for cats" - Google search for cats</li>
                    <li>"Look up recipe for pasta" - Search for pasta recipes</li>
                    <li>"Find information about Mars" - Search for Mars</li>
                  </ul>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-white text-xs font-bold">Browser Controls:</h4>
                  <ul className="text-gray-300 text-xs list-disc list-inside">
                    <li>"Go back" - Navigate to previous page</li>
                    <li>"Go forward" - Navigate to next page</li>
                    <li>"Reload" or "Refresh" - Reload current page</li>
                    <li>"New tab" - Open a new blank tab</li>
                    <li>"Close tab" - Attempt to close current tab</li>
                  </ul>
                </div>
                
                {isLLMEnabled && (
                  <div className="mb-2">
                    <h4 className="text-white text-xs font-bold">LLM Enhanced Commands:</h4>
                    <p className="text-gray-300 text-xs">
                      Natural language commands are enabled! Try speaking naturally, 
                      like "I want to watch some videos" or "Could you find me information about climate change?"
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={openSettings}
                  className="mt-2 w-full py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                >
                  Add Custom Commands
                </button>
              </div>
              
              {/* Status indicator in bottom right */}
              <div className="absolute bottom-6 right-6 flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-500">{isTranscribing ? 'Recording...' : 'Press spacebar to speak'}</span>
                
                {/* Small button as fallback for mobile or non-keyboard users */}
                <button
                  ref={buttonRef}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-full shadow-lg transform transition-transform active:scale-95"
                  onMouseDown={handleTranscribeButtonDown}
                  onMouseUp={handleTranscribeButtonUp}
                  onMouseLeave={handleTranscribeButtonUp}
                  onTouchStart={handleTranscribeButtonDown}
                  onTouchEnd={handleTranscribeButtonUp}
                  aria-label={isTranscribing ? "Stop recording" : "Start recording"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Command Settings Modal */}
      <CustomCommandSettings isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  );
};

export default App;
