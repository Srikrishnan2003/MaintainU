"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { TextZoom } from "@capawesome/capacitor-text-zoom"

export function CapacitorInit() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Lock text zoom to 100% to prevent Android system font size settings 
          // from blowing up the UI and causing overflows.
          await TextZoom.setZoom({ zoom: 1.0 });
        } catch (error) {
          console.error("Failed to set text zoom:", error);
        }
      }
    };

    initCapacitor();
  }, []);

  return null;
}
