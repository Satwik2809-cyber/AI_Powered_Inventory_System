export const playAlertSound = (severity: string) => {
  const audio = new Audio(
    severity === "critical"
      ? "/sounds/critical.mp3"
      : "/sounds/notify.mp3"
  );
  audio.play();
};
