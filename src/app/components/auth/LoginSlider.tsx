import { useState, useEffect, useCallback, useRef } from "react";
import { LoginSlide } from "./LoginSlide";
import type { SlideData } from "../../pages/auth/LoginPage";

const AUTOPLAY_INTERVAL = 7000;
const FADE_DURATION = 600;

interface LoginSliderProps {
  slides: SlideData[];
}

export function LoginSlider({ slides }: LoginSliderProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number) => {
    if (transitioning) return;
    setPrev(current);
    setTransitioning(true);
    setCurrent(next);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setPrev(null);
      setTransitioning(false);
    }, FADE_DURATION);
  }, [current, transitioning]);

  const advance = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(advance, AUTOPLAY_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, advance]);

  return (
    <div className="lp-slider">
      {/* Crossfade stage — the mock preview window */}
      <div className="lp-slider__stage">
        {prev !== null && (
          <div key={`out-${prev}`} className="lp-slider__layer lp-slider__layer--out">
            <LoginSlide slide={slides[prev]} />
          </div>
        )}
        <div key={`in-${current}`} className="lp-slider__layer lp-slider__layer--in">
          <LoginSlide slide={slides[current]} />
        </div>
      </div>

      {/* Caption below the preview window */}
      <div className="lp-slider__caption">
        <div className="lp-slider__caption-text">
          <p className="lp-slider__headline">{slides[current].headline}</p>
          <p className="lp-slider__body">{slides[current].text}</p>
        </div>
        <div className="lp-slider__dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`lp-slider__dot ${idx === current ? "lp-slider__dot--active" : "lp-slider__dot--inactive"}`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
