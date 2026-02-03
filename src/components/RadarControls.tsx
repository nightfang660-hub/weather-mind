/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react";

interface RadarControlsProps {
  frames: any[];
  currentFrameIndex: number;
  isPlaying: boolean;
  loading: boolean;
  onFrameChange: (index: number) => void;
  onPlayPause: () => void;
}

export const RadarControls = ({
  frames,
  currentFrameIndex,
  isPlaying,
  loading,
  onFrameChange,
  onPlayPause,
}: RadarControlsProps) => {
  const currentFrame = frames[currentFrameIndex];
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : null;

  const goToPrevious = () => {
    onFrameChange(Math.max(0, currentFrameIndex - 1));
  };

  const goToNext = () => {
    onFrameChange(Math.min(frames.length - 1, currentFrameIndex + 1));
  };

  return (
    <Card className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm border-border shadow-2xl p-2 w-56 animate-fade-in">
      {loading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Time Display */}
          {frameTime && (
            <div className="text-center bg-gradient-to-br from-primary/10 to-primary/5 p-1.5 rounded-lg border border-primary/20">
              <div className="text-[9px] text-muted-foreground">Radar Time</div>
              <div className="font-bold text-sm text-primary">
                {frameTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="font-semibold text-[10px] text-foreground">
                {frameTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={currentFrameIndex === 0}
              className="hover:bg-primary/10 h-7 w-7"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={onPlayPause}
              disabled={frames.length === 0}
              className="w-9 h-9 shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={currentFrameIndex === frames.length - 1}
              className="hover:bg-primary/10 h-7 w-7"
            >
              <SkipForward className="w-3 h-3" />
            </Button>
          </div>

          {/* Timeline Slider */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] text-muted-foreground font-medium">Timeline:</span>
              <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentFrameIndex + 1) / frames.length) * 100}%` }}
                />
              </div>
            </div>
            <Slider
              value={[currentFrameIndex]}
              onValueChange={(value) => onFrameChange(value[0])}
              max={Math.max(0, frames.length - 1)}
              step={1}
              disabled={frames.length === 0}
              className="cursor-pointer"
            />
            <div className="flex justify-between items-center mt-1">
              <div className="text-[9px] text-muted-foreground">
                <span className="font-bold text-foreground">{currentFrameIndex + 1}</span> / {frames.length}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {isPlaying ? "Playing" : "Paused"}
              </div>
            </div>
          </div>

          {/* Frame Type Indicator */}
          <div className="flex items-center justify-center">
            {currentFrameIndex < frames.length / 2 ? (
              <div className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded-full font-medium border border-blue-500/30">
                Past
              </div>
            ) : (
              <div className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded-full font-medium border border-green-500/30">
                Nowcast
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
