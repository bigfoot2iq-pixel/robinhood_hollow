import { useEffect, useState } from "react";

interface CountdownTime {
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

export function useCountdown(endDate: string | Date): CountdownTime {
  const calculateTimeLeft = (): CountdownTime => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const difference = end - now;

    if (difference <= 0) {
      return {
        hours: "00",
        minutes: "00",
        seconds: "00",
        isExpired: true,
      };
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
      isExpired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return timeLeft;
}
