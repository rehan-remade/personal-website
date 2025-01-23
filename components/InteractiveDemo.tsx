"use client";
import 'katex/dist/katex.min.css'
import KatexSpan from '@/components/KatexSpan'
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function InteractiveVaeDemo() {
  const [label, setLabel] = useState<number>(0);
  const [tiltValue, setTiltValue] = useState<number>(0);
  const [reconstructionImage, setReconstructionImage] = useState<string | null>(null);

  // Generate image whenever label or tilt changes
  useEffect(() => {
    handleGenerate();
  }, [label, tiltValue]);

  async function handleGenerate() {
    const pixelData = new Array(784).fill(0.5); // Start with gray image

    const response = await fetch("/api/run-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pixelData,
        label,
        tiltValue,
      }),
    });
    const result = await response.json();
    if (result.x_hat) {
      const canvas = document.createElement('canvas');
      canvas.width = 28;
      canvas.height = 28;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(28, 28);
        for (let i = 0; i < result.x_hat.length; i++) {
          const pixelValue = Math.floor((1 - result.x_hat[i]) * 255); // Invert by subtracting from 1
          imageData.data[i * 4] = pixelValue;     // R
          imageData.data[i * 4 + 1] = pixelValue; // G 
          imageData.data[i * 4 + 2] = pixelValue; // B
          imageData.data[i * 4 + 3] = 255;        // Alpha
        }
        ctx.putImageData(imageData, 0, 0);
        setReconstructionImage(canvas.toDataURL());
      }
    }
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 not-prose">      
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[...Array(10)].map((_, idx) => (
          <Button
            key={idx}
            variant={label === idx ? "default" : "outline"}
            onClick={() => setLabel(idx)}
            className="w-12 h-12 text-lg"
          >
            {idx}
          </Button>
        ))}
      </div>

      <div className="w-full max-w-md mb-8">
        <p className="mb-2">Adjusting <KatexSpan text="\mathbf{z}_3" inline /> dimension</p>
        <Slider
          value={[tiltValue]}
          onValueChange={(values) => setTiltValue(values[0])}
          min={-3}
          max={3}
          step={0.1}
        />
        <div className="text-sm text-muted-foreground mt-1 text-center">
          Value: {tiltValue.toFixed(1)}
        </div>
      </div>

      {reconstructionImage && (
        <div className="flex flex-col items-center">
          <img 
            src={reconstructionImage} 
            alt="VAE reconstruction"
            className="border border-gray-300"
            style={{
              imageRendering: 'pixelated',
              width: '280px',
              height: '280px'
            }}
          />
        </div>
      )}
    </div>
  );
}