
import { useState, useEffect } from "react";

// Função para formatar data/hora no horário do Brasil (GMT-3)
export function formatToBrazilTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

interface RealTimeTimerProps {
  startTime: string;
  endTime?: string;
  label?: string;
  className?: string;
  showCalculated?: boolean;
}

export function RealTimeTimer({ 
  startTime, 
  endTime, 
  label, 
  className = "",
  showCalculated = false 
}: RealTimeTimerProps) {
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      
      const diffMs = end.getTime() - start.getTime();
      
      if (diffMs < 0) {
        setTimeString("0m");
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let timeStr = "";
      if (days > 0) {
        timeStr += `${days}d `;
      }
      if (hours > 0) {
        timeStr += `${hours}h `;
      }
      timeStr += `${minutes}m`;

      setTimeString(timeStr.trim());
    };

    updateTime();
    
    // Only set interval if we're showing real-time (no endTime)
    if (!endTime && !showCalculated) {
      const interval = setInterval(updateTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [startTime, endTime, showCalculated]);

  return (
    <span className={className}>
      {label && `${label}: `}{timeString}
    </span>
  );
}

