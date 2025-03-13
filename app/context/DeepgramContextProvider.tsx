"use client";

import {
  createClient,
  LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
} from "@deepgram/sdk";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  FunctionComponent,
} from "react";

interface DeepgramContextType {
  connection: LiveClient | null;
  connectToDeepgram: (options: LiveSchema, endpoint?: string) => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: LiveConnectionState;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const getApiKey = async (): Promise<string> => {
  try {
    console.log("Fetching API key from /api/authenticate");
    const response = await fetch("/api/authenticate", { cache: "no-store" });
    const result = await response.json();
    console.log("API key response:", result);
    return result.key;
  } catch (error) {
    console.error("Error fetching API key:", error);
    return "";
  }
};

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
  const [connection, setConnection] = useState<LiveClient | null>(null);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>(
    LiveConnectionState.CLOSED
  );

  /**
   * Connects to the Deepgram speech recognition service and sets up a live transcription session.
   *
   * @param options - The configuration options for the live transcription session.
   * @param endpoint - The optional endpoint URL for the Deepgram service.
   * @returns A Promise that resolves when the connection is established.
   */
  const connectToDeepgram = async (options: LiveSchema, endpoint?: string) => {
    try {
      console.log("Connecting to Deepgram with options:", options);
      const key = await getApiKey();
      console.log("Got API key, length:", key?.length);
      
      if (!key) {
        console.error("API key is empty or undefined");
        return;
      }
      
      const deepgram = createClient(key);
      console.log("Created Deepgram client");

      const conn = deepgram.listen.live(options, endpoint);
      console.log("Created live connection");

      conn.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("WebSocket connection opened");
        setConnectionState(LiveConnectionState.OPEN);
      });

      conn.addListener(LiveTranscriptionEvents.Close, () => {
        console.log("WebSocket connection closed");
        setConnectionState(LiveConnectionState.CLOSED);
      });

      conn.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error("WebSocket error:", error);
      });

      conn.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        console.log("Received transcript:", data.channel.alternatives[0].transcript);
      });

      setConnection(conn);
    } catch (error) {
      console.error("Error connecting to Deepgram:", error);
    }
  };

  const disconnectFromDeepgram = async () => {
    if (connection) {
      console.log("Disconnecting from Deepgram");
      connection.finish();
      setConnection(null);
    }
  };

  return (
    <DeepgramContext.Provider
      value={{
        connection,
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  DeepgramContextProvider,
  useDeepgram,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
