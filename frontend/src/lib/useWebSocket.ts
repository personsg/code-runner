import { useEffect, useState } from 'react';

export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    setSocket(socket);

    return () => {
      socket.close();
    };
  }, [url]);

  return socket;
};