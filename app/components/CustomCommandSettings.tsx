"use client";

import { useState } from "react";
import { addCustomWebsite } from "../utils/voiceCommands";

interface CustomCommandSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomCommandSettings: React.FC<CustomCommandSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleAddWebsite = () => {
    // Basic validation
    if (!websiteName.trim()) {
      setMessage({ text: "Please enter a website name", type: "error" });
      return;
    }

    if (!websiteUrl.trim()) {
      setMessage({ text: "Please enter a website URL", type: "error" });
      return;
    }

    try {
      // Add the custom website
      addCustomWebsite(websiteName, websiteUrl);
      
      // Show success message
      setMessage({ 
        text: `Added "${websiteName}". Try saying "Open ${websiteName}"`, 
        type: "success" 
      });
      
      // Reset form
      setWebsiteName("");
      setWebsiteUrl("");
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({ 
        text: `Error adding website: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: "error" 
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Custom Voice Command</h2>
        
        <p className="text-gray-600 mb-4">
          Add a custom website that can be opened with a voice command.
          After adding, you can say "Open [Website Name]" to open it.
        </p>
        
        <div className="mb-4">
          <label htmlFor="websiteName" className="block text-sm font-medium text-gray-700 mb-1">
            Website Name (for voice command)
          </label>
          <input
            id="websiteName"
            type="text"
            value={websiteName}
            onChange={(e) => setWebsiteName(e.target.value)}
            placeholder="Netflix, Twitter, etc."
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <input
            id="websiteUrl"
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.example.com"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Close
          </button>
          <button 
            onClick={handleAddWebsite}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Add Website
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomCommandSettings; 